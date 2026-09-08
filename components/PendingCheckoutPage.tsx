import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';

function formatCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    // CPF
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  } else {
    // CNPJ
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
}

function formatCardNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}

const paymentSchema = z.object({
  paymentMethod: z.enum(['CREDIT_CARD', 'PIX', 'BOLETO']).default('CREDIT_CARD'),
  ccHolderName: z.string().optional(),
  ccCpfCnpj: z.string().optional(),
  ccNumber: z.string().optional(),
  ccExpiry: z.string().optional(),
  ccCvv: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.paymentMethod === 'CREDIT_CARD') {
    if (!data.ccHolderName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Nome impresso no cartão é obrigatório', path: ['ccHolderName'] });
    }
    if (!data.ccCpfCnpj || data.ccCpfCnpj.replace(/\D/g, '').length < 11) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CPF ou CNPJ inválido', path: ['ccCpfCnpj'] });
    }
    if (!data.ccNumber || data.ccNumber.replace(/\D/g, '').length < 14) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Número do cartão inválido', path: ['ccNumber'] });
    }
    if (!data.ccExpiry || data.ccExpiry.length < 5) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Validade inválida (MM/AA)', path: ['ccExpiry'] });
    }
    if (!data.ccCvv || data.ccCvv.length < 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CVV inválido', path: ['ccCvv'] });
    }
  }
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PendingCheckoutPageProps {
  onLogout: () => void;
  session: any;
}

export const PendingCheckoutPage: React.FC<PendingCheckoutPageProps> = ({ onLogout, session }) => {
  const _navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [schoolData, setSchoolData] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(30 * 60);

  // Plan editing state
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editStudentCount, setEditStudentCount] = useState('');
  const [editBillingCycle, setEditBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

  // Timer de 30 minutos
  useEffect(() => {
    const savedTime = localStorage.getItem('checkout_startTime');
    let startTime = parseInt(savedTime || '0', 10);
    
    if (!startTime) {
      startTime = Date.now();
      localStorage.setItem('checkout_startTime', startTime.toString());
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, (30 * 60) - elapsed);
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Polling: verifica o status da escola a cada 5s — funciona para PIX, Boleto e Cartão
  useEffect(() => {
    const intervalRef = { current: null as any };
    let redirecting = false;

    const checkStatus = async () => {
      if (redirecting) return;
      // Usa o school_id da sessão, ou cai no localStorage como fallback (logo após o cadastro)
      const schoolId = session?.user?.user_metadata?.school_id
        || localStorage.getItem('checkout_schoolId');
      if (!schoolId) return;

      const { data: school, error } = await supabase
        .from('schools')
        .select('id, name, subscription_status, student_count')
        .eq('id', schoolId)
        .single();

      if (error) {
        console.error('Erro ao buscar status da escola:', error);
        return;
      }

      if (school) {
        setSchoolData(school);

        if (school.subscription_status === 'active') {
          // Pagamento aprovado! Limpar flags e redirecionar direto para o dashboard
          redirecting = true;
          clearInterval(intervalRef.current);
          localStorage.removeItem('checkout_studentCount');
          localStorage.removeItem('checkout_billingCycle');

          // Forçar refresh da sessão para pegar user_metadata atualizado
          await supabase.auth.refreshSession();
          // Recarregar a página — o App.tsx vai detectar a assinatura ativa e liberar o acesso
          window.location.href = '/app/inst-overview';
          return;
        }
      }

      // Se estamos aguardando confirmação de cartão, fazer ping extra na função pay-subscription
      if (checkingStatus) {
        try {
          const { data: checkData, error: checkError } = await supabase.functions.invoke('pay-subscription', {
            body: { action: 'check_status' },
            headers: { Authorization: `Bearer ${session.access_token}` }
          });

          if (!checkError && checkData?.status === 'PAID') {
            redirecting = true;
            clearInterval(intervalRef.current);
            localStorage.removeItem('checkout_studentCount');
            localStorage.removeItem('checkout_billingCycle');
            await supabase.auth.refreshSession();
            window.location.href = '/app/inst-overview';
          } else if (!checkError && checkData?.status === 'REJECTED') {
            setCheckingStatus(false);
            setGlobalError('Cartão recusado pelo banco. Verifique os dados e tente novamente.');
          }
        } catch (e) {
          console.error('Erro ao verificar status do cartão:', e);
        }
      }
    };

    checkStatus();
    intervalRef.current = setInterval(checkStatus, 5000); // Verifica a cada 5 segundos

    return () => clearInterval(intervalRef.current);
  }, [session, checkingStatus]);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<any>({
    resolver: zodResolver(paymentSchema),
    mode: 'onChange',
    defaultValues: {
      paymentMethod: 'CREDIT_CARD',
    }
  });

  const formValues = watch();

  const onSubmit = async (data: PaymentFormData) => {
    setIsLoading(true);
    setGlobalError(null);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('pay-subscription', {
        body: {
          paymentMethod: data.paymentMethod,
          ccHolderName: data.ccHolderName,
          ccCpfCnpj: data.ccCpfCnpj,
          ccNumber: data.ccNumber,
          ccExpiry: data.ccExpiry,
          ccCvv: data.ccCvv
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      // Erro da invocação ou erro retornado pela função
      if (fnError || fnData?.error) {
        setIsLoading(false);
        setGlobalError(fnError?.message || fnData?.error || 'Erro ao processar pagamento.');
        return;
      }

      // Cartão aprovado imediatamente (caso remoto em fallback)
      if (fnData.status === 'PAID') {
        setIsLoading(false);
        localStorage.removeItem('checkout_studentCount');
        localStorage.removeItem('checkout_billingCycle');
        await supabase.auth.signOut();
        window.location.href = '/login?activated=true';
        return;
      }

      setPaymentResult(fnData);
      setIsLoading(false);

      // Redirecionamento automático após 3 segundos para cartão de crédito aprovado
      if (fnData.billingType === 'CREDIT_CARD') {
        setTimeout(async () => {
          localStorage.removeItem('checkout_studentCount');
          localStorage.removeItem('checkout_billingCycle');
          await supabase.auth.refreshSession();
          window.location.href = '/app/inst-overview';
        }, 3000);
      }

    } catch (err: any) {
      console.error('[PendingCheckoutPage] Error:', err);
      setGlobalError(err.message || 'Falha ao processar o pagamento. Tente novamente.');
      setIsLoading(false);
    }
  };

  const handleUpdatePlan = async () => {
    const students = parseInt(editStudentCount, 10);
    if (isNaN(students) || students <= 0) {
      setGlobalError('Quantidade de alunos inválida.');
      return;
    }

    setIsUpdatingPlan(true);
    setGlobalError(null);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('pay-subscription', {
        body: {
          action: 'update_plan',
          studentCount: students,
          billingCycle: editBillingCycle
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (fnError || fnData?.error) {
        setGlobalError(fnError?.message || fnData?.error || 'Erro ao atualizar o plano.');
      } else {
        // Sucesso! Atualiza localStorage
        localStorage.setItem('checkout_studentCount', students.toString());
        localStorage.setItem('checkout_billingCycle', editBillingCycle);
        
        // Atualiza o schoolData localmente
        setSchoolData(prev => prev ? { ...prev, student_count: students } : prev);
        
        // Volta para a tela de pagamento
        setIsEditingPlan(false);
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Falha ao atualizar o plano.');
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const renderField = (
    label: string,
    name: keyof PaymentFormData,
    type: string = 'text',
    placeholder: string = '',
    formatter?: (val: string) => string
  ) => {
    const errorMsg = errors[name]?.message;
    return (
      <div className="space-y-1.5 group">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-primary">
          {label}
        </label>
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <input
              {...field}
              type={type}
              placeholder={placeholder}
              onChange={(e) => {
                const val = formatter ? formatter(e.target.value) : e.target.value;
                field.onChange(val);
              }}
              className={`w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border font-bold text-sm transition-all outline-none ${
                errorMsg
                  ? 'border-rose-300 focus:border-rose-400 bg-rose-50/50 dark:bg-rose-900/10'
                  : 'border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10'
              }`}
            />
          )}
        />
        {errorMsg && (
          <p className="text-rose-500 text-[11px] font-bold ml-1 flex items-center gap-1">
            <span className="material-icons-outlined text-xs">error_outline</span>
            {errorMsg as string}
          </p>
        )}
      </div>
    );
  };

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  // Calculate price to display based on student count
  const savedCount = typeof window !== 'undefined' ? localStorage.getItem('checkout_studentCount') : null;
  const dbStudentCount = schoolData?.student_count || parseInt(savedCount || '0', 10);
  
  // Retrieve billingCycle from localStorage
  const savedCycle = localStorage.getItem('checkout_billingCycle');
  const dbIsYearly = savedCycle === 'YEARLY';

  // For display (especially during editing)
  const effectiveStudentCount = isEditingPlan 
    ? (parseInt(editStudentCount, 10) || dbStudentCount) 
    : dbStudentCount;
  
  const effectiveIsYearly = isEditingPlan 
    ? (editBillingCycle === 'YEARLY') 
    : dbIsYearly;
  
  // Dynamic pricing (per student)
  const discount = effectiveIsYearly ? 0.6 : 1;
  
  let pricePerStudent = 0;
  if (effectiveStudentCount <= 200) {
    pricePerStudent = 8.90;
  } else if (effectiveStudentCount <= 500) {
    pricePerStudent = 7.90;
  } else if (effectiveStudentCount <= 1000) {
    pricePerStudent = 6.90;
  } else {
    pricePerStudent = 5.90;
  }
  pricePerStudent = pricePerStudent * discount;
  
  const monthlyTotal = effectiveStudentCount * pricePerStudent;
  const finalTotal = effectiveIsYearly ? monthlyTotal * 12 : monthlyTotal;
  const _planName = 'School'; // Plano único
  
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background-light dark:bg-background-dark font-sans overflow-hidden">
      
      {/* ── Lado Esquerdo — Branding / Resumo ──────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[40%] xl:w-[35%] relative bg-slate-900 overflow-hidden">
        <div className="min-h-full w-full flex items-center justify-center p-8 xl:p-12">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          <div className="relative z-10 text-white w-full max-w-sm text-left">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-2xl shrink-0">
                <div className="flex flex-col items-center translate-y-[1px]">
                  <span className="text-slate-900 font-black text-2xl leading-none tracking-tighter">L</span>
                  <div className="w-5 h-[4px] bg-primary mt-[1px] rounded-full" />
                </div>
              </div>
              <span className="font-black text-3xl tracking-tighter text-white font-display">
                Littera<span className="text-primary">.</span>
              </span>
            </div>

            <div className="space-y-6">
              <h1 className="text-3xl font-black leading-tight tracking-tight font-display">
                Finalize seu acesso.
              </h1>
              <p className="text-base text-gray-400 font-medium leading-relaxed">
                Sua instituição <strong>{schoolData?.name || '...'}</strong> já está cadastrada.
                Para liberar correções I.A., relatórios e gestão de turmas, conclua o pagamento.
              </p>

              <div className="bg-white/5 border-none shadow-ambient rounded-2xl p-6 mt-8 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">Seu Plano Atual</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{effectiveIsYearly ? 'ANUAL (-40%)' : 'MENSAL'}</p>
                </div>
                <div className="flex justify-between items-end mb-2">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black text-white">{effectiveStudentCount}</span>
                    <span className="text-gray-400 font-bold mb-1">Alunos</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-white">R$ {formatBRL(finalTotal)}</span>
                    <span className="text-xs text-gray-400 block mt-1">/{effectiveIsYearly ? 'ano' : 'mês'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                  <span className="material-icons-outlined text-primary text-base">verified</span>
                  Acesso Total Imediato
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    localStorage.clear();
                    window.location.href = '/cadastro';
                  }}
                  className="text-xs font-bold uppercase tracking-widest text-primary hover:text-white transition-colors flex items-center gap-2 bg-primary/10 hover:bg-primary px-4 py-2 rounded-xl"
                >
                  <span className="material-icons-outlined text-sm">add_circle</span>
                  Novo Cadastro
                </button>
                <button
                  onClick={onLogout}
                  className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-2"
                >
                  <span className="material-icons-outlined text-sm">logout</span>
                  Sair da Conta
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lado Direito — Formulário de Pagamento ─────────────────────────────────────── */}
      <div className="w-full lg:w-[60%] xl:w-[65%] h-full bg-white dark:bg-slate-900 overflow-y-auto custom-scrollbar flex flex-col relative">
        {/* Mobile Header */}
        <div className="lg:hidden p-6 flex justify-between items-center border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center shrink-0">
                <span className="text-white dark:text-slate-900 font-black text-lg leading-none">L</span>
             </div>
             <span className="font-black text-xl tracking-tighter text-slate-900 dark:text-white font-display">Littera.</span>
          </div>
          <button onClick={onLogout} className="text-gray-400">
            <span className="material-icons-outlined">logout</span>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
          <div className="w-full max-w-lg">

            {checkingStatus ? (
               <div className="bg-white dark:bg-surface-dark rounded-3xl p-10 shadow-premium border-none shadow-ambient text-center animate-fade-in-up">
                 <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                 </div>
                 <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-3 font-display">Aguardando Confirmação</h2>
                 <p className="text-gray-500 font-medium text-sm mb-6">
                   O banco está analisando seu pagamento. Assim que for aprovado, seu acesso será liberado automaticamente.
                 </p>
                 <p className="text-gray-400 text-xs mb-6">
                   Isso pode levar de alguns segundos até alguns minutos.
                 </p>
                 <button
                   type="button"
                   onClick={() => { setCheckingStatus(false); setIsLoading(false); setGlobalError(null); }}
                   className="text-xs font-black text-primary hover:text-primary-dark uppercase tracking-widest transition-colors"
                 >
                   ← Voltar e tentar outro método
                 </button>
               </div>
            ) : paymentResult ? (
              <div className="bg-white dark:bg-surface-dark rounded-3xl p-8 shadow-premium border-none shadow-ambient text-center animate-fade-in-up">
                <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="material-icons-outlined text-4xl">check_circle</span>
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-2 font-display">
                  Quase lá!
                </h2>

                {paymentResult.billingType === 'PIX' && (
                  <div className="mt-6">
                    <p className="text-gray-500 text-sm font-medium mb-6">
                      Escaneie o QR Code abaixo para liberar seu acesso imediatamente.
                    </p>
                    <div className="bg-white p-4 rounded-2xl inline-block shadow-md border-none shadow-sm">
                      {paymentResult.pixQrCode ? (
                        <img 
                          src={paymentResult.pixQrCode.startsWith('data:') ? paymentResult.pixQrCode : `data:image/jpeg;base64,${paymentResult.pixQrCode}`} 
                          alt="PIX QR Code" 
                          className="w-48 h-48 mx-auto" 
                        />
                      ) : (
                        <div className="w-48 h-48 flex items-center justify-center text-gray-400 text-sm">
                          Gerando PIX...
                        </div>
                      )}
                    </div>
                    <div className="mt-6">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Ou use o Copia e Cola:</p>
                      <div className="flex gap-2 justify-center">
                        <input 
                          type="text" 
                          readOnly 
                          value={paymentResult.pixCopyPaste} 
                          className="text-xs bg-gray-50 dark:bg-white/5 border-none shadow-sm rounded-xl px-4 py-3 w-full max-w-[250px] outline-none text-gray-600 dark:text-gray-300 font-medium"
                        />
                        <button 
                          type="button"
                          onClick={() => navigator.clipboard.writeText(paymentResult.pixCopyPaste)}
                          className="bg-primary text-white px-4 rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
                          title="Copiar"
                        >
                          <span className="material-icons-outlined text-sm">content_copy</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {paymentResult.billingType === 'BOLETO' && (
                  <div className="mt-6">
                    <p className="text-gray-500 text-sm font-medium mb-6">
                      Seu boleto foi gerado. O acesso será liberado em até 2 dias úteis após o pagamento.
                    </p>
                    <a 
                      href={paymentResult.bankSlipUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 bg-primary text-white font-bold py-4 px-8 rounded-xl hover:bg-primary-dark transition-all shadow-xl shadow-primary/30"
                    >
                      <span className="material-icons-outlined">receipt_long</span>
                      Baixar Boleto
                    </a>
                  </div>
                )}
                
                {paymentResult.billingType === 'CREDIT_CARD' && (
                  <div className="mt-6 w-full">
                    <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold mb-4">
                      Pagamento com cartão processado com sucesso!
                    </p>
                    <p className="text-gray-500 text-sm font-medium mb-4">
                      Seu acesso será liberado em alguns instantes.
                    </p>
                  </div>
                )}
                
                {paymentResult.billingType !== 'CREDIT_CARD' && (
                  <div className="mt-8 pt-8 border-t border-gray-100 dark:border-white/5">
                     <div className="flex items-center justify-center gap-3 text-sm text-gray-400 font-bold">
                       <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                       Aguardando confirmação do banco...
                     </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-surface-dark rounded-3xl p-8 sm:p-10 shadow-premium border-none shadow-ambient animate-fade-in-up">
                <div className="mb-8 flex justify-between items-start text-center sm:text-left">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight font-display">
                      Pagamento
                    </h2>
                    <p className="text-gray-500 font-medium mt-1">Ambiente 100% seguro.</p>
                  </div>
                  {!isEditingPlan && (
                    <button 
                      type="button"
                      onClick={() => {
                        setEditStudentCount(dbStudentCount.toString());
                        setEditBillingCycle(dbIsYearly ? 'YEARLY' : 'MONTHLY');
                        setGlobalError(null);
                        setIsEditingPlan(true);
                      }} 
                      className="text-primary text-xs sm:text-sm font-bold flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
                    >
                      <span className="material-icons-outlined text-[16px]">edit</span>
                      <span className="hidden sm:inline">Editar Plano</span>
                    </button>
                  )}
                </div>

                {globalError && (
                  <div className="mb-8 p-4 bg-rose-50 dark:bg-rose-900/10 border-none shadow-sm rounded-2xl text-rose-600 dark:text-rose-400 text-sm font-bold text-center">
                    <span className="material-icons-outlined text-base mr-1 align-middle">error_outline</span>
                    {globalError}
                  </div>
                )}

                {isEditingPlan ? (
                  <div className="space-y-6 animate-fade-in">
                    <div className="space-y-1.5 group">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        Quantidade de Alunos
                      </label>
                      <input
                        type="number"
                        value={editStudentCount}
                        onChange={(e) => setEditStudentCount(e.target.value)}
                        placeholder="Ex: 350"
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 font-bold text-sm transition-all outline-none"
                      />
                    </div>
                    
                    <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl">
                      <button 
                        type="button"
                        onClick={() => setEditBillingCycle('MONTHLY')}
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${editBillingCycle === 'MONTHLY' ? 'bg-white dark:bg-surface-dark shadow text-primary' : 'text-gray-500'}`}
                      >
                        Mensal
                      </button>
                      <button 
                        type="button"
                        onClick={() => setEditBillingCycle('YEARLY')}
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${editBillingCycle === 'YEARLY' ? 'bg-white dark:bg-surface-dark shadow text-primary' : 'text-gray-500'}`}
                      >
                        Anual <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full ml-1">-40%</span>
                      </button>
                    </div>

                    <div className="mt-6 bg-primary/5 dark:bg-primary/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                      <p className="text-gray-500 text-xs font-bold mb-1">Novo valor {effectiveIsYearly ? '(Anual)' : '(Mensal)'}</p>
                      <p className="text-3xl font-black text-slate-900 dark:text-white">R$ {formatBRL(finalTotal)}</p>
                    </div>

                    <div className="flex gap-3 mt-8">
                      <button
                        type="button"
                        onClick={() => setIsEditingPlan(false)}
                        className="px-6 py-4 rounded-2xl font-black text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleUpdatePlan}
                        disabled={isUpdatingPlan}
                        className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm text-white bg-primary hover:bg-primary-dark shadow-xl shadow-primary/25 transition-all active:scale-[0.97]"
                      >
                        {isUpdatingPlan ? <span className="material-icons-outlined animate-spin">refresh</span> : 'Salvar Plano'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-fade-in">
                    <div className="mb-6">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">
                        Forma de Pagamento
                      </label>
                      <div className="flex gap-2 bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl">
                        {['CREDIT_CARD', 'PIX', 'BOLETO'].map(method => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setValue('paymentMethod', method as any)}
                            className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                              formValues.paymentMethod === method
                                ? 'bg-white dark:bg-surface-dark shadow text-primary'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                          >
                            {method === 'CREDIT_CARD' ? 'Cartão' : method === 'PIX' ? 'PIX' : 'Boleto'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {formValues.paymentMethod === 'CREDIT_CARD' && (
                      <div className="pt-2 animate-fade-in space-y-4">
                        {renderField('Nome no Cartão', 'ccHolderName', 'text', 'Ex: JOAO A SILVA')}
                        {renderField('CPF/CNPJ do Titular', 'ccCpfCnpj', 'text', '000.000.000-00', formatCpfCnpj)}
                        <div className="grid grid-cols-12 gap-4">
                          <div className="col-span-12 sm:col-span-6">
                            {renderField('Número do Cartão', 'ccNumber', 'text', '0000 0000 0000 0000', formatCardNumber)}
                          </div>
                          <div className="col-span-6 sm:col-span-3">
                            {renderField('Validade', 'ccExpiry', 'text', 'MM/AA', formatExpiry)}
                          </div>
                          <div className="col-span-6 sm:col-span-3">
                            {renderField('CVV', 'ccCvv', 'text', '123', (v) => v.replace(/\D/g, '').slice(0, 4))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Resumo da Compra + Timer */}
                    <div className="mt-8">
                      <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden mb-4">
                        {timeLeft > 0 ? (
                          <div className="flex items-center gap-2 text-rose-500 font-black mb-2 animate-pulse">
                            <span className="material-icons-outlined text-sm">timer</span>
                            <span className="text-xs uppercase tracking-widest">Desconto expira em: {formatTime(timeLeft)}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400 font-black mb-2">
                            <span className="material-icons-outlined text-sm">timer_off</span>
                            <span className="text-xs uppercase tracking-widest">Desconto expirado</span>
                          </div>
                        )}
                        <p className="text-gray-500 text-xs font-bold mb-1">Total a pagar {effectiveIsYearly ? '(Anual)' : '(Mensal)'}</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white">R$ {formatBRL(finalTotal)}</p>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-xl shadow-xl shadow-primary/25 transition-all flex items-center justify-center gap-2 active:scale-95 text-base uppercase tracking-widest"
                      >
                        {isLoading ? (
                          <span className="material-icons-outlined animate-spin">refresh</span>
                        ) : (
                          <>
                            <span className="material-icons-outlined">lock</span>
                            {formValues.paymentMethod === 'CREDIT_CARD' ? 'Pagar e Acessar' : 'Gerar Pagamento'}
                          </>
                        )}
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 opacity-50 mt-4">
                      <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                        <span className="material-icons-outlined text-[14px]">shield</span>
                        Processado com segurança pelo Asaas
                      </span>
                    </div>
                  </form>
                )}

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
