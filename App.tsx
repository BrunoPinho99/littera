
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import TopicCard from './components/TopicCard';
import CreateTopicCard from './components/CreateTopicCard';
import PerformanceView from './components/PerformanceView';
import ExploreView from './components/ExploreView';
import EssayEditor from './components/EssayEditor';
import CorrectionResultView from './components/CorrectionResult';
import RankingView from './components/RankingView';
import NotificationsView from './components/NotificationsView';
import ProfileView from './components/ProfileView';
import LoginView from './components/LoginView';
import InstitutionDashboard from './components/InstitutionDashboard';
import LandingPage from './components/LandingPage';
import CheckoutForm from './components/CheckoutForm';
import PaymentSuccess from './components/PaymentSuccess';
// Types and Services
import { Topic, CorrectionResult, EssayInput, Notification } from './types';
import { correctEssay } from './services/geminiService';
import { saveEssayToDatabase, getNotifications, getSchoolData } from './services/databaseService';
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
const getPath = () => window.location.pathname.replace(/\/$/, '') || '/';

// --- APP COMPONENT ---
const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [userType, setUserType] = useState<string>('student');
  const [currentView, setCurrentView] = useState<string>('practice');
  const [isInitializing, setIsInitializing] = useState(true);

  // Writing flow
  const [topic, setTopic] = useState<Topic>(INITIAL_TOPIC);
  const [writingTopicTitle, setWritingTopicTitle] = useState('');
  const [correctionResult, setCorrectionResult] = useState<CorrectionResult | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Checkout
  const [checkoutPlan, setCheckoutPlan] = useState<any>(null);

  // Banner de redação em andamento
  const [essayDraft, setEssayDraft] = useState<{ topicTitle: string; startTime: number } | null>(null);
  const [schoolStatus, setSchoolStatus] = useState<string | null>(null);

  const path = getPath();

  // 1. Initialize Session
  useEffect(() => {
    if (path === '/checkout') {
      const savedPlan = localStorage.getItem('littera_checkout_plan');
      if (savedPlan) setCheckoutPlan(JSON.parse(savedPlan));
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
      setCurrentView('inst-students');
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
    setCurrentView('practice');
    window.location.href = '/';
  };

  const handleEssaySubmit = async (input: EssayInput) => {
    setIsCorrecting(true);
    try {
      const result = await correctEssay(writingTopicTitle, input);
      setCorrectionResult({ ...result, timeTaken: '0m', topicTitle: writingTopicTitle });
      const userId = session?.user?.id || 'demo';
      await saveEssayToDatabase(writingTopicTitle, input, userId, result, session?.user?.user_metadata);
      setCurrentView('result');
    } catch (err: any) {
      alert('Erro ao corrigir: ' + err.message);
    } finally {
      setIsCorrecting(false);
    }
  };

  const getDefaultView = (type: string) => {
    if (type === 'school_admin' || type === 'teacher') return 'inst-students';
    return 'practice';
  };

  if (isInitializing) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 font-bold">Carregando Littera...</div>;
  }

  // ─── ROTA /sucesso ────────────────────────────────────────────────────────────
  if (path === '/sucesso') {
    return <PaymentSuccess />;
  }

  // ─── ROTA /login ──────────────────────────────────────────────────────────────
  if (path === '/login') {
    if (session || isDemoMode) {
      window.location.href = '/';
      return null;
    }
    return (
      <LoginView
        onLoginSuccess={() => { window.location.href = '/'; }}
        onEnterDemo={(t) => {
          setIsDemoMode(true);
          setUserType(t);
          setSession({ user: { id: 'demo', email: 'demo@tese.com.br' } });
          localStorage.setItem('littera_demo_mode', 'true');
          localStorage.setItem('littera_demo_type', t);
          setNotifications(notificationsData);
          window.location.href = '/';
        }}
      />
    );
  }

  // ─── ROTA /checkout ───────────────────────────────────────────────────────────
  if (path === '/checkout' && checkoutPlan) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 transition-colors">
        <CheckoutForm
          plan={checkoutPlan}
          schoolId={session?.user?.user_metadata?.school_id || session?.user?.id}
          onBack={() => {
            setCheckoutPlan(null);
            localStorage.removeItem('littera_checkout_plan');
            window.location.href = '/';
          }}
          onSuccess={(successData) => {
            localStorage.setItem('littera_payment_success', JSON.stringify(successData));
            localStorage.removeItem('littera_checkout_plan');
            window.location.href = '/sucesso';
          }}
        />
      </div>
    );
  }

  // ─── SEM SESSÃO: Landing Page ─────────────────────────────────────────────────
  if (!session && !isDemoMode) {
    return (
      <LandingPage
        onLoginClick={() => { window.location.href = '/login'; }}
        onDemoClick={(t) => {
          setIsDemoMode(true);
          setUserType(t);
          setSession({ user: { id: 'demo', email: 'demo@tese.com.br' } });
          localStorage.setItem('littera_demo_mode', 'true');
          localStorage.setItem('littera_demo_type', t);
          setNotifications(notificationsData);
        }}
        onCheckout={(plan) => {
          setCheckoutPlan(plan);
          localStorage.setItem('littera_checkout_plan', JSON.stringify(plan));
          window.location.href = '/checkout';
        }}
      />
    );
  }

  // --- TRAVA DE ASSINATURA (PAYWALL B2B) ---
  if (session && !isDemoMode && currentView !== 'checkout') {
    if (schoolStatus !== 'active' && schoolStatus !== null) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center font-sans">
          <div className="bg-white dark:bg-slate-800 p-10 rounded-[2rem] shadow-premium max-w-lg text-center border border-gray-100 dark:border-slate-700">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4">
              {userType === 'school_admin' ? 'Acesso Interrompido' : 'Plataforma Suspensa'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">
              {userType === 'school_admin' 
                ? 'Para habilitar as correções com I.A. e o acesso aos seus alunos e professores, é necessário ativar sua assinatura.' 
                : 'A assinatura da sua instituição encontra-se inativa ou pendente. Por favor, avise a secretaria ou coordenação da sua escola.'}
            </p>
            
            {userType === 'school_admin' ? (
              <button 
                onClick={() => {
                  setCheckoutPlan({ id: 'pro_mensal', name: 'Plano B2B', price: 'Consulte' });
                  setCurrentView('checkout');
                  window.location.href = '/checkout';
                }}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-all"
              >
                Regularizar Assinatura
              </button>
            ) : (
              <button 
                onClick={handleLogout}
                className="px-6 py-2 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
              >
                Sair da Conta
              </button>
            )}
          </div>
        </div>
      );
    }
  }
  // -----------------------------------------

  // ─── APP PRINCIPAL (autenticado / demo) ───────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar
        currentView={currentView}
        onViewChange={setCurrentView}
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
                setCurrentView('writing');
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

      <main className="pt-28 px-6 pb-12 max-w-[1400px] mx-auto">
        {/* Views de Aluno */}
        {!['school_admin', 'teacher'].includes(userType) && (
          <>
            {currentView === 'practice' && (
              <div className="space-y-16">
                <TopicCard
                  topic={topic}
                  onRefresh={() => {
                    const random = SAFE_TOPICS[Math.floor(Math.random() * SAFE_TOPICS.length)];
                    setTopic({ id: random.id, title: random.title, supportTexts: random.supportTexts });
                  }}
                  isLoading={isLoading}
                  onWrite={() => { setWritingTopicTitle(topic.title); setCurrentView('writing'); }}
                  onUpload={() => { setWritingTopicTitle(topic.title); setCurrentView('writing'); }}
                />
                <CreateTopicCard onTopicGenerated={(t) => { setTopic(t); }} />
              </div>
            )}
            {currentView === 'writing' && (
              <EssayEditor
                topicTitle={writingTopicTitle}
                onCancel={() => setCurrentView('practice')}
                onSubmit={handleEssaySubmit}
                isSubmitting={isCorrecting}
                startTime={Date.now()}
              />
            )}
            {currentView === 'result' && correctionResult && (
              <CorrectionResultView result={correctionResult} onBack={() => setCurrentView('practice')} />
            )}
            {currentView === 'explore' && (
              <ExploreView onSelectTopic={(title) => {
                const found = SAFE_TOPICS.find(t => t.title === title);
                if (found) {
                  setTopic({ id: found.id, title: found.title, supportTexts: found.supportTexts });
                  setCurrentView('practice');
                }
              }} />
            )}
            {currentView === 'performance' && <PerformanceView userId={session?.user?.id} isDemo={isDemoMode} />}
            {currentView === 'ranking' && <RankingView />}
          </>
        )}

        {currentView === 'notifications' && (
          <NotificationsView
            notifications={notifications}
            onMarkAsRead={() => { }}
            onMarkAllAsRead={() => { }}
            onClose={() => setCurrentView(getDefaultView(userType))}
          />
        )}
        {currentView === 'profile' && <ProfileView user={session?.user} />}

        {/* Views Institucionais */}
        {(userType === 'school_admin' || userType === 'teacher') && (
          <>
            {currentView === 'inst-students' && <InstitutionDashboard initialTab="students" userType={userType as any} />}
            {currentView === 'inst-performance' && <InstitutionDashboard initialTab="essays" userType={userType as any} />}
            {currentView === 'inst-ranking' && <InstitutionDashboard initialTab="ranking" userType={userType as any} />}
            {currentView === 'inst-classes' && <InstitutionDashboard initialTab="classes" userType={userType as any} />}
          </>
        )}
      </main>
    </div>
  );
};

export default App;
