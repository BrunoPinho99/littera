
import React, { useState } from 'react';

interface Plan {
  id: string;
  name: string;
  price: string;
  features: string[];
  recommended?: boolean;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Essencial',
    price: 'R$ 0',
    features: ['3 correções por mês', 'Temas semanais', 'Feedback básico IA', 'Acesso ao ranking']
  },
  {
    id: 'premium',
    name: 'Pro',
    price: 'R$ 29,90',
    recommended: true,
    features: ['Correções ilimitadas', 'Análise detalhada competência', 'Geração de temas personalizada', 'Suporte prioritário', 'Sem anúncios']
  },
  {
    id: 'escolar',
    name: 'Escolar',
    price: 'Consulte',
    features: ['Painel para professores', 'Relatórios de turma', 'Gestão de alunos', 'Temas exclusivos da escola']
  }
];

interface SubscriptionViewProps {
  onPlanSelected: (planId: string) => void;
  onCancel: () => void;
  onCheckout?: (plan: any) => void;
}

const SubscriptionView: React.FC<SubscriptionViewProps> = ({ onPlanSelected, onCancel, onCheckout }) => {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handleSubscribe = (plan: Plan) => {
    if (plan.id === 'free') {
      onPlanSelected('Free');
      return;
    }
    setSelectedPlan(plan);
  };

  const handleMercadoPagoPayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setPaymentSuccess(true);
      setTimeout(() => {
        onPlanSelected(selectedPlan?.name || 'Premium');
      }, 2000);
    }, 2500);
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto py-8">
      {!selectedPlan ? (
        <>
          <div className="text-center mb-16">
            <h1 className="text-display-sm font-display text-on-surface mb-4" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>Escolha seu Plano</h1>
            <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto">
              Invista no seu futuro. Escolha o plano que melhor se adapta à sua rotina de estudos e alcance a nota 1000.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-surface-container-lowest rounded-card p-8 transition-all duration-300 flex flex-col ${
                  plan.recommended
                    ? 'shadow-glow scale-105 z-10 ring-2 ring-primary'
                    : 'shadow-ambient hover:shadow-ambient-lg'
                }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 btn-gradient text-on-primary text-label-sm uppercase tracking-widest px-4 py-1.5 rounded-pill shadow-glow-sm">
                    Recomendado
                  </div>
                )}

                <h3 className="text-headline-sm text-on-surface mb-2" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-black text-on-surface" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>{plan.price}</span>
                  {plan.id !== 'escolar' && <span className="text-on-surface-variant ml-1">/mês</span>}
                </div>

                <ul className="space-y-4 mb-8 flex-grow">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-body-md text-on-surface-variant">
                      <span className="material-icons-outlined text-emerald-500 text-lg">check_circle</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan)}
                  className={`w-full py-4 rounded-pill font-black text-label-lg transition-all transform active:scale-95 ${
                    plan.recommended
                      ? 'btn-gradient text-on-primary shadow-glow-sm hover:shadow-glow'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  {plan.id === 'escolar' ? 'Falar com Consultor' : 'Começar Agora'}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <button onClick={onCancel} className="text-on-surface-variant hover:text-primary transition-colors text-label-lg">
              Voltar para o perfil
            </button>
          </div>
        </>
      ) : (
        <div className="max-w-md mx-auto bg-surface-container-lowest rounded-card shadow-ambient-lg overflow-hidden">
          <div className="bg-blue-600 p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <img src="https://logodownload.org/wp-content/uploads/2019/06/mercado-pago-logo-0.png" className="w-6 h-6 object-contain" alt="Mercado Pago" />
              </div>
              <span className="text-white font-bold">Mercado Pago</span>
            </div>
            <button onClick={() => setSelectedPlan(null)} className="text-white/80 hover:text-white">
              <span className="material-icons-outlined">close</span>
            </button>
          </div>

          <div className="p-8">
            {paymentSuccess ? (
              <div className="text-center py-8 animate-fade-in">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="material-icons-outlined text-5xl">check</span>
                </div>
                <h2 className="text-headline-md text-on-surface mb-2" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>Pagamento Aprovado!</h2>
                <p className="text-body-md text-on-surface-variant">Sua assinatura {selectedPlan.name} foi ativada.</p>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h3 className="text-on-surface-variant text-label-sm uppercase mb-1">Resumo do Pedido</h3>
                  <div className="flex justify-between items-end">
                    <span className="text-title-lg text-on-surface">Assinatura Littera {selectedPlan.name}</span>
                    <span className="text-title-lg text-primary">{selectedPlan.price}</span>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="p-4 rounded-input bg-surface-container-low flex items-center gap-4 cursor-pointer hover:bg-surface-container-high transition-colors ghost-border">
                    <span className="material-icons-outlined text-blue-500">credit_card</span>
                    <span className="flex-1 font-medium text-on-surface">Cartão de Crédito</span>
                    <span className="material-icons-outlined text-on-surface-variant">chevron_right</span>
                  </div>
                  <div className="p-4 rounded-input bg-surface-container-low flex items-center gap-4 cursor-pointer hover:bg-surface-container-high transition-colors ghost-border">
                    <span className="material-icons-outlined text-emerald-500">pix</span>
                    <span className="flex-1 font-medium text-on-surface">Pix (Instantâneo)</span>
                    <span className="material-icons-outlined text-on-surface-variant">chevron_right</span>
                  </div>
                </div>

                <button
                  disabled={isProcessing}
                  onClick={handleMercadoPagoPayment}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-pill font-black text-label-lg shadow-glow-sm transition-all flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <span>Finalizar Pagamento</span>
                  )}
                </button>
                <p className="text-center text-label-sm text-on-surface-variant mt-4 px-4">
                  Pagamento processado com segurança pelo Mercado Pago. Ao clicar em finalizar, você aceita nossos termos de uso.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionView;
