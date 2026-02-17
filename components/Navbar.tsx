
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
  const photoUrl = user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${firstName}&background=8B5CF6&color=fff`;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);

    // Carregar rank do usuário para o badge da Navbar apenas se for aluno
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
    if (userType === 'school_admin') {
      onViewChange('inst-students');
    } else if (userType === 'teacher') {
      onViewChange('inst-students'); // Professor vai para lista de alunos
    } else {
      onViewChange('practice');
    }
  };

  // Definição dos itens de menu baseados no tipo de usuário
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
      // School Admin
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
          ? 'bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl shadow-premium border border-gray-100 dark:border-white/5 rounded-[2rem]'
          : 'bg-transparent'
        }`}>
        <nav className="h-20 flex items-center justify-between px-8">

          {/* Logo Section */}
          <div
            className="flex items-center gap-3 cursor-pointer shrink-0 group"
            onClick={handleLogoClick}
          >
            <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center shadow-premium border border-gray-100 dark:border-white/5 group-hover:scale-105 transition-all duration-300">
              <div className="flex flex-col items-center translate-y-[1.5px]">
                <span className="text-primary font-black text-2xl leading-none tracking-tighter">L</span>
                <div className="w-4 h-[3.5px] bg-primary mt-[1px] rounded-full"></div>
              </div>
            </div>
            <span className="font-black text-2xl tracking-tighter text-gray-900 dark:text-white transition-opacity">
              Littera<span className="text-primary/40">.</span>
            </span>
          </div>

          {/* Centered Navigation Items - Modern Pill Design */}
          <div className="hidden md:flex items-center bg-gray-100/50 dark:bg-white/5 p-1.5 rounded-2xl gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-black transition-all duration-300 ${currentView === item.id
                    ? 'bg-white dark:bg-slate-800 text-primary shadow-sm scale-100'
                    : 'text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10'
                  }`}
              >
                <span className={`material-icons-outlined text-xl transition-transform ${currentView === item.id ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                <span className="tracking-tight">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Right Section: User & Actions */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onViewChange('notifications')}
                className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-all relative group ${currentView === 'notifications' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-primary hover:bg-primary/5'}`}
              >
                <span className="material-icons-outlined text-2xl">notifications</span>
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-background-dark group-hover:scale-125 transition-transform"></span>
                )}
              </button>
            </div>

            <div className="h-8 w-px bg-gray-100 dark:bg-white/5 hidden sm:block"></div>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-3 p-1.5 rounded-2xl transition-all hover:bg-gray-100/50 dark:hover:bg-white/5 group"
              >
                <div className="text-right hidden sm:block pr-1">
                  <p className="text-xs font-black text-gray-900 dark:text-white leading-none mb-1 group-hover:text-primary transition-colors">{firstName}</p>
                  <div className="flex items-center justify-end gap-1.5">
                    {userRank && userType === 'student' && (
                      <span className={`material-icons-outlined text-[12px] ${userRank.color}`}>{userRank.icon}</span>
                    )}
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                      {userType === 'teacher' ? 'Docente' : userType === 'school_admin' ? 'Admin' : (userRank ? userRank.label : userType)}
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <img src={photoUrl} className="w-10 h-10 rounded-xl border-2 border-primary/20 p-0.5 object-cover shadow-sm group-hover:border-primary/50 transition-all" alt="User" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center border-2 border-white dark:border-background-dark">
                    <span className="material-icons-outlined text-10px font-bold">expand_more</span>
                  </div>
                </div>
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 mt-4 w-64 bg-white dark:bg-surface-dark rounded-[2rem] shadow-premium border border-gray-100 dark:border-white/5 py-3 animate-fade-in-up">
                  <div className="px-6 py-4 border-b border-gray-50 dark:border-white/5 mb-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Logado como</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.email}</p>
                  </div>

                  <button onClick={() => { onViewChange('profile'); setIsMenuOpen(false); }} className="w-full px-6 py-3 text-left text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-primary/5 hover:text-primary flex items-center gap-4 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <span className="material-icons-outlined text-xl">person_outline</span>
                    </div>
                    Meu Perfil
                  </button>

                  {userType === 'student' && (
                    <button onClick={() => { onViewChange('performance'); setIsMenuOpen(false); }} className="w-full px-6 py-3 text-left text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-primary/5 hover:text-primary flex items-center gap-4 transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <span className="material-icons-outlined text-xl">emoji_events</span>
                      </div>
                      Minha Jornada
                    </button>
                  )}

                  <div className="h-px bg-gray-50 dark:bg-white/5 my-2 mx-4"></div>

                  <button onClick={onLogout} className="w-full px-6 py-3 text-left text-sm font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 flex items-center gap-4 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
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
