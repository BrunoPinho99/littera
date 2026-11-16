import React, { useState, useRef, useEffect } from 'react';
import { Notification } from '../types';
import { getUserStats, calculateUserRank } from '../services/databaseService';

interface NavbarProps {
  currentView: any;
  onViewChange: (view: any) => void;
  onLogout: () => void;
  userType: 'student' | 'teacher' | 'school_admin';
  user: any;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  activeChallengesCount?: number;
  onOpenChallenge?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  onLogout,
  userType,
  user,
  notifications,
  onMarkAsRead: _onMarkAsRead,
  activeChallengesCount = 0,
  onOpenChallenge,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userRank, setUserRank] = useState<any>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDemoMode =
    localStorage.getItem('littera_demo_mode') === 'true' &&
    (!user?.id || String(user.id).startsWith('demo'));

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Usuário';
  const photoUrl =
    user?.user_metadata?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}&background=2563eb&color=fff`;

  useEffect(() => {
    if (user?.id && userType === 'student') {
      getUserStats(user.id).then((stats) => {
        setUserRank(calculateUserRank(stats.totalEssays));
      });
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user?.id, userType]);

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (userType === 'school_admin' || userType === 'teacher') {
      onViewChange('inst-overview');
    } else {
      onViewChange('practice');
    }
  };

  const getNavItems = () => {
    if (userType === 'student') {
      return [
        {
          id: 'practice',
          label: 'Praticar',
          renderIcon: (active: boolean) => (
            <svg
              className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-blue-600' : 'text-slate-500'}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              viewBox="0 0 24 24"
            >
              <path d="M4 6h16M4 12h10M4 18h7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
        },
        {
          id: 'performance',
          label: 'Evolução',
          renderIcon: (active: boolean) => (
            <svg
              className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-blue-600' : 'text-slate-500'}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
        },
        {
          id: 'explore',
          label: 'Temas',
          renderIcon: (active: boolean) => (
            <svg
              className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-blue-600' : 'text-slate-500'}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="9" />
              <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" />
            </svg>
          ),
        },
        {
          id: 'ranking',
          label: 'Comunidade',
          renderIcon: (active: boolean) => (
            <svg
              className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-blue-600' : 'text-slate-500'}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ),
        },
      ];
    }
    return [];
  };

  const navItems = getNavItems();

  return (
    <>
      {/* ═══ TOP BAR (Proportional & Compact Stitch Design) ═══ */}
      <header className="fixed w-full top-0 z-[100] px-3 sm:px-6 pt-2.5 sm:pt-3.5 pb-2 pointer-events-none">
        <div className="w-full max-w-6xl mx-auto pointer-events-auto">
          <nav
            aria-label="Navegação Principal"
            className="bg-white/95 backdrop-blur-md rounded-full px-4 sm:px-5 py-1.5 sm:py-2 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.06)] border border-slate-100 flex items-center justify-between transition-all duration-200"
          >
            {/* Brand & Mode Tag Section */}
            <div className="flex items-center gap-2.5">
              <a
                aria-label="Littera Página Inicial"
                className="flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg pr-1 group cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  handleLogoClick();
                }}
                href="#"
              >
                <img
                  alt="Littera Logo"
                  className="w-auto object-contain h-[20px] sm:h-[22px] md:h-[24px] transition-transform duration-200 group-hover:scale-[1.02]"
                  src="/assets/littera-logo.png"
                />
              </a>

              {isDemoMode && (
                <span className="px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 rounded-full border border-amber-200/70">
                  Modo Teste
                </span>
              )}
            </div>

            {/* Segmented Central Navigation Pill */}
            {navItems.length > 0 && (
              <div className="hidden lg:flex items-center bg-slate-100/80 p-1 rounded-full border border-slate-200/70 gap-0.5 shadow-sm">
                {navItems.map((item) => {
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onViewChange(item.id)}
                      className={`text-xs sm:text-[13px] tracking-tight px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all ${
                        isActive
                          ? 'bg-white text-blue-600 shadow-sm font-semibold'
                          : 'text-slate-600 hover:text-slate-900 font-medium'
                      }`}
                    >
                      {item.renderIcon(isActive)}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Right Action CTAs */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {userType === 'student' && activeChallengesCount > 0 && onOpenChallenge && (
                <button
                  onClick={onOpenChallenge}
                  aria-label="Desafios do Professor"
                  title="Abrir Desafio do Professor"
                  type="button"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 text-[11px] font-bold transition-colors mr-0.5"
                >
                  <span className="material-icons-outlined text-[15px]">emoji_events</span>
                  <span className="hidden sm:inline">Desafios</span>
                  <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[9.5px] font-black leading-tight">
                    {activeChallengesCount}
                  </span>
                </button>
              )}
              {isDemoMode ? (
                /* Demo mode: NO "Criar Conta" button as requested, only exit icon */
                <button
                  onClick={onLogout}
                  aria-label="Sair do modo teste"
                  title="Sair do modo teste"
                  className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 sm:p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
                  type="button"
                >
                  <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ) : (
                /* Authenticated User CTAs */
                <>
                  {/* Notifications */}
                  <button
                    onClick={() => onViewChange('notifications')}
                    aria-label="Notificações"
                    title="Notificações"
                    className={`text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 sm:p-2 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-slate-300 ${
                      currentView === 'notifications' ? 'bg-slate-100 text-blue-600' : ''
                    }`}
                  >
                    <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path
                        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {notifications.some((n) => !n.read) && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border border-white" />
                    )}
                  </button>

                  {/* User Profile Avatar with Dropdown */}
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="flex items-center p-0.5 rounded-full hover:ring-2 hover:ring-slate-200 transition-all focus:outline-none"
                      aria-label="Menu do Usuário"
                    >
                      <img
                        src={photoUrl}
                        className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full object-cover border border-slate-200"
                        alt={firstName}
                      />
                    </button>

                    {/* Dropdown Menu */}
                    {isMenuOpen && (
                      <div className="absolute right-0 mt-2.5 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-scale-up">
                        <div className="px-3.5 py-1.5 border-b border-slate-100 mb-1">
                          <p className="text-[11px] text-slate-400 font-medium">Logado como</p>
                          <p className="text-xs font-bold text-slate-800 truncate">{user?.email || firstName}</p>
                          {userRank && userType === 'student' && (
                            <span className="inline-block mt-0.5 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              {userRank.label}
                            </span>
                          )}
                          {userType === 'school_admin' && (
                            <span className="inline-block mt-0.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                              Administrador Escolar
                            </span>
                          )}
                          {userType === 'teacher' && (
                            <span className="inline-block mt-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              Professor(a)
                            </span>
                          )}
                        </div>

                        {(userType === 'school_admin' || userType === 'teacher') && (
                          <button
                            onClick={() => {
                              onViewChange('inst-overview');
                              setIsMenuOpen(false);
                            }}
                            className="w-full px-3.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                            Painel de Controle
                          </button>
                        )}

                        <button
                          onClick={() => {
                            onViewChange('profile');
                            setIsMenuOpen(false);
                          }}
                          className="w-full px-3.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          Meu Perfil
                        </button>

                        {userType === 'student' && (
                          <button
                            onClick={() => {
                              onViewChange('performance');
                              setIsMenuOpen(false);
                            }}
                            className="w-full px-3.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            Minha Jornada
                          </button>
                        )}

                        <div className="border-t border-slate-100 my-1" />

                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            onLogout();
                          }}
                          className="w-full px-3.5 py-1.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Encerrar Sessão
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Stitch Direct Logout / Exit Button */}
                  <button
                    onClick={onLogout}
                    aria-label="Sair"
                    title="Encerrar sessão"
                    className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 sm:p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
                    type="button"
                  >
                    <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* ═══ MOBILE BOTTOM TAB BAR ═══ */}
      {navItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden">
          <div className="bg-white/95 backdrop-blur-xl border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-around px-2 py-1 max-w-lg mx-auto">
              {navItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-all duration-200 min-w-[60px] ${
                      isActive ? 'text-blue-600 font-bold' : 'text-slate-500 font-medium'
                    }`}
                  >
                    <div
                      className={`p-1 rounded-full transition-all duration-200 ${
                        isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-500'
                      }`}
                    >
                      {item.renderIcon(isActive)}
                    </div>
                    <span className="text-[10.5px] tracking-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
            {/* Safe area for mobile home indicators */}
            <div className="h-[env(safe-area-inset-bottom,0px)]" />
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
