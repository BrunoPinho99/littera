
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

interface LoginViewProps {
  onLoginSuccess: () => void;
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
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onLoginSuccess();
      } else {
        // --- FLUXO DE CADASTRO / RESGATE ---

        if (password !== confirmPassword) throw new Error("As senhas não coincidem!");
        if (password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");

        // 1. Fluxo para ESCOLA (O cadastro de escola foi migrado para o fluxo /cadastro)
        if (userType === 'school_admin') {
          window.location.href = '/cadastro';
          return;
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
    <div className="min-h-screen lg:h-screen w-full flex bg-background-light dark:bg-background-dark overflow-y-auto lg:overflow-hidden font-sans">
      {/* Lado Esquerdo - Branding Imersivo Premium */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#06132B] flex-col justify-between p-12 xl:p-16 overflow-hidden select-none">
        {/* Glows Ambientes Suaves */}
        <div className="absolute top-[-10%] right-[-10%] w-[520px] h-[520px] bg-[#1455E8]/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-15%] left-[-15%] w-[480px] h-[480px] bg-[#1455E8]/15 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute top-[45%] left-[-10%] w-[320px] h-[320px] bg-[#0A2663]/25 rounded-full blur-[100px] pointer-events-none" />

        {/* Textura sutil de micro-grid linear */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Formas Geométricas Orgânicas e Fluídas (SVG de Alta Fidelidade nas Extremidades) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 800 1000"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            {/* Gradiente de preenchimento fluido topo-direito */}
            <linearGradient id="fluid-top-grad" x1="800" y1="0" x2="450" y2="400" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1455E8" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#2563EB" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#06132B" stopOpacity="0" />
            </linearGradient>

            {/* Gradiente de traçado topo-direito */}
            <linearGradient id="stroke-top-grad" x1="800" y1="0" x2="400" y2="350" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#1455E8" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#06132B" stopOpacity="0" />
            </linearGradient>

            {/* Gradiente de preenchimento fluido base-esquerda */}
            <linearGradient id="fluid-bottom-grad" x1="0" y1="1000" x2="400" y2="650" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1455E8" stopOpacity="0.32" />
              <stop offset="65%" stopColor="#1D4ED8" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#06132B" stopOpacity="0" />
            </linearGradient>

            {/* Gradiente de traçado base-esquerda */}
            <linearGradient id="stroke-bottom-grad" x1="0" y1="1000" x2="450" y2="600" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#1455E8" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#06132B" stopOpacity="0" />
            </linearGradient>

            {/* Brilho radial focal */}
            <radialGradient id="focal-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(700 150) rotate(90) scale(260)">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#1455E8" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#06132B" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Curva Orgânica Superior Direita - Camada 1 (Profundidade Suave) */}
          <path
            d="M 520 0 C 580 140, 720 180, 800 240 L 800 0 Z"
            fill="url(#fluid-top-grad)"
          />

          {/* Curva Orgânica Superior Direita - Camada 2 (Onda Elegante) */}
          <path
            d="M 450 0 C 540 180, 680 230, 800 320"
            stroke="url(#stroke-top-grad)"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M 500 0 C 590 150, 710 200, 800 280"
            stroke="url(#stroke-top-grad)"
            strokeWidth="1.2"
            strokeDasharray="4 6"
            opacity="0.65"
          />

          {/* Curva Orgânica Base Esquerda - Camada 1 (Profundidade Suave) */}
          <path
            d="M 0 780 C 120 760, 260 880, 360 1000 L 0 1000 Z"
            fill="url(#fluid-bottom-grad)"
          />

          {/* Curva Orgânica Base Esquerda - Camada 2 (Onda Elegante) */}
          <path
            d="M 0 720 C 160 720, 290 840, 420 1000"
            stroke="url(#stroke-bottom-grad)"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M 0 770 C 130 780, 240 880, 340 1000"
            stroke="url(#stroke-bottom-grad)"
            strokeWidth="1.2"
            strokeDasharray="4 6"
            opacity="0.65"
          />

          {/* Orbe sutil iluminado topo-direito */}
          <circle cx="700" cy="150" r="240" fill="url(#focal-glow)" />
        </svg>

        {/* 1. Topo: Logo Littera Preservada */}
        <div className="relative z-10 animate-fade-in">
          <a
            href="/"
            className="inline-flex items-center transition-opacity hover:opacity-85 focus:outline-none"
            aria-label="Littera Início"
          >
            <img
              src="/assets/littera-logo.png"
              alt="Littera"
              className="block h-7 lg:h-[30px] w-auto brightness-0 invert"
            />
          </a>
        </div>

        {/* 2, 3, 4. Centro / Mensagem Principal com Alto Contraste */}
        <div className="relative z-10 my-auto max-w-lg space-y-7 animate-fade-in-up">
          <div className="space-y-3">
            <h1 className="text-4xl xl:text-5xl 2xl:text-[3.5rem] font-black tracking-[-0.035em] text-white leading-[1.08] font-sans">
              <span className="block">Suas ideias merecem ir mais longe.</span>
              <span className="block mt-2.5 text-transparent bg-clip-text bg-gradient-to-r from-[#2F6BFF] via-[#3B82F6] to-[#60A5FA]">
                A inteligência para chegar lá.
              </span>
            </h1>
          </div>

          <p className="text-base sm:text-lg text-slate-300/85 leading-relaxed font-normal max-w-md font-sans">
            Escrita, conhecimento e inteligência artificial trabalhando juntos para desenvolver seu potencial.
          </p>
        </div>

        {/* 5. Base: Assinatura Editorial Minimalista */}
        <div className="relative z-10 flex items-center gap-3 text-xs font-medium text-slate-400/60 font-sans tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1455E8] shadow-[0_0_8px_#1455E8]" />
          <span>Plataforma de inteligência e desenvolvimento da escrita</span>
        </div>
      </div>

      {/* Lado Direito - Formulário Glassmorphism */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-grid overflow-y-auto">
        <div className="w-full max-w-md animate-fade-in-up py-8">
            <div className="bg-white dark:bg-surface-dark rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-premium border border-gray-100 dark:border-white/5 relative overflow-hidden">

            <div className="mb-6 text-center">
              <h2 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tighter">
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
                  onClick={() => {
                    if (!isLogin && type === 'school_admin') {
                      window.location.href = '/cadastro';
                      return;
                    }
                    setUserType(type);
                  }}
                  className={`flex-1 py-3.5 text-[9px] font-black uppercase tracking-widest rounded-[1.4rem] transition-all duration-300 ${userType === type
                    ? 'bg-white dark:bg-white/10 text-primary shadow-lg scale-100'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                    }`}
                >
                  {type === 'student' ? 'ALUNO' : type === 'teacher' ? 'DOCENTE' : 'ESCOLA'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
              {showActivatedBanner && (
                <div className="p-5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/20 rounded-2xl text-center animate-fade-in-up">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="material-icons-outlined text-emerald-500 text-2xl">check_circle</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-black text-sm">Pagamento Confirmado!</span>
                  </div>
                  <p className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                    Sua assinatura foi ativada com sucesso. Faça login para acessar o painel completo.
                  </p>
                </div>
              )}

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
                <div className="space-y-1 group">
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

              <div className="space-y-1 group">
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

              <div className="space-y-1 group">
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
                <div className="space-y-1 group">
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
                className="w-full py-4 mt-2 rounded-[1.8rem] font-black text-white bg-primary hover:bg-primary-dark shadow-xl shadow-primary/25 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
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

              {/* Botão Testar como Aluno — só aparece no modo login + perfil aluno */}
              {isLogin && userType === 'student' && (
                <button
                  type="button"
                  onClick={() => onEnterDemo('student')}
                  className="w-full py-3.5 rounded-[1.8rem] font-black text-primary bg-primary/5 hover:bg-primary/10 border-2 border-primary/20 hover:border-primary/40 transition-all flex items-center justify-center gap-2.5 active:scale-95 group"
                >
                  <span className="material-icons-outlined text-lg group-hover:rotate-12 transition-transform">science</span>
                  <span className="text-[10px] uppercase tracking-[0.2em]">Experimentar sem cadastro</span>
                </button>
              )}

              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                {isLogin
                  ? (userType === 'school_admin' ? 'Ainda não tem conta?' : 'Foi convidado pela escola?')
                  : 'Já tem cadastro?'}
                <button
                  type="button"
                  onClick={() => {
                    if (isLogin && userType === 'school_admin') {
                      window.location.href = '/cadastro';
                      return;
                    }
                    setIsLogin(!isLogin);
                    setErrorMessage(null);
                  }}
                  className="ml-2 text-gray-900 dark:text-white hover:text-primary transition-colors underline decoration-primary/20 underline-offset-4"
                >
                  {isLogin
                    ? (userType === 'school_admin' ? 'Criar Conta' : 'Resgatar Convite')
                    : 'Fazer Login'}
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
