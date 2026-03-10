import React from 'react';

interface Plan {
  id: string;
  name: string;
  price: string;
  features: string[];
  recommended?: boolean;
  color: string;
  frequency: number;
}

const plans: Plan[] = [
  {
    id: 'pro_mensal',
    name: 'Pro Mensal',
    price: 'R$ 29,90',
    color: 'bg-gray-500',
    frequency: 1,
    features: ['Correções ilimitadas', 'Análise detalhada', 'Feedback instantâneo da IA']
  },
  {
    id: 'pro_semestral',
    name: 'Pro Semestral',
    price: 'R$ 149,90',
    recommended: true,
    color: 'bg-primary',
    frequency: 6,
    features: ['Tudo do Mensal', '16% de desconto', 'Suporte prioritário']
  },
  {
    id: 'pro_anual',
    name: 'Pro Anual',
    price: 'R$ 249,90',
    color: 'bg-blue-600',
    frequency: 12,
    features: ['Tudo do Semestral', '30% de desconto', 'Acesso a temas exclusivos']
  }
];

interface SubscriptionViewProps {
  onPlanSelected?: (planId: string) => void;
  onCancel: () => void;
  onCheckout?: (plan: Plan) => void;
}

const SubscriptionView: React.FC<SubscriptionViewProps> = ({ onPlanSelected, onCancel, onCheckout }) => {
  const handleSubscribe = (plan: Plan) => {
    if (onCheckout) {
      onCheckout(plan);
    }
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto py-8">
      <div className="transition-opacity">
        <>
          <div className="text-center mb-16">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">Escolha seu Plano</h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">
              Invista no seu futuro. Escolha o plano que melhor se adapta à sua rotina de estudos e alcance a nota 1000.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-white dark:bg-surface-dark rounded-3xl p-8 border-2 transition-all duration-300 flex flex-col ${plan.recommended
                  ? 'border-primary shadow-2xl shadow-primary/20 scale-105 z-10'
                  : 'border-gray-100 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500'
                  }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                    Recomendado
                  </div>
                )}

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-black text-gray-900 dark:text-white">{plan.price}</span>
                  <span className="text-gray-500 ml-1">
                    {plan.frequency === 1 ? '/mês' : plan.frequency === 6 ? '/semestre' : '/ano'}
                  </span>
                </div>

                <ul className="space-y-4 mb-8 flex-grow">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                      <span className="material-icons-outlined text-green-500 text-lg">check_circle</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan)}
                  className={`w-full py-4 rounded-xl font-bold transition-all transform active:scale-95 flex items-center justify-center gap-2 ${plan.recommended
                    ? 'bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/30'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-700'
                    }`}
                >
                  Assinar Agora
                </button>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <button onClick={onCancel} className="text-gray-500 hover:text-primary transition-colors text-sm font-medium">
              Voltar para o perfil
            </button>
          </div>
        </>
      </div>
    </div>
  );
};

export default SubscriptionView;