import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const SetupAccount: React.FC = () => {
  const [email, setEmail] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      // Chama a Edge Function para definir a senha
      const { data, error: functionError } = await supabase.functions.invoke('setup-password', {
        body: { email, cpfCnpj, newPassword: password }
      });

      if (functionError) {
        throw new Error('Falha ao configurar a senha. Verifique seus dados ou aguarde alguns instantes se você acabou de pagar.');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setSuccess('Senha configurada com sucesso! Entrando...');

      // Faz login automaticamente
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (loginError) {
        throw new Error('Conta configurada, mas não foi possível entrar automaticamente. Tente fazer login.');
      }

      // Redireciona para o app
      navigate('/app/inst-overview');

    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao configurar a conta.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Configurar Acesso</h2>
        <p className="text-slate-500 mb-6">
          Obrigado por assinar! Confirme os dados usados no pagamento para criar sua senha de acesso ao Littera.
        </p>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg text-sm">{success}</div>}

        <form onSubmit={handleSetup} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">E-mail usado no pagamento</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              placeholder="exemplo@escola.com.br"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">CPF ou CNPJ do pagador</label>
            <input
              type="text"
              required
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              placeholder="Apenas números"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Crie uma Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Configurando...' : 'Criar Senha e Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetupAccount;
