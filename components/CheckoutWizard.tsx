import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// ── Helpers de validação ────────────────────────────────────────────────────────

function validateCNPJ(value: string): boolean {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleaned)) return false;

  const calcDigit = (digits: string, weights: number[]): number => {
    const sum = digits.split('').reduce((acc, d, i) => acc + parseInt(d) * weights[i], 0);
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calcDigit(cleaned.substring(0, 12), w1);
  const d2 = calcDigit(cleaned.substring(0, 12) + d1, w2);

  return cleaned.endsWith(`${d1}${d2}`);
}

function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
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

// ── Zod Schemas ─────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  directorName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  schoolName: z.string().min(2, "Nome da escola é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string()
    .min(8, "A senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
    .regex(/\d/, "A senha deve conter pelo menos um número")
    .regex(/[^a-zA-Z0-9]/, "A senha deve conter pelo menos um caractere especial"),
  confirmPassword: z.string().min(1, "A confirmação da senha é obrigatória"),
  cnpj: z.string().refine(validateCNPJ, "CNPJ inválido"),
});

const step2Schema = z.object({
  studentCount: z.string().refine(val => {
    const num = parseInt(val, 10);
    return !isNaN(num) && num > 0 && num <= 50000;
  }, "Quantidade deve estar entre 1 e 50.000"),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']),
});

const step3Schema = z.object({
  ccName: z.string().min(3, "Nome no cartão é obrigatório"),
  ccNumber: z.string().refine(v => v.replace(/\D/g, '').length === 16, "Número de cartão inválido (16 dígitos)"),
  ccExpiry: z.string().regex(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/, "Validade inválida (MM/AA)"),
  ccCvv: z.string().min(3, "CVV inválido").max(4, "CVV inválido"),
});

// We create a combined schema for the full form types with a refinement to compare passwords
const checkoutSchema = step1Schema.and(step2Schema).and(step3Schema).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  }
);
type CheckoutFormData = z.infer<typeof checkoutSchema>;

// ── Steps Info ──────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Dados Escolares', icon: 'school' },
  { id: 2, label: 'Plano', icon: 'payments' },
  { id: 3, label: 'Pagamento', icon: 'lock' },
] as const;

// ── Componente ──────────────────────────────────────────────────────────────────

const CheckoutWizard: React.FC<{ onBack: () => void; onLogin: () => void }> = ({ onBack, onLogin }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const { control, handleSubmit, trigger, watch, setValue, formState: { errors } } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onChange',
    defaultValues: {
      directorName: '',
      email: '',
      password: '',
      confirmPassword: '',
      schoolName: '',
      cnpj: '',
      studentCount: '',
      billingCycle: 'MONTHLY',
      ccName: '',
      ccNumber: '',
      ccExpiry: '',
      ccCvv: '',
    }
  });

  const formValues = watch();

  useEffect(() => {
    // Configurar ambiente do Asaas
    // @ts-ignore
    if (typeof asaas !== 'undefined') {
      // @ts-ignore
      asaas.setEnvironment('producao');
    }

    const params = new URLSearchParams(window.location.search);
    const studentsParam = params.get('students');
    const cycleParam = params.get('cycle');
    
    if (studentsParam) setValue('studentCount', studentsParam);
    if (cycleParam === 'YEARLY' || cycleParam === 'MONTHLY') setValue('billingCycle', cycleParam);
  }, [setValue]);

  const getDynamicPrice = () => {
    const students = parseInt(formValues.studentCount) || 0;
    const isYearly = formValues.billingCycle === 'YEARLY';
    const discount = isYearly ? 0.8 : 1;
    const pricePerStudent = students <= 200 ? 9 * discount : 7 * discount;
    const monthlyTotal = students * pricePerStudent;
    const finalTotal = isYearly ? monthlyTotal * 12 : monthlyTotal;
    
    return {
      finalTotal,
      planName: students <= 200 ? 'Starter' : 'School',
      isYearly
    };
  };

  const handleNextStep = async () => {
    setGlobalError(null);
    if (step === 1) {
      const isValid = await trigger(['directorName', 'schoolName', 'email', 'password', 'confirmPassword', 'cnpj']);
      if (isValid) setStep(2);
    } else if (step === 2) {
      const isValid = await trigger(['studentCount', 'billingCycle']);
      if (isValid) setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setGlobalError(null);
    } else {
      onBack();
    }
  };

  const onSubmit = useCallback(async (data: CheckoutFormData) => {
    setIsLoading(true);
    setGlobalError(null);

    try {
      // 1. Validar e formatar dados do cartão
      const cardNumber = data.ccNumber.replace(/\D/g, '');
      const [expiryMonth, expiryYearRaw] = data.ccExpiry.split('/');
      const expiryYear = expiryYearRaw.length === 2 ? `20${expiryYearRaw}` : expiryYearRaw;

      // @ts-ignore
      if (typeof asaas === 'undefined' || !asaas.creditCard) {
        throw new Error('Script de pagamento (Asaas) não carregado.');
      }

      // Payload exigido pelo Asaas para Tokenização client-side
      const tokenizationPayload = {
        creditCard: {
          holderName: data.ccName,
          number: cardNumber,
          expiryMonth,
          expiryYear,
          ccv: data.ccCvv
        },
        creditCardHolderInfo: {
          name: data.directorName,
          email: data.email,
          cpfCnpj: data.cnpj.replace(/\D/g, ''),
          postalCode: '01001000', // Preenchimento genérico para by-pass anti-fraude se não coletado
          addressNumber: '0',
          phone: '11999999999'
        }
      };

      // 2. Tokenizar no Asaas
      // @ts-ignore
      asaas.creditCard.tokenize(tokenizationPayload, {
        onSuccess: async (asaasData: any) => {
          const token = asaasData.creditCardToken;

          // 3. Chamar nossa Edge Function "process-subscription"
          const { data: fnData, error: fnError } = await supabase.functions.invoke('process-subscription', {
            body: {
              directorName: data.directorName.trim(),
              email: data.email.toLowerCase().trim(),
              password: data.password,
              schoolName: data.schoolName.trim(),
              cnpj: data.cnpj.replace(/\D/g, ''),
              studentCount: parseInt(data.studentCount),
              billingCycle: data.billingCycle,
              creditCardToken: token,
            },
          });

          if (fnError || fnData?.error) {
            setIsLoading(false);
            setGlobalError(fnError?.message || fnData?.error || 'Erro ao processar assinatura.');
            return;
          }

          // 4. Auto-login com o usuário recém criado
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: data.email.toLowerCase().trim(),
            password: data.password,
          });

          if (signInError) {
            setGlobalError('Conta criada, mas falha ao fazer login automático. Vá para a página de login.');
            setIsLoading(false);
            return;
          }

          // 5. Sucesso! Descartar campos (opcional, já que react vai unmount)
          setValue('ccNumber', '');
          setValue('ccCvv', '');

          // Redireciona
          navigate('/dashboard');
        },
        onError: (errors: any) => {
          setIsLoading(false);
          setGlobalError(errors?.[0]?.description || 'Erro ao validar o cartão de crédito.');
        }
      });
      
    } catch (err: any) {
      console.error('[CheckoutWizard] Error:', err);
      setGlobalError(err.message || 'Falha ao processar checkout. Verifique os dados.');
      setIsLoading(false);
    }
  }, [navigate, setValue]);

  const renderField = (
    label: string,
    name: keyof CheckoutFormData,
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
            {errorMsg}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen lg:h-screen w-full flex flex-col lg:flex-row bg-background-light dark:bg-background-dark font-sans overflow-hidden relative animate-slide-up-full z-[100]">
      
      {/* ── Botão Fechar (X) ────────────────────────────────────────────── */}
      <button 
        onClick={onBack}
        className="absolute top-4 right-4 lg:top-8 lg:right-8 z-50 w-12 h-12 bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-white/10 text-gray-500 dark:text-gray-300 rounded-full flex items-center justify-center transition-all hover:scale-105 shadow-sm backdrop-blur-md border border-gray-200 dark:border-white/10"
        title="Voltar"
      >
        <span className="material-icons-outlined">close</span>
      </button>

      {/* ── Lado Esquerdo — Branding ──────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[35%] xl:w-[30%] relative bg-primary overflow-hidden">
        <div className="min-h-full w-full flex items-center justify-center p-6 lg:p-8 xl:p-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          <div className="relative z-10 text-white w-full max-w-sm text-left py-8">
            <div className="flex items-center gap-3 mb-10 animate-fade-in">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-2xl shrink-0">
                <div className="flex flex-col items-center translate-y-[1px]">
                  <span className="text-primary font-black text-2xl leading-none tracking-tighter">L</span>
                  <div className="w-5 h-[4px] bg-primary mt-[1px] rounded-full" />
                </div>
              </div>
              <span className="font-black text-3xl lg:text-4xl tracking-tighter text-white">
                Littera<span className="text-white/40">.</span>
              </span>
            </div>

            <div className="space-y-5 animate-fade-in-up">
              <h1 className="text-2xl lg:text-3xl font-black leading-[1.1] tracking-tight">
                Cadastre sua escola em minutos
              </h1>
              <p className="text-sm lg:text-base opacity-80 leading-relaxed font-medium">
                Correção de redações por I.A., gestão de turmas e relatórios completos. Tudo pronto para uso imediato.
              </p>

              <div className="space-y-3 mt-6">
                {[
                  { icon: 'bolt', text: 'Correção instantânea com Google Gemini' },
                  { icon: 'shield', text: 'Dados seguros — LGPD compliant' },
                  { icon: 'trending_up', text: 'Relatórios de evolução por turma' },
                ].map(({ icon, text }) => (
                  <div key={icon} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center backdrop-blur-sm shrink-0">
                      <span className="material-icons-outlined text-white text-base">{icon}</span>
                    </div>
                    <span className="font-semibold text-white/90 text-xs lg:text-sm leading-tight">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lado Direito — Formulário ─────────────────────────────────────── */}
      <div className="w-full lg:w-[65%] xl:w-[70%] h-full bg-white dark:bg-slate-900 overflow-y-auto custom-scrollbar">
        <div className="min-h-full flex items-center justify-center p-4 sm:p-8 lg:p-12">
          <div className="w-full max-w-lg animate-fade-in-up py-6">
            <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 sm:p-8 shadow-premium border border-gray-100 dark:border-white/5 relative overflow-hidden">

              {/* Step indicator */}
              <div className="flex items-center justify-between mb-6">
                {STEPS.map((s, i) => (
                  <React.Fragment key={s.id}>
                    <div className="flex flex-col items-center gap-1.5 z-10">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                          step >= s.id
                            ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105'
                            : 'bg-gray-100 dark:bg-white/5 text-gray-300'
                        }`}
                      >
                        <span className="material-icons-outlined text-lg">
                          {step > s.id ? 'check' : s.icon}
                        </span>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${
                        step >= s.id ? 'text-primary' : 'text-gray-300'
                      }`}>
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-[-10px] rounded-full transition-colors duration-500 z-0 ${
                        step > s.id ? 'bg-primary' : 'bg-gray-100 dark:bg-white/10'
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {globalError && (
                <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-2xl text-rose-600 dark:text-rose-400 text-xs font-bold text-center animate-shake">
                  <span className="material-icons-outlined text-sm mr-1 align-middle">error_outline</span>
                  {globalError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)}>
                {/* ── Step 1: Dados da Escola ───────────────────────────────────── */}
                {step === 1 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="mb-4">
                      <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                        Sobre sua Instituição
                      </h2>
                    </div>

                    {renderField('Nome do Responsável', 'directorName', 'text', 'Nome Completo')}
                    {renderField('E-mail Institucional', 'email', 'email', 'diretoria@escola.com.br')}
                    {renderField('Senha de Acesso', 'password', 'password', 'Mín. 8 caracteres, com maiúsculas, minúsculas, números e símbolos')}
                    {renderField('Repita a Senha', 'confirmPassword', 'password', 'Confirme a senha digitada')}
                    {renderField('Nome da Escola', 'schoolName', 'text', 'Colégio Estadual...')}
                    {renderField('CNPJ', 'cnpj', 'text', '00.000.000/0000-00', formatCNPJ)}
                  </div>
                )}

                {/* ── Step 2: Plano ───────────────────────────────────── */}
                {step === 2 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="mb-4">
                      <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                        Personalize seu Plano
                      </h2>
                    </div>

                    {renderField('Quantidade de Alunos', 'studentCount', 'number', 'Ex: 350')}

                    <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl my-6">
                      <button 
                        type="button"
                        onClick={() => setValue('billingCycle', 'MONTHLY')}
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${formValues.billingCycle === 'MONTHLY' ? 'bg-white dark:bg-surface-dark shadow text-primary' : 'text-gray-500'}`}
                      >
                        Mensal
                      </button>
                      <button 
                        type="button"
                        onClick={() => setValue('billingCycle', 'YEARLY')}
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${formValues.billingCycle === 'YEARLY' ? 'bg-white dark:bg-surface-dark shadow text-primary' : 'text-gray-500'}`}
                      >
                        Anual <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full ml-1">-20%</span>
                      </button>
                    </div>

                    {(() => {
                      const priceInfo = getDynamicPrice();
                      const formatBRL = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      return (
                        <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl p-5 flex items-center justify-between mb-4">
                          <div>
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Plano {priceInfo.planName}</p>
                            <p className="text-sm text-gray-500 font-medium mt-0.5">Cobrança {priceInfo.isYearly ? 'anual (à vista)' : 'mensal'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-black text-gray-900 dark:text-white">R$ {formatBRL(priceInfo.finalTotal)}</p>
                            <p className="text-xs text-gray-400">/{priceInfo.isYearly ? 'ano' : 'mês'}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ── Step 3: Pagamento (Cartão) ───────────────────────────────────── */}
                {step === 3 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="mb-4">
                      <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                        Pagamento Seguro
                      </h2>
                      <p className="text-gray-400 text-[11px] sm:text-xs font-bold mt-1">
                        Seus dados são criptografados. R$ {getDynamicPrice().finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} {formValues.billingCycle === 'YEARLY' ? '/ano' : '/mês'}.
                      </p>
                    </div>

                    {renderField('Número do Cartão', 'ccNumber', 'text', '0000 0000 0000 0000', formatCardNumber)}
                    {renderField('Nome impresso no Cartão', 'ccName', 'text', 'Ex: JOAO M SILVA')}
                    
                    <div className="flex gap-4">
                      <div className="flex-1">
                        {renderField('Validade', 'ccExpiry', 'text', 'MM/AA', formatExpiry)}
                      </div>
                      <div className="w-1/3">
                        {renderField('CVV', 'ccCvv', 'password', '123')}
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-center gap-2 opacity-50">
                      <span className="material-icons-outlined text-sm">lock</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Transação Segura &middot; PCI Compliant</span>
                    </div>
                  </div>
                )}

                {/* ── Actions ──────────────────────────────────────────────────── */}
                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-6 py-4 rounded-2xl font-black text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                  >
                    {step === 1 ? 'Voltar' : 'Anterior'}
                  </button>

                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="flex-1 py-4 rounded-2xl font-black text-sm text-white bg-primary hover:bg-primary-dark shadow-xl shadow-primary/25 transition-all active:scale-[0.97]"
                    >
                      Próximo
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-4 rounded-2xl font-black text-sm text-white bg-primary hover:bg-primary-dark shadow-xl shadow-primary/25 transition-all flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Finalizando...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-icons-outlined text-lg">check_circle</span>
                          <span className="uppercase tracking-widest">Finalizar Assinatura</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>

              {/* Login link */}
              <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-6">
                Já possui cadastro?{' '}
                <button onClick={onLogin} className="text-gray-900 dark:text-white hover:text-primary transition-colors underline decoration-primary/20 underline-offset-4">
                  Fazer Login
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
        
        @keyframes slideUpFull {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up-full {
          animation: slideUpFull 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        /* Custom scrollbar to prevent layout shift */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.3);
          border-radius: 20px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
};

export default CheckoutWizard;
