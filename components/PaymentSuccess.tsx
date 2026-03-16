import React, { useEffect, useState } from 'react';

interface SuccessData {
    orderDate: string;
    planName: string;
    amount: string;
    email?: string;
}

const PaymentSuccess: React.FC = () => {
    const [data, setData] = useState<SuccessData | null>(null);

    useEffect(() => {
        const raw = localStorage.getItem('littera_payment_success');
        if (raw) {
            try {
                setData(JSON.parse(raw));
            } catch {
                // fallback sem dados
            }
        }
    }, []);

    const handleAccess = () => {
        localStorage.removeItem('littera_payment_success');
        localStorage.removeItem('littera_checkout_plan');
        window.location.href = '/login';
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="animate-fade-in max-w-lg w-full">
                <div className="bg-white dark:bg-surface-dark rounded-[2rem] p-8 md:p-10 shadow-xl border border-gray-100 dark:border-slate-800 w-full flex flex-col items-center text-center">
                    {/* Ícone de sucesso */}
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 border-[8px] border-primary/5">
                        <span className="material-icons-outlined text-4xl text-primary">check_circle</span>
                    </div>

                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
                        Sucesso! Assinatura<br />confirmada.
                    </h1>

                    <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm max-w-sm">
                        Verifique seu e-mail para confirmação e instruções adicionais sobre o seu acesso.
                    </p>

                    {data && (
                        <div className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 space-y-4 mb-8 text-sm">
                            <div className="flex justify-between items-center text-left">
                                <span className="text-gray-500">Data</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{data.orderDate}</span>
                            </div>
                            <div className="flex justify-between items-center text-left">
                                <span className="text-gray-500">Plano</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{data.planName}</span>
                            </div>
                            <div className="flex justify-between items-center text-left">
                                <span className="text-gray-500">Valor Pago</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{data.amount}</span>
                            </div>
                            {data.email && (
                                <div className="flex justify-between items-center text-left pt-4 mt-4 border-t border-gray-200 dark:border-slate-700">
                                    <span className="text-gray-500">Login</span>
                                    <span className="font-semibold text-primary">{data.email}</span>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        onClick={handleAccess}
                        className="w-full py-4 bg-[#0B0F19] hover:bg-black dark:bg-primary dark:hover:bg-primary-dark text-white rounded-2xl font-bold transition-all"
                    >
                        Acessar Conta
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;
