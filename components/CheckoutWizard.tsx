import React, { useState, useCallback, useEffect, useMemo } from 'react';
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

function validateCPF(value: string): boolean {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  let sum = 0;
  for (let i = 1; i <= 9; i++) sum = sum + parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) sum = sum + parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false;

  return true;
}

function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatWhatsApp(value: string): string {
  const val = value.replace(/\D/g, '').slice(0, 11);
  if (val.length <= 2) return val;
  if (val.length <= 6) return `(${val.slice(0, 2)}) ${val.slice(2)}`;
  if (val.length <= 10) return `(${val.slice(0, 2)}) ${val.slice(2, 6)}-${val.slice(6)}`;
  return `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7, 11)}`;
}

function formatCEP(value: string): string {
  const val = value.replace(/\D/g, '').slice(0, 8);
  return val.length > 5 ? `${val.slice(0, 5)}-${val.slice(5, 8)}` : val;
}

function formatCardNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

function validateLuhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13) return false;
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (isEven) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

function formatBRL(val: number): string {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Zod Schema ──────────────────────────────────────────────────────────────────

const checkoutSchema = z.object({
  // Section 1 — Dados Pessoais + Conta
  directorName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  cpf: z.string().refine(validateCPF, "CPF inválido"),
  whatsapp: z.string().min(10, "WhatsApp inválido"),
  email: z.string().email("E-mail inválido"),
  password: z.string()
    .min(8, "A senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "Deve conter letra maiúscula")
    .regex(/[a-z]/, "Deve conter letra minúscula")
    .regex(/\d/, "Deve conter um número")
    .regex(/[^a-zA-Z0-9]/, "Deve conter caractere especial"),
  confirmPassword: z.string().min(1, "Confirmação obrigatória"),
  // Section 1 — Escola
  schoolName: z.string().min(2, "Nome da escola é obrigatório"),
  cnpj: z.string().refine(validateCNPJ, "CNPJ inválido"),
  // Section 2 — Endereço
  postalCode: z.string().min(8, "CEP inválido"),
  endereco: z.string().optional(),
  addressNumber: z.string().min(1, "Número obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  // Plano
  studentCount: z.string().refine(val => {
    const num = parseInt(val, 10);
    return !isNaN(num) && num > 0 && num <= 50000;
  }, "Quantidade deve estar entre 1 e 50.000"),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']),
  // Section 3 — Cartão
  ccHolderName: z.string().min(3, "Nome no cartão obrigatório"),
  ccNumber: z.string().refine(v => validateLuhn(v), "Número de cartão inválido"),
  ccExpiry: z.string().min(5, "Validade inválida (MM/AA)"),
  ccCvv: z.string().min(3, "CVV inválido"),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: "As senhas não coincidem", path: ["confirmPassword"] }
);

type CheckoutFormData = z.infer<typeof checkoutSchema>;

// ── Componente ──────────────────────────────────────────────────────────────────

const CheckoutWizard: React.FC<{ onBack: () => void; onLogin: () => void }> = ({ onBack, onLogin }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState(false);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<any>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onChange',
    defaultValues: {
      directorName: '', cpf: '', whatsapp: '', email: '',
      password: '', confirmPassword: '',
      schoolName: '', cnpj: '',
      postalCode: '', endereco: '', addressNumber: '', complemento: '', bairro: '', cidade: '', estado: '',
      studentCount: '', billingCycle: 'MONTHLY',
      ccHolderName: '', ccNumber: '', ccExpiry: '', ccCvv: '',
    }
  });

  const formValues = watch();

  // URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('students');
    const c = params.get('cycle');
    if (s) setValue('studentCount', s);
    if (c === 'YEARLY' || c === 'MONTHLY') setValue('billingCycle', c);
  }, [setValue]);

  // ViaCEP Auto-complete
  useEffect(() => {
    const cep = formValues.postalCode?.replace(/\D/g, '');
    if (cep?.length === 8) {
      setCepLoading(true);
      fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then(res => res.json())
        .then(data => {
          if (!data.erro) {
            setValue('endereco', data.logradouro || '');
            setValue('bairro', data.bairro || '');
            setValue('cidade', data.localidade || '');
            setValue('estado', data.uf || '');
          }
        })
        .catch(err => console.warn('Erro ViaCEP', err))
        .finally(() => setCepLoading(false));
    }
  }, [formValues.postalCode, setValue]);

  // Dynamic pricing
  const priceInfo = useMemo(() => {
    const students = parseInt(formValues.studentCount) || 0;
    const isYearly = formValues.billingCycle === 'YEARLY';
    const discount = isYearly ? 0.6 : 1;

    let basePrice = 0;
    if (students <= 200) basePrice = 8.90;
    else if (students <= 500) basePrice = 7.90;
    else if (students <= 1000) basePrice = 6.90;
    else basePrice = 5.90;

    const pricePerStudent = basePrice * discount;
    const monthlyTotal = students * pricePerStudent;
    const finalTotal = isYearly ? monthlyTotal * 12 : monthlyTotal;
    const originalTotal = isYearly ? students * basePrice / discount * 12 : 0;

    return {
      students,
      basePrice,
      pricePerStudent,
      monthlyTotal,
      finalTotal,
      originalTotal,
      isYearly,
      tierLabel: students <= 200 ? '1-200' : students <= 500 ? '201-500' : students <= 1000 ? '501-1000' : '1000+',
    };
  }, [formValues.studentCount, formValues.billingCycle]);

  // Password strength
  const passwordStrength = useMemo(() => {
    const p = formValues.password || '';
    if (!p) return { score: 0, label: '', color: '' };
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[a-z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^a-zA-Z0-9]/.test(p)) s++;
    const labels = ['', 'Fraca', 'Razoável', 'Boa', 'Forte', 'Excelente'];
    const colors = ['', 'bg-rose-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-400', 'bg-emerald-500'];
    return { score: s, label: labels[s], color: colors[s] };
  }, [formValues.password]);

  const onSubmit = useCallback(async (data: CheckoutFormData) => {
    setIsLoading(true);
    setGlobalError(null);

    try {
      // 1. Criar conta + assinatura
      const { data: fnData, error: fnError } = await supabase.functions.invoke('process-subscription', {
        body: {
          directorName: data.directorName.trim(),
          email: data.email.toLowerCase().trim(),
          whatsapp: data.whatsapp.replace(/\D/g, ''),
          cpf: data.cpf.replace(/\D/g, ''),
          password: data.password,
          schoolName: data.schoolName.trim(),
          cnpj: data.cnpj.replace(/\D/g, ''),
          postalCode: data.postalCode.replace(/\D/g, ''),
          addressNumber: data.addressNumber.trim(),
          studentCount: parseInt(data.studentCount),
          billingCycle: data.billingCycle,
          paymentMethod: 'CREDIT_CARD',
        },
      });

      if (fnError || fnData?.error) {
        setIsLoading(false);
        setGlobalError(fnError?.message || fnData?.error || 'Erro ao processar assinatura.');
        return;
      }

      // 2. Auto-login
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email.toLowerCase().trim(),
        password: data.password,
      });

      if (signInError) {
        setGlobalError('Conta criada, mas falha ao fazer login automático. Vá para a página de login.');
        setIsLoading(false);
        return;
      }

      // 3. Processar pagamento com cartão imediatamente
      const { data: payData, error: payError } = await supabase.functions.invoke('pay-subscription', {
        body: {
          paymentMethod: 'CREDIT_CARD',
          ccHolderName: data.ccHolderName,
          ccCpfCnpj: data.cpf.replace(/\D/g, ''),
          ccNumber: data.ccNumber.replace(/\s/g, ''),
          ccExpiry: data.ccExpiry,
          ccCvv: data.ccCvv,
        },
        headers: {
          Authorization: `Bearer ${signInData.session?.access_token}`,
        },
      });

      if (payError || payData?.error) {
        // Conta criada mas pagamento falhou — redireciona pro dashboard onde pode tentar de novo
        console.warn('[CheckoutWizard] Pagamento falhou, redirecionando:', payError?.message || payData?.error);
        localStorage.setItem('checkout_billingCycle', data.billingCycle);
        window.location.href = '/app/inst-overview';
        return;
      }

      // 4. Pagamento processado! Redirecionar direto pro dashboard
      localStorage.setItem('checkout_billingCycle', data.billingCycle);
      if (fnData?.schoolId) localStorage.setItem('checkout_schoolId', fnData.schoolId);
      
      // Se aprovado imediatamente
      if (payData?.status === 'PAID') {
        await supabase.auth.refreshSession();
        window.location.href = '/app/inst-overview';
      } else {
        // Cartão em análise antifraude — redireciona e o polling cuida
        window.location.href = '/app/inst-overview';
      }

    } catch (err: any) {
      console.error('[CheckoutWizard] Error:', err);
      setGlobalError(err.message || 'Falha ao processar o pagamento. Tente novamente.');
      setIsLoading(false);
    }
  }, [navigate]);

  // ── renderField ──
  const renderField = (
    label: string,
    name: string,
    type: string = 'text',
    placeholder: string = '',
    formatter?: (val: string) => string,
    extraContent?: React.ReactNode,
    disabled?: boolean,
  ) => {
    const errorMsg = (errors as any)[name]?.message;
    return (
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-slate-400 tracking-wide block">
          {label}
        </label>
        <Controller
          name={name as any}
          control={control}
          render={({ field }) => (
            <input
              {...field}
              type={type}
              placeholder={placeholder}
              disabled={disabled}
              onChange={(e) => {
                const val = formatter ? formatter(e.target.value) : e.target.value;
                field.onChange(val);
              }}
              className={`w-full px-4 py-3 rounded-xl bg-slate-800/60 border text-sm text-white placeholder:text-slate-500 font-medium transition-all outline-none focus:ring-2 focus:ring-primary/40 ${
                disabled ? 'opacity-60 cursor-not-allowed' : ''
              } ${
                errorMsg
                  ? 'border-rose-500/50 bg-rose-950/20'
                  : 'border-slate-700/50 hover:border-slate-600 focus:border-primary/60'
              }`}
            />
          )}
        />
        {errorMsg && (
          <p className="text-rose-400 text-[11px] font-medium flex items-center gap-1">
            <span className="material-icons-outlined text-xs">error_outline</span>
            {errorMsg as string}
          </p>
        )}
        {extraContent}
      </div>
    );
  };

  // ── Section Header ──
  const SectionHeader = ({ number, title }: { number: number; title: string }) => (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-lg shadow-primary/30">
        {number}
      </div>
      <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-slate-950 font-sans overflow-x-hidden relative">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/50 backdrop-blur-md bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="text-white font-black text-lg leading-none">L</span>
            </div>
            <span className="font-black text-xl tracking-tight text-white">
              Littera<span className="text-primary">.</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <span className="material-icons-outlined text-emerald-400 text-sm">lock</span>
              Ambiente 100% Seguro
            </span>
            <button
              onClick={onBack}
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium"
            >
              <span className="material-icons-outlined text-lg">close</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col lg:flex-row gap-8 items-start">

            {/* ── Left: Form Sections ──────────────────────────────────── */}
            <div className="flex-1 w-full lg:max-w-2xl space-y-6">

              {globalError && (
                <div className="p-4 bg-rose-950/40 border border-rose-500/30 rounded-2xl text-rose-300 text-sm font-medium flex items-center gap-2">
                  <span className="material-icons-outlined text-base">error_outline</span>
                  {globalError}
                </div>
              )}

              {/* ─ Section 1: Dados Pessoais ─ */}
              <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800/60 rounded-2xl p-6 sm:p-7">
                <SectionHeader number={1} title="Dados Pessoais & Conta" />

                <div className="space-y-4">
                  {renderField('Nome Completo (para faturamento)', 'directorName', 'text', 'João Silva')}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {renderField('CPF', 'cpf', 'text', '000.000.000-00', formatCPF)}
                    {renderField('WhatsApp', 'whatsapp', 'text', '(48) 99999-9999', formatWhatsApp)}
                  </div>

                  {renderField('E-mail Institucional', 'email', 'email', 'diretoria@escola.com.br')}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {renderField('Senha de Acesso', 'password', 'password', 'Mín. 8 caracteres',
                      undefined,
                      formValues.password ? (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex h-1.5 flex-1 gap-0.5">
                            {[1, 2, 3, 4, 5].map(level => (
                              <div key={level} className={`flex-1 rounded-full transition-all duration-300 ${
                                passwordStrength.score >= level ? passwordStrength.color : 'bg-slate-700'
                              }`} />
                            ))}
                          </div>
                          <span className={`text-[10px] font-bold ${passwordStrength.score <= 2 ? 'text-orange-400' : 'text-emerald-400'}`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                      ) : undefined
                    )}
                    {renderField('Confirmar Senha', 'confirmPassword', 'password', 'Repita a senha')}
                  </div>

                  <div className="border-t border-slate-800/50 pt-4 mt-4">
                    <p className="text-xs text-slate-500 font-medium mb-3 flex items-center gap-1.5">
                      <span className="material-icons-outlined text-sm text-primary">school</span>
                      Dados da Instituição
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {renderField('Nome da Escola', 'schoolName', 'text', 'Colégio Estadual...')}
                      {renderField('CNPJ', 'cnpj', 'text', '00.000.000/0000-00', formatCNPJ)}
                    </div>
                  </div>
                </div>
              </div>

              {/* ─ Section 2: Endereço de Cobrança ─ */}
              <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800/60 rounded-2xl p-6 sm:p-7">
                <SectionHeader number={2} title="Endereço de Cobrança" />

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      {renderField('CEP', 'postalCode', 'text', '00000-000', formatCEP)}
                      {cepLoading && (
                        <div className="absolute right-3 top-[34px] w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      )}
                    </div>
                    {renderField('Endereço', 'endereco', 'text', 'Rua, Avenida...', undefined, undefined, !!formValues.endereco)}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {renderField('Número', 'addressNumber', 'text', '123')}
                    {renderField('Complemento', 'complemento', 'text', 'Apto, Sala...')}
                    {renderField('Bairro', 'bairro', 'text', 'Bairro', undefined, undefined, !!formValues.bairro)}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {renderField('Cidade', 'cidade', 'text', 'Cidade', undefined, undefined, !!formValues.cidade)}
                    {renderField('Estado', 'estado', 'text', 'UF', undefined, undefined, !!formValues.estado)}
                  </div>
                </div>
              </div>

              {/* ─ Section 3: Dados do Cartão ─ */}
              <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800/60 rounded-2xl p-6 sm:p-7">
                <SectionHeader number={3} title="Dados do Cartão" />

                <div className="space-y-4">
                  {renderField('Nome no Cartão', 'ccHolderName', 'text', 'Nome como está no cartão')}
                  {renderField('Número do Cartão', 'ccNumber', 'text', '0000 0000 0000 0000', formatCardNumber)}

                  <div className="grid grid-cols-2 gap-4">
                    {renderField('Validade', 'ccExpiry', 'text', 'MM/AA', formatExpiry)}
                    {renderField('CVV', 'ccCvv', 'text', '123', (v) => v.replace(/\D/g, '').slice(0, 4))}
                  </div>
                </div>
              </div>

              {/* ─ Submit (mobile only) ─ */}
              <div className="lg:hidden">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl shadow-xl shadow-primary/30 transition-all flex items-center justify-center gap-2 active:scale-[0.97] text-sm"
                >
                  {isLoading ? (
                    <span className="material-icons-outlined animate-spin">refresh</span>
                  ) : (
                    <>
                      <span className="material-icons-outlined text-lg">lock</span>
                      Finalizar Pagamento
                    </>
                  )}
                </button>
                <div className="flex items-center justify-center gap-2 mt-3 opacity-50">
                  <span className="material-icons-outlined text-xs text-slate-400">shield</span>
                  <span className="text-[10px] text-slate-400 font-medium">Processado com segurança pelo Asaas</span>
                </div>
              </div>

            </div>

            {/* ── Right: Resumo do Pedido (Sidebar) ────────────────── */}
            <div className="w-full lg:w-[380px] lg:sticky lg:top-8 shrink-0">
              <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800/60 rounded-2xl p-6 sm:p-7">
                <h3 className="text-lg font-bold text-white mb-6 tracking-tight">Resumo do Pedido</h3>

                {/* Plan Icon + Title */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
                    <span className="material-icons-outlined text-white text-2xl">school</span>
                  </div>
                  <div>
                    <p className="text-white font-bold text-base">
                      Plano {priceInfo.isYearly ? 'Anual' : 'Mensal'}
                    </p>
                    <p className="text-sm text-slate-400">
                      {priceInfo.isYearly ? '12x sem juros' : 'Cobrança mensal'}
                    </p>
                  </div>
                </div>

                {/* Quantidade de Alunos */}
                <div className="mb-5 space-y-2">
                  <label className="text-[11px] font-semibold text-slate-400 tracking-wide block">
                    Quantidade de Alunos
                  </label>
                  <Controller
                    name="studentCount"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="number"
                        placeholder="Ex: 350"
                        className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm text-white placeholder:text-slate-500 font-medium transition-all outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 hover:border-slate-600"
                      />
                    )}
                  />
                  {(errors as any).studentCount?.message && (
                    <p className="text-rose-400 text-[11px] font-medium">{(errors as any).studentCount.message as string}</p>
                  )}
                  {priceInfo.students > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      Faixa {priceInfo.tierLabel} — R$ {formatBRL(priceInfo.basePrice)}/aluno
                      {priceInfo.isYearly && <span className="text-emerald-400"> (c/ 40% off)</span>}
                    </p>
                  )}
                </div>

                {/* Billing Cycle Toggle */}
                <div className="flex bg-slate-800/80 p-1 rounded-xl mb-6">
                  <button
                    type="button"
                    onClick={() => setValue('billingCycle', 'MONTHLY')}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                      formValues.billingCycle === 'MONTHLY'
                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    Mensal
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('billingCycle', 'YEARLY')}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      formValues.billingCycle === 'YEARLY'
                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    Anual
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">-40%</span>
                  </button>
                </div>

                {/* Price breakdown */}
                <div className="border-t border-slate-800/60 pt-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Valor total</span>
                    <span className="text-white font-semibold">R$ {formatBRL(priceInfo.finalTotal)}</span>
                  </div>

                  {priceInfo.isYearly && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Parcelamento</span>
                      <span className="text-white font-semibold">12x sem juros</span>
                    </div>
                  )}

                  <div className="flex justify-between items-end pt-3 border-t border-slate-800/60">
                    <span className="text-sm font-bold text-white">Valor da parcela</span>
                    <span className="text-2xl font-black text-primary">
                      R$ {formatBRL(priceInfo.isYearly ? priceInfo.finalTotal / 12 : priceInfo.finalTotal)}
                    </span>
                  </div>
                </div>

                {/* Benefits */}
                <div className="mt-6 space-y-2.5">
                  {[
                    'Garantia de 7 dias',
                    'Acesso imediato',
                    'Suporte prioritário',
                    'Atualizações gratuitas',
                  ].map(benefit => (
                    <div key={benefit} className="flex items-center gap-2 text-sm text-slate-300">
                      <span className="material-icons-outlined text-emerald-400 text-base">check_circle</span>
                      {benefit}
                    </div>
                  ))}
                </div>

                {/* Submit button (desktop) */}
                <div className="mt-6 hidden lg:block">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl shadow-xl shadow-primary/30 transition-all flex items-center justify-center gap-2 active:scale-[0.97] text-sm"
                  >
                    {isLoading ? (
                      <span className="material-icons-outlined animate-spin">refresh</span>
                    ) : (
                      <>
                        <span className="material-icons-outlined text-lg">lock</span>
                        Finalizar Pagamento
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 mt-3 opacity-50">
                    <span className="material-icons-outlined text-xs text-slate-400">shield</span>
                    <span className="text-[10px] text-slate-400 font-medium">Processado com segurança pelo Asaas</span>
                  </div>
                </div>
              </div>

              {/* Login link */}
              <p className="text-center text-xs text-slate-500 mt-4">
                Já possui cadastro?{' '}
                <button type="button" onClick={onLogin} className="text-primary hover:text-primary-light font-semibold underline underline-offset-2 transition-colors">
                  Fazer Login
                </button>
              </p>
            </div>

          </div>
        </form>
      </main>
    </div>
  );
};

export default CheckoutWizard;
