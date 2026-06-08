import React, { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';

// ── Tipos ───────────────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  price: string;
  priceValue: number;       // valor numérico para enviar ao Asaas
  frequency: number;        // 1 = mensal, 6 = semestral, 12 = anual
  features: string[];
  recommended?: boolean;
  badge?: string;
}

interface SubscriptionViewProps {
  onPlanSelected: (planId: string) => void;
  onCancel: () => void;
  schoolId?: string;
}

// ── Planos ──────────────────────────────────────────────────────────────────────

const plans: Plan[] = [
  {
    id: 'essencial',
    name: 'Essencial',
    price: 'R$ 0',
    priceValue: 0,
    frequency: 1,
    features: [
      '3 correções por mês',
      'Temas semanais',
      'Feedback básico IA',
      'Acesso ao ranking',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$ 29,90',
    priceValue: 29.90,
    frequency: 1,
    recommended: true,
    badge: 'Mais Popular',
    features: [
      'Correções ilimitadas',
      'Análise detalhada por competência',
      'Geração de temas personalizada',
      'Suporte prioritário',
      'Sem anúncios',
    ],
  },
  {
    id: 'escolar',
    name: 'Escolar',
    price: 'R$ 149,90',
    priceValue: 149.90,
    frequency: 1,
    badge: 'Para Instituições',
    features: [
      'Painel completo para professores',
      'Relatórios de turma em tempo real',
      'Gestão de alunos e convites',
      'Temas exclusivos da escola',
      'Suporte dedicado',
    ],
  },
];

// ── Componente ──────────────────────────────────────────────────────────────────

const SubscriptionView: React.FC<SubscriptionViewProps> = ({
  onPlanSelected,
  onCancel,
  schoolId,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Checkout via Supabase Edge Function ────────────────────────────────────
  const handleCheckout = useCallback(async (plan: Plan) => {
    // Plano gratuito: ativa direto
    if (plan.priceValue === 0) {
      onPlanSelected(plan.name);
      return;
    }

    setIsLoading(true);
    setLoadingPlanId(plan.id);
    setError(null);

    try {
      // Buscar dados do usuário para montar o payload
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Você precisa estar logado para assinar um plano.');
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke('create-checkout', {
        body: {
          planId: plan.id,
          planPrice: plan.priceValue,
          frequency: plan.frequency,
          customer: {
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cliente',
            cpfCnpj: user.user_metadata?.cpf_cnpj || '',
            email: user.email || '',
            phone: user.user_metadata?.phone || '',
          },
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Erro ao processar checkout.');
      }

      if (!data?.checkoutUrl) {
        throw new Error('URL de checkout não retornada pelo servidor.');
      }

      // Redirecionar para o checkout externo do Asaas
      window.location.href = data.checkoutUrl;

    } catch (err: any) {
      console.error('[SubscriptionView] Checkout error:', err);
      setError(err.message || 'Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
      setLoadingPlanId(null);
    }
  }, [onPlanSelected]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-16">
        <h1
          className="text-display-sm font-display text-on-surface mb-4"
          style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}
        >
          Escolha seu Plano
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto">
          Invista no futuro da sua escola. Escolha o plano que melhor se adapta à sua necessidade
          e libere o poder da correção por IA.
        </p>
      </div>

      {/* Erro global */}
      {error && (
        <div className="max-w-md mx-auto mb-8 p-4 rounded-card bg-red-50 border border-red-200 text-red-700 text-body-md text-center animate-fade-in">
          <span className="material-icons-outlined text-sm mr-2 align-middle">error_outline</span>
          {error}
        </div>
      )}

      {/* Grid de planos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const isCurrentLoading = loadingPlanId === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative bg-surface-container-lowest rounded-card p-8 transition-all duration-300 flex flex-col ${
                plan.recommended
                  ? 'shadow-glow scale-105 z-10 ring-2 ring-primary'
                  : 'shadow-ambient hover:shadow-ambient-lg'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div
                  className={`absolute -top-4 left-1/2 -translate-x-1/2 text-label-sm uppercase tracking-widest px-4 py-1.5 rounded-pill shadow-glow-sm ${
                    plan.recommended
                      ? 'btn-gradient text-on-primary'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {plan.badge}
                </div>
              )}

              {/* Plan name */}
              <h3
                className="text-headline-sm text-on-surface mb-2"
                style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}
              >
                {plan.name}
              </h3>

              {/* Price */}
              <div className="mb-6">
                <span
                  className="text-4xl font-black text-on-surface"
                  style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}
                >
                  {plan.price}
                </span>
                {plan.priceValue > 0 && (
                  <span className="text-on-surface-variant ml-1">/mês</span>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8 flex-grow">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-body-md text-on-surface-variant">
                    <span className="material-icons-outlined text-emerald-500 text-lg flex-shrink-0">
                      check_circle
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleCheckout(plan)}
                disabled={isLoading}
                className={`w-full py-4 rounded-pill font-black text-label-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
                  plan.recommended
                    ? 'btn-gradient text-on-primary shadow-glow-sm hover:shadow-glow'
                    : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
                } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isCurrentLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : plan.priceValue === 0 ? (
                  'Começar Grátis'
                ) : (
                  'Assinar Agora'
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Selo de segurança */}
      <div className="mt-12 text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-on-surface-variant text-label-md">
          <span className="material-icons-outlined text-emerald-500 text-lg">lock</span>
          Pagamento seguro processado pelo Asaas. Seus dados de cartão nunca passam pelo Littera.
        </div>
        <button
          onClick={onCancel}
          className="text-on-surface-variant hover:text-primary transition-colors text-label-lg"
        >
          Voltar para o perfil
        </button>
      </div>
    </div>
  );
};

export default SubscriptionView;
