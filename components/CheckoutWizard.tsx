import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../supabaseClient';

// ── Helpers ─────────────────────────────────────────────────────────────────
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

const formatBRL = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Schema Zod ───────────────────────────────────────────────────────────────
const checkoutSchema = z.object({
  directorName: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  schoolName: z.string().min(2, 'Nome da escola é obrigatório'),
  cnpj: z.string().refine(validateCNPJ, 'CNPJ inválido'),
  studentCount: z.number().min(1, 'No mínimo 1 aluno').max(50000, 'Limite excedido'),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

// ── Componente ───────────────────────────────────────────────────────────────
interface CheckoutWizardProps {
  isOpen: boolean;
  onClose: () => void;
  initialStudents?: number;
  initialCycle?: 'MONTHLY' | 'YEARLY';
}

export default function CheckoutWizard({ isOpen, onClose, initialStudents = 300, initialCycle = 'YEARLY' }: CheckoutWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
    reset
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      studentCount: initialStudents,
      billingCycle: initialCycle,
      directorName: '',
      email: '',
      password: '',
      schoolName: '',
      cnpj: '',
    },
    mode: 'onChange',
  });

  const watchStudents = watch('studentCount') || 0;
  const watchCycle = watch('billingCycle');

  useEffect(() => {
    if (isOpen) {
      setValue('studentCount', initialStudents);
      setValue('billingCycle', initialCycle);
      setStep(1);
      setServerError(null);
      // Lock body scroll
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      // Small delay to reset form after animation
      setTimeout(() => reset({ studentCount: initialStudents, billingCycle: initialCycle }), 300);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, initialStudents, initialCycle, setValue, reset]);

  const getPriceInfo = () => {
    const isYearly = watchCycle === 'YEARLY';
    const discount = isYearly ? 0.8 : 1;
    const pricePerStudent = watchStudents <= 200 ? 9 * discount : 7 * discount;
    const monthlyTotal = watchStudents * pricePerStudent;
    const finalTotal = isYearly ? monthlyTotal * 12 : monthlyTotal;

    return {
      finalTotal,
      planName: watchStudents <= 200 ? 'Starter' : 'School',
      isYearly
    };
  };

  const handleNextStep = async () => {
    let isValid = false;
    if (step === 1) {
      isValid = await trigger(['directorName', 'email', 'schoolName', 'cnpj']);
    } else if (step === 2) {
      isValid = await trigger(['studentCount', 'billingCycle']);
    }

    if (isValid) {
      setStep(prev => prev + 1);
    }
  };

  const onSubmit = async (data: CheckoutFormData) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('onboarding', {
        body: {
          directorName: data.directorName.trim(),
          email: data.email.toLowerCase().trim(),
          password: data.password,
          schoolName: data.schoolName.trim(),
          cnpj: data.cnpj.replace(/\D/g, ''),
          studentCount: data.studentCount,
          billingCycle: data.billingCycle,
        },
      });

      if (fnError) throw new Error(fnError.message || 'Erro ao processar cadastro.');
      if (fnData?.error) throw new Error(fnData.error);

      if (!fnData?.checkoutUrl) {
        if (fnData?.partialSuccess) {
          await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
          window.location.href = '/app/inst-overview';
          return;
        }
        throw new Error('Erro inesperado ao gerar link de pagamento.');
      }

      localStorage.setItem('littera_checkout_url', fnData.checkoutUrl);
      
      // Realiza login no fundo para que o app esteja pronto quando ele voltar
      await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
      
      // Redireciona pro Asaas
      window.location.href = fnData.checkoutUrl;

    } catch (err: any) {
      setServerError(err.message || 'Erro ao processar cadastro.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen && step === 1) return null; // Wait for animation before completely unmounting if closed

  const priceInfo = getPriceInfo();

  return (
    <>
      {/* Overlay Escuro */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[99] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-[480px] bg-white shadow-2xl z-[100] transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Assinar Littera</h2>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Passo {step} de 3</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <span className="material-icons-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 w-full bg-gray-100">
          <div className="h-full bg-[#004ac6] transition-all duration-300 ease-out" style={{ width: `${(step / 3) * 100}%` }} />
        </div>

        {/* Content (Form) */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          {serverError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600">
              <span className="material-icons-outlined text-red-500">error_outline</span>
              <p className="text-sm font-medium">{serverError}</p>
            </div>
          )}

          <form id="checkout-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* ── STEP 1: Dados ── */}
            <div className={`transition-opacity duration-300 ${step === 1 ? 'block opacity-100' : 'hidden opacity-0'}`}>
              <h3 className="text-lg font-bold text-gray-900 mb-6">Seus Dados e Escola</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nome do Diretor(a)</label>
                  <input {...register('directorName')} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#004ac6] focus:border-transparent outline-none transition-all text-sm font-medium" placeholder="Ex: Maria Helena Silva" />
                  {errors.directorName && <p className="text-red-500 text-xs mt-1 font-medium">{errors.directorName.message}</p>}
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">E-mail Institucional</label>
                  <input type="email" {...register('email')} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#004ac6] focus:border-transparent outline-none transition-all text-sm font-medium" placeholder="diretoria@colegio.com.br" />
                  {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nome da Escola</label>
                  <input {...register('schoolName')} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#004ac6] focus:border-transparent outline-none transition-all text-sm font-medium" placeholder="Ex: Colégio Dom Pedro II" />
                  {errors.schoolName && <p className="text-red-500 text-xs mt-1 font-medium">{errors.schoolName.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">CNPJ</label>
                  <input 
                    {...register('cnpj')} 
                    onChange={(e) => {
                      setValue('cnpj', formatCNPJ(e.target.value), { shouldValidate: true });
                    }}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#004ac6] focus:border-transparent outline-none transition-all text-sm font-medium" 
                    placeholder="00.000.000/0000-00" 
                  />
                  {errors.cnpj && <p className="text-red-500 text-xs mt-1 font-medium">{errors.cnpj.message}</p>}
                </div>
              </div>
            </div>

            {/* ── STEP 2: Alunos e Plano ── */}
            <div className={`transition-opacity duration-300 ${step === 2 ? 'block opacity-100' : 'hidden opacity-0'}`}>
              <h3 className="text-lg font-bold text-gray-900 mb-6">Escopo e Preço</h3>

              <div className="space-y-8">
                <div>
                  <div className="flex justify-between mb-3">
                    <label className="block text-sm font-bold text-gray-700">Quantidade de Alunos</label>
                    <span className="text-sm font-black text-[#004ac6]">{watchStudents} alunos</span>
                  </div>
                  <input 
                    type="range" min="50" max="1500" step="10"
                    {...register('studentCount', { valueAsNumber: true })}
                    className="w-full accent-[#004ac6]"
                  />
                  <div className="flex justify-between mt-2 text-xs text-gray-400 font-semibold">
                    <span>50</span>
                    <span>1000+</span>
                  </div>
                  {errors.studentCount && <p className="text-red-500 text-xs mt-1 font-medium">{errors.studentCount.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Ciclo de Pagamento</label>
                  <div className="flex p-1 bg-gray-100 rounded-xl">
                    <button type="button" onClick={() => setValue('billingCycle', 'MONTHLY')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${watchCycle === 'MONTHLY' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Mensal</button>
                    <button type="button" onClick={() => setValue('billingCycle', 'YEARLY')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${watchCycle === 'YEARLY' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Anual (-20%)</button>
                  </div>
                </div>

                <div className="bg-[#f8fafc] border border-blue-100 rounded-2xl p-5 mt-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-gray-500 uppercase">Plano {priceInfo.planName}</span>
                    <span className="text-[10px] font-bold bg-[#004ac6] text-white px-2 py-0.5 rounded-full uppercase">{watchCycle === 'YEARLY' ? 'Anual' : 'Mensal'}</span>
                  </div>
                  <div className="text-2xl font-black text-[#131b2e] mb-1">
                    R$ {formatBRL(priceInfo.finalTotal)}
                  </div>
                  <p className="text-xs text-gray-500 font-medium">Cobrança {watchCycle === 'YEARLY' ? 'anual (à vista)' : 'mensal recorrente'}</p>
                </div>
              </div>
            </div>

            {/* ── STEP 3: Senha e Confirmação ── */}
            <div className={`transition-opacity duration-300 ${step === 3 ? 'block opacity-100' : 'hidden opacity-0'}`}>
              <h3 className="text-lg font-bold text-gray-900 mb-6">Criar Conta</h3>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Crie uma Senha Segura</label>
                  <input type="password" {...register('password')} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#004ac6] focus:border-transparent outline-none transition-all text-sm font-medium" placeholder="••••••••" />
                  {errors.password && <p className="text-red-500 text-xs mt-1 font-medium">{errors.password.message}</p>}
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Resumo da Assinatura</h4>
                
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-gray-600">Escola</span>
                  <span className="text-gray-900 truncate max-w-[180px] text-right">{watch('schoolName') || '-'}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-gray-600">Alunos</span>
                  <span className="text-gray-900">{watchStudents}</span>
                </div>
                
                <div className="border-t border-gray-200 my-2" />
                
                <div className="flex justify-between items-end">
                  <div>
                    <span className="block text-gray-900 font-bold">Total a pagar</span>
                    <span className="block text-xs text-gray-400">Via Asaas Checkout</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-lg font-black text-[#004ac6]">R$ {formatBRL(priceInfo.finalTotal)}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-center gap-2 text-gray-400">
                <span className="material-icons-outlined text-sm">lock</span>
                <span className="text-[10px] font-bold uppercase tracking-widest">Ambiente 100% Seguro</span>
              </div>
            </div>

          </form>
        </div>

        {/* Footer / Actions */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
          {step > 1 && (
            <button 
              type="button" 
              onClick={() => setStep(step - 1)}
              disabled={isSubmitting}
              className="px-6 py-3.5 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Voltar
            </button>
          )}
          
          {step < 3 ? (
            <button 
              type="button"
              onClick={handleNextStep}
              className="flex-1 px-6 py-3.5 bg-[#131b2e] text-white font-bold text-sm rounded-xl hover:bg-gray-900 transition-colors shadow-lg shadow-black/5"
            >
              Próximo
            </button>
          ) : (
            <button 
              type="submit"
              form="checkout-form"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3.5 bg-[#004ac6] text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando...
                </>
              ) : (
                'Ir para Pagamento'
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
