import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getClassesBySchool, getSchoolData } from '../services/databaseService';
import { ClassGroup, School } from '../types';

interface ProfileViewProps {
  user: any;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user: initialUser }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User state
  const [user, setUser] = useState<any>(initialUser);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState(initialUser?.user_metadata?.full_name || '');
  const [phone, setPhone] = useState(initialUser?.user_metadata?.phone || '');
  const [email, setEmail] = useState(initialUser?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photoUrl, setPhotoUrl] = useState(
    initialUser?.user_metadata?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(initialUser?.email || 'User')}&background=004ac6&color=fff`
  );
  const [schoolName, setSchoolName] = useState(
    initialUser?.user_metadata?.school || initialUser?.user_metadata?.school_name || 'Não vinculada'
  );

  // Role and School
  const resolvedRole =
    initialUser?.user_metadata?.user_type ||
    localStorage.getItem('littera_user_type') ||
    'student';
  const isInstitution = resolvedRole === 'institution' || resolvedRole === 'school_admin' || resolvedRole === 'owner';
  const isProfessor = resolvedRole === 'professor' || resolvedRole === 'teacher';
  const isStudent = !isInstitution && !isProfessor;
  const isDemo = localStorage.getItem('littera_demo_mode') === 'true' || initialUser?.id?.startsWith('demo');

  const [schoolId, setSchoolId] = useState<string | null>(
    initialUser?.user_metadata?.school_id || localStorage.getItem('checkout_schoolId') || null
  );
  const [school, setSchool] = useState<School | null>(null);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('active');

  // Subscription management states (somente escola)
  const [isUpdatingCard, setIsUpdatingCard] = useState(false);
  const [cardIframeUrl, setCardIframeUrl] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('Outro');

  // Toast notification
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; title: string; message: string } | null>(null);
  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 6000);
  };

  // Load profile and school details from database
  useEffect(() => {
    let isMounted = true;

    const loadProfileData = async () => {
      try {
        let currentUser = initialUser;
        if (!currentUser) {
          const { data: { session } } = await supabase.auth.getSession();
          currentUser = session?.user;
          if (currentUser && isMounted) setUser(currentUser);
        }

        if (!currentUser?.id) return;

        // 1. Obter perfil do banco (profiles)
        if (!isDemo) {
          const { data: dbProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle();

          if (dbProfile && isMounted) {
            if (dbProfile.full_name) setFullName(dbProfile.full_name);
            if (dbProfile.phone) setPhone(dbProfile.phone);
            if (dbProfile.avatar_url) setPhotoUrl(dbProfile.avatar_url);
            if (!schoolId && dbProfile.school_id) setSchoolId(dbProfile.school_id);
          }
        }

        // 2. Resolver schoolId
        const targetSchoolId =
          schoolId ||
          currentUser?.user_metadata?.school_id ||
          localStorage.getItem('checkout_schoolId') ||
          (isDemo ? 'demo-school' : null);

        if (targetSchoolId) {
          if (isMounted) setSchoolId(targetSchoolId);

          const schoolData = await getSchoolData(targetSchoolId);
          if (schoolData && isMounted) {
            setSchool(schoolData);
            if (schoolData.name) {
              setSchoolName(schoolData.name);
            }
            if (schoolData.subscription_status) {
              setSubscriptionStatus(schoolData.subscription_status);
            }
          }

          // 3. Carregar turmas vinculadas
          const classesData = await getClassesBySchool(targetSchoolId);
          if (classesData && isMounted) {
            if (isProfessor && currentUser?.user_metadata?.class_id) {
              setClasses(classesData.filter((c) => c.id === currentUser.user_metadata.class_id));
            } else {
              setClasses(classesData);
            }
          }
        }
      } catch (err) {
        console.warn('[ProfileView] Erro ao carregar dados do perfil:', err);
      }
    };

    loadProfileData();

    return () => {
      isMounted = false;
    };
  }, [initialUser, schoolId, isDemo, isProfessor]);

  const handleEdit = () => setIsEditing(true);

  const handleCancel = () => {
    setFullName(user?.user_metadata?.full_name || '');
    setPhone(user?.user_metadata?.phone || '');
    setEmail(user?.email || '');
    setNewPassword('');
    setConfirmPassword('');
    setPhotoUrl(
      user?.user_metadata?.avatar_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email || 'User')}&background=004ac6&color=fff`
    );
    setSchoolName(school?.name || user?.user_metadata?.school || 'Não vinculada');
    setIsEditing(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('error', 'Arquivo muito grande', 'A foto de perfil deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setPhotoUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      showToast('error', 'Senhas não coincidem', 'A nova senha e a confirmação devem ser idênticas.');
      return;
    }
    if (newPassword && newPassword.length < 6) {
      showToast('error', 'Senha muito curta', 'A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setIsSaving(true);
    try {
      if (!isDemo && user?.id) {
        // 1. Atualizar Auth User
        const updates: any = {
          data: {
            full_name: fullName,
            phone: phone,
            school: schoolName,
            school_name: schoolName,
            avatar_url: photoUrl,
          },
        };

        if (email && email !== user.email) {
          updates.email = email;
        }

        if (newPassword) {
          updates.password = newPassword;
        }

        const { error: authError } = await supabase.auth.updateUser(updates);
        if (authError) throw authError;

        // 2. Atualizar tabela profiles
        await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            phone: phone,
            avatar_url: photoUrl,
          })
          .eq('id', user.id);

        // 3. Se for escola, atualizar também o nome na tabela schools
        if (isInstitution && schoolId) {
          await supabase
            .from('schools')
            .update({ name: schoolName })
            .eq('id', schoolId);

          if (school) {
            setSchool({ ...school, name: schoolName });
          }
        }
      } else {
        // Modo Demo: simulação de atualização
        if (isInstitution && school) {
          setSchool({ ...school, name: schoolName });
        }
      }

      showToast(
        'success',
        'Perfil atualizado!',
        email !== user?.email
          ? 'Dados salvos. Verifique sua caixa de entrada para confirmar o novo e-mail.'
          : 'Suas informações foram salvas com sucesso.'
      );

      setIsEditing(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      const msg = error?.message || 'Ocorreu um erro ao salvar o perfil.';
      showToast('error', 'Erro ao salvar', msg);
    } finally {
      setIsSaving(false);
    }
  };

  // ── FEATURE DE ASSINATURA: Trocar Cartão de Crédito ───────────────────────────
  const handleUpdateCreditCard = async () => {
    setIsUpdatingCard(true);
    setCardIframeUrl(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resolvedSchoolId = schoolId || school?.id;

      if (!resolvedSchoolId) {
        throw new Error('Identificador da instituição não encontrado.');
      }

      const { data, error } = await supabase.functions.invoke('update-credit-card', {
        body: { schoolId: resolvedSchoolId },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.invoiceUrl) {
        localStorage.setItem('checkout_invoiceUrl', data.invoiceUrl);
        setCardIframeUrl(data.invoiceUrl);
        showToast('success', 'Ambiente Asaas pronto', 'Você pode trocar o cartão diretamente na tela abaixo ou abrir em nova janela.');
        return;
      }

      const savedUrl = localStorage.getItem('checkout_invoiceUrl');
      if (savedUrl) {
        setCardIframeUrl(savedUrl);
        return;
      }

      throw new Error('Não foi possível gerar o link de alteração de cartão no momento.');
    } catch (err: any) {
      const msg = err?.message || 'Erro ao conectar ao gateway financeiro Asaas.';
      showToast('error', 'Falha ao buscar fatura', msg);
    } finally {
      setIsUpdatingCard(false);
    }
  };

  // ── FEATURE DE ASSINATURA: Cancelar Assinatura ─────────────────────────────────
  const handleConfirmCancellation = async () => {
    setIsCancelling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Chama a Edge Function pay-subscription com action cancel_subscription
      const { data, error } = await supabase.functions.invoke('pay-subscription', {
        body: {
          action: 'cancel_subscription',
          reason: cancelReason,
        },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });

      if (error || (data && !data.success && data.error)) {
        throw new Error(data?.error || error?.message || 'Não foi possível cancelar a assinatura no gateway.');
      }

      setSubscriptionStatus('canceled');
      if (school) {
        setSchool({ ...school, subscription_status: 'canceled' });
      }

      setIsCancelModalOpen(false);
      showToast(
        'info',
        'Assinatura cancelada',
        'Sua assinatura foi cancelada. O acesso à plataforma continuará disponível até o encerramento da vigência atual.'
      );
    } catch (err: any) {
      showToast('error', 'Erro ao cancelar', err?.message || 'Não foi possível processar o cancelamento agora.');
    } finally {
      setIsCancelling(false);
    }
  };

  const getUserLabel = () => {
    if (isInstitution) return 'Administrador Escolar';
    if (isProfessor) return 'Professor(a)';
    return 'Estudante';
  };

  const getStatusBadge = () => {
    const status = String(subscriptionStatus || 'inactive').toLowerCase();
    switch (status) {
      case 'active':
        return {
          label: 'Assinatura Ativa',
          classes: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50',
          icon: 'check_circle',
        };
      case 'trialing':
        return {
          label: 'Período de Avaliação (Trial)',
          classes: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50',
          icon: 'hourglass_top',
        };
      case 'past_due':
        return {
          label: 'Pagamento Pendente',
          classes: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50',
          icon: 'warning',
        };
      case 'canceled':
        return {
          label: 'Assinatura Cancelada',
          classes: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50',
          icon: 'cancel',
        };
      default:
        return {
          label: 'Inativa / Aguardando',
          classes: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
          icon: 'info',
        };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-24 px-3 sm:px-6">
      {/* ── Toast Notification ── */}
      {toast && (
        <div className="fixed top-20 right-4 z-[9999] max-w-md w-full animate-fade-in pointer-events-auto">
          <div
            className={`p-4 rounded-2xl shadow-2xl border flex items-start gap-3 backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-900/95 text-white border-emerald-500/40'
                : toast.type === 'error'
                ? 'bg-rose-900/95 text-white border-rose-500/40'
                : 'bg-slate-900/95 text-white border-white/20'
            }`}
          >
            <span className="material-icons-outlined text-2xl shrink-0 mt-0.5">
              {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
            </span>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm tracking-tight">{toast.title}</h4>
              <p className="text-xs text-white/80 mt-0.5 leading-relaxed font-medium">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="text-white/60 hover:text-white transition-colors">
              <span className="material-icons-outlined text-lg">close</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="mb-8 sm:mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <button
            onClick={() => {
              if (isInstitution || isProfessor) {
                navigate('/app/inst-overview');
              } else {
                navigate('/app/practice');
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-primary hover:text-primary-dark dark:text-blue-400 mb-2 transition-colors group"
          >
            <span className="material-icons-outlined text-base transition-transform group-hover:-translate-x-1">
              arrow_back
            </span>
            Voltar ao Painel
          </button>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight font-display">
            Meu Perfil
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium text-sm sm:text-base">
            Gerencie suas informações pessoais{isInstitution ? ' e os dados de assinatura da sua escola' : ''}.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
            >
              <span className="material-icons-outlined text-lg">edit</span>
              Editar Perfil
            </button>
          ) : (
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="flex-1 sm:flex-initial px-5 py-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl sm:rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/25 hover:bg-primary-dark transition-all disabled:opacity-50 active:scale-95"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-icons-outlined text-lg">save</span>
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Grid Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column: Avatar & Summary */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-surface-dark rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col items-center text-center">
            {/* Avatar with edit overlay */}
            <div className="relative mb-5">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-gradient-to-tr from-primary to-blue-400 shadow-xl relative group overflow-hidden">
                <img
                  src={photoUrl}
                  alt={fullName || 'Avatar'}
                  className="w-full h-full rounded-full object-cover border-4 border-white dark:border-surface-dark"
                />
                {isEditing && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Alterar foto"
                    className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center text-white transition-opacity hover:opacity-90"
                  >
                    <span className="material-icons-outlined text-2xl">photo_camera</span>
                    <span className="text-[10px] font-bold mt-1">Alterar Foto</span>
                  </button>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white truncate w-full">
              {fullName || 'Nome não definido'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-semibold truncate w-full mt-0.5">
              {email}
            </p>

            <span className="mt-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary dark:text-blue-400 border border-primary/20">
              {getUserLabel()}
            </span>

            {/* School / Institution Pill */}
            <div className="w-full mt-6 pt-6 border-t border-gray-100 dark:border-white/5 space-y-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Instituição
              </p>
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-gray-800 dark:text-gray-200">
                <span className="material-icons-outlined text-base text-primary">domain</span>
                <span className="truncate max-w-[200px]">{schoolName}</span>
              </div>
            </div>

            {/* Subscription status pill (escola) */}
            {isInstitution && (
              <div className="w-full mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  Status da Assinatura
                </p>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${statusBadge.classes}`}
                >
                  <span className="material-icons-outlined text-xs">{statusBadge.icon}</span>
                  {statusBadge.label}
                </span>
              </div>
            )}
          </div>

          {/* Quick Help / Info Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 dark:from-slate-800/40 dark:to-slate-800/20 rounded-2xl sm:rounded-[2rem] p-6 border border-blue-100 dark:border-white/5 space-y-3">
            <div className="flex items-center gap-2 text-primary dark:text-blue-400">
              <span className="material-icons-outlined text-xl">shield</span>
              <h4 className="text-xs font-black uppercase tracking-wider">Privacidade e Dados</h4>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
              Seus dados de cadastro estão em conformidade com a LGPD e criptografados em trânsito e em repouso.
            </p>
          </div>
        </div>

        {/* Right Column: Personal Info, Security, and Conditional Subscription Feature */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          {/* ── CARD 1: Informações Pessoais ── */}
          <div className="bg-white dark:bg-surface-dark rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-white/5">
            <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="material-icons-outlined text-primary text-xl">badge</span>
              Informações Pessoais
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Seu nome completo"
                  className="w-full px-4 sm:px-5 py-3.5 rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-white/10 outline-none font-bold text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 disabled:opacity-75 disabled:cursor-not-allowed transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!isEditing}
                  placeholder="(00) 00000-0000"
                  className="w-full px-4 sm:px-5 py-3.5 rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-white/10 outline-none font-bold text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 disabled:opacity-75 disabled:cursor-not-allowed transition-all"
                />
              </div>

              {/* Escola Vinculada */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Instituição Vinculada
                </label>
                {isEditing && isInstitution ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="Nome oficial da sua escola"
                      className="w-full px-4 sm:px-5 py-3.5 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border-2 border-primary outline-none font-bold text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                    <span className="text-[10px] text-primary dark:text-blue-400 font-semibold mt-1 block ml-1">
                      * Como gestor escolar, você pode atualizar a denominação oficial da instituição.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-white/10 font-bold text-sm text-gray-700 dark:text-gray-300">
                    <span className="material-icons-outlined text-primary text-xl">domain</span>
                    <span>{schoolName}</span>
                  </div>
                )}
                {isProfessor && (
                  <p className="text-[10px] text-gray-400 mt-1 italic ml-1">
                    * O vínculo com a instituição é administrado pela coordenação pedagógica da sua escola.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── CARD 2: Segurança e Acesso ── */}
          <div className="bg-white dark:bg-surface-dark rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-white/5">
            <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="material-icons-outlined text-primary text-xl">lock</span>
              Segurança e Acesso
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  E-mail de Login
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-4 sm:px-5 py-3.5 rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-white/10 outline-none font-bold text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 disabled:opacity-75 disabled:cursor-not-allowed transition-all"
                />
                {isEditing && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-1 ml-1">
                    * Se alterar o e-mail, uma mensagem de verificação será enviada ao novo endereço para confirmação.
                  </p>
                )}
              </div>

              {isEditing && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Nova Senha
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Deixe em branco para manter a atual"
                      className="w-full px-4 sm:px-5 py-3.5 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 outline-none font-bold text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="w-full px-4 sm:px-5 py-3.5 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 outline-none font-bold text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── CARD 3: RECURSO EXCLUSIVO DE ASSINATURA (SOMENTE NO PERFIL DA ESCOLA) ── */}
          {isInstitution && (
            <div className="bg-gradient-to-br from-[#0c1427] to-[#15233e] text-white rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 shadow-xl relative overflow-hidden border border-white/10 space-y-6">
              {/* Decorative background glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] pointer-events-none" />

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="material-icons-outlined text-primary-light text-2xl">credit_card</span>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight font-display">
                      Gestão de Assinatura Escolar
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-300 mt-1 font-medium">
                    Controle de forma de pagamento, faturas e cancelamento através do gateway seguro Asaas.
                  </p>
                </div>

                <span
                  className={`self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                    subscriptionStatus === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : subscriptionStatus === 'canceled'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  <span className="material-icons-outlined text-sm">{statusBadge.icon}</span>
                  {statusBadge.label}
                </span>
              </div>

              {/* Informações Resumidas do Plano Contratado */}
              <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Plano</p>
                  <p className="text-base sm:text-lg font-black text-white mt-1">Littera School</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alunos</p>
                  <p className="text-base sm:text-lg font-black text-emerald-400 mt-1">
                    {school?.student_count || 0} licenças
                  </p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ciclo</p>
                  <p className="text-base sm:text-lg font-black text-white mt-1">
                    {school?.billing_cycle === 'YEARLY' ? 'Anual (12x)' : 'Mensal'}
                  </p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Segurança</p>
                  <p className="text-base sm:text-lg font-black text-blue-300 mt-1">PCI-DSS Asaas</p>
                </div>
              </div>

              {/* Botões de Ação da Assinatura: Trocar Cartão & Cancelar */}
              <div className="relative z-10 pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={handleUpdateCreditCard}
                  disabled={isUpdatingCard}
                  className="flex-1 py-3.5 px-6 rounded-xl sm:rounded-2xl bg-primary hover:bg-primary-dark text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
                >
                  {isUpdatingCard ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="material-icons-outlined text-base">payment</span>
                      Trocar Cartão de Crédito
                    </>
                  )}
                </button>

                <button
                  onClick={async () => {
                    const savedUrl = localStorage.getItem('checkout_invoiceUrl');
                    if (savedUrl) {
                      window.open(savedUrl, '_blank', 'noopener,noreferrer');
                    } else {
                      handleUpdateCreditCard();
                    }
                  }}
                  className="py-3.5 px-5 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/15 flex items-center justify-center gap-2"
                >
                  <span className="material-icons-outlined text-base">receipt_long</span>
                  Faturas & Comprovantes
                </button>

                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  className="py-3.5 px-5 rounded-xl sm:rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/30 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-icons-outlined text-base">cancel</span>
                  Cancelar Assinatura
                </button>
              </div>

              {/* Iframe Embutido para Atualização de Cartão (quando requisitado) */}
              {cardIframeUrl && (
                <div className="relative z-10 mt-6 bg-slate-900 rounded-2xl p-4 border border-white/20 animate-fade-in space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                      <span className="material-icons-outlined text-emerald-400 text-sm">lock</span>
                      Ambiente de Pagamento Asaas
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={cardIframeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary-light hover:underline flex items-center gap-1 font-bold"
                      >
                        <span className="material-icons-outlined text-sm">open_in_new</span>
                        Abrir em tela cheia
                      </a>
                      <button
                        onClick={() => setCardIframeUrl(null)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <span className="material-icons-outlined text-lg">close</span>
                      </button>
                    </div>
                  </div>
                  <div className="w-full h-[520px] rounded-xl overflow-hidden bg-white">
                    <iframe
                      src={cardIframeUrl}
                      className="w-full h-full border-none"
                      title="Atualização de Cartão Asaas"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── CARD EXCLUSIVO DE PROFESSOR: Minhas Turmas Ativas (Sem Assinatura) ── */}
          {isProfessor && (
            <div className="bg-white dark:bg-surface-dark rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-white/5 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-icons-outlined text-primary text-xl">school</span>
                  <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                    Minhas Turmas Ativas
                  </h3>
                </div>
                <span className="text-xs font-bold text-gray-400">
                  {classes.length} {classes.length === 1 ? 'turma vinculada' : 'turmas vinculadas'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-white/5 flex items-center justify-between hover:border-primary/30 transition-all"
                  >
                    <div>
                      <p className="font-black text-sm text-gray-900 dark:text-white">{cls.name}</p>
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-0.5">
                        {cls.grade} • {cls.shift || 'Geral'}
                      </p>
                    </div>
                    <span className="material-icons-outlined text-gray-400 text-xl">groups</span>
                  </div>
                ))}

                {classes.length === 0 && (
                  <div className="col-span-full py-8 text-center text-gray-400 font-semibold italic bg-gray-50 dark:bg-slate-900/30 rounded-2xl">
                    Nenhuma turma vinculada a este professor ainda.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL DE CONFIRMAÇÃO DE CANCELAMENTO (ESCOLA) ── */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-surface-dark max-w-lg w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-white/10 space-y-6 animate-scale-up">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <span className="material-icons-outlined text-3xl">warning_amber</span>
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white font-display">
                Deseja cancelar sua assinatura?
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                Ao cancelar, sua instituição continuará com acesso até o encerramento do ciclo pago atual. Após essa data,
                as correções por inteligência artificial e os relatórios pedagógicos ficarão suspensos.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Motivo do Cancelamento
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-white/10 font-bold text-xs text-gray-800 dark:text-gray-200 outline-none"
              >
                <option value="Custo">Orçamento / Custo da mensalidade</option>
                <option value="Pouco uso">Pouco uso pelos estudantes</option>
                <option value="Recursos">Necessidade de outros recursos pedagógicos</option>
                <option value="Férias">Período de férias escolares</option>
                <option value="Outro">Outro motivo</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                disabled={isCancelling}
                className="w-full sm:flex-1 py-3.5 px-4 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold text-xs uppercase tracking-wider hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
              >
                Manter Minha Assinatura
              </button>

              <button
                onClick={handleConfirmCancellation}
                disabled={isCancelling}
                className="w-full sm:flex-1 py-3.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2"
              >
                {isCancelling ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Confirmar Cancelamento'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileView;
