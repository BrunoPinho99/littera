import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface PendingCheckoutPageProps {
  onLogout: () => void;
  session: any;
  schoolStatus?: string | null;
  onEnterDemo?: (type?: 'student' | 'teacher' | 'school_admin') => void;
}

export const PendingCheckoutPage: React.FC<PendingCheckoutPageProps> = ({
  onLogout,
  session,
  schoolStatus,
  onEnterDemo,
}) => {
  const [schoolData, setSchoolData] = useState<any>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(() => localStorage.getItem('checkout_invoiceUrl'));
  const [isOpeningInvoice, setIsOpeningInvoice] = useState(false);

  // Polling: verifica o status da escola a cada 5s
  useEffect(() => {
    const intervalRef = { current: null as any };
    let redirecting = false;

    const checkStatus = async () => {
      if (redirecting) return;
      
      const schoolId = session?.user?.user_metadata?.school_id || localStorage.getItem('checkout_schoolId');
      if (!schoolId) return;

      try {
        // Tenta verificar o status real no Asaas via Edge Function
        const { data: statusData, error: statusError } = await supabase.functions.invoke('pay-subscription', {
          body: { action: 'check_status' },
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });

        if (!statusError && statusData) {
          if (statusData.invoiceUrl) {
            setInvoiceUrl(statusData.invoiceUrl);
            localStorage.setItem('checkout_invoiceUrl', statusData.invoiceUrl);
          }

          if (statusData.status === 'PAID') {
            redirecting = true;
            clearInterval(intervalRef.current);
            await supabase.auth.refreshSession();
            setIsSuccess(true);
            return;
          } else if (statusData.status === 'REJECTED') {
            redirecting = true;
            clearInterval(intervalRef.current);
            setIsRejected(true);
            return;
          }
        }
      } catch (err) {
        console.error('Erro ao chamar edge function check_status:', err);
      }

      // Fallback: busca na tabela schools
      const { data: school, error } = await supabase
        .from('schools')
        .select('id, name, subscription_status')
        .eq('id', schoolId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar status da escola:', error);
        return;
      }

      if (school) {
        setSchoolData(school);
        if (school.subscription_status === 'active') {
          redirecting = true;
          clearInterval(intervalRef.current);
          await supabase.auth.refreshSession();
          setIsSuccess(true);
        }
      }
    };

    checkStatus();
    intervalRef.current = setInterval(checkStatus, 5000);

    return () => clearInterval(intervalRef.current);
  }, [session, retryCount]);

  // Realtime: destrava no instante em que o webhook do Asaas ativa a escola
  useEffect(() => {
    const schoolId = session?.user?.user_metadata?.school_id || localStorage.getItem('checkout_schoolId');
    if (!schoolId || isSuccess) return;
    const channel = supabase
      .channel(`pending-school-${schoolId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'schools', filter: `id=eq.${schoolId}` },
        async (payload: any) => {
          const nextStatus = String(payload.new?.subscription_status || '').toLowerCase();
          setSchoolData((prev: any) => ({ ...prev, ...(payload.new || {}) }));
          if (nextStatus === 'active') {
            await supabase.auth.refreshSession();
            setIsSuccess(true);
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, isSuccess]);

  const handleOpenAsaasInvoice = async () => {
    if (invoiceUrl) {
      window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    setIsOpeningInvoice(true);
    try {
      const schoolId = schoolData?.id || session?.user?.user_metadata?.school_id || localStorage.getItem('checkout_schoolId');
      const { data, error } = await supabase.functions.invoke('update-credit-card', {
        body: { schoolId },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });

      if (!error && data?.invoiceUrl) {
        setInvoiceUrl(data.invoiceUrl);
        localStorage.setItem('checkout_invoiceUrl', data.invoiceUrl);
        window.open(data.invoiceUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      // Fallback para check_status em pay-subscription
      const { data: statusData } = await supabase.functions.invoke('pay-subscription', {
        body: { action: 'check_status' },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });

      if (statusData?.invoiceUrl) {
        setInvoiceUrl(statusData.invoiceUrl);
        localStorage.setItem('checkout_invoiceUrl', statusData.invoiceUrl);
        window.open(statusData.invoiceUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      window.open('/cadastro', '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Erro ao buscar fatura Asaas:', err);
      window.open('/cadastro', '_blank', 'noopener,noreferrer');
    } finally {
      setIsOpeningInvoice(false);
    }
  };

  const effectiveStatus = String(schoolData?.subscription_status || schoolStatus || 'inactive').toLowerCase();

  const getStatusCopy = () => {
    if (effectiveStatus === 'past_due') {
      return {
        title: 'Assinatura em Atraso',
        description: 'Identificamos uma fatura vencida. Regularize o pagamento no Asaas para reativar o acesso de professores e alunos.',
        icon: 'warning_amber',
        badgeColor: 'text-amber-500 border-amber-500/20',
      };
    }
    if (effectiveStatus === 'unpaid' || effectiveStatus === 'canceled') {
      return {
        title: 'Assinatura Inativa ou Cancelada',
        description: 'Sua assinatura não está ativa. Regularize ou reative seu plano para continuar usando o Littera.',
        icon: 'block',
        badgeColor: 'text-red-500 border-red-500/20',
      };
    }
    return {
      title: 'Aguardando Pagamento',
      description: 'Finalize o pagamento no ambiente seguro do Asaas para liberar o painel da sua escola.',
      icon: 'lock',
      badgeColor: 'text-primary border-primary/20',
    };
  };

  const statusCopy = getStatusCopy();

  if (isRejected) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1c] flex flex-col items-center justify-center font-sans p-4 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30vw] h-[30vw] bg-orange-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="bg-white dark:bg-surface-dark p-6 sm:p-10 rounded-3xl sm:rounded-[2.5rem] shadow-premium max-w-lg w-full text-center border-none shadow-ambient relative z-10 animate-fade-in-up">
          <div className="relative z-10">
            <div className="relative w-24 h-24 mx-auto mb-8 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center">
              <span className="material-icons-outlined text-red-500 text-5xl">error_outline</span>
            </div>

            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight font-display">
              Pagamento Recusado
            </h2>
            
            <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium leading-relaxed">
              Ocorreu um problema com o pagamento da sua assinatura. Acesse sua fatura no Asaas para tentar outro cartão, PIX ou boleto.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setIsRejected(false);
                  handleOpenAsaasInvoice();
                  setRetryCount(c => c + 1);
                }}
                disabled={isOpeningInvoice}
                className="w-full bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-xl shadow-xl shadow-primary/25 transition-all flex items-center justify-center gap-2 active:scale-95 text-sm uppercase tracking-widest disabled:opacity-60"
              >
                <span className="material-icons-outlined text-lg">open_in_new</span>
                {isOpeningInvoice ? 'Abrindo Fatura...' : 'Pagar Fatura no Asaas'}
              </button>

              <button
                onClick={onLogout}
                className="w-full px-6 py-4 rounded-2xl font-black text-sm text-gray-400 hover:text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-all uppercase tracking-widest"
              >
                Sair da Conta
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1c] flex flex-col items-center justify-center font-sans p-4 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-green-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30vw] h-[30vw] bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="bg-white dark:bg-surface-dark p-6 sm:p-10 rounded-3xl sm:rounded-[2.5rem] shadow-premium max-w-lg w-full text-center border-none shadow-ambient relative z-10 animate-fade-in-up">
          <div className="relative z-10">
            <div className="relative w-24 h-24 mx-auto mb-8 bg-green-50 dark:bg-green-500/10 rounded-full flex items-center justify-center">
              <span className="material-icons-outlined text-green-500 text-5xl">check_circle</span>
            </div>

            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight font-display">
              Pagamento Confirmado!
            </h2>
            
            <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium leading-relaxed">
              Muito obrigado pela confiança! Sua assinatura foi ativada com sucesso. Você já pode acessar a plataforma e começar a utilizar todos os nossos recursos.
            </p>

            <button
              onClick={() => window.location.href = '/app/inst-overview'}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-xl shadow-xl shadow-green-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 text-sm uppercase tracking-widest"
            >
              <span className="material-icons-outlined text-lg">school</span>
              Acessar Área da Escola
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1c] flex flex-col items-center justify-center font-sans p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30vw] h-[30vw] bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="bg-white dark:bg-surface-dark p-10 rounded-[2.5rem] shadow-premium max-w-lg w-full text-center border-none shadow-ambient relative z-10 animate-fade-in-up">
        <div className="relative z-10">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className={`absolute inset-0 border-4 rounded-full ${statusCopy.badgeColor}`}></div>
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`material-icons-outlined text-3xl animate-pulse ${statusCopy.badgeColor.split(' ')[0]}`}>
                {statusCopy.icon}
              </span>
            </div>
          </div>

          <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight font-display">
            {statusCopy.title}
          </h2>
          
          <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium leading-relaxed">
            {statusCopy.description}
          </p>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center gap-3 text-sm text-gray-400 font-bold mb-2">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Aguardando confirmação automática do Asaas...
            </div>

            <button
              onClick={handleOpenAsaasInvoice}
              disabled={isOpeningInvoice}
              className="w-full bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-xl shadow-xl shadow-primary/25 transition-all flex items-center justify-center gap-2 active:scale-95 text-sm uppercase tracking-widest disabled:opacity-60 cursor-pointer"
            >
              <span className="material-icons-outlined text-lg">open_in_new</span>
              {isOpeningInvoice ? 'Abrindo Fatura no Asaas...' : 'Pagar Fatura no Asaas'}
            </button>

            {onEnterDemo && (
              <button
                type="button"
                onClick={() => onEnterDemo('school_admin')}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-icons-outlined text-base">visibility</span>
                Explorar em Modo Demonstração (Demo)
              </button>
            )}

            <div className="flex items-center justify-center gap-4 pt-3 border-t border-gray-100 dark:border-white/10 mt-2">
              <button
                type="button"
                onClick={() => { window.location.href = '/'; }}
                className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
              >
                Voltar ao Início
              </button>
              <span className="text-gray-300 dark:text-gray-700">·</span>
              <button
                type="button"
                onClick={onLogout}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-wider cursor-pointer"
              >
                Sair da Conta
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
