import React, { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';

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

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Tipos ───────────────────────────────────────────────────────────────────────

interface FormData {
  directorName: string;
  email: string;
  password: string;
  confirmPassword: string;
  schoolName: string;
  cnpj: string;
  studentCount: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
}

interface FieldError {
  directorName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  schoolName?: string;
  cnpj?: string;
  studentCount?: string;
}

interface OnboardingViewProps {
  onBack: () => void;
  onLogin: () => void;
}

// ── Steps ───────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Dados Escolares', icon: 'school' },
  { id: 2, label: 'Plano', icon: 'payments' },
] as const;

// ── Componente ──────────────────────────────────────────────────────────────────

const OnboardingView: React.FC<OnboardingViewProps> = ({ onBack, onLogin }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});

  const [form, setForm] = useState<FormData>({
    directorName: '',
    email: '',
    password: '',
    confirmPassword: '',
    schoolName: '',
    cnpj: '',
    studentCount: '',
    billingCycle: 'MONTHLY',
  });

  // Extract initial values from URL if present
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const studentsParam = params.get('students');
    const cycleParam = params.get('cycle');
    
    setForm(prev => ({
      ...prev,
      studentCount: studentsParam || prev.studentCount,
      billingCycle: (cycleParam === 'YEARLY' ? 'YEARLY' : 'MONTHLY')
    }));
  }, []);

  // Helper para cálculo dinâmico de preço
  const getDynamicPrice = () => {
    const students = parseInt(form.studentCount) || 0;
    const isYearly = form.billingCycle === 'YEARLY';
    const discount = isYearly ? 0.8 : 1;
    const pricePerStudent = students <= 200 ? 9 * discount : 7 * discount;
    const monthlyTotal = students * pricePerStudent;
    const finalTotal = isYearly ? monthlyTotal * 12 : monthlyTotal;
    
    return {
      monthlyEquivalent: monthlyTotal,
      finalTotal,
      planName: students <= 200 ? 'Starter' : 'School',
      isYearly
    };
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const updateField = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    setError(null);
  };

  const validateStep1 = (): boolean => {
    const errors: FieldError = {};

    if (!form.directorName.trim() || form.directorName.trim().length < 3) {
      errors.directorName = 'Nome deve ter pelo menos 3 caracteres.';
    }
    if (!form.schoolName.trim() || form.schoolName.trim().length < 2) {
      errors.schoolName = 'Nome da escola é obrigatório.';
    }
    if (!validateEmail(form.email)) {
      errors.email = 'Formato de e-mail inválido.';
    }
    if (!validateCNPJ(form.cnpj)) {
      errors.cnpj = 'CNPJ inválido.';
    }
    const count = parseInt(form.studentCount);
    if (!count || count < 1 || count > 50000) {
      errors.studentCount = 'Quantidade inválida (1–50.000).';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    return true;
  };

  const handleSubmit = useCallback(async () => {
    if (!validateStep1() || !validateStep2()) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-checkout', {
        body: {
          directorName: form.directorName.trim(),
          email: form.email.toLowerCase().trim(),
          schoolName: form.schoolName.trim(),
          cnpj: form.cnpj.replace(/\D/g, ''),
          studentCount: parseInt(form.studentCount),
          billingCycle: form.billingCycle,
        },
      });

      if (fnError || data?.error) throw new Error(fnError?.message || data?.error || 'Erro ao gerar pagamento.');

      // Save form data to recover in the final step
      localStorage.setItem('littera_onboarding_form', JSON.stringify(form));
      if (data.asaasCustomerId) {
        localStorage.setItem('littera_asaas_customer', data.asaasCustomerId);
      }
      if (data.subscriptionId) {
        localStorage.setItem('littera_asaas_subscription', data.subscriptionId);
      }

      window.location.href = data.checkoutUrl;

    } catch (err: any) {
      console.error('[OnboardingView] Error:', err);
      setError(err.message || 'Falha ao processar checkout. Verifique os dados.');
      setIsLoading(false);
    }
  }, [form]);

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
      setFieldErrors({});
    } else {
      onBack();
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderInput = (
    label: string,
    field: keyof FormData,
    type: string = 'text',
    placeholder: string = '',
    extra?: React.ReactNode
  ) => (
    <div className="space-y-1.5 group">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-primary">
        {label}
      </label>
      <input
        type={type}
        value={form[field]}
        onChange={(e) => updateField(field, field === 'cnpj' ? formatCNPJ(e.target.value) : e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border font-bold text-sm transition-all outline-none ${
          fieldErrors[field]
            ? 'border-rose-300 focus:border-rose-400 bg-rose-50/50 dark:bg-rose-900/10'
            : 'border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10'
        }`}
      />
      {fieldErrors[field] && (
        <p className="text-rose-500 text-[11px] font-bold ml-1 flex items-center gap-1">
          <span className="material-icons-outlined text-xs">error_outline</span>
          {fieldErrors[field]}
        </p>
      )}
      {extra}
    </div>
  );

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
            {/* Logo */}
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

              {/* Features */}
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
                  <div className="flex flex-col items-center gap-1.5">
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
                    <div className={`flex-1 h-0.5 mx-3 rounded-full transition-colors duration-500 ${
                      step > s.id ? 'bg-primary' : 'bg-gray-100 dark:bg-white/10'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Error global */}
            {error && (
              <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-2xl text-rose-600 dark:text-rose-400 text-xs font-bold text-center animate-shake">
                <span className="material-icons-outlined text-sm mr-1 align-middle">error_outline</span>
                {error}
              </div>
            )}

            {/* ── Step 1: Dados da Escola ───────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="mb-4">
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                    Sobre sua Instituição
                  </h2>
                  <p className="text-gray-400 text-[11px] sm:text-xs font-bold mt-1">
                    Vamos começar conhecendo sua escola.
                  </p>
                </div>

                {renderInput('Nome do Responsável', 'directorName', 'text', 'Nome Completo')}
                {renderInput('Nome da Escola', 'schoolName', 'text', 'Colégio Estadual...')}
                {renderInput('CNPJ', 'cnpj', 'text', '00.000.000/0000-00')}
                {renderInput('E-mail Institucional', 'email', 'email', 'diretoria@colegio.com.br')}
                {renderInput('Quantidade de Alunos', 'studentCount', 'number', 'Ex: 350')}
              </div>
            )}

            {/* ── Step 2: Pagamento e Cálculo ───────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div className="mb-4">
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                    Escolha seu Plano
                  </h2>
                  <p className="text-gray-400 text-[11px] sm:text-xs font-bold mt-1">
                    Preço calculado com base em {form.studentCount || 0} alunos.
                  </p>
                </div>

                <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl mb-6">
                  <button 
                    onClick={() => updateField('billingCycle', 'MONTHLY')}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${form.billingCycle === 'MONTHLY' ? 'bg-white dark:bg-surface-dark shadow text-primary' : 'text-gray-500'}`}
                  >
                    Mensal
                  </button>
                  <button 
                    onClick={() => updateField('billingCycle', 'YEARLY')}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${form.billingCycle === 'YEARLY' ? 'bg-white dark:bg-surface-dark shadow text-primary' : 'text-gray-500'}`}
                  >
                    Anual <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full ml-1">-20%</span>
                  </button>
                </div>

                {/* Price */}
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

            {/* ── Actions ──────────────────────────────────────────────────── */}
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="px-6 py-4 rounded-2xl font-black text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
              >
                {step === 1 ? 'Voltar' : 'Anterior'}
              </button>

              <button
                type="button"
                onClick={step === 2 ? handleSubmit : () => { if (validateStep1()) setStep(2); }}
                disabled={isLoading}
                className="flex-1 py-4 rounded-2xl font-black text-sm text-white bg-primary hover:bg-primary-dark shadow-xl shadow-primary/25 transition-all flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Criando sua conta...</span>
                  </>
                ) : step === 2 ? (
                  <>
                    <span className="material-icons-outlined text-lg">payment</span>
                    <span className="uppercase tracking-widest">Ir para Pagamento Seguro</span>
                  </>
                ) : (
                  <span className="uppercase tracking-widest">Próximo</span>
                )}
              </button>
            </div>

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

export default OnboardingView;
