import React, { useState } from 'react';
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
        schoolName: '' // Adicionado para criar a escola
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let { name, value } = e.target;
        
        // Mantendo suas máscaras originais
        if (name === 'cpfCnpj') value = value.replace(/\D/g, '');
        if (name === 'phone') value = value.replace(/\D/g, '').substring(0, 11);

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

            // 1. Criar o usuário no Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
            });

            if (authError) throw new Error(authError.message);

            const numericPrice = parseFloat(
                plan.price.replace('R$ ', '').replace('.', '').replace(',', '.')
            );

            // 2. Chamar a API para gerar o link do Asaas e vincular à escola
            const response = await fetch('/api/create-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: authData.user?.id,
                    schoolName: formData.schoolName || formData.name, // Nome da escola
                    email: formData.email,
                    cpfCnpj: formData.cpfCnpj,
                    name: formData.name,
                    phone: formData.phone,
                    planPrice: numericPrice,
                    frequency: plan.frequency,
                    planName: plan.name
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao gerar pagamento.');
            }

            // 3. Redirecionar para o ambiente seguro do Asaas
            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
            } else {
                throw new Error('URL de checkout não retornada.');
            }

        } catch (error: any) {
            console.error('Erro no checkout:', error);
            setErrorMsg(error.message);
            setIsProcessing(false);
        }
    };

    return (
        <div className="animate-fade-in max-w-3xl mx-auto py-8 px-4">
            <div className="mb-8">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors mb-4 font-medium">
                    <span className="material-icons-outlined text-sm">arrow_back</span> Voltar
                </button>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Cadastro da Escola</h1>
                <p className="text-gray-500 mt-2">Você será redirecionado para o ambiente seguro de pagamento na próxima etapa.</p>
            </div>

            <form onSubmit={handleCheckout} className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm space-y-6">
                
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

                {errorMsg && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100 flex items-start gap-2">
                        <span className="material-icons-outlined text-base mt-0.5">error_outline</span> <span>{errorMsg}</span>
                    </div>
                )}

                <div className="border-t border-gray-100 pt-6 mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <p className="text-sm text-gray-500">Plano selecionado:</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{plan.name} - {plan.price}</p>
                    </div>
                    <button disabled={isProcessing} type="submit" className="w-full md:w-auto px-8 py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2">
                        {isProcessing ? 'Processando...' : 'Ir para Pagamento Seguro'}
                        {!isProcessing && <span className="material-icons-outlined text-sm">lock</span>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CheckoutForm;
