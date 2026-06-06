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
        schoolName: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let { name, value } = e.target;
        
        // Máscaras
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
            if (!formData.cpfCnpj || formData.cpfCnpj.length < 11) {
                throw new Error('CPF/CNPJ inválido.');
            }

            // 1. Criar o usuário no Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: { full_name: formData.name }
                }
            });

            if (authError) throw new Error(`Erro ao criar conta: ${authError.message}`);
            if (!authData.user) throw new Error('Falha ao criar usuário.');

            // 2. Criar a escola
            const { data: schoolData, error: schoolError } = await supabase
                .from('schools')
                .insert({
                    name: formData.schoolName || formData.name,
                    city: 'Não informada',
                    status: 'PENDENTE'
                })
                .select()
                .single();

            if (schoolError || !schoolData) throw new Error('Erro ao registrar a escola no sistema.');

            // 3. Criar perfil do gestor
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: authData.user.id,
                    email: formData.email,
                    firstName: formData.name.split(' ')[0],
                    lastName: formData.name.split(' ').slice(1).join(' '),
                    school_id: schoolData.id,
                    user_type: 'school_admin'
                });
            
            if (profileError) console.error('Erro perfil:', profileError); // Não bloqueante

            // 4. Chamar Edge Function para gerar o checkout Asaas
            const numericPrice = parseFloat(
                plan.price.replace('R$ ', '').replace('.', '').replace(',', '.')
            );

            const { data: funcData, error: funcError } = await supabase.functions.invoke('criar-checkout', {
                body: {
                    schoolId: schoolData.id,
                    userId: authData.user.id,
                    nome: formData.name,
                    email: formData.email,
                    cpfCnpj: formData.cpfCnpj,
                    plano: plan.id,
                    nomePlano: plan.name,
                    precoPlano: numericPrice
                }
            });

            if (funcError) {
                throw new Error(`Erro ao conectar com o provedor de pagamentos: ${funcError.message}`);
            }

            if (funcData?.error) {
                throw new Error(`Erro no pagamento: ${funcData.error}`);
            }

            if (funcData?.invoiceUrl) {
                // Redireciona o usuário para o ambiente de pagamento do Asaas
                window.location.href = funcData.invoiceUrl;
            } else {
                throw new Error('Link de pagamento não foi gerado.');
            }

        } catch (error: any) {
            console.error('Erro no checkout:', error);
            setErrorMsg(error.message || 'Ocorreu um erro inesperado.');
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
                <p className="text-gray-500 mt-2">Plano {plan.name} - {plan.price}. Crie sua conta para prosseguir com o pagamento seguro.</p>
            </div>

            <form onSubmit={handleCheckout} className="space-y-6">
                
                {/* DADOS DA ESCOLA */}
                <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b pb-2 mb-4">Dados da Conta e Acesso</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Escola</label>
                            <input required type="text" name="schoolName" value={formData.schoolName} onChange={handleChange} placeholder="Colégio Exemplo" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border outline-none dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CNPJ da Escola (ou CPF)</label>
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

                {errorMsg && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100 flex items-start gap-2">
                        <span className="material-icons-outlined text-base mt-0.5">error_outline</span> <span>{errorMsg}</span>
                    </div>
                )}

                <div className="pt-4 flex flex-col items-end gap-4">
                    <button disabled={isProcessing} type="submit" className="w-full md:w-auto px-10 py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2 text-lg">
                        {isProcessing ? 'Gerando Pagamento...' : `Ir para Pagamento (${plan.price})`}
                        {!isProcessing && <span className="material-icons-outlined">exit_to_app</span>}
                    </button>
                    <p className="text-xs text-gray-400 text-center w-full md:text-right">Você será redirecionado para o ambiente seguro do Asaas.</p>
                </div>
            </form>
        </div>
    );
};

export default CheckoutForm;
