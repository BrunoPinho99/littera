
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
// Types and Services
import { Topic, CorrectionResult, EssayInput, Notification } from './types';
import { correctEssay } from './services/geminiService';
import { saveEssayToDatabase, getNotifications, markNotificationAsRead, markAllNotificationsRead } from './services/databaseService';
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

// --- APP COMPONENT START ---
const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [userType, setUserType] = useState<string>('student');
  const [currentView, setCurrentView] = useState<string>('practice');
  const [isInitializing, setIsInitializing] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // State for writing flow
  const [topic, setTopic] = useState<Topic>(INITIAL_TOPIC);
  const [writingTopicTitle, setWritingTopicTitle] = useState("");
  const [correctionResult, setCorrectionResult] = useState<CorrectionResult | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // 1. Initialize Session
  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          setUserType(data.session.user.user_metadata?.user_type || 'student');
          loadNotifications(data.session.user.id);
        } else if (localStorage.getItem('littera_demo_mode')) {
          setIsDemoMode(true);
          const type = localStorage.getItem('littera_demo_type') || 'student';
          setUserType(type);
          setSession({ user: { id: 'demo', email: 'demo@tese.com.br' } });
          setNotifications(notificationsData);
        }
      } catch (error) {
        console.error("Init error:", error);
      } finally {
        setIsInitializing(false);
      }
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setUserType(session.user.user_metadata?.user_type || 'student');
        loadNotifications(session.user.id);
      } else if (!localStorage.getItem('littera_demo_mode')) {
        // Se não há sessão e não é demo, reseta estados para login
        setSession(null);
        setIsDemoMode(false);
        setUserType('student');
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Redirecionamento automático para a view padrão do administrador
  useEffect(() => {
    if ((userType === 'school_admin' || userType === 'teacher') && !currentView.startsWith('inst-')) {
      setCurrentView('inst-students');
    }
  }, [userType, currentView]);

  const loadNotifications = async (uid: string) => {
    try {
      const data = await getNotifications(uid);
      setNotifications(data || []);
    } catch (e) {
      console.error("Erro ao carregar notificações", e);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    setSession(null);
    setIsDemoMode(false);
    setUserType('student');
    setCurrentView('practice');
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
      showToast("Erro ao corrigir: " + (err.message || 'Verifique sua conexão e tente novamente.'));
    } finally {
      setIsCorrecting(false);
    }
  };

  const getDefaultView = (type: string) => {
    if (type === 'school_admin' || type === 'teacher') return 'inst-students';
    return 'practice';
  };

  if (isInitializing) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="relative mb-8">
        <div className="w-20 h-20 bg-surface-container-lowest rounded-[1.75rem] flex items-center justify-center shadow-ambient">
          <div className="flex flex-col items-center translate-y-[2px]">
            <span style={{ color: '#004ac6', fontWeight: 900, fontSize: 36, lineHeight: 1, letterSpacing: '-0.05em', fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>L</span>
            <div style={{ width: 24, height: 4, background: '#004ac6', borderRadius: 9999, marginTop: 2 }}></div>
          </div>
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-2 border-surface-container-high border-t-primary rounded-full animate-spin"></div>
      </div>
      <p className="text-label-sm text-on-surface-variant uppercase tracking-[0.25em]">Carregando...</p>
    </div>
  );

  if (!session && !isDemoMode) {
    if (showLogin) {
      return <LoginView onLoginSuccess={() => { }} onEnterDemo={(t) => {
        setIsDemoMode(true);
        setUserType(t);
        setSession({ user: { id: 'demo', email: 'demo@tese.com.br' } });
        localStorage.setItem('littera_demo_mode', 'true');
        localStorage.setItem('littera_demo_type', t);
        setNotifications(notificationsData);
      }} />;
    }

    return (
      <LandingPage
        onLoginClick={() => setShowLogin(true)}
        onDemoClick={(t) => {
          setIsDemoMode(true);
          setUserType(t);
          setSession({ user: { id: 'demo', email: 'demo@tese.com.br' } });
          localStorage.setItem('littera_demo_mode', 'true');
          localStorage.setItem('littera_demo_type', t);
          setNotifications(notificationsData);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface transition-colors">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-fade-in-up">
          <div className="flex items-center gap-3 bg-rose-600 text-white px-6 py-4 rounded-pill shadow-ambient-lg max-w-md backdrop-blur-xl">
            <span className="material-icons-outlined text-xl shrink-0">error_outline</span>
            <p className="text-body-sm font-bold leading-snug">{toastMessage}</p>
            <button onClick={() => setToastMessage(null)} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
              <span className="material-icons-outlined text-lg">close</span>
            </button>
          </div>
        </div>
      )}

      <Navbar
        currentView={currentView}
        onViewChange={setCurrentView}
        onLogout={handleLogout}
        user={session?.user}
        userType={userType as any}
        notifications={notifications}
        onMarkAsRead={() => { }}
      />

      <main className="pt-28 px-6 pb-12 max-w-[1400px] mx-auto">
        {/* Student Views */}
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
        {currentView === 'notifications' && <NotificationsView notifications={notifications} onMarkAsRead={() => { }} onMarkAllAsRead={() => { }} onClose={() => setCurrentView(getDefaultView(userType))} />}
        {currentView === 'profile' && <ProfileView user={session?.user} />}

        {/* Institucional Views */}
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
