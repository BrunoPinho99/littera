
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

interface LoginViewProps {
  onLoginSuccess: () => void;
  onEnterDemo: (type: 'student' | 'teacher' | 'school_admin') => void;
}

type UserTypeSelection = 'student' | 'teacher' | 'school_admin';

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onEnterDemo }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState<UserTypeSelection>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (isLogin) {
        // --- FLUXO DE LOGIN ---
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onLoginSuccess();
      } else {
        // --- FLUXO DE CADASTRO / RESGATE ---

        if (password !== confirmPassword) throw new Error("As senhas não coincidem!");
        if (password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");

        // 1. Fluxo para ESCOLA (Cadastro Livre)
        if (userType === 'school_admin') {
          // PASSO 1: Criar o usuário Auth (sem school_id ainda para evitar erro de trigger)
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: name,
                user_type: userType,
                // Não enviamos school_id aqui para não quebrar a integridade referencial no trigger de criação
              }
            }
          });

          if (signUpError) throw signUpError;

          // PASSO 2: Se logou com sucesso, criar a escola e vincular
          if (signUpData.session && signUpData.user) {
            const schoolId = crypto.randomUUID();

            // Cria a escola na tabela pública
            const { error: schoolError } = await supabase.from('schools').insert({
              id: schoolId,
              name: name,
              slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
            });

            if (schoolError) {
              console.error("Erro ao criar escola:", schoolError);
              throw new Error("Erro ao registrar dados da instituição.");
            }

            // Atualiza o perfil do usuário com o ID da escola recém criada
            // Usamos upsert para garantir que o perfil exista, mesmo se o trigger de criação do Auth falhar ou atrasar
            const { error: profileError } = await supabase.from('profiles').upsert({
              id: signUpData.user.id,
              school_id: schoolId,
              role: 'school_admin',
              full_name: name,
              email: email,
              status: 'active'
            });

            if (profileError) {
              console.error("Erro ao vincular perfil:", JSON.stringify(profileError));
              // Não lançamos erro aqui para não bloquear o fluxo se o usuário já estiver criado
            }

            // Atualiza metadata do usuário para sessões futuras
            await supabase.auth.updateUser({
              data: { school_id: schoolId }
            });

            setSuccessMessage("Instituição cadastrada com sucesso! Bem-vindo.");
            // Pequeno delay para exibir mensagem antes de entrar
            setTimeout(() => onLoginSuccess(), 1500);
          } else if (signUpData.user && !signUpData.session) {
            setSuccessMessage("Cadastro realizado! Verifique seu e-mail para confirmar a conta antes de entrar.");
            setTimeout(() => setIsLogin(true), 3000);
          }
        }
        // 2. Fluxo para ALUNO e PROFESSOR (Resgate de Convite)
        else {
          // Verifica se existe um pré-cadastro (convite) feito pela escola
          const { data: existingProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();

          if (!existingProfile || profileError) {
            throw new Error("Convite não encontrado. Peça para sua escola cadastrar seu e-mail primeiro.");
          }

          const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: existingProfile.full_name,
                user_type: userType,
                school_id: existingProfile.school_id,
                class_id: existingProfile.class_id,
                avatar_url: `https://ui-avatars.com/api/?name=${existingProfile.full_name}&background=8B5CF6&color=fff`
              }
            }
          });

          if (authError) {
            if (authError.message.includes("already registered")) {
              throw new Error("Este usuário já possui cadastro. Faça login.");
            }
            throw authError;
          }

          if (authData.user) {
            // Remove o perfil "convite" (que não tem ID de usuário real)
            await supabase.from('profiles').delete().eq('email', email).is('user_id', null);

            // Garante upsert do perfil oficial com os dados corretos vinculados ao ID do Auth
            const { error: linkError } = await supabase.from('profiles').upsert({
              id: authData.user.id,
              full_name: existingProfile.full_name,
              role: userType,
              school_id: existingProfile.school_id,
              class_id: existingProfile.class_id,
              email: email,
              status: 'active'
            });

            if (linkError) {
              console.error("Erro ao vincular perfil de aluno:", JSON.stringify(linkError));
            }

            setSuccessMessage(`Convite resgatado! Bem-vindo(a), ${existingProfile.full_name}.`);

            if (authData.session) {
              setTimeout(() => onLoginSuccess(), 1500);
            } else {
              setTimeout(() => setIsLogin(true), 3000);
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Erro no processo:", error);
      const msg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      setErrorMessage(msg || "Falha na operação. Verifique sua conexão.");
    } finally {
      setIsLoading(false);
    }
  };

  const checkConnection = async () => {
    try {
      const { error } = await supabase.from('schools').select('count', { count: 'exact', head: true });
      if (error) throw error;
      alert("Conexão com Supabase OK!");
    } catch (e: any) {
      alert("Erro de conexão: " + (e.message || JSON.stringify(e)));
    }
  };

  return (
    <div className="h-screen w-full flex bg-background-light dark:bg-background-dark overflow-hidden font-sans">
      {/* Lado Esquerdo - Branding Imersivo */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary items-center justify-center p-16 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative z-10 text-white max-w-xl text-left">
          <div className="flex items-center gap-4 mb-16 animate-fade-in">
            <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center shadow-2xl">
              <div className="flex flex-col items-center translate-y-[2px]">
                <span className="text-primary font-black text-4xl leading-none tracking-tighter">L</span>
                <div className="w-7 h-[6px] bg-primary mt-[1px] rounded-full"></div>
              </div>
            </div>
            <span className="font-black text-6xl tracking-tighter text-white">
              Littera<span className="text-white/40">.</span>
            </span>
          </div>

          <div className="space-y-8 animate-fade-in-up">
            <h1 className="text-6xl font-black leading-[1.1] tracking-tight">
              {isLogin ? 'Potencialize sua escrita com I.A.' : 'Você foi convidado?'}
            </h1>
            <p className="text-xl opacity-80 leading-relaxed font-medium max-w-md">
              {isLogin
                ? 'A plataforma definitiva para quem busca excelência. Correção instantânea, gestão de dados e evolução contínua.'
                : 'Resgate seu convite institucional para criar sua senha e acessar a plataforma da sua escola.'}
            </p>
          </div>
        </div>
      </div>

      {/* Lado Direito - Formulário Glassmorphism */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-grid">
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-8 shadow-premium border border-gray-100 dark:border-white/5 relative overflow-hidden">

            <div className="mb-6 text-center">
              <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tighter">
                {isLogin ? 'Bem-vindo' : 'Ativar Conta'}
              </h2>
              <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.3em]">
                {isLogin ? 'Acesse seu painel exclusivo' : 'Defina sua senha de acesso'}
              </p>
            </div>

            {/* Selector de Perfil Dinâmico */}
            <div className="flex bg-gray-50 dark:bg-white/5 p-1 rounded-[1.4rem] mb-6 shadow-inner">
              {(['student', 'teacher', 'school_admin'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setUserType(type)}
                  className={`flex-1 py-3.5 text-[9px] font-black uppercase tracking-widest rounded-[1.4rem] transition-all duration-300 ${userType === type
                    ? 'bg-white dark:bg-white/10 text-primary shadow-lg scale-100'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                    }`}
                >
                  {type === 'student' ? 'ALUNO' : type === 'teacher' ? 'DOCENTE' : 'ESCOLA'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
              {errorMessage && (
                <div className="p-5 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-2xl text-rose-600 dark:text-rose-400 text-xs font-bold text-center animate-shake">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="p-5 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 rounded-2xl text-green-600 dark:text-green-400 text-xs font-bold text-center animate-pulse">
                  {successMessage}
                </div>
              )}

              {/* Nome só é necessário para Escolas novas. Alunos/Profs já têm nome no convite. */}
              {!isLogin && userType === 'school_admin' && (
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-primary">
                    NOME DA INSTITUIÇÃO
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Colégio Anglo"
                    className="w-full px-5 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
                  />
                </div>
              )}

              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-primary">E-MAIL</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={!isLogin && userType !== 'school_admin' ? "Email onde recebeu o convite" : "exemplo@littera.com"}
                  className="w-full px-5 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
                />
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-primary">SENHA</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-5 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
                />
              </div>

              {!isLogin && (
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-primary">CONFIRMAR SENHA</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-5 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-5 rounded-[1.8rem] font-black text-white bg-primary hover:bg-primary-dark shadow-xl shadow-primary/25 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <span className="text-sm uppercase tracking-widest">
                    {isLogin ? 'Entrar Agora' : (userType === 'school_admin' ? 'Criar Instituição' : 'Resgatar Convite')}
                  </span>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-gray-50 dark:border-white/5 text-center space-y-2">
              <button
                type="button"
                onClick={checkConnection}
                className="opacity-0 hover:opacity-20 text-[8px] uppercase tracking-widest absolute bottom-2 left-2"
              >
                Debug Conexão
              </button>
              <button
                type="button"
                onClick={() => onEnterDemo(userType)}
                className="text-[10px] font-black text-primary hover:text-primary-dark uppercase tracking-[0.2em] transition-colors"
              >
                Acesso Demonstrativo ({userType === 'student' ? 'Aluno' : userType === 'teacher' ? 'Docente' : 'Escola'})
              </button>
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                {isLogin ? 'Foi convidado pela escola?' : 'Já tem cadastro?'}
                <button
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setErrorMessage(null); }}
                  className="ml-2 text-gray-900 dark:text-white hover:text-primary transition-colors underline decoration-primary/20 underline-offset-4"
                >
                  {isLogin ? 'Resgatar Convite' : 'Fazer Login'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .bg-grid {
          background-image: radial-gradient(circle, #e5e7eb 1px, transparent 1px);
          background-size: 30px 30px;
        }
        .dark .bg-grid {
          background-image: radial-gradient(circle, #1f2937 1px, transparent 1px);
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default LoginView;
