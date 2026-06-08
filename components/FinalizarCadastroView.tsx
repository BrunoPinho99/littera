import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const FinalizarCadastroView: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Read from localStorage to know who is finishing
    const savedForm = localStorage.getItem('littera_onboarding_form');
    if (savedForm) {
      try {
        setFormData(JSON.parse(savedForm));
      } catch (e) {}
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (!formData) {
      setError('Dados de cadastro não encontrados. Por favor, volte e tente novamente.');
      return;
    }

    setIsLoading(true);

    try {
      const asaasCustomerId = localStorage.getItem('littera_asaas_customer');
      const subscriptionId = localStorage.getItem('littera_asaas_subscription');

      // Call the complete-onboarding function
      const { data, error: fnError } = await supabase.functions.invoke('complete-onboarding', {
        body: {
          ...formData,
          password: password,
          asaasCustomerId,
          subscriptionId
        },
      });

      if (fnError || data?.error) {
        throw new Error(fnError?.message || data?.error || 'Erro ao criar conta final. Entre em contato com o suporte.');
      }

      // Cleanup local storage
      localStorage.removeItem('littera_onboarding_form');
      localStorage.removeItem('littera_asaas_customer');
      localStorage.removeItem('littera_asaas_subscription');

      // Login and redirect
      await supabase.auth.signInWithPassword({
        email: formData.email.toLowerCase().trim(),
        password: password,
      });

      navigate('/app/inst-overview');
    } catch (err: any) {
      setError(err.message || 'Erro inesperado.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-surface-dark p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-white/5 animate-fade-in-up">
        
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
            <span className="material-icons-outlined text-3xl">check_circle</span>
          </div>
        </div>

        <h1 className="text-2xl font-black text-center text-gray-900 dark:text-white tracking-tight mb-2">
          Pagamento Confirmado!
        </h1>
        <p className="text-center text-gray-500 text-sm mb-8">
          Falta pouco, {formData?.schoolName || 'Diretor'}! Crie sua senha de acesso para entrar no Littera.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-2xl text-rose-600 dark:text-rose-400 text-xs font-bold text-center animate-shake">
            <span className="material-icons-outlined text-sm mr-1 align-middle">error_outline</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail</label>
            <input
              type="email"
              value={formData?.email || ''}
              disabled
              className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-white/5 border border-transparent font-bold text-sm text-gray-500 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5 group">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors">Senha de Acesso</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 font-bold text-sm transition-all outline-none"
              autoFocus
            />
          </div>

          <div className="space-y-1.5 group">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors">Confirmar Senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 font-bold text-sm transition-all outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 py-4 rounded-2xl font-black text-sm text-white bg-primary hover:bg-primary-dark shadow-xl shadow-primary/25 transition-all flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Acessar Plataforma'
            )}
          </button>
        </form>

      </div>
    </div>
  );
};

export default FinalizarCadastroView;
