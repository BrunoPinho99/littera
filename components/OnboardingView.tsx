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
}

// ── Steps ───────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Seus Dados', icon: 'person' },
  { id: 2, label: 'Sua Escola', icon: 'school' },
  { id: 3, label: 'Confirmar', icon: 'check_circle' },
] as const;

// ── Componente ──────────────────────────────────────────────────────────────────

const OnboardingView: React.FC<OnboardingViewProps> = ({ onBack }) => {
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
    if (!validateEmail(form.email)) {
      errors.email = 'Formato de e-mail inválido.';
    }
    if (form.password.length < 6) {
      errors.password = 'Mínimo de 6 caracteres.';
    }
    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'As senhas não coincidem.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errors: FieldError = {};

    if (!form.schoolName.trim() || form.schoolName.trim().length < 2) {
      errors.schoolName = 'Nome da escola é obrigatório.';
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

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
      setFieldErrors({});
    } else {
      onBack();
    }
  };

  // ── Submit final ────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('onboarding', {
        body: {
          directorName: form.directorName.trim(),
          email: form.email.toLowerCase().trim(),
          password: form.password,
          schoolName: form.schoolName.trim(),
          cnpj: form.cnpj.replace(/\D/g, ''),
          studentCount: parseInt(form.studentCount),
          billingCycle: form.billingCycle
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Erro ao processar cadastro.');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.checkoutUrl) {
        // Conta criada mas sem checkout — loga e manda para o app
        if (data?.partialSuccess) {
          // Fazer login automático
          await supabase.auth.signInWithPassword({
            email: form.email.toLowerCase().trim(),
            password: form.password,
          });
          window.location.href = '/app/inst-overview';
          return;
        }
        throw new Error('Erro inesperado ao gerar link de pagamento.');
      }

      // Salvar URL de checkout para recuperação futura
      localStorage.setItem('littera_checkout_url', data.checkoutUrl);

      // Login automático antes do redirecionamento
      await supabase.auth.signInWithPassword({
        email: form.email.toLowerCase().trim(),
        password: form.password,
      });

      // Redireciona para o checkout externo do Asaas
      window.location.href = data.checkoutUrl;

    } catch (err: any) {
      console.error('[OnboardingView] Error:', err);
      setError(err.message || 'Erro inesperado. Tente novamente.');
      setIsLoading(false);
    }
  }, [form]);

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
        className={`w-full px-5 py-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border font-bold text-sm transition-all outline-none ${
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

  // ── Render steps ──────────────────────────────────────────────────────────

  return (
    <div className="h-screen w-full flex bg-background-light dark:bg-background-dark overflow-hidden font-sans">

      {/* ── Lado Esquerdo — Branding ──────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-primary items-center justify-center p-16 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 text-white max-w-xl text-left">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-16 animate-fade-in">
            <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center shadow-2xl">
              <div className="flex flex-col items-center translate-y-[2px]">
                <span className="text-primary font-black text-4xl leading-none tracking-tighter">L</span>
                <div className="w-7 h-[6px] bg-primary mt-[1px] rounded-full" />
              </div>
            </div>
            <span className="font-black text-6xl tracking-tighter text-white">
              Littera<span className="text-white/40">.</span>
            </span>
          </div>

          <div className="space-y-8 animate-fade-in-up">
            <h1 className="text-5xl font-black leading-[1.1] tracking-tight">
              Cadastre sua escola em minutos
            </h1>
            <p className="text-xl opacity-80 leading-relaxed font-medium max-w-md">
              Correção de redações por I.A., gestão de turmas e relatórios completos. Tudo pronto para uso imediato.
            </p>

            {/* Features */}
            <div className="space-y-4 mt-10">
              {[
                { icon: 'bolt', text: 'Correção instantânea com Google Gemini' },
                { icon: 'shield', text: 'Dados seguros — LGPD compliant' },
                { icon: 'trending_up', text: 'Relatórios de evolução por turma' },
              ].map(({ icon, text }) => (
                <div key={icon} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <span className="material-icons-outlined text-white text-lg">{icon}</span>
                  </div>
                  <span className="font-semibold text-white/90">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Lado Direito — Formulário ─────────────────────────────────────── */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-4 sm:p-6 bg-grid overflow-y-auto">
        <div className="w-full max-w-lg animate-fade-in-up py-8">
          <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-6 sm:p-10 shadow-premium border border-gray-100 dark:border-white/5 relative overflow-hidden">

            {/* Step indicator */}
            <div className="flex items-center justify-between mb-8">
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

            {/* ── Step 1: Dados do Diretor ──────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-5 animate-fade-in">
                <div className="mb-2">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                    Dados do Diretor
                  </h2>
                  <p className="text-gray-400 text-xs font-bold mt-1">
                    Estas credenciais serão usadas para acessar o painel administrativo.
                  </p>
                </div>

                {renderInput('Nome Completo', 'directorName', 'text', 'Maria Helena Silva')}
                {renderInput('E-mail Institucional', 'email', 'email', 'diretoria@colegio.com.br')}
                {renderInput('Senha de Acesso', 'password', 'password', '••••••••',
                  <p className="text-gray-300 text-[10px] font-bold ml-1">Mínimo 6 caracteres</p>
                )}
                {renderInput('Confirmar Senha', 'confirmPassword', 'password', '••••••••')}
              </div>
            )}

            {/* ── Step 2: Dados da Escola ───────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-5 animate-fade-in">
                <div className="mb-2">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                    Dados da Escola
                  </h2>
                  <p className="text-gray-400 text-xs font-bold mt-1">
                    Informações da instituição para registro e emissão de nota fiscal.
                  </p>
                </div>

                {renderInput('Nome da Escola', 'schoolName', 'text', 'Colégio Estadual Dom Pedro II')}
                {renderInput('CNPJ', 'cnpj', 'text', '00.000.000/0000-00')}
                {renderInput('Quantidade de Alunos', 'studentCount', 'number', 'Ex: 350')}
              </div>
            )}

            {/* ── Step 3: Confirmação ───────────────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div className="mb-2">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                    Confirme os Dados
                  </h2>
                  <p className="text-gray-400 text-xs font-bold mt-1">
                    Revise as informações antes de prosseguir para o pagamento.
                  </p>
                </div>

                {/* Summary card */}
                <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <span className="material-icons-outlined text-primary text-xl">person</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Diretor(a)</p>
                      <p className="font-bold text-gray-900 dark:text-white">{form.directorName}</p>
                      <p className="text-sm text-gray-400">{form.email}</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-white/10" />

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <span className="material-icons-outlined text-emerald-500 text-xl">school</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Escola</p>
                      <p className="font-bold text-gray-900 dark:text-white">{form.schoolName}</p>
                      <p className="text-sm text-gray-400">CNPJ: {form.cnpj}</p>
                      <p className="text-sm text-gray-400">{form.studentCount} alunos</p>
                    </div>
                  </div>
                </div>

                {/* Price */}
                {(() => {
                  const priceInfo = getDynamicPrice();
                  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  return (
                    <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl p-5 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Plano {priceInfo.planName}</p>
                        <p className="text-sm text-gray-500 font-medium mt-0.5">Cobrança {priceInfo.isYearly ? 'anual (à vista)' : 'mensal'} via Asaas</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-gray-900 dark:text-white">R$ {formatBRL(priceInfo.finalTotal)}</p>
                        <p className="text-xs text-gray-400">/{priceInfo.isYearly ? 'ano' : 'mês'}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Security badges */}
                <div className="flex items-center justify-center gap-4 text-gray-300">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest">
                    <span className="material-icons-outlined text-emerald-400 text-sm">lock</span>
                    Dados criptografados
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest">
                    <span className="material-icons-outlined text-emerald-400 text-sm">verified</span>
                    PCI-DSS Asaas
                  </div>
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

              <button
                type="button"
                onClick={step === 3 ? handleSubmit : handleNext}
                disabled={isLoading}
                className="flex-1 py-4 rounded-2xl font-black text-sm text-white bg-primary hover:bg-primary-dark shadow-xl shadow-primary/25 transition-all flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Criando sua conta...</span>
                  </>
                ) : step === 3 ? (
                  <>
                    <span className="material-icons-outlined text-lg">payment</span>
                    <span className="uppercase tracking-widest">Ir para Pagamento</span>
                  </>
                ) : (
                  <span className="uppercase tracking-widest">Próximo</span>
                )}
              </button>
            </div>

            {/* Login link */}
            <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-6">
              Já possui cadastro?{' '}
              <button onClick={onBack} className="text-gray-900 dark:text-white hover:text-primary transition-colors underline decoration-primary/20 underline-offset-4">
                Fazer Login
              </button>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .bg-grid {
          background-image: radial-gradient(circle, #e5e7eb 1px, transparent 1px);
          background-size: 30px 30px;
        }
        .dark .bg-grid {
          background-image: radial-gradient(circle, #1f2937 1px, transparent 1px);
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default OnboardingView;
