import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface PendingCheckoutPageProps {
  onLogout: () => void;
  session: any;
}

export const PendingCheckoutPage: React.FC<PendingCheckoutPageProps> = ({ onLogout, session }) => {
  const [schoolData, setSchoolData] = useState<any>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Polling: verifica o status da escola a cada 5s
  useEffect(() => {
    const intervalRef = { current: null as any };
    let redirecting = false;

    const checkStatus = async () => {
      if (redirecting) return;
      
      const schoolId = session?.user?.user_metadata?.school_id || localStorage.getItem('checkout_schoolId');
      if (!schoolId) return;

      const { data: school, error } = await supabase
        .from('schools')
        .select('id, name, subscription_status')
        .eq('id', schoolId)
        .single();

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
  }, [session]);

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1c] flex flex-col items-center justify-center font-sans p-4 relative overflow-hidden">
        {/* Elementos Decorativos Fundo */}
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-green-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30vw] h-[30vw] bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="bg-white dark:bg-surface-dark p-10 rounded-[2.5rem] shadow-premium max-w-lg w-full text-center border-none shadow-ambient relative z-10 animate-fade-in-up">
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
              <span className="material-icons-outlined text-lg">login</span>
              Acessar Plataforma
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1c] flex flex-col items-center justify-center font-sans p-4 relative overflow-hidden">
      {/* Elementos Decorativos Fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30vw] h-[30vw] bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="bg-white dark:bg-surface-dark p-10 rounded-[2.5rem] shadow-premium max-w-lg w-full text-center border-none shadow-ambient relative z-10 animate-fade-in-up">
        
        <div className="relative z-10">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-icons-outlined text-primary text-3xl animate-pulse">lock</span>
            </div>
          </div>

          <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight font-display">
            Aguardando Liberação
          </h2>
          
          <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium leading-relaxed">
            Sua assinatura está em análise pelo banco ou inativa. Assim que o pagamento for confirmado, seu acesso será liberado automaticamente.
          </p>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center gap-3 text-sm text-gray-400 font-bold mb-4">
               <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
               Verificando status com o banco...
            </div>

            <button
              onClick={() => window.open('/cadastro', '_blank')}
              className="w-full bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-xl shadow-xl shadow-primary/25 transition-all flex items-center justify-center gap-2 active:scale-95 text-sm uppercase tracking-widest"
            >
              <span className="material-icons-outlined text-lg">payment</span>
              Realizar Pagamento
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
};
