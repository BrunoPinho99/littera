import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

interface LoginViewProps {
  onLoginSuccess: (session?: any) => Promise<void> | void;
  onEnterDemo: (type: 'student' | 'teacher' | 'school_admin') => void;
}

type UserTypeSelection = 'student' | 'teacher' | 'school_admin';

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onEnterDemo }) => {
  const [searchParams] = useSearchParams();
  const isActivated = searchParams.get('activated') === 'true';

  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState<UserTypeSelection>(isActivated ? 'school_admin' : 'student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showActivatedBanner, setShowActivatedBanner] = useState(isActivated);

  // Auto-dismiss activated banner after 8 seconds
  useEffect(() => {
    if (showActivatedBanner) {
      const timer = setTimeout(() => setShowActivatedBanner(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [showActivatedBanner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (isLogin) {
        // --- FLUXO DE LOGIN ---
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await onLoginSuccess(data?.session);
      } else {
        // --- FLUXO DE CADASTRO / RESGATE ---
        if (password !== confirmPassword) throw new Error("As senhas não coincidem!");
        if (password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");

        // 1. Fluxo para ESCOLA (O cadastro de escola vai para o fluxo /cadastro)
        if (userType === 'school_admin') {
          window.location.href = '/cadastro';
          return;
        } else {
          // 2. Fluxo para ALUNO e PROFESSOR (Resgate de Convite)
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
                avatar_url: `https://ui-avatars.com/api/?name=${existingProfile.full_name}&background=2F5BFF&color=fff`
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
            // Remove o perfil "convite" temporário
            await supabase.from('profiles').delete().eq('email', email).is('user_id', null);

            // Vincula o perfil oficial
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
              console.error("Erro ao vincular perfil:", JSON.stringify(linkError));
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

  return (
    <div className="bg-[#f6f8fb] min-h-screen flex items-center justify-center p-3 sm:p-6 md:p-8 font-sans antialiased text-slate-800">
      {/* Container Principal do Card de Autenticação */}
      <main
        className="w-full max-w-[1020px] bg-white rounded-3xl md:rounded-[32px] p-4 sm:p-5 md:p-4 auth-card-shadow flex flex-col md:flex-row items-stretch border border-slate-100/80"
        data-purpose="auth-container"
      >
        {/* Banner Esquerdo - Identidade Visual & Mensagem Conceitual (Oculto no mobile conforme solicitado) */}
        <div className="hidden md:flex md:w-[46%] rounded-[24px] bg-gradient-to-b from-[#2563EB] via-[#1D4ED8] to-[#1E3A8A] p-7 md:p-10 flex-col justify-between relative overflow-hidden shrink-0 min-h-[580px]">
          {/* Logo / Link Home */}
          <div className="relative z-10 flex items-center justify-between">
            <a
              href="/"
              className="inline-flex items-center gap-2.5 text-white focus:outline-none transition-opacity hover:opacity-90"
              title="Voltar para a página inicial"
            >
              <img
                src="/assets/littera-logo.png"
                alt="Littera"
                className="h-7 md:h-8 w-auto brightness-0 invert"
              />
            </a>
          </div>

          {/* Ambient Lighting Accents */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-blue-400/25 blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -top-12 w-64 h-64 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />

          {/* Textura sutil */}
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
              backgroundSize: '36px 36px',
            }}
          />

          {/* Headline & Kicker */}
          <div className="relative z-10 mt-auto pt-10">
            <p className="text-[11px] font-bold tracking-[0.18em] text-blue-200 uppercase mb-3">
              REDAÇÃO NOTA 1000
            </p>
            <h1 className="text-2xl md:text-[28px] font-bold text-white leading-tight tracking-tight">
              A nota 1000 no ENEM começa na inteligência de cada correção.
            </h1>
            <p className="mt-3.5 text-xs text-blue-100/80 leading-relaxed font-normal">
              Correções com padrão banca examinadora, devolutivas em segundos e gestão pedagógica completa.
            </p>
          </div>
        </div>

        {/* Lado Direito - Painel de Acesso / Formulário */}
        <div className="w-full md:w-[54%] py-2 px-1 sm:px-4 md:py-10 md:px-12 flex flex-col justify-center">
          {/* Logo no Mobile */}
          <div className="flex md:hidden items-center justify-between mb-4">
            <a
              href="/"
              className="inline-flex items-center focus:outline-none"
              title="Voltar para a página inicial"
            >
              <img
                src="/assets/littera-logo.png"
                alt="Littera"
                className="h-7 w-auto object-contain"
              />
            </a>
          </div>

          {/* Segmented Tabs / Seletor de Perfil */}
          <div className="mb-4 sm:mb-6" data-purpose="role-selector">
            <div className="inline-flex bg-[#f1f4f9] p-1 rounded-2xl w-full justify-between gap-1 border border-slate-200/50">
              {/* Aluno */}
              <button
                type="button"
                aria-selected={userType === 'student'}
                onClick={() => setUserType('student')}
                className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:py-2.5 sm:px-3 rounded-xl text-xs sm:text-[13px] font-semibold transition-all duration-200 min-w-0 ${
                  userType === 'student'
                    ? 'bg-white pill-shadow text-[#2F5BFF]'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <svg
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${userType === 'student' ? 'text-[#2F5BFF]' : 'text-slate-400'}`}
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
                <span className="truncate">Aluno</span>
              </button>

              {/* Professor */}
              <button
                type="button"
                aria-selected={userType === 'teacher'}
                onClick={() => setUserType('teacher')}
                className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:py-2.5 sm:px-3 rounded-xl text-xs sm:text-[13px] font-semibold transition-all duration-200 min-w-0 ${
                  userType === 'teacher'
                    ? 'bg-white pill-shadow text-[#2F5BFF]'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <svg
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${userType === 'teacher' ? 'text-[#2F5BFF]' : 'text-slate-400'}`}
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <rect height="18" rx="2" width="18" x="3" y="3" />
                  <circle cx="12" cy="10" r="3" />
                  <path d="M7 21v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
                </svg>
                <span className="truncate">Professor</span>
              </button>

              {/* Escola */}
              <button
                type="button"
                aria-selected={userType === 'school_admin'}
                onClick={() => {
                  if (!isLogin) {
                    window.location.href = '/cadastro';
                    return;
                  }
                  setUserType('school_admin');
                }}
                className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:py-2.5 sm:px-3 rounded-xl text-xs sm:text-[13px] font-semibold transition-all duration-200 min-w-0 ${
                  userType === 'school_admin'
                    ? 'bg-white pill-shadow text-[#2F5BFF]'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <svg
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${userType === 'school_admin' ? 'text-[#2F5BFF]' : 'text-slate-400'}`}
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M4 22h16" />
                  <path d="M4 10V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v18" />
                  <path d="M9 10h1" />
                  <path d="M14 10h1" />
                  <path d="M9 14h1" />
                  <path d="M14 14h1" />
                  <path d="M9 18h1" />
                  <path d="M14 18h1" />
                </svg>
                <span className="truncate">Escola</span>
              </button>
            </div>
          </div>

          {/* Cabeçalho da Seção */}
          <div className="mb-4 sm:mb-6" data-purpose="form-header">
            <h2 className="text-xl sm:text-2xl md:text-[28px] font-bold text-slate-900 tracking-tight leading-snug">
              {isLogin ? 'Acessar sua conta' : 'Resgatar Convite'}
            </h2>
            <p className="text-xs sm:text-[13px] text-slate-500 mt-1 leading-relaxed">
              {isLogin
                ? 'Acesse suas redações, anotações e atividades a qualquer momento.'
                : 'Defina sua senha de acesso vinculada ao convite recebido da sua instituição.'}
            </p>
          </div>

          {/* Banners de Notificação / Feedback */}
          {showActivatedBanner && (
            <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800 font-semibold">
              🎉 Pagamento Confirmado! Sua assinatura escolar está ativa. Faça login para continuar.
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl text-center text-xs text-rose-700 font-medium animate-shake">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3.5 bg-green-50 border border-green-200/80 rounded-xl text-center text-xs text-green-700 font-medium">
              {successMessage}
            </div>
          )}

          {/* Formulário de Acesso */}
          <form onSubmit={handleSubmit} className="space-y-4" data-purpose="login-form">
            {/* Nome da Instituição (quando aplicável) */}
            {!isLogin && userType === 'school_admin' && (
              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium text-slate-700" htmlFor="institution-name">
                  Nome da Instituição
                </label>
                <input
                  id="institution-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Colégio Anglo"
                  className="w-full h-11 px-4 text-[14px] text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-xl focus:border-[#2F5BFF] focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                />
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-slate-700" htmlFor="email">
                Seu e-mail
              </label>
              <input
                id="email"
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={!isLogin && userType !== 'school_admin' ? "E-mail onde recebeu o convite" : "seu.email@exemplo.com.br"}
                className="w-full h-11 px-4 text-[14px] text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-xl focus:border-[#2F5BFF] focus:ring-2 focus:ring-blue-100 transition-all outline-none"
              />
            </div>

            {/* Senha */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between">
                <label className="block text-[13px] font-medium text-slate-700" htmlFor="password">
                  Senha
                </label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!email) {
                        alert("Por favor, digite seu e-mail no campo acima para redefinir a senha.");
                        return;
                      }
                      supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: `${window.location.origin}/login`
                      }).then(({ error }) => {
                        if (error) alert("Erro ao enviar e-mail: " + error.message);
                        else alert("Instruções de recuperação enviadas para o seu e-mail!");
                      });
                    }}
                    className="text-[12.5px] font-medium text-[#2F5BFF] hover:text-blue-700 transition-colors"
                  >
                    Esqueceu sua senha?
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-11 pl-4 pr-11 text-[14px] tracking-wider text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-xl focus:border-[#2F5BFF] focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label="Alternar visualização da senha"
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 focus:outline-none transition p-0.5"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirmar Senha (Modo Cadastro / Resgate) */}
            {!isLogin && (
              <div className="space-y-1.5 pt-0.5">
                <label className="block text-[13px] font-medium text-slate-700" htmlFor="confirmPassword">
                  Confirmar Senha
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-11 px-4 text-[14px] tracking-wider text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-xl focus:border-[#2F5BFF] focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                />
              </div>
            )}

            {/* Botão de Submissão Principal */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-[#2F5BFF] hover:bg-[#254ED8] active:bg-[#1E3A8A] text-white text-[15px] font-medium rounded-xl shadow-lg shadow-blue-500/25 transition-all transform active:scale-[0.99] flex items-center justify-center disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>{isLogin ? 'Entrar' : 'Confirmar e Ativar Conta'}</span>
                )}
              </button>
            </div>

            {/* Experimentar sem cadastro (Modo Aluno Demo) */}
            {isLogin && userType === 'student' && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => onEnterDemo('student')}
                  className="w-full h-11 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[13px] font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-icons-outlined text-base text-[#2F5BFF]">science</span>
                  <span>Experimentar sem cadastro (Modo Demo)</span>
                </button>
              </div>
            )}

            {/* Link Alternativo: Alternar entre Login e Cadastro */}
            <p className="text-center text-[13px] text-slate-500 pt-3">
              {isLogin ? (
                <>
                  {userType === 'school_admin' ? 'Não tem uma conta escolar? ' : 'Foi convidado pela sua escola? '}
                  <button
                    type="button"
                    onClick={() => {
                      if (userType === 'school_admin') {
                        window.location.href = '/cadastro';
                        return;
                      }
                      setIsLogin(false);
                      setErrorMessage(null);
                    }}
                    className="font-semibold text-[#2F5BFF] hover:text-blue-700 transition-colors"
                  >
                    {userType === 'school_admin' ? 'Cadastre-se gratuitamente' : 'Resgatar meu convite'}
                  </button>
                </>
              ) : (
                <>
                  Já possui uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      setErrorMessage(null);
                    }}
                    className="font-semibold text-[#2F5BFF] hover:text-blue-700 transition-colors"
                  >
                    Fazer Login
                  </button>
                </>
              )}
            </p>

            {/* LGPD e Termos */}
            <p className="text-[11px] text-slate-400 text-center leading-tight pt-2">
              Ao acessar, você concorda com nossos{' '}
              <a href="/termos" className="underline hover:text-slate-600 transition-colors">Termos de Uso</a>{' '}
              e a{' '}
              <a href="/privacidade" className="underline hover:text-slate-600 transition-colors">Política de Privacidade (LGPD)</a>.
            </p>
          </form>
        </div>
      </main>

      <style>{`
        .auth-card-shadow {
          box-shadow: 0 25px 60px -15px rgba(50, 65, 110, 0.12), 0 10px 25px -10px rgba(50, 65, 110, 0.08);
        }
        .pill-shadow {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
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
