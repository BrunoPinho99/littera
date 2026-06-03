import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface Plan {
    id: string;
    name: string;
    price: string;
    frequency: number;
}

interface CheckoutFormProps {
    plan: Plan;
    onBack: () => void;
}

// Declarando tipo global para acessar asaas.js
declare global {
    interface Window {
        asaas: any;
    }
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ plan, onBack }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const [formData, setFormData] = useState({
        cpfCnpj: '',
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        schoolName: '',
        cardNumber: '',
        cardHolderName: '',
        cardExpiry: '',
        cardCcv: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let { name, value } = e.target;
        
        // Máscaras
        if (name === 'cpfCnpj') value = value.replace(/\D/g, '');
        if (name === 'phone') value = value.replace(/\D/g, '').substring(0, 11);
        if (name === 'cardNumber') value = value.replace(/\D/g, '').substring(0, 16);
        if (name === 'cardCcv') value = value.replace(/\D/g, '').substring(0, 4);
        if (name === 'cardExpiry') {
            value = value.replace(/\D/g, '').substring(0, 4);
            if (value.length > 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        setErrorMsg('');

        try {
            if (formData.password !== formData.confirmPassword) {
                throw new Error('As senhas não coincidem.');
            }
            if (formData.password.length < 6) {
                throw new Error('A senha deve ter pelo menos 6 caracteres.');
            }

            if (!formData.cardNumber || !formData.cardHolderName || !formData.cardExpiry || !formData.cardCcv) {
                throw new Error('Preencha todos os dados do cartão de crédito.');
            }

            const [expMonth, expYear] = formData.cardExpiry.split('/');
            if (!expMonth || !expYear || expYear.length !== 2) {
                throw new Error('Data de validade do cartão inválida. Use o formato MM/AA.');
            }

            // 1. Iniciar Asaas.js
            const asaasPublicKey = import.meta.env.VITE_ASAAS_PUBLIC_KEY || 'SUA_CHAVE_PUBLICA_AQUI'; // fallback se não configurado
            if (!window.asaas) {
                throw new Error('SDK do Asaas não carregou corretamente.');
            }

            window.asaas.creditCard.setIntegrationKey(asaasPublicKey);
            
            // 2. Tokenizar Cartão
            const creditCardToken = await new Promise<string>((resolve, reject) => {
                const creditCardData = {
                    customerName: formData.cardHolderName,
                    customerEmail: formData.email,
                    customerCpfCnpj: formData.cpfCnpj,
                    cardNumber: formData.cardNumber,
                    cardHolderName: formData.cardHolderName,
                    cardExpiryMonth: expMonth,
                    cardExpiryYear: '20' + expYear, // assumindo 2 dígitos para o ano
                    cardCcv: formData.cardCcv
                };

                window.asaas.creditCard.tokenize(creditCardData, {
                    onSuccess: (data: any) => resolve(data.creditCardToken),
                    onError: (error: any) => reject(new Error('Erro no cartão: ' + (error?.description || 'Dados inválidos.')))
                });
            });

            // 3. Enviar para a API Backend (Vercel)
            const numericPrice = parseFloat(
                plan.price.replace('R$ ', '').replace('.', '').replace(',', '.')
            );

            const response = await fetch('/api/create-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schoolName: formData.schoolName || formData.name,
                    email: formData.email,
                    password: formData.password,
                    cpfCnpj: formData.cpfCnpj,
                    name: formData.name,
                    phone: formData.phone,
                    planPrice: numericPrice,
                    frequency: plan.frequency,
                    planName: plan.name,
                    creditCardToken: creditCardToken,
                    cardHolderName: formData.cardHolderName
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao gerar pagamento.');
            }

            // 4. O usuário foi criado e a assinatura foi confirmada na API. 
            // Fazer login no frontend
            await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password
            });

            // 5. Redirecionar para Dashboard
            window.location.href = '/app/inst-overview';

        } catch (error: any) {
            console.error('Erro no checkout:', error);
            setErrorMsg(error.message);
            setIsProcessing(false);
        }
    };

    return (
        <div className="animate-fade-in max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors mb-4 font-medium">
                    <span className="material-icons-outlined text-sm">arrow_back</span> Voltar
                </button>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Finalizar Assinatura</h1>
                <p className="text-gray-500 mt-2">Plano {plan.name} - {plan.price}. Crie sua conta e efetue o pagamento de forma segura.</p>
            </div>

            <form onSubmit={handleCheckout} className="space-y-6">
                
                {/* DADOS DA ESCOLA */}
                <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b pb-2 mb-4">Dados da Conta</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Escola</label>
                            <input required type="text" name="schoolName" value={formData.schoolName} onChange={handleChange} placeholder="Colégio Exemplo" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border outline-none dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CNPJ da Escola</label>
                            <input required type="text" name="cpfCnpj" value={formData.cpfCnpj} onChange={handleChange} placeholder="Apenas números" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border outline-none dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Gestor</label>
                            <input required type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Nome completo" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border outline-none dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone / WhatsApp</label>
                            <input required type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="Apenas números" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border outline-none dark:text-white" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail Corporativo</label>
                            <input required type="email" name="email" value={formData.email} onChange={handleChange} placeholder="contato@escola.com" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border outline-none dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Crie uma Senha</label>
                            <input required type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Mínimo 6 caracteres" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border outline-none dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirme a Senha</label>
                            <input required type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Repita a senha" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border outline-none dark:text-white" />
                        </div>
                    </div>
                </div>

                {/* PAGAMENTO (CARTÃO) */}
                <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b pb-2 mb-4 flex items-center justify-between">
                        Pagamento Seguro (Asaas)
                        <span className="material-icons-outlined text-green-600">lock</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número do Cartão</label>
                            <input required type="text" name="cardNumber" value={formData.cardNumber} onChange={handleChange} placeholder="0000 0000 0000 0000" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border outline-none dark:text-white" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Titular do Cartão</label>
                            <input required type="text" name="cardHolderName" value={formData.cardHolderName} onChange={handleChange} placeholder="NOME COMO ESTÁ NO CARTÃO" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border outline-none dark:text-white uppercase" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Validade (MM/AA)</label>
                            <input required type="text" name="cardExpiry" value={formData.cardExpiry} onChange={handleChange} placeholder="12/30" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border outline-none dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CVV</label>
                            <input required type="text" name="cardCcv" value={formData.cardCcv} onChange={handleChange} placeholder="123" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border outline-none dark:text-white" />
                        </div>
                    </div>
                </div>

                {errorMsg && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100 flex items-start gap-2">
                        <span className="material-icons-outlined text-base mt-0.5">error_outline</span> <span>{errorMsg}</span>
                    </div>
                )}

                <div className="pt-4 flex flex-col items-end gap-4">
                    <button disabled={isProcessing} type="submit" className="w-full md:w-auto px-10 py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2 text-lg">
                        {isProcessing ? 'Processando Pagamento...' : `Assinar por ${plan.price}`}
                        {!isProcessing && <span className="material-icons-outlined">payment</span>}
                    </button>
                    <p className="text-xs text-gray-400 text-center w-full md:text-right">Pagamento criptografado e seguro via Asaas.</p>
                </div>
            </form>
        </div>
    );
};

export default CheckoutForm;
