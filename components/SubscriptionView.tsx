
import React, { useState } from 'react';

interface Plan {
  id: string;
  name: string;
  price: string;
  features: string[];
  recommended?: boolean;
  color: string;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Essencial',
    price: 'R$ 0',
    color: 'bg-gray-500',
    features: ['3 correções por mês', 'Temas semanais', 'Feedback básico IA', 'Acesso ao ranking']
  },
  {
    id: 'premium',
    name: 'Pro',
    price: 'R$ 29,90',
    recommended: true,
    color: 'bg-primary',
    features: ['Correções ilimitadas', 'Análise detalhada competência', 'Geração de temas personalizada', 'Suporte prioritário', 'Sem anúncios']
  },
  {
    id: 'escolar',
    name: 'Escolar',
    price: 'Consulte',
    color: 'bg-blue-600',
    features: ['Painel para professores', 'Relatórios de turma', 'Gestão de alunos', 'Temas exclusivos da escola']
  }
];

interface SubscriptionViewProps {
  onPlanSelected: (planId: string) => void;
  onCancel: () => void;
}

const SubscriptionView: React.FC<SubscriptionViewProps> = ({ onPlanSelected, onCancel }) => {
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
    // Simulating Mercado Pago processing
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
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">Escolha seu Plano</h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">
              Invista no seu futuro. Escolha o plano que melhor se adapta à sua rotina de estudos e alcance a nota 1000.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={`relative bg-white dark:bg-surface-dark rounded-3xl p-8 border-2 transition-all duration-300 flex flex-col ${
                  plan.recommended 
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
                  {plan.id !== 'escolar' && <span className="text-gray-500 ml-1">/mês</span>}
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
                  className={`w-full py-4 rounded-xl font-bold transition-all transform active:scale-95 ${
                    plan.recommended
                      ? 'bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/30'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {plan.id === 'escolar' ? 'Falar com Consultor' : 'Começar Agora'}
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
      ) : (
        <div className="max-w-md mx-auto bg-white dark:bg-surface-dark rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-700">
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
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="material-icons-outlined text-5xl">check</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Pagamento Aprovado!</h2>
                <p className="text-gray-500">Sua assinatura {selectedPlan.name} foi ativada.</p>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h3 className="text-gray-500 text-xs font-bold uppercase mb-1">Resumo do Pedido</h3>
                  <div className="flex justify-between items-end">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">Assinatura Tese {selectedPlan.name}</span>
                    <span className="text-lg font-bold text-primary">{selectedPlan.price}</span>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center gap-4 cursor-pointer hover:border-primary transition-colors">
                    <span className="material-icons-outlined text-blue-500">credit_card</span>
                    <span className="flex-1 font-medium dark:text-white">Cartão de Crédito</span>
                    <span className="material-icons-outlined text-gray-400">chevron_right</span>
                  </div>
                  <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center gap-4 cursor-pointer hover:border-primary transition-colors">
                    <span className="material-icons-outlined text-green-500">pix</span>
                    <span className="flex-1 font-medium dark:text-white">Pix (Instantâneo)</span>
                    <span className="material-icons-outlined text-gray-400">chevron_right</span>
                  </div>
                </div>

                <button
                  disabled={isProcessing}
                  onClick={handleMercadoPagoPayment}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <span>Finalizar Pagamento</span>
                  )}
                </button>
                <p className="text-center text-[10px] text-gray-400 mt-4 px-4">
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
