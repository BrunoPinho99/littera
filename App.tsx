
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import TopicCard from './components/TopicCard';
import CreateTopicCard from './components/CreateTopicCard';
import PerformanceView from './components/PerformanceView';
import ExploreView from './components/ExploreView';
import EssayEditor from './components/EssayEditor';
import CorrectionResultView from './components/CorrectionResult';
import HandwrittenResultView from './components/HandwrittenResult';
import RankingView from './components/RankingView';
import NotificationsView from './components/NotificationsView';
import ProfileView from './components/ProfileView';
import LoginView from './components/LoginView';
import InstitutionDashboard from './components/InstitutionDashboard';
import { TillmornMarketingPage } from './src/app/(marketing)/page';
import AcceptInviteView from './components/AcceptInviteView';
import CheckoutWizard from './components/CheckoutWizard';
import { PendingCheckoutPage } from './components/PendingCheckoutPage';
import FinalizarCadastroView from './components/FinalizarCadastroView';
import ChallengeBanner from './components/ChallengeBanner';
import WarmSchoolsDashboard from './components/WarmSchoolsDashboard';
import ActivateTrialDashboard from './components/ActivateTrialDashboard';
import ClassRegistration from './components/ClassRegistration';
import SchoolRegistration from './components/SchoolRegistration';
import { TermsPrivacyPage } from './components/TermsPrivacyPage';
// Types and Services
import { Topic, CorrectionResult, EssayInput, Notification, HandwrittenCorrectionResult, Assignment } from './types';
import { correctEssay, correctHandwrittenEssay, correctEssayDemo, correctHandwrittenEssayDemo } from './services/geminiService';
import { saveEssayToDatabase, getNotifications, markNotificationAsRead, markAllNotificationsRead, getSchoolData, getStudentAssignments } from './services/databaseService';
import { supabase } from './supabaseClient';
import { exploreTopics } from './data/exploreTopics';

const clearDemoStorage = () => {
  localStorage.removeItem('littera_demo_mode');
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('scritta_demo_') || key === 'scritta_custom_notifications') {
      localStorage.removeItem(key);
    }
  });
};

const normalizeUserType = (rawType?: string | null): 'student' | 'teacher' | 'school_admin' => {
  const t = String(rawType || '').toLowerCase();
  if (t === 'owner' || t === 'school_admin' || t === 'institution') return 'school_admin';
  if (t === 'professor' || t === 'teacher') return 'teacher';
  return 'student';
};

const safeParseJson = <T,>(raw: any, fallback: T): T => {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw !== 'string') return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

// Fallback logic
const SAFE_TOPICS = exploreTopics && exploreTopics.length > 0 ? exploreTopics : [{
  id: 'default',
  title: 'Tema Padrão',
  category: 'Geral',
  difficulty: 'Médio',
  supportTexts: []
}];
const INITIAL_INDEX = Math.floor(Math.random() * SAFE_TOPICS.length);
const INITIAL_TOPIC: Topic = {
  id: SAFE_TOPICS[INITIAL_INDEX].id,
  title: SAFE_TOPICS[INITIAL_INDEX].title,
  supportTexts: SAFE_TOPICS[INITIAL_INDEX].supportTexts || []
};

// Helper: timeout defensivo para chamadas assíncronas
function withTimeout<T>(promise: PromiseLike<T>, ms = 2500, fallback: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([Promise.resolve(promise), timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

// --- APP COMPONENT ---
const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userType, setUserType] = useState<string>('student');
  const navigate = useNavigate();
  const location = useLocation();
  const currentView = location.pathname.startsWith('/app/') ? location.pathname.replace('/app/', '') : 'practice';
  const [isInitializing, setIsInitializing] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(() => localStorage.getItem('littera_demo_mode') === 'true');

  // Hard safety timeout: garante que a tela "Carregando Littera..." nunca fica travada por mais de 2.5s
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setIsInitializing(false);
    }, 2500);
    return () => clearTimeout(safetyTimer);
  }, []);

  // Writing flow
  const [topic, setTopic] = useState<Topic>(INITIAL_TOPIC);
  const [writingTopicTitle, setWritingTopicTitle] = useState(() => {
    try {
      const saved = localStorage.getItem('littera_essay_in_progress');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.topicTitle) return parsed.topicTitle;
      }
    } catch {}
    return INITIAL_TOPIC.title;
  });
  const [correctionResult, setCorrectionResult] = useState<CorrectionResult | null>(null);
  const [handwrittenResult, setHandwrittenResult] = useState<HandwrittenCorrectionResult | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [isLoading, _setIsLoading] = useState(false);

  // Banner de redação em andamento
  const [essayDraft, setEssayDraft] = useState<{ topicTitle: string; startTime: number } | null>(null);
  const [schoolStatus, setSchoolStatus] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userClassId, setUserClassId] = useState<string | null>(null);

  // Resolve user_type, class_id, school_id + subscription_status (fail-closed: qualquer falha => 'inactive')
  const resolveSchoolStatus = async (s: any): Promise<'student' | 'teacher' | 'school_admin'> => {
    const isDemoSession = Boolean(!s?.user?.id || String(s.user.id).startsWith('demo'));
    if (isDemoSession && localStorage.getItem('littera_demo_mode') === 'true') {
      setSchoolStatus('active');
      setSchoolId('demo-school');
      setUserClassId(s?.user?.user_metadata?.class_id || null);
      return normalizeUserType(s?.user?.user_metadata?.user_type || localStorage.getItem('littera_user_type'));
    }
    if (!s?.user) {
      setSchoolStatus('inactive');
      return 'student';
    }
    try {
      const metaType = s.user.user_metadata?.user_type;
      let sid: string | null = s.user.user_metadata?.school_id || null;
      let cid: string | null = s.user.user_metadata?.class_id || null;
      let resolvedRole: 'student' | 'teacher' | 'school_admin' = normalizeUserType(metaType);

      if (!sid || !metaType || (resolvedRole === 'teacher' && !cid)) {
        const profilePromise = supabase
          .from('profiles')
          .select('role, school_id, class_id')
          .eq('id', s.user.id)
          .maybeSingle();
        const { data: profile } = await withTimeout(profilePromise, 2000, { data: null, error: null } as any);
        if (!sid && profile?.school_id) sid = profile.school_id;
        if (!cid && profile?.class_id) cid = profile.class_id;
        if (profile?.role) {
          resolvedRole = normalizeUserType(profile.role);
        }
      }

      if (!sid) {
        sid = localStorage.getItem('checkout_schoolId');
      }

      localStorage.setItem('littera_user_type', resolvedRole);
      setUserType(prev => (prev === resolvedRole ? prev : resolvedRole));
      setUserClassId(cid);
      setSchoolId(sid);

      if (!sid) {
        setSchoolStatus('inactive');
        return resolvedRole;
      }
      const schoolPromise = supabase.from('schools').select('subscription_status').eq('id', sid).maybeSingle();
      const { data: school, error } = await withTimeout(schoolPromise, 2000, { data: null, error: null } as any);
      const status = !error && school?.subscription_status ? String(school.subscription_status).toLowerCase() : 'inactive';
      setSchoolStatus(prev => (prev === status ? prev : status));
      return resolvedRole;
    } catch {
      setSchoolStatus('inactive');
      return normalizeUserType(s?.user?.user_metadata?.user_type);
    }
  };

  // Realtime: libera acesso no instante em que o webhook do Asaas ativar a escola
  useEffect(() => {
    if (!session || !schoolId) return;
    const channel = supabase
      .channel(`school-status-${schoolId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'schools', filter: `id=eq.${schoolId}` },
        (payload: any) => {
          const st = String(payload.new?.subscription_status || '').toLowerCase();
          if (st) setSchoolStatus(st);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, schoolId]);

  // Desafios Ativos (Alunos)
  const [activeAssignments, setActiveAssignments] = useState<Assignment[]>([]);
  const [forceShowChallengeId, setForceShowChallengeId] = useState<string | null>(null);
  const [quotaAlert, setQuotaAlert] = useState<{ title: string; message: string; icon: string; color: string } | null>(null);

  const handleCorrectionError = (err: unknown) => {
    setIsCorrecting(false);
    const msg = err instanceof Error ? err.message : String(err || 'Erro desconhecido');
    if (msg.includes('10 minutos') || msg.includes('COOLDOWN') || msg.includes('Aguarde 10')) {
      setQuotaAlert({
        title: 'Intervalo Pedagógico (Cooldown)',
        message: 'Aguarde 10 minutos entre os envios de redação. O processo de escrita do ENEM exige leitura atenta da devolutiva e planejamento antes da próxima folha.',
        icon: 'hourglass_top',
        color: 'amber'
      });
    } else if (msg.includes('diário') || msg.includes('DAILY_LIMIT')) {
      setQuotaAlert({
        title: 'Limite Diário Atingido',
        message: 'Você atingiu o limite de redações diárias para o seu perfil. Essa trava de intervalo garante a qualidade do seu aprendizado e evita sobrecarga.',
        icon: 'event_busy',
        color: 'indigo'
      });
    } else if (msg.includes('franquia') || msg.includes('SCHOOL_QUOTA_EXCEEDED')) {
      setQuotaAlert({
        title: 'Franquia da Escola Atingida',
        message: 'A franquia mensal de correções contratada pela sua instituição foi atingida. Comunique a coordenação pedagógica da sua escola.',
        icon: 'school',
        color: 'rose'
      });
    } else if (msg.includes('JWT') || msg.includes('Autorização') || msg.includes('não autenticado') || msg.includes('Sessão')) {
      setQuotaAlert({
        title: 'Sessão Expirada',
        message: 'Sua sessão de login expirou ou você não está autenticado. Por favor, faça login novamente com sua conta para corrigir sua redação.',
        icon: 'lock',
        color: 'rose'
      });
    } else {
      setQuotaAlert({
        title: 'Aviso de Correção',
        message: msg,
        icon: 'info',
        color: 'rose'
      });
    }
  };

  useEffect(() => {
    if (userType === 'student') {
      const u = session?.user;
      const effectiveSchoolId = isDemoMode
        ? 'demo-school'
        : (schoolId || u?.user_metadata?.school_id || null);
      const effectiveClassId = userClassId || u?.user_metadata?.class_id;
      if (!effectiveSchoolId) {
        setActiveAssignments([]);
        return;
      }
      getStudentAssignments(effectiveSchoolId, effectiveClassId).then((assignments) => {
        const now = Date.now();
        const valid = (assignments || []).filter(a => !a.due_date || new Date(a.due_date).getTime() > now);
        setActiveAssignments(valid);
      });
    }
  }, [userType, currentView, session, schoolId, userClassId, isDemoMode]);

  
  // 1. Initialize Session
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const { data } = await withTimeout(
          supabase.auth.getSession(),
          2500,
          { data: { session: null }, error: null } as any
        );
        if (!isMounted) return;
        if (data?.session) {
          if (!String(data.session.user.id || '').startsWith('demo')) {
            clearDemoStorage();
            setIsDemoMode(false);
          }
          setSession(data.session);
          const metaType = data.session.user.user_metadata?.user_type;
          if (metaType) localStorage.setItem('littera_user_type', normalizeUserType(metaType));
          const resolvedType = normalizeUserType(metaType || localStorage.getItem('littera_user_type'));
          setUserType(resolvedType);
          loadNotifications(data.session.user.id);

          // Paywall + fallback de profile (role/school_id/class_id)
          await withTimeout(resolveSchoolStatus(data.session), 2000, 'student');
        } else if (localStorage.getItem('littera_demo_mode') === 'true') {
          const savedType = (localStorage.getItem('littera_user_type') || 'student') as 'student' | 'teacher' | 'school_admin';
          setIsDemoMode(true);
          setUserType(savedType);
          setSchoolStatus('active');
          setSchoolId('demo-school');

          if (savedType === 'teacher') {
            setSession({
              user: {
                id: 'demo-teacher',
                email: 'professor.demo@littera.com',
                user_metadata: {
                  full_name: 'Prof. Carlos Eduardo (Demo)',
                  user_type: 'teacher',
                  school: 'Colégio Littera (Demo)',
                  school_name: 'Colégio Littera (Demo)',
                  school_id: 'demo-school',
                  class_id: 'turma-demo-1',
                  avatar_url: 'https://ui-avatars.com/api/?name=Prof+Carlos&background=10b981&color=fff',
                }
              }
            });
          } else if (savedType === 'school_admin') {
            setSession({
              user: {
                id: 'demo-school-admin',
                email: 'coordenacao.demo@littera.com',
                user_metadata: {
                  full_name: 'Coordenação Pedagógica (Demo)',
                  user_type: 'school_admin',
                  school: 'Colégio Littera (Demo)',
                  school_name: 'Colégio Littera (Demo)',
                  school_id: 'demo-school',
                  avatar_url: 'https://ui-avatars.com/api/?name=Colegio+Littera&background=6366f1&color=fff',
                }
              }
            });
          } else {
            setSession({
              user: {
                id: 'demo-anonymous',
                email: 'demo@littera.com',
                user_metadata: {
                  full_name: 'Estudante Demo',
                  user_type: 'student',
                  school: 'Colégio Littera (Demo)',
                  school_name: 'Colégio Littera (Demo)',
                  school_id: 'demo-school',
                  avatar_url: 'https://ui-avatars.com/api/?name=Demo&background=f59e0b&color=fff',
                }
              }
            });
          }
        }
      } catch (error) {
        console.error('Init error:', error);
        setSchoolStatus('inactive');
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        if (!String(session.user.id || '').startsWith('demo')) {
          clearDemoStorage();
          setIsDemoMode(false);
        }
        setSession(prev => (prev?.access_token === session.access_token && prev?.user?.id === session.user?.id ? prev : session));
        
        const metaType = session.user.user_metadata?.user_type;
        if (metaType) localStorage.setItem('littera_user_type', normalizeUserType(metaType));
        const nextUserType = normalizeUserType(metaType || localStorage.getItem('littera_user_type'));
        setUserType(prev => prev === nextUserType ? prev : nextUserType);

        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
          loadNotifications(session.user.id);

          // Resolve status + fallback de profile em background sem travar o app em isInitializing
          resolveSchoolStatus(session).finally(() => {
            if (isMounted) setIsInitializing(false);
          });
        }
      } else {
        if (localStorage.getItem('littera_demo_mode') !== 'true') {
          localStorage.removeItem('littera_user_type');
          setIsDemoMode(false);
          setSession(null);
          setUserType('student');
          setSchoolId(null);
          setUserClassId(null);
        }
        if (isMounted) setIsInitializing(false);
      }
    });
    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Detecta rascunho de redação em andamento (quando fora da view 'writing')
  useEffect(() => {
    if (currentView === 'writing') {
      setEssayDraft(null);
      return;
    }
    const check = () => {
      const raw = localStorage.getItem('littera_essay_in_progress');
      if (raw) {
        try { setEssayDraft(JSON.parse(raw)); } catch { setEssayDraft(null); }
      } else {
        setEssayDraft(null);
      }
    };
    check();
    const interval = setInterval(check, 1500);
    return () => clearInterval(interval);
  }, [currentView]);

  // 2. Auto-redireciona admin para view padrão
  useEffect(() => {
    if (
      (userType === 'school_admin' || userType === 'teacher') &&
      !currentView.startsWith('inst-') &&
      currentView !== 'profile' &&
      currentView !== 'notifications'
    ) {
      navigate('/app/inst-overview', { replace: true });
    }
  }, [userType, currentView]);

  const loadNotifications = async (uid: string) => {
    try {
      const data = await getNotifications(uid);
      setNotifications(data || []);
    } catch (e) {
      console.error('Erro ao carregar notificações', e);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('SignOut error:', e);
    } finally {
      const LITTERA_KEYS = ['littera_', 'scritta_', 'checkout_', 'draft_', 'sb-'];
      Object.keys(localStorage).forEach(key => {
        if (LITTERA_KEYS.some(p => key.startsWith(p)) || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
      setIsDemoMode(false);
      setSession(null);
      setUserType('student');
      setSchoolStatus(null);
      setSchoolId(null);
      window.location.href = '/login';
    }
  };

  // --- MODO DEMO: Entrar sem cadastro (Aluno, Professor ou Escola) ---
  const handleEnterDemo = (type: 'student' | 'teacher' | 'school_admin' = 'student') => {
    localStorage.setItem('littera_demo_mode', 'true');
    localStorage.setItem('littera_user_type', type);
    setIsDemoMode(true);
    setUserType(type);
    setSchoolStatus('active');
    setSchoolId('demo-school');

    if (type === 'teacher') {
      setSession({
        user: {
          id: 'demo-teacher',
          email: 'professor.demo@littera.com',
          user_metadata: {
            full_name: 'Prof. Carlos Eduardo (Demo)',
            user_type: 'teacher',
            school: 'Colégio Littera (Demo)',
            school_name: 'Colégio Littera (Demo)',
            school_id: 'demo-school',
            class_id: 'turma-demo-1',
            avatar_url: 'https://ui-avatars.com/api/?name=Prof+Carlos&background=10b981&color=fff',
          }
        }
      });
      navigate('/app/inst-overview');
    } else if (type === 'school_admin') {
      setSession({
        user: {
          id: 'demo-school-admin',
          email: 'coordenacao.demo@littera.com',
          user_metadata: {
            full_name: 'Coordenação Pedagógica (Demo)',
            user_type: 'school_admin',
            school: 'Colégio Littera (Demo)',
            school_name: 'Colégio Littera (Demo)',
            school_id: 'demo-school',
            avatar_url: 'https://ui-avatars.com/api/?name=Colegio+Littera&background=6366f1&color=fff',
          }
        }
      });
      navigate('/app/inst-overview');
    } else {
      setSession({
        user: {
          id: 'demo-anonymous',
          email: 'demo@littera.com',
          user_metadata: {
            full_name: 'Estudante Demo',
            user_type: 'student',
            school: 'Colégio Littera (Demo)',
            school_name: 'Colégio Littera (Demo)',
            school_id: 'demo-school',
            avatar_url: 'https://ui-avatars.com/api/?name=Demo&background=f59e0b&color=fff',
          }
        }
      });
      navigate('/app/practice');
    }
  };

  const handleStartChallengeWriting = (assignment: Assignment) => {
    setWritingTopicTitle(assignment.title);
    setTopic({
      id: assignment.id,
      title: assignment.title,
      supportTexts: assignment.base_text ? [{ id: 'inst-1', title: 'Instruções / Texto Base', content: assignment.base_text, icon: 'description' }] : []
    });
    navigate('/app/writing');
  };

  const mapCorrectionRecord = (record: any, activeTopic: string): CorrectionResult => {
    const competencies = safeParseJson<any[]>(record.competencias_json, []);
    return {
      totalScore: record.total_score || 0,
      competencies,
      generalComment: record.comentario_geral || '',
      aiDetected: false,
      aiJustification: '',
      zeroReason: record.zero_reason || null,
      strengths: safeParseJson<string[]>(record.strengths_json, []),
      priorityImprovements: safeParseJson<string[]>(record.improvements_json, []),
      annotations: safeParseJson<any[]>(record.annotations_json, []),
      timeTaken: '0m',
      topicTitle: activeTopic,
    };
  };

  const mapHandwrittenRecord = (record: any, activeTopic: string): HandwrittenCorrectionResult => {
    const rawCompetencies = safeParseJson<any[]>(record.competencias_json, []);
    const competencies = rawCompetencies.map((c, idx) => ({
      id: (c?.id && ['C1', 'C2', 'C3', 'C4', 'C5'].includes(c.id) ? c.id : `C${idx + 1}`) as 'C1' | 'C2' | 'C3' | 'C4' | 'C5',
      name: c?.name || `Competência ${idx + 1}`,
      score: Number(c?.score || 0),
      feedback: c?.feedback || '',
      suggestions: Array.isArray(c?.suggestions) ? c.suggestions : (Array.isArray(c?.tips) ? c.tips : []),
    }));

    const parsedAnnotations = safeParseJson<any>(record.annotations_json, []);
    const isAnnotationsObj = parsedAnnotations && !Array.isArray(parsedAnnotations) && typeof parsedAnnotations === 'object';

    const annotatedSegments = Array.isArray(parsedAnnotations)
      ? parsedAnnotations
      : (Array.isArray(parsedAnnotations?.annotatedSegments) ? parsedAnnotations.annotatedSegments : []);

    const transcribedText =
      record.transcribed_text ||
      (isAnnotationsObj ? parsedAnnotations.transcribedText : '') ||
      (record.conteudo && record.conteudo !== 'Redação enviada via imagem' ? record.conteudo : '') ||
      '';

    const overallSuggestions =
      (Array.isArray(record.overall_suggestions) ? record.overall_suggestions : null) ||
      (isAnnotationsObj && Array.isArray(parsedAnnotations.overallSuggestions) ? parsedAnnotations.overallSuggestions : null) ||
      safeParseJson<string[]>(record.improvements_json, []);

    return {
      totalScore: record.total_score || 0,
      competencies,
      generalComment: record.comentario_geral || '',
      annotatedSegments,
      overallSuggestions,
      transcribedText,
      topicTitle: activeTopic,
      timeTaken: '0m',
    };
  };

  const fetchEssayRecord = async (essayId: string, isDemo: boolean) => {
    if (isDemo) {
      const { data, error } = await supabase.rpc('get_demo_essay_result', {
        p_essay_id: essayId,
      });
      if (error) return null;
      return data || null;
    }
    const { data, error } = await supabase
      .from('redacoes')
      .select('*')
      .eq('id', essayId)
      .maybeSingle();
    if (error) return null;
    return data || null;
  };

  const waitForEssayResult = (
    essayId: string,
    isDemo: boolean,
    onCompleted: (record: any) => void,
    onError: (msg: string) => void
  ) => {
    let settled = false;
    let pollTimer: any = null;
    let timeoutTimer: any = null;
    const channel = !isDemo ? supabase.channel(`essay-watch-${essayId}`) : null;

    const cleanup = () => {
      if (pollTimer) clearInterval(pollTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (channel) supabase.removeChannel(channel);
    };

    const handleRecord = (record: any) => {
      if (!record || settled) return;
      if (record.status === 'corrigida') {
        settled = true;
        cleanup();
        onCompleted(record);
      } else if (record.status === 'erro') {
        settled = true;
        cleanup();
        onError(record.comentario_geral || 'Erro ao processar redação.');
      }
    };

    const checkOnce = async () => {
      if (settled) return;
      try {
        const data = await fetchEssayRecord(essayId, isDemo);
        if (data) handleRecord(data);
      } catch {
        // Ignora erro transitório de polling; próximo tick ou Realtime resolverá
      }
    };

    if (channel) {
      channel
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'redacoes',
            filter: `id=eq.${essayId}`,
          },
          (payload) => handleRecord(payload.new)
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Verifica imediatamente caso process-essay tenha concluído antes da inscrição
            checkOnce();
          }
        });
    } else {
      checkOnce();
    }

    // Polling fallback a cada 3 segundos (via RPC segura em modo demo)
    pollTimer = setInterval(checkOnce, 3000);

    // Timeout de segurança de 90 segundos para evitar spinner infinito
    timeoutTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      onError('A correção demorou mais do que o esperado. Verifique seu histórico em "Minha Evolução" em alguns instantes.');
    }, 90000);
  };

  const handleEssaySubmit = async (input: EssayInput) => {
    setIsCorrecting(true);
    try {
      const activeTopic = writingTopicTitle || topic.title || INITIAL_TOPIC.title;
      if (!writingTopicTitle) setWritingTopicTitle(activeTopic);

      const userId = session?.user?.id;
      const isActuallyDemo = isDemoMode || !session || String(userId || '').startsWith('demo');

      // Usa a função demo ou normal conforme o modo
      const res = isActuallyDemo
        ? await correctEssayDemo(activeTopic, input)
        : await correctEssay(activeTopic, input);
      const { essayId } = res;

      const finishEssay = async (record: any) => {
        const mapped = mapCorrectionRecord(record, activeTopic);
        setCorrectionResult(mapped);
        if (isActuallyDemo) {
          await saveEssayToDatabase(
            activeTopic,
            input,
            userId || 'demo-anonymous',
            mapped,
            session?.user?.user_metadata
          );
        }
        navigate('/app/result');
        setTimeout(() => setIsCorrecting(false), 100);
      };

      if ((res as any).cached) {
        const existingRecord = await fetchEssayRecord(essayId, isActuallyDemo);

        if (existingRecord && existingRecord.status === 'corrigida') {
          await finishEssay(existingRecord);
          return;
        }
      }

      waitForEssayResult(
        essayId,
        isActuallyDemo,
        (updatedRecord) => { finishEssay(updatedRecord); },
        (errMsg) => { handleCorrectionError(errMsg); }
      );
    } catch (err: unknown) {
      handleCorrectionError(err);
    }
  };

  const handleHandwrittenSubmit = async (base64: string, mimeType: string) => {
    setIsCorrecting(true);
    try {
      const activeTopic = writingTopicTitle || topic.title || INITIAL_TOPIC.title;
      if (!writingTopicTitle) setWritingTopicTitle(activeTopic);

      const userId = session?.user?.id;
      const isActuallyDemo = isDemoMode || !session || String(userId || '').startsWith('demo');

      const res = isActuallyDemo
        ? await correctHandwrittenEssayDemo(activeTopic, base64, mimeType)
        : await correctHandwrittenEssay(activeTopic, base64, mimeType);
      const { essayId } = res;

      const finishHandwritten = async (record: any) => {
        const mapped = mapHandwrittenRecord(record, activeTopic);
        setHandwrittenResult(mapped);
        if (isActuallyDemo) {
          await saveEssayToDatabase(
            activeTopic,
            { type: 'image', base64, mimeType },
            userId || 'demo-anonymous',
            {
              totalScore: mapped.totalScore,
              competencies: mapped.competencies.map((c) => ({
                name: c.name,
                score: c.score,
                feedback: c.feedback,
                tips: c.suggestions,
              })),
              generalComment: mapped.generalComment,
              aiDetected: false,
            },
            session?.user?.user_metadata
          );
        }
        navigate('/app/handwritten-result');
        setTimeout(() => setIsCorrecting(false), 100);
      };

      if ((res as any).cached) {
        const existingRecord = await fetchEssayRecord(essayId, isActuallyDemo);

        if (existingRecord && existingRecord.status === 'corrigida') {
          await finishHandwritten(existingRecord);
          return;
        }
      }

      waitForEssayResult(
        essayId,
        isActuallyDemo,
        (updatedRecord) => { finishHandwritten(updatedRecord); },
        (errMsg) => { handleCorrectionError(errMsg); }
      );
    } catch (err: unknown) {
      handleCorrectionError(err);
    }
  };

  const getDefaultView = (type: string) => {
    if (type === 'school_admin' || type === 'teacher') return 'inst-overview';
    return 'practice';
  };


  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-gray-500 font-medium">
        <div className="w-9 h-9 border-3 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <span className="text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-400">Carregando Littera...</span>
      </div>
    );
  }

  // --- TRAVA DE ASSINATURA (PAYWALL B2B) ---
  const isSuspended = Boolean(session && !isDemoMode && schoolStatus !== 'active' && schoolStatus !== 'trialing');

  const renderSuspended = () => {
    if (userType === 'school_admin') {
      return (
        <PendingCheckoutPage
          onLogout={handleLogout}
          session={session}
          schoolStatus={schoolStatus}
          onEnterDemo={handleEnterDemo}
        />
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center font-sans p-4">
        <div className="bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] shadow-premium max-w-lg w-full text-center border border-gray-100 dark:border-slate-700 relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-[60px] pointer-events-none" />

          <div className="relative z-10">
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <span className="material-icons-outlined text-4xl">hourglass_empty</span>
            </div>

            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
              Plataforma Suspensa
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium leading-relaxed">
              A assinatura da sua instituição encontra-se inativa ou pendente. Por favor, avise a secretaria ou coordenação da sua escola.
            </p>

            <button
              onClick={handleLogout}
              className="px-8 py-3 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
            >
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderMainAppLayout = () => {
    if (!session && !isDemoMode) {
      return <Navigate to="/login" replace />;
    }

    if (isSuspended) return renderSuspended();

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 transition-colors">
        <Navbar
          currentView={currentView}
          onViewChange={(view) => navigate(`/app/${view}`)}
          onLogout={handleLogout}
          user={session?.user}
          userType={userType as any}
          notifications={notifications}
          onMarkAsRead={async (id) => {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            await markNotificationAsRead(id, session?.user?.id || 'demo');
          }}
          activeChallengesCount={activeAssignments.length}
          onOpenChallenge={() => { 
            if (activeAssignments.length > 0) {
              setForceShowChallengeId(activeAssignments[0].id);
              if (currentView !== 'practice') navigate('/app/practice');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
        />

        {/* ── Banner: Redação em andamento ─────────────────────────────────────── */}
        {essayDraft && currentView !== 'writing' && !['school_admin', 'teacher'].includes(userType) && (
          <div className="fixed top-0 left-0 right-0 z-[100] flex justify-center px-4 pt-4 pointer-events-none">
            <div className="pointer-events-auto animate-fade-in flex items-center gap-3 bg-[#0B0F19] dark:bg-slate-800 text-white rounded-2xl shadow-2xl shadow-black/40 px-5 py-3 border border-white/10 max-w-xl w-full">
              {/* Pulso animado */}
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-black uppercase tracking-widest text-primary">Redação em andamento</p>
                <p className="text-sm font-semibold text-white/90 truncate">{essayDraft.topicTitle}</p>
              </div>

              <button
                onClick={() => {
                  setWritingTopicTitle(essayDraft.topicTitle);
                  navigate('/app/writing');
                }}
                className="shrink-0 flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white text-sm font-bold px-4 py-2 rounded-xl transition-all"
              >
                <span className="material-icons-outlined text-base">edit_note</span>
                Continuar
              </button>

              <button
                onClick={() => {
                  localStorage.removeItem('littera_essay_in_progress');
                  localStorage.removeItem(`draft_${essayDraft.topicTitle}`);
                  setEssayDraft(null);
                }}
                title="Descartar rascunho"
                className="shrink-0 text-white/40 hover:text-white/80 transition-colors"
              >
                <span className="material-icons-outlined text-xl">close</span>
              </button>
            </div>
          </div>
        )}

        <main className="pt-16 sm:pt-20 lg:pt-24 px-3.5 sm:px-6 lg:px-8 pb-28 sm:pb-24 md:pb-12 max-w-[1440px] mx-auto">
          {/* Views de Aluno */}
          {!['school_admin', 'teacher'].includes(userType) && (
            <Routes>
              <Route path="practice" element={
                <div className="space-y-16">
                  <ChallengeBanner
                    assignments={activeAssignments}
                    onStartWriting={handleStartChallengeWriting}
                    forceShowId={forceShowChallengeId}
                    onClearForceShow={() => setForceShowChallengeId(null)}
                  />
                  <TopicCard
                    topic={topic}
                    onRefresh={() => {
                      const random = SAFE_TOPICS[Math.floor(Math.random() * SAFE_TOPICS.length)];
                      setTopic({ id: random.id, title: random.title, supportTexts: random.supportTexts });
                    }}
                    isLoading={isLoading}
                    onWrite={() => { setWritingTopicTitle(topic.title); navigate('/app/writing'); }}
                  />
                  <CreateTopicCard onTopicGenerated={(t) => { setTopic(t); }} />
                </div>
              } />
              <Route path="writing" element={
                <EssayEditor
                  topicTitle={writingTopicTitle || topic.title || INITIAL_TOPIC.title}
                  onCancel={() => navigate('/app/practice')}
                  onSubmit={handleEssaySubmit}
                  onHandwrittenSubmit={handleHandwrittenSubmit}
                  isSubmitting={isCorrecting}
                  startTime={Date.now()}
                />
              } />
              <Route path="result" element={
                correctionResult ? <CorrectionResultView result={correctionResult} onBack={() => navigate('/app/practice')} onEvolution={() => navigate('/app/performance')} /> : <Navigate to="/app/practice" replace />
              } />
              <Route path="handwritten-result" element={
                handwrittenResult ? <HandwrittenResultView result={handwrittenResult} onBack={() => navigate('/app/practice')} onEvolution={() => navigate('/app/performance')} /> : <Navigate to="/app/practice" replace />
              } />
              <Route path="explore" element={
                <ExploreView onSelectTopic={(title) => {
                  const found = SAFE_TOPICS.find(t => t.title === title);
                  if (found) {
                    setTopic({ id: found.id, title: found.title, supportTexts: found.supportTexts });
                    navigate('/app/practice');
                  }
                }} />
              } />
              <Route path="performance" element={
                <div className="space-y-16">
                  <ChallengeBanner 
                    assignments={activeAssignments} 
                    onStartWriting={handleStartChallengeWriting}
                    forceShowId={forceShowChallengeId}
                    onClearForceShow={() => setForceShowChallengeId(null)}
                  />
                  <PerformanceView userId={session?.user?.id} schoolId={schoolId} isDemo={isDemoMode} />
                </div>
              } />
              <Route path="ranking" element={<RankingView />} />
              <Route path="notifications" element={
                <NotificationsView
                  notifications={notifications}
                  onMarkAsRead={async (id) => {
                    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
                    await markNotificationAsRead(id, session?.user?.id || 'demo');
                  }}
                  onMarkAllAsRead={async () => {
                    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                    await markAllNotificationsRead(session?.user?.id || 'demo');
                  }}
                  onAction={(type) => {
                    if (type === 'correction') navigate('/app/performance');
                    else if (type === 'ranking') navigate('/app/ranking');
                    else if (type === 'assignment') navigate('/app/practice');
                    else navigate('/app/practice');
                  }}
                  onClose={() => navigate(`/app/${getDefaultView(userType)}`)}
                />
              } />
              <Route path="profile" element={<ProfileView user={session?.user} />} />
              <Route path="*" element={<Navigate to="/app/practice" replace />} />
            </Routes>
          )}

          {/* Views Institucionais */}
          {['school_admin', 'teacher'].includes(userType) && (
            <Routes>
              <Route path="inst-overview" element={<InstitutionDashboard initialTab="overview" userType={userType as any} />} />
              <Route path="inst-students" element={<InstitutionDashboard initialTab="students" userType={userType as any} />} />
              <Route path="inst-performance" element={<InstitutionDashboard initialTab="essays" userType={userType as any} />} />
              <Route path="inst-ranking" element={<InstitutionDashboard initialTab="ranking" userType={userType as any} />} />
              <Route path="inst-classes" element={<InstitutionDashboard initialTab="classes" userType={userType as any} />} />
              <Route path="inst-staff" element={<InstitutionDashboard initialTab="staff" userType={userType as any} />} />
              <Route path="inst-subscription" element={<InstitutionDashboard initialTab="subscription" userType={userType as any} />} />
              <Route path="admin/warm-schools" element={<WarmSchoolsDashboard />} />
              <Route path="admin/activate-trial" element={<ActivateTrialDashboard />} />
              <Route path="profile" element={<ProfileView user={session?.user} />} />
              <Route path="notifications" element={
                <NotificationsView
                  notifications={notifications}
                  onMarkAsRead={async (id) => {
                    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
                    await markNotificationAsRead(id, session?.user?.id || 'demo');
                  }}
                  onMarkAllAsRead={async () => {
                    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                    await markAllNotificationsRead(session?.user?.id || 'demo');
                  }}
                  onAction={(type) => {
                    if (type === 'correction') navigate('/app/inst-performance');
                    else if (type === 'ranking') navigate('/app/inst-ranking');
                    else navigate('/app/inst-overview');
                  }}
                  onClose={() => navigate(`/app/${getDefaultView(userType)}`)}
                />
              } />
              <Route path="*" element={<Navigate to="/app/inst-overview" replace />} />
            </Routes>
          )}
        </main>
      </div>
    );
  };

  return (
    <>
      <Routes>
        <Route path="/" element={
          session && !isSuspended ? (
            <Navigate to={`/app/${getDefaultView(userType)}`} replace />
          ) : (
            <TillmornMarketingPage />
          )
        } />
        <Route path="/termos" element={<TermsPrivacyPage defaultTab="termos" />} />
        <Route path="/privacidade" element={<TermsPrivacyPage defaultTab="privacidade" />} />
        <Route path="/lgpd" element={<TermsPrivacyPage defaultTab="lgpd" />} />
        <Route path="/login" element={
          session ? (
            <Navigate to={`/app/${getDefaultView(userType)}`} replace />
          ) : (
            <LoginView
              onLoginSuccess={async (newSession?: any) => {
                const s = newSession || (await supabase.auth.getSession()).data.session;
                if (s) {
                  if (!String(s.user?.id || '').startsWith('demo')) {
                    clearDemoStorage();
                    setIsDemoMode(false);
                  }
                  setSession(s);
                  const resolvedType = await withTimeout(
                    resolveSchoolStatus(s),
                    2500,
                    normalizeUserType(s.user?.user_metadata?.user_type || localStorage.getItem('littera_user_type'))
                  );
                  navigate(`/app/${getDefaultView(resolvedType)}`, { replace: true });
                } else {
                  navigate(`/app/${getDefaultView(userType)}`, { replace: true });
                }
              }}
              onEnterDemo={handleEnterDemo}
            />
          )
        } />
        <Route path="/cadastro" element={
          <CheckoutWizard onBack={() => window.location.href = '/'} onLogin={() => window.location.href = '/login'} />
        } />
        <Route path="/cadastro/finalizar" element={
          session
            ? <Navigate to={`/app/${getDefaultView(userType)}`} replace />
            : <FinalizarCadastroView />
        } />
        <Route path="/setup-account" element={<Navigate to="/cadastro/finalizar" replace />} />
        <Route path="/convite" element={<AcceptInviteView />} />
        <Route path="/matricula/:schoolId" element={
          session && !isSuspended ? (
            <Navigate to={`/app/${getDefaultView(userType)}`} replace />
          ) : (
            <SchoolRegistration />
          )
        } />
        <Route path="/invite/:inviteCode" element={
          session && !isSuspended ? (
            <Navigate to={`/app/${getDefaultView(userType)}`} replace />
          ) : (
            <ClassRegistration />
          )
        } />
        <Route path="/app/*" element={renderMainAppLayout()} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Modal de Alerta de Limite / Intervalo Anti-Spam */}
      {quotaAlert && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-surface-dark max-w-md w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-white/10 text-center animate-scale-up">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
              quotaAlert.color === 'amber' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
              quotaAlert.color === 'rose' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' :
              quotaAlert.color === 'indigo' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' :
              'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              <span className="material-icons-outlined text-3xl">{quotaAlert.icon}</span>
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white font-display mb-2">{quotaAlert.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6 font-medium">{quotaAlert.message}</p>
            <button
              onClick={() => setQuotaAlert(null)}
              className="w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all"
            >
              Compreendido
            </button>
          </div>
        </div>
      )}
    </>
  );

};

export default App;
