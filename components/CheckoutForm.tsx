import React, { useState } from 'react';

interface Plan {
    id: string;
    name: string;
    price: string;
    frequency: number;
}

interface SuccessData {
    orderDate: string;
    planName: string;
    amount: string;
    email?: string;
}

interface CheckoutFormProps {
    plan: Plan;
    schoolId?: string;
    onBack: () => void;
    onSuccess: (data: SuccessData) => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ plan, schoolId, onBack, onSuccess }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        cpfCnpj: '',
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        postalCode: '',
        addressNumber: '',
        addressComplement: '',
        cardNumber: '',
        cardHolderName: '',
        cardExpiry: '',
        cardCvv: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let { name, value } = e.target;

        if (name === 'cpfCnpj') {
            value = value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2');
                if (value.length > 14) value = value.substring(0, 14);
            } else {
                value = value.substring(0, 14).replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})/, '$1-$2');
            }
        }

        if (name === 'phone') {
            value = value.replace(/\D/g, '').substring(0, 11);
            value = value.replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2');
        }

        if (name === 'postalCode') {
            value = value.replace(/\D/g, '').substring(0, 8);
            value = value.replace(/^(\d{5})(\d)/, '$1-$2');
        }

        if (name === 'cardNumber') {
            value = value.replace(/\D/g, '').substring(0, 16);
            value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
        }

        if (name === 'cardExpiry') {
            value = value.replace(/\D/g, '').substring(0, 4);
            value = value.replace(/(\d{2})(\d)/, '$1/$2');
        }

        if (name === 'cardCvv') {
            value = value.replace(/\D/g, '').substring(0, 4);
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        setErrorMsg('');

        try {
            if (!schoolId && formData.password !== formData.confirmPassword) {
                throw new Error('As senhas não coincidem.');
            }
            if (!schoolId && formData.password.length < 6) {
                throw new Error('A senha deve ter pelo menos 6 caracteres.');
            }

            const numericPrice = parseFloat(
                plan.price.replace('R$ ', '').replace('.', '').replace(',', '.')
            );

            // Extract Month and Year
            const [expiryMonth, expiryYear] = formData.cardExpiry.split('/');

            const response = await fetch('/api/process-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schoolId: schoolId,
                    planId: plan.id,
                    planPrice: numericPrice,
                    frequency: plan.frequency,
                    password: formData.password,
                    customer: {
                        name: formData.name,
                        cpfCnpj: formData.cpfCnpj.replace(/\D/g, ''),
                        email: formData.email,
                        phone: formData.phone.replace(/\D/g, ''),
                        postalCode: formData.postalCode.replace(/\D/g, ''),
                        addressNumber: formData.addressNumber,
                        addressComplement: formData.addressComplement
                    },
                    creditCard: {
                        holderName: formData.cardHolderName,
                        number: formData.cardNumber.replace(/\s/g, ''),
                        expiryMonth: expiryMonth?.trim(),
                        expiryYear: expiryYear?.trim(),
                        ccv: formData.cardCvv
                    }
                }),
            });

            const text = await response.text();
            let data;
            try {
                data = text ? JSON.parse(text) : {};
            } catch (err) {
                throw new Error('Erro de comunicação com o servidor. Vercel dev rodando?');
            }

            if (!response.ok) {
                throw new Error(data.message || `Erro: ${response.status}`);
            }

            // Sucesso: passa dados para o pai redirecionar para /sucesso
            const successPayload: SuccessData = {
                orderDate: new Date().toLocaleDateString('pt-BR'),
                planName: plan.name,
                amount: plan.price,
                email: formData.email || undefined
            };
            onSuccess(successPayload);
            return;

        } catch (error: any) {
            console.error('Erro no checkout:', error);
            setErrorMsg(error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="animate-fade-in max-w-5xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors mb-4 font-medium"
                >
                    <span className="material-icons-outlined text-sm">arrow_back</span>
                    Voltar para Planos
                </button>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Checkout Seguro</h1>
            </div>

            <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Lado Esquerdo - Dados e Plano */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Box Seu Plano */}
                    <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white mb-4">
                            <span className="material-icons-outlined text-primary">auto_awesome</span>
                            Seu Plano
                        </h3>
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 flex flex-col items-center justify-center relative">
                            <div className="text-primary font-bold mb-2">{plan.name}</div>
                            <div className="text-3xl font-black text-gray-900 dark:text-white">{plan.price}</div>
                            <div className="text-sm text-gray-500 mt-1">
                                {plan.frequency === 1 ? 'cobrado mensalmente' : plan.frequency === 6 ? 'cobrado a cada semestre' : 'cobrado anualmente'}
                            </div>
                        </div>
                    </div>

                    {/* Box Dados Pessoais */}
                    <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white mb-4">
                            <span className="material-icons-outlined text-primary">person_outline</span>
                            Dados da Escola/Gestor
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CPF ou CNPJ</label>
                                <input
                                    required
                                    type="text"
                                    name="cpfCnpj"
                                    value={formData.cpfCnpj}
                                    onChange={handleChange}
                                    placeholder="000.000.000-00 ou CNPJ"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
                                <input
                                    required
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Como no documento"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail</label>
                                <input
                                    required
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="contato@escola.com"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone / Celular</label>
                                <input
                                    required
                                    type="text"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="(11) 99999-9999"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                                />
                            </div>
                        </div>

                        {!schoolId && (
                            <>
                                <hr className="border-gray-100 dark:border-slate-700 my-6" />
                                <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white mb-4">
                                    <span className="material-icons-outlined text-primary">lock_outline</span>
                                    Crie seu Acesso
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha de Acesso</label>
                                        <input
                                            required
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="Sua senha forte"
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirmar Senha</label>
                                        <input
                                            required
                                            type="password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            placeholder="Repita a senha"
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Box Endereço */}
                    <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white mb-4">
                            <span className="material-icons-outlined text-primary">location_on</span>
                            Endereço de Cobrança
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CEP</label>
                                <input
                                    required
                                    type="text"
                                    name="postalCode"
                                    value={formData.postalCode}
                                    onChange={handleChange}
                                    placeholder="00000-000"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número</label>
                                <input
                                    required
                                    type="text"
                                    name="addressNumber"
                                    value={formData.addressNumber}
                                    onChange={handleChange}
                                    placeholder="Ex: 123"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Complemento (Opcional)</label>
                                <input
                                    type="text"
                                    name="addressComplement"
                                    value={formData.addressComplement}
                                    onChange={handleChange}
                                    placeholder="Ex: Sala 2, Prédio B"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                </div>

                {/* Lado Direito - Pagamento */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm sticky top-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                                <span className="material-icons-outlined text-green-500">credit_card</span>
                                Pagamento
                            </h3>
                            <div className="flex gap-1">
                                <div className="w-8 h-5 bg-gray-200 dark:bg-slate-700 rounded flex items-center justify-center text-xs font-bold text-gray-400">VISA</div>
                                <div className="w-8 h-5 bg-gray-200 dark:bg-slate-700 rounded flex items-center justify-center text-xs font-bold text-gray-400">MC</div>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número do Cartão</label>
                                <input
                                    required
                                    type="text"
                                    name="cardNumber"
                                    value={formData.cardNumber}
                                    onChange={handleChange}
                                    placeholder="0000 0000 0000 0000"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white tracking-widest"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome no Cartão</label>
                                <input
                                    required
                                    type="text"
                                    name="cardHolderName"
                                    value={formData.cardHolderName}
                                    onChange={handleChange}
                                    placeholder="EXATAMENTE COMO NO CARTÃO"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white uppercase"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Validade</label>
                                    <input
                                        required
                                        type="text"
                                        name="cardExpiry"
                                        value={formData.cardExpiry}
                                        onChange={handleChange}
                                        placeholder="MM/AA"
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CVV</label>
                                    <input
                                        required
                                        type="text"
                                        name="cardCvv"
                                        value={formData.cardCvv}
                                        onChange={handleChange}
                                        placeholder="123"
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 dark:border-slate-700 pt-6 mb-6">
                            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                                <span>Plano {plan.name}</span>
                                <span>{plan.price} / {plan.frequency === 1 ? 'mês' : plan.frequency === 6 ? 'semestre' : 'ano'}</span>
                            </div>
                            <div className="flex items-end justify-between">
                                <span className="text-lg font-bold text-gray-900 dark:text-white">Total Hoje</span>
                                <span className="text-2xl font-black text-primary">{plan.price}</span>
                            </div>
                        </div>

                        {errorMsg && (
                            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100 flex items-start gap-2">
                                <span className="material-icons-outlined text-base mt-0.5">error_outline</span>
                                <span className="flex-1">{errorMsg}</span>
                            </div>
                        )}

                        <button
                            disabled={isProcessing}
                            type="submit"
                            className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Processando...
                                </>
                            ) : (
                                <>
                                    <span className="material-icons-outlined">lock</span>
                                    Pagar Agora
                                </>
                            )}
                        </button>
                        <p className="text-center text-[10px] text-gray-400 mt-4">
                            Pagamento processado com segurança via Asaas. Seus dados são criptografados.
                        </p>
                    </div>
                </div>
            </form>
        </div>
    );
};


export default CheckoutForm;

