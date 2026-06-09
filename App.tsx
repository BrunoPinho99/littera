
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
import LandingPage from './components/LandingPage';
import SetupAccount from './components/SetupAccount';
import PaymentSuccess from './components/PaymentSuccess';
import AcceptInviteView from './components/AcceptInviteView';
import CheckoutWizard from './components/CheckoutWizard';
import FinalizarCadastroView from './components/FinalizarCadastroView';
// Types and Services
import { Topic, CorrectionResult, EssayInput, Notification, HandwrittenCorrectionResult } from './types';
import { correctEssay, correctHandwrittenEssay } from './services/geminiService';
import { saveEssayToDatabase, getNotifications, getSchoolData, checkEssayCache } from './services/databaseService';
import { supabase } from './supabaseClient';
import { exploreTopics } from './data/exploreTopics';
import { notificationsData } from './data/notificationsData';

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

// Helper: retorna o pathname atual sem barra final

// --- APP COMPONENT ---
const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [userType, setUserType] = useState<string>('student');
  const navigate = useNavigate();
  const location = useLocation();
  const currentView = location.pathname.startsWith('/app/') ? location.pathname.replace('/app/', '') : 'practice';
  const [isInitializing, setIsInitializing] = useState(true);

  // Writing flow
  const [topic, setTopic] = useState<Topic>(INITIAL_TOPIC);
  const [writingTopicTitle, setWritingTopicTitle] = useState('');
  const [correctionResult, setCorrectionResult] = useState<CorrectionResult | null>(null);
  const [handwrittenResult, setHandwrittenResult] = useState<HandwrittenCorrectionResult | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);



  // Banner de redação em andamento
  const [essayDraft, setEssayDraft] = useState<{ topicTitle: string; startTime: number } | null>(null);
  const [schoolStatus, setSchoolStatus] = useState<string | null>(null);

  
  // 1. Initialize Session
  useEffect(() => {
    if (location.pathname === '/setup-account') {
      // Logic for setup-account if needed
    }

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          setUserType(data.session.user.user_metadata?.user_type || 'student');
          loadNotifications(data.session.user.id);

          const schoolId = data.session.user.user_metadata?.school_id;
          if (schoolId) {
            const schoolData = await getSchoolData(schoolId);
            setSchoolStatus(schoolData?.subscription_status || 'inactive');
          }
        } else if (localStorage.getItem('littera_demo_mode')) {
          setIsDemoMode(true);
          const type = localStorage.getItem('littera_demo_type') || 'student';
          setUserType(type);
          setSession({ user: { id: 'demo', email: 'demo@tese.com.br' } });
          setNotifications(notificationsData);
        }
      } catch (error) {
        console.error('Init error:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        localStorage.removeItem('littera_demo_mode');
        localStorage.removeItem('littera_demo_type');
        setIsDemoMode(false);
        setSession(session);
        setUserType(session.user.user_metadata?.user_type || 'student');
        loadNotifications(session.user.id);

        const schoolId = session.user.user_metadata?.school_id;
        if (schoolId) {
          getSchoolData(schoolId).then(sd => setSchoolStatus(sd?.subscription_status || 'inactive'));
        }
      } else {
        if (!localStorage.getItem('littera_demo_mode')) {
          setSession(null);
          setIsDemoMode(false);
          setUserType('student');
        }
      }
    });
    return () => sub.subscription.unsubscribe();
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
    await supabase.auth.signOut();
    localStorage.clear();
    setSession(null);
    setIsDemoMode(false);
    setUserType('student');
    navigate('/');
  };

  const handleEssaySubmit = async (input: EssayInput) => {
    setIsCorrecting(true);
    try {
      const userId = session?.user?.id || 'demo';

      if (input.type === 'text') {
        const cached = await checkEssayCache(userId, input.content);
        if (cached) {
          // Pequeno delay para UX
          await new Promise(r => setTimeout(r, 1000));
          setCorrectionResult({ ...cached, timeTaken: 'Cache', topicTitle: writingTopicTitle });
          navigate('/app/result');
          // Small delay before hiding overlay to prevent flash
          setTimeout(() => setIsCorrecting(false), 100);
          return;
        }
      }

      const result = await correctEssay(writingTopicTitle, input);
      setCorrectionResult({ ...result, timeTaken: '0m', topicTitle: writingTopicTitle });
      
      await saveEssayToDatabase(writingTopicTitle, input, userId, result, session?.user?.user_metadata);
      navigate('/app/result');
      // Small delay before hiding overlay to prevent flash
      setTimeout(() => setIsCorrecting(false), 100);
    } catch (err: unknown) {
      setIsCorrecting(false);
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert('Erro ao corrigir: ' + message);
    }
  };

  const handleHandwrittenSubmit = async (base64: string, mimeType: string) => {
    setIsCorrecting(true);
    try {
      const result = await correctHandwrittenEssay(writingTopicTitle, base64, mimeType);
      setHandwrittenResult({ ...result, topicTitle: writingTopicTitle, timeTaken: '0m' });
      navigate('/app/handwritten-result');
      setTimeout(() => setIsCorrecting(false), 100);
    } catch (err: unknown) {
      setIsCorrecting(false);
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert('Erro ao corrigir manuscrito: ' + message);
    }
  };

  const getDefaultView = (type: string) => {
    if (type === 'school_admin' || type === 'teacher') return 'inst-overview';
    return 'practice';
  };


  if (isInitializing) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 font-bold">Carregando Littera...</div>;
  }

  // --- TRAVA DE ASSINATURA (PAYWALL B2B) ---
  const isSuspended = session && !isDemoMode && schoolStatus !== 'active' && schoolStatus !== null;

  const renderSuspended = () => {
    const savedCheckoutUrl = localStorage.getItem('littera_checkout_url');

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
              {userType === 'school_admin' ? 'Pagamento Pendente' : 'Plataforma Suspensa'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium leading-relaxed">
              {userType === 'school_admin'
                ? 'Sua conta foi criada com sucesso! Para liberar o acesso completo — correções por I.A., turmas e relatórios — finalize o pagamento da assinatura.'
                : 'A assinatura da sua instituição encontra-se inativa ou pendente. Por favor, avise a secretaria ou coordenação da sua escola.'}
            </p>

            {userType === 'school_admin' ? (
              <div className="space-y-3">
                <button
                  onClick={() => {
                    if (savedCheckoutUrl) {
                      window.location.href = savedCheckoutUrl;
                    } else {
                      // Tenta gerar novo checkout via Edge Function
                      navigate('/app/inst-overview');
                    }
                  }}
                  className="w-full py-4 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-primary-dark shadow-xl shadow-primary/25 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <span className="material-icons-outlined text-lg">payment</span>
                  Retomar Pagamento
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full py-3 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-600 transition-colors"
                >
                  Sair da Conta
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogout}
                className="px-8 py-3 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
              >
                Sair da Conta
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const MainAppLayout = () => {
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
          onMarkAsRead={() => { }}
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

        <main className="pt-16 sm:pt-20 lg:pt-24 px-3 sm:px-6 pb-20 md:pb-12 max-w-[1400px] mx-auto">
          {/* Views de Aluno */}
          {!['school_admin', 'teacher'].includes(userType) && (
            <Routes>
              <Route path="practice" element={
                <div className="space-y-16">
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
                  topicTitle={writingTopicTitle}
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
              <Route path="performance" element={<PerformanceView userId={session?.user?.id} isDemo={isDemoMode} />} />
              <Route path="ranking" element={<RankingView />} />
              <Route path="notifications" element={
                <NotificationsView
                  notifications={notifications}
                  onMarkAsRead={() => { }}
                  onMarkAllAsRead={() => { }}
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
              <Route path="profile" element={<ProfileView user={session?.user} />} />
              <Route path="*" element={<Navigate to="/app/inst-overview" replace />} />
            </Routes>
          )}
        </main>
      </div>
    );
  };

  return (
    <Routes>
      <Route path="/" element={
        session || isDemoMode ? (
          <Navigate to={`/app/${getDefaultView(userType)}`} replace />
        ) : (
          <LandingPage
            onLoginClick={() => navigate('/login')}
            onDemoClick={(t) => {
              setIsDemoMode(true);
              setUserType(t);
              setSession({ user: { id: 'demo', email: 'demo@tese.com.br' } });
              localStorage.setItem('littera_demo_mode', 'true');
              localStorage.setItem('littera_demo_type', t);
              setNotifications(notificationsData);
              navigate('/app/practice');
            }}
            onCheckout={() => {}} // Não mais usado, redireciona direto pelo componente LandingPage
          />
        )
      } />
      <Route path="/login" element={
        session || isDemoMode ? (
          <Navigate to={`/app/${getDefaultView(userType)}`} replace />
        ) : (
          <LoginView
            onLoginSuccess={() => navigate(`/app/${getDefaultView('student')}`)}
            onEnterDemo={(t) => {
              setIsDemoMode(true);
              setUserType(t);
              setSession({ user: { id: 'demo', email: 'demo@tese.com.br' } });
              localStorage.setItem('littera_demo_mode', 'true');
              localStorage.setItem('littera_demo_type', t);
              setNotifications(notificationsData);
              navigate('/app/practice');
            }}
          />
        )
      } />
      <Route path="/cadastro" element={
        session || isDemoMode ? (
          <Navigate to={`/app/${getDefaultView(userType)}`} replace />
        ) : (
          <CheckoutWizard onBack={() => window.location.href = '/'} onLogin={() => window.location.href = '/login'} />
        )
      } />
      <Route path="/cadastro/finalizar" element={
        session || isDemoMode
          ? <Navigate to={`/app/${getDefaultView(userType)}`} replace />
          : <FinalizarCadastroView />
      } />
      <Route path="/setup-account" element={<SetupAccount />} />
      <Route path="/convite" element={<AcceptInviteView />} />
      <Route path="/app/*" element={<MainAppLayout />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

};

export default App;
