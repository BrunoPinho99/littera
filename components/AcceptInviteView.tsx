
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// Extracts hash/query params from the current URL (Supabase sends tokens in the hash)
const extractTokenFromURL = (): { token: string | null; type: string | null; accessToken: string | null } => {
  // Supabase invite links use the hash fragment: #access_token=...&type=invite
  const hash = window.location.hash.substring(1);
  const search = window.location.search.substring(1);

  const parseParams = (str: string) => {
    const params = new URLSearchParams(str);
    return {
      token: params.get('token'),
      type: params.get('type'),
      accessToken: params.get('access_token'),
    };
  };

  const fromHash = parseParams(hash);
  const fromSearch = parseParams(search);

  return {
    token: fromHash.token || fromSearch.token,
    type: fromHash.type || fromSearch.type,
    accessToken: fromHash.accessToken || fromSearch.accessToken,
  };
};

const AcceptInviteView: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  // Form state
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Invite metadata
  const [inviteMeta, setInviteMeta] = useState<{
    email: string;
    schoolName: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    const initInvite = async () => {
      const { token, type, accessToken } = extractTokenFromURL();

      // Supabase invite: the hash contains access_token + type=invite
      // We need to exchange it for a session via verifyOtp or setSession
      if (accessToken && type === 'invite') {
        try {
          // Exchange the token — Supabase will validate it and return a session
          const refreshToken = new URLSearchParams(window.location.hash.substring(1)).get('refresh_token') || '';
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error || !data.session) {
            throw new Error('Link de convite inválido ou expirado. Solicite um novo convite à sua escola.');
          }

          const user = data.session.user;
          const meta = user.user_metadata;

          setInviteMeta({
            email: user.email ?? '',
            schoolName: meta?.invited_by_school || meta?.school_name || 'sua escola',
            role: meta?.user_type === 'teacher' ? 'Professor(a)' : 'Aluno(a)',
          });

          // Pre-fill name if already set in metadata
          if (meta?.full_name) {
            setFullName(meta.full_name);
          }

          setStep('form');
        } catch (err: any) {
          setErrorMsg(err.message || 'Erro ao validar convite.');
          setStep('error');
        }
        return;
      }

      // Supabase token-based OTP flow (older format)
      if (token && type === 'invite') {
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'invite',
          });

          if (error || !data.session) {
            throw new Error('Link de convite inválido ou expirado.');
          }

          const user = data.session.user;
          const meta = user.user_metadata;

          setInviteMeta({
            email: user.email ?? '',
            schoolName: meta?.invited_by_school || meta?.school_name || 'sua escola',
            role: meta?.user_type === 'teacher' ? 'Professor(a)' : 'Aluno(a)',
          });

          if (meta?.full_name) setFullName(meta.full_name);

          setStep('form');
        } catch (err: any) {
          setErrorMsg(err.message || 'Erro ao validar convite.');
          setStep('error');
        }
        return;
      }

      // No token found
      setErrorMsg('Nenhum token de convite encontrado na URL. Use o link enviado para o seu email.');
      setStep('error');
    };

    initInvite();
  }, []);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (!fullName.trim()) {
      setErrorMsg('Por favor, informe seu nome completo.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // Update password and name for the current session (which was set via invite token)
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { full_name: fullName.trim() },
      });

      if (updateError) throw updateError;

      // Also update the profiles table
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('profiles').upsert({
          id: session.user.id,
          full_name: fullName.trim(),
          email: session.user.email,
          role: session.user.user_metadata?.user_type || 'student',
          school_id: session.user.user_metadata?.school_id,
          class_id: session.user.user_metadata?.class_id,
          status: 'active',
        });
      }

      setStep('success');

      // Redirect to app after 2s
      setTimeout(() => {
        navigate('/app/practice', { replace: true });
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao ativar conta. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleIcon = inviteMeta?.role === 'Professor(a)' ? 'school' : 'menu_book';
  const roleColor = inviteMeta?.role === 'Professor(a)' ? 'bg-violet-500' : 'bg-primary';

  return (
    <div className="h-screen w-full flex bg-background-light dark:bg-background-dark overflow-hidden font-sans">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary items-center justify-center p-16 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 text-white max-w-xl">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-16">
            <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center shadow-2xl">
              <div className="flex flex-col items-center translate-y-[2px]">
                <span className="text-primary font-black text-4xl leading-none tracking-tighter">L</span>
                <div className="w-7 h-[6px] bg-primary mt-[1px] rounded-full" />
              </div>
            </div>
            <span className="font-black text-6xl tracking-tighter text-white">
              Littera<span className="text-white/40">.</span>
            </span>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="material-icons-outlined text-white/60 text-3xl">mark_email_read</span>
              <span className="text-white/60 font-bold text-sm uppercase tracking-widest">Convite recebido</span>
            </div>
            <h1 className="text-5xl font-black leading-[1.1] tracking-tight">
              Você foi convidado para a Littera!
            </h1>
            <p className="text-xl opacity-75 leading-relaxed font-medium max-w-md">
              {inviteMeta
                ? `${inviteMeta.schoolName} te convidou para fazer parte da plataforma de correção inteligente de redações.`
                : 'Crie sua senha para acessar a plataforma de correção de redações com I.A.'}
            </p>

            {/* Feature bullets */}
            <div className="space-y-3 pt-4">
              {[
                { icon: 'auto_awesome', text: 'Correção inteligente com I.A.' },
                { icon: 'insights', text: 'Evolução mês a mês' },
                { icon: 'emoji_events', text: 'Ranking da turma' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="material-icons-outlined text-white text-base">{icon}</span>
                  </div>
                  <span className="text-white/80 font-semibold text-sm">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-grid">
        <div className="w-full max-w-md">

          {/* LOADING */}
          {step === 'loading' && (
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-gray-500 font-bold">Verificando seu convite...</p>
            </div>
          )}

          {/* ERROR */}
          {step === 'error' && (
            <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-10 shadow-premium border border-gray-100 dark:border-white/5 text-center space-y-6">
              <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/20 rounded-3xl flex items-center justify-center mx-auto">
                <span className="material-icons-outlined text-rose-500 text-4xl">link_off</span>
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Link Inválido</h2>
                <p className="text-gray-500 font-medium text-sm leading-relaxed">{errorMsg}</p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-4 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white font-bold rounded-2xl hover:bg-gray-200 transition-all text-sm"
              >
                Ir para o Login
              </button>
            </div>
          )}

          {/* SUCCESS */}
          {step === 'success' && (
            <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-10 shadow-premium border border-gray-100 dark:border-white/5 text-center space-y-6">
              <div className="relative mx-auto w-24 h-24">
                <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/20 rounded-3xl flex items-center justify-center">
                  <span className="material-icons-outlined text-emerald-500 text-5xl">check_circle</span>
                </div>
                <div className="absolute -top-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center animate-bounce">
                  <span className="material-icons-outlined text-white text-base">auto_awesome</span>
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Conta Ativada!</h2>
                <p className="text-gray-500 font-medium">
                  Bem-vindo(a) ao Littera, <span className="font-bold text-gray-700 dark:text-gray-200">{fullName}</span>!
                  Redirecionando para a plataforma...
                </p>
              </div>
              <div className="w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full animate-[grow_2.5s_linear_forwards]" style={{ width: '100%', transformOrigin: 'left' }} />
              </div>
            </div>
          )}

          {/* FORM */}
          {step === 'form' && (
            <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-8 shadow-premium border border-gray-100 dark:border-white/5 space-y-6">

              {/* Header */}
              <div className="text-center space-y-3">
                {/* School badge */}
                {inviteMeta && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-2xl">
                    <div className={`w-7 h-7 ${roleColor} rounded-lg flex items-center justify-center`}>
                      <span className="material-icons-outlined text-white text-sm">{roleIcon}</span>
                    </div>
                    <span className="text-primary font-bold text-xs">
                      {inviteMeta.schoolName} • {inviteMeta.role}
                    </span>
                  </div>
                )}
                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
                  Criar sua Conta
                </h2>
                <p className="text-gray-400 font-medium text-sm">
                  {inviteMeta?.email && (
                    <span>Ativando acesso para <strong className="text-gray-600 dark:text-gray-300">{inviteMeta.email}</strong></span>
                  )}
                </p>
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-2xl text-rose-600 dark:text-rose-400 text-xs font-bold text-center">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleActivate} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5 group">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors">
                    NOME COMPLETO
                  </label>
                  <input
                    id="invite-full-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Como você quer ser chamado(a)"
                    className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5 group">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors">
                    CRIAR SENHA
                  </label>
                  <div className="relative">
                    <input
                      id="invite-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-5 py-3.5 pr-12 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <span className="material-icons-outlined text-xl">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {/* Password strength indicator */}
                  {password.length > 0 && (
                    <div className="flex gap-1 mt-1.5 px-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            password.length >= level * 2
                              ? password.length >= 8
                                ? 'bg-emerald-500'
                                : password.length >= 6
                                  ? 'bg-amber-400'
                                  : 'bg-rose-400'
                              : 'bg-gray-100 dark:bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5 group">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors">
                    CONFIRMAR SENHA
                  </label>
                  <div className="relative">
                    <input
                      id="invite-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                      className={`w-full px-5 py-3.5 pr-12 rounded-2xl border outline-none font-bold text-sm transition-all ${
                        confirmPassword && confirmPassword !== password
                          ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-800'
                          : confirmPassword && confirmPassword === password
                            ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800'
                            : 'bg-gray-50 dark:bg-white/5 border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10'
                      }`}
                    />
                    {confirmPassword && (
                      <span className={`material-icons-outlined absolute right-4 top-1/2 -translate-y-1/2 text-xl ${
                        confirmPassword === password ? 'text-emerald-500' : 'text-rose-400'
                      }`}>
                        {confirmPassword === password ? 'check_circle' : 'cancel'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Submit */}
                <button
                  id="invite-submit-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-5 rounded-[1.8rem] font-black text-white bg-primary hover:bg-primary-dark shadow-xl shadow-primary/25 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 mt-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="material-icons-outlined text-xl">how_to_reg</span>
                      <span className="text-sm uppercase tracking-widest">Ativar Minha Conta</span>
                    </>
                  )}
                </button>
              </form>

              {/* Footer */}
              <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                Já tem uma conta?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-gray-700 dark:text-gray-200 hover:text-primary transition-colors underline underline-offset-4"
                >
                  Fazer Login
                </button>
              </p>
            </div>
          )}
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
        @keyframes grow {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
};

export default AcceptInviteView;
