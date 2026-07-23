import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';

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
  ccNumber: z.string().optional(),
  ccExpiry: z.string().optional(),
  ccCvv: z.string().optional(),
  billingPostalCode: z.string().optional(),
  billingAddressNumber: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.paymentMethod === 'CREDIT_CARD') {
    if (!data.ccHolderName || data.ccHolderName.trim().length < 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nome do titular obrigatório", path: ["ccHolderName"] });
    }
    if (!data.ccNumber || data.ccNumber.replace(/\D/g, '').length < 13) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Número do cartão inválido", path: ["ccNumber"] });
    }
    if (!data.ccExpiry || data.ccExpiry.replace(/\D/g, '').length < 4) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Validade inválida (MM/AA)", path: ["ccExpiry"] });
    }
    if (!data.ccCvv || data.ccCvv.replace(/\D/g, '').length < 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CVV inválido", path: ["ccCvv"] });
    }
    if (!data.billingPostalCode || data.billingPostalCode.replace(/\D/g, '').length < 8) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CEP inválido", path: ["billingPostalCode"] });
    }
    if (!data.billingAddressNumber || data.billingAddressNumber.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Número obrigatório", path: ["billingAddressNumber"] });
    }
  }
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PendingCheckoutPageProps {
  onLogout: () => void;
  session: any;
}

export const PendingCheckoutPage: React.FC<PendingCheckoutPageProps> = ({ onLogout, session }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [schoolData, setSchoolData] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Polling: verifica o status da escola a cada 5s — funciona para PIX, Boleto e Cartão
  useEffect(() => {
    let interval: any;
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
          clearInterval(interval);
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
            clearInterval(interval);
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
    interval = setInterval(checkStatus, 5000); // Verifica a cada 5 segundos

    return () => clearInterval(interval);
  }, [session, checkingStatus]);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<any>({
    resolver: zodResolver(paymentSchema),
    mode: 'onChange',
    defaultValues: {
      paymentMethod: 'CREDIT_CARD',
      ccHolderName: '',
      ccNumber: '',
      ccExpiry: '',
      ccCvv: '',
    }
  });

  const formValues = watch();

  const onSubmit = async (data: PaymentFormData) => {
    setIsLoading(true);
    setGlobalError(null);

    try {
      let creditCardData = undefined;
      if (data.paymentMethod === 'CREDIT_CARD') {
        const expiryClean = data.ccExpiry?.replace(/\D/g, '') || '';
        creditCardData = {
          holderName: data.ccHolderName,
          number: data.ccNumber?.replace(/\D/g, ''),
          expiryMonth: expiryClean.slice(0, 2),
          expiryYear: expiryClean.length === 4 ? `20${expiryClean.slice(2, 4)}` : expiryClean.slice(2),
          ccv: data.ccCvv?.replace(/\D/g, '')
        };
      }

      const { data: fnData, error: fnError } = await supabase.functions.invoke('pay-subscription', {
        body: {
          paymentMethod: data.paymentMethod,
          creditCardData,
          billingPostalCode: data.billingPostalCode,
          billingAddressNumber: data.billingAddressNumber
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

      // Cartão aprovado imediatamente
      if (fnData.status === 'PAID') {
        setIsLoading(false);
        // Limpar dados e redirecionar para login
        localStorage.removeItem('checkout_studentCount');
        localStorage.removeItem('checkout_billingCycle');
        await supabase.auth.signOut();
        window.location.href = '/login?activated=true';
        return;
      }

      // Cartão em análise (PENDING)
      if (fnData.status === 'PENDING_CARD') {
        setCheckingStatus(true);
        setIsLoading(false);
        return;
      }

      if (data.paymentMethod === 'PIX' || data.paymentMethod === 'BOLETO') {
        setPaymentResult(fnData);
        setIsLoading(false);
      } else {
        // Fallback: aguardar polling
        setCheckingStatus(true);
        setIsLoading(false);
      }
      
    } catch (err: any) {
      console.error('[PendingCheckoutPage] Error:', err);
      setGlobalError(err.message || 'Falha ao processar o pagamento. Tente novamente.');
      setIsLoading(false);
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
  const studentCount = schoolData?.student_count || parseInt(savedCount || '0', 10);
  
  // Retrieve billingCycle from localStorage
  const savedCycle = localStorage.getItem('checkout_billingCycle');
  const isYearly = savedCycle === 'YEARLY';
  
  // Dynamic pricing (per student)
  const discount = isYearly ? 0.8 : 1;
  const pricePerStudent = studentCount <= 200 ? 9 * discount : 7 * discount;
  const monthlyTotal = studentCount * pricePerStudent;
  
  const finalTotal = isYearly ? monthlyTotal * 12 : monthlyTotal;
  const planName = studentCount <= 200 ? 'Starter' : 'School';
  
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
              <span className="font-black text-3xl tracking-tighter text-white">
                Littera<span className="text-primary">.</span>
              </span>
            </div>

            <div className="space-y-6">
              <h1 className="text-3xl font-black leading-tight tracking-tight">
                Finalize seu acesso.
              </h1>
              <p className="text-base text-gray-400 font-medium leading-relaxed">
                Sua instituição <strong>{schoolData?.name || '...'}</strong> já está cadastrada.
                Para liberar correções I.A., relatórios e gestão de turmas, conclua o pagamento.
              </p>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mt-8 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">Seu Plano Atual</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isYearly ? 'ANUAL (-20%)' : 'MENSAL'}</p>
                </div>
                <div className="flex justify-between items-end mb-2">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black text-white">{studentCount}</span>
                    <span className="text-gray-400 font-bold mb-1">Alunos</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-white">R$ {formatBRL(finalTotal)}</span>
                    <span className="text-xs text-gray-400 block mt-1">/{isYearly ? 'ano' : 'mês'}</span>
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
             <span className="font-black text-xl tracking-tighter text-slate-900 dark:text-white">Littera.</span>
          </div>
          <button onClick={onLogout} className="text-gray-400">
            <span className="material-icons-outlined">logout</span>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
          <div className="w-full max-w-lg">

            {checkingStatus ? (
               <div className="bg-white dark:bg-surface-dark rounded-3xl p-10 shadow-premium border border-gray-100 dark:border-white/5 text-center animate-fade-in-up">
                 <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                 </div>
                 <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-3">Aguardando Confirmação</h2>
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
              <div className="bg-white dark:bg-surface-dark rounded-3xl p-8 shadow-premium border border-gray-100 dark:border-white/5 text-center animate-fade-in-up">
                <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="material-icons-outlined text-4xl">check_circle</span>
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                  Quase lá!
                </h2>

                {paymentResult.billingType === 'PIX' && (
                  <div className="mt-6">
                    <p className="text-gray-500 text-sm font-medium mb-6">
                      Escaneie o QR Code abaixo para liberar seu acesso imediatamente.
                    </p>
                    <div className="bg-white p-4 rounded-2xl inline-block shadow-md border border-gray-100">
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
                          className="text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 w-full max-w-[250px] outline-none text-gray-600 dark:text-gray-300 font-medium"
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
                
                <div className="mt-8 pt-8 border-t border-gray-100 dark:border-white/5">
                   <div className="flex items-center justify-center gap-3 text-sm text-gray-400 font-bold">
                     <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                     Aguardando confirmação do banco...
                   </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-surface-dark rounded-3xl p-8 sm:p-10 shadow-premium border border-gray-100 dark:border-white/5 animate-fade-in-up">
                <div className="mb-8 text-center sm:text-left">
                  <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                    Pagamento
                  </h2>
                  <p className="text-gray-500 font-medium mt-1">Ambiente 100% seguro.</p>
                </div>

                {globalError && (
                  <div className="mb-8 p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-2xl text-rose-600 dark:text-rose-400 text-sm font-bold text-center">
                    <span className="material-icons-outlined text-base mr-1 align-middle">error_outline</span>
                    {globalError}
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                    <div className="space-y-5 pt-2 animate-fade-in">
                      {renderField('Nome impresso no cartão', 'ccHolderName', 'text', 'Ex: JOAO S SILVA')}
                      {renderField('Número do cartão', 'ccNumber', 'text', '0000 0000 0000 0000', formatCardNumber)}
                      <div className="flex gap-4">
                        <div className="flex-[2]">
                          {renderField('Validade (MM/AA)', 'ccExpiry', 'text', 'MM/AA', formatExpiry)}
                        </div>
                        <div className="flex-1">
                          {renderField('CVV', 'ccCvv', 'text', '123')}
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">CEP</label>
                          <Controller
                            name="billingPostalCode"
                            control={control}
                            render={({ field }) => (
                              <input
                                {...field}
                                placeholder="00000-000"
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 outline-none font-bold text-sm"
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  field.onChange(val.length > 5 ? `${val.slice(0, 5)}-${val.slice(5, 8)}` : val);
                                }}
                              />
                            )}
                          />
                          {errors.billingPostalCode && <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1">{errors.billingPostalCode.message as string}</p>}
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Número</label>
                          <Controller
                            name="billingAddressNumber"
                            control={control}
                            render={({ field }) => (
                              <input
                                {...field}
                                placeholder="Ex: 123"
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 outline-none font-bold text-sm"
                              />
                            )}
                          />
                          {errors.billingAddressNumber && <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1">{errors.billingAddressNumber.message as string}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-xl shadow-xl shadow-primary/25 transition-all flex items-center justify-center gap-2 mt-8 active:scale-95 text-base uppercase tracking-widest"
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
                  
                  <div className="flex items-center justify-center gap-2 opacity-50 mt-4">
                    <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                      <span className="material-icons-outlined text-[14px]">shield</span>
                      Processado com segurança pelo Asaas
                    </span>
                  </div>
                </form>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
