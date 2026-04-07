
import React, { useState, useRef, useEffect, useMemo } from 'react';
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
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onViewChange, onLogout, userType, user, notifications, onMarkAsRead }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userRank, setUserRank] = useState<any>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || "Usuário";
  const photoUrl = user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${firstName}&background=004ac6&color=fff`;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);

    if (user?.id && userType === 'student') {
      getUserStats(user.id).then(stats => {
        setUserRank(calculateUserRank(stats.totalEssays));
      });
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user?.id, userType]);

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (userType === 'school_admin' || userType === 'teacher') {
      onViewChange('inst-students');
    } else {
      onViewChange('practice');
    }
  };

  const getNavItems = () => {
    if (userType === 'student') {
      return [
        { id: 'practice', label: 'Praticar', icon: 'edit_note' },
        { id: 'performance', label: 'Evolução', icon: 'insights' },
        { id: 'explore', label: 'Temas', icon: 'explore' },
        { id: 'ranking', label: 'Comunidade', icon: 'groups' },
      ];
    } else if (userType === 'teacher') {
      return [
        { id: 'inst-students', label: 'Meus Alunos', icon: 'school' },
        { id: 'inst-performance', label: 'Correções', icon: 'assignment_turned_in' },
        { id: 'inst-ranking', label: 'Ranking da Turma', icon: 'leaderboard' },
      ];
    } else {
      return [
        { id: 'inst-students', label: 'Alunos', icon: 'person' },
        { id: 'inst-performance', label: 'Desempenho', icon: 'insights' },
        { id: 'inst-ranking', label: 'Rankings', icon: 'emoji_events' },
        { id: 'inst-classes', label: 'Turmas', icon: 'class' },
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <header className={`fixed w-full top-0 z-[100] transition-all duration-500 px-6 ${scrolled ? 'pt-4' : 'pt-6'}`}>
      <div className={`max-w-[1400px] mx-auto transition-all duration-500 ${scrolled
          ? 'bg-surface/80 backdrop-blur-2xl shadow-ambient rounded-pill'
          : 'bg-transparent'
        }`}>
        <nav className="h-20 flex items-center justify-between px-8">

          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer shrink-0 group"
            onClick={handleLogoClick}
          >
            <div className="w-10 h-10 bg-surface-container-lowest rounded-xl flex items-center justify-center shadow-ambient group-hover:scale-105 transition-all duration-300">
              <div className="flex flex-col items-center translate-y-[1.5px]">
                <span className="text-primary font-black text-2xl leading-none tracking-tighter" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>L</span>
                <div className="w-4 h-[3.5px] bg-primary mt-[1px] rounded-full"></div>
              </div>
            </div>
            <span className="font-black text-2xl tracking-tighter text-on-surface transition-opacity" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
              Littera<span className="text-primary/30">.</span>
            </span>
          </div>

          {/* Center Navigation — Surface Pill */}
          <div className="hidden md:flex items-center bg-surface-container-low p-1.5 rounded-pill gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-pill text-label-lg transition-all duration-300 ${currentView === item.id
                    ? 'bg-surface-container-lowest text-primary shadow-card'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest/60'
                  }`}
              >
                <span className={`material-icons-outlined text-xl transition-transform ${currentView === item.id ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                <span className="tracking-tight">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">

            {/* Notification bell */}
            <button
              onClick={() => onViewChange('notifications')}
              className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all relative group ${currentView === 'notifications'
                ? 'bg-primary text-on-primary shadow-glow-sm'
                : 'text-on-surface-variant hover:text-primary hover:bg-primary-fixed/30'}`}
            >
              <span className="material-icons-outlined text-2xl">notifications</span>
              {notifications.some(n => !n.read) && (
                <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-surface group-hover:scale-125 transition-transform"></span>
              )}
            </button>

            {/* Separator — uses tonal layering, not a border */}
            <div className="h-8 w-px bg-surface-container-high hidden sm:block"></div>

            {/* User menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-3 p-1.5 rounded-xl transition-all hover:bg-surface-container-low group"
              >
                <div className="text-right hidden sm:block pr-1">
                  <p className="text-label-md text-on-surface leading-none mb-1 group-hover:text-primary transition-colors">{firstName}</p>
                  <div className="flex items-center justify-end gap-1.5">
                    {userRank && userType === 'student' && (
                      <span className={`material-icons-outlined text-[12px] ${userRank.color}`}>{userRank.icon}</span>
                    )}
                    <p className="text-label-sm text-on-surface-variant uppercase tracking-widest">
                      {userType === 'teacher' ? 'Docente' : userType === 'school_admin' ? 'Admin' : (userRank ? userRank.label : userType)}
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <img src={photoUrl} className="w-10 h-10 rounded-xl p-0.5 object-cover shadow-card ghost-border group-hover:shadow-glow-sm transition-all" alt="User" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary text-on-primary rounded-full flex items-center justify-center border-2 border-surface">
                    <span className="material-icons-outlined text-10px font-bold">expand_more</span>
                  </div>
                </div>
              </button>

              {/* Dropdown — Ambient shadow, surface-container-lowest, no borders */}
              {isMenuOpen && (
                <div className="absolute right-0 mt-4 w-64 bg-surface-container-lowest rounded-card shadow-ambient-lg py-3 animate-fade-in-up">
                  <div className="px-6 py-4 mb-2">
                    <p className="text-label-sm text-on-surface-variant uppercase tracking-widest mb-1">Logado como</p>
                    <p className="text-body-sm font-bold text-on-surface truncate">{user?.email}</p>
                  </div>

                  <div className="h-px bg-surface-container-high mx-4 mb-1"></div>

                  <button onClick={() => { onViewChange('profile'); setIsMenuOpen(false); }} className="w-full px-6 py-3 text-left text-body-sm font-bold text-on-surface-variant hover:bg-surface-container-low hover:text-primary flex items-center gap-4 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center group-hover:bg-primary-fixed/40 transition-colors">
                      <span className="material-icons-outlined text-xl">person_outline</span>
                    </div>
                    Meu Perfil
                  </button>

                  {userType === 'student' && (
                    <button onClick={() => { onViewChange('performance'); setIsMenuOpen(false); }} className="w-full px-6 py-3 text-left text-body-sm font-bold text-on-surface-variant hover:bg-surface-container-low hover:text-primary flex items-center gap-4 transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center group-hover:bg-primary-fixed/40 transition-colors">
                        <span className="material-icons-outlined text-xl">emoji_events</span>
                      </div>
                      Minha Jornada
                    </button>
                  )}

                  <div className="h-px bg-surface-container-high my-1 mx-4"></div>

                  <button onClick={onLogout} className="w-full px-6 py-3 text-left text-body-sm font-black text-rose-500 hover:bg-rose-50 flex items-center gap-4 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                      <span className="material-icons-outlined text-xl">logout</span>
                    </div>
                    Encerrar Sessão
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
