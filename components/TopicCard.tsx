
import React from 'react';
import { Topic } from '../types';

interface TopicCardProps {
  topic: Topic;
  onRefresh: () => void;
  isLoading: boolean;
  onWrite: () => void;
  onUpload: () => void;
}

const TopicCard: React.FC<TopicCardProps> = ({ topic, onRefresh, isLoading, onWrite, onUpload }) => {
  const [countdown, setCountdown] = React.useState<number | null>(null);

  const handleWriteClick = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(interval);
          setTimeout(() => { setCountdown(null); onWrite(); }, 500);
          return 1;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);
  };

  return (
    <div className="relative group">
      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-on-surface/80 backdrop-blur-md">
          <div className="flex flex-col items-center gap-6">
            <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
              <svg width="140" height="140" className="absolute inset-0 -rotate-90">
                <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                <circle
                  cx="70" cy="70" r="60" fill="none"
                  stroke="#004ac6" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 60}`}
                  strokeDashoffset={`${2 * Math.PI * 60 * (1 - countdown / 3)}`}
                  style={{ transition: 'stroke-dashoffset 0.9s linear' }}
                />
              </svg>
              <span key={countdown} className="text-7xl font-black text-white animate-count-in z-10" style={{ letterSpacing: '-0.05em', fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
                {countdown}
              </span>
            </div>
            <p className="text-label-sm text-white/50 uppercase tracking-[0.3em]">Preparando...</p>
          </div>
        </div>
      )}

      {/* Main Card — "Littera Standard": xl radius, no borders, surface-container-lowest */}
      <div className="relative bg-surface-container-lowest rounded-card shadow-ambient overflow-hidden transition-all duration-500">

        {/* Shimmer loading bar */}
        {isLoading && (
          <div className="absolute top-0 left-0 w-full h-1 bg-surface-container-high overflow-hidden z-30">
            <div className="h-full bg-primary animate-shimmer w-1/3 absolute top-0" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }}></div>
          </div>
        )}

        <div className="p-10 md:p-14 flex flex-col items-center text-center relative z-20">

          {/* Floating badge — Secondary button style */}
          <div className="mb-8 animate-float">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface-container-lowest rounded-pill shadow-card ghost-border text-primary hover:bg-primary hover:text-on-primary transition-all duration-300 group/badge"
            >
              <span className={`material-icons-outlined text-sm transition-transform duration-700 ${isLoading ? 'animate-spin' : 'group-hover/badge:rotate-180'}`}>autorenew</span>
              <span className="text-label-sm uppercase tracking-widest">Gerar Novo Tema</span>
            </button>
          </div>

          {/* Hero Title — display-md, Plus Jakarta Sans */}
          <h2 className={`max-w-4xl text-display-md font-display text-on-surface leading-[1.1] mb-8 tracking-tight transition-all duration-500 ${isLoading ? 'opacity-30 blur-sm scale-95' : 'opacity-100 scale-100'}`}
              style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
            {topic.title}
          </h2>

          <div className="w-20 h-1.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent rounded-full mb-12"></div>

          {/* Support Texts — Nested containers (surface-container-low on surface-container-lowest) */}
          <div className="w-full max-w-5xl mb-12">
            <div className="flex items-center justify-center gap-3 mb-6 opacity-50">
              <div className="h-px w-12 bg-outline-variant/30"></div>
              <span className="text-label-sm uppercase tracking-[0.3em] text-on-surface-variant">Contexto & Apoio</span>
              <div className="h-px w-12 bg-outline-variant/30"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {topic.supportTexts.slice(0, 2).map((text) => (
                <div key={text.id} className="text-left bg-surface-container-low p-6 rounded-card hover:bg-surface-container-lowest hover:shadow-ambient transition-all duration-300 group/card cursor-default">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-container-lowest shadow-inner flex items-center justify-center text-primary group-hover/card:bg-primary group-hover/card:text-on-primary transition-colors">
                      <span className="material-icons-outlined text-lg">{text.icon === 'article' ? 'description' : text.icon}</span>
                    </div>
                    <h4 className="font-bold text-body-sm text-on-surface line-clamp-1">{text.title}</h4>
                  </div>
                  <p className="text-body-sm text-on-surface-variant leading-relaxed line-clamp-2 pl-11">
                    {text.content}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CTAs — Primary gradient + Secondary outlined */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button
              onClick={handleWriteClick}
              disabled={isLoading}
              className="group relative px-8 py-5 btn-gradient text-on-primary rounded-pill font-black text-label-lg transition-all hover:scale-[1.02] active:scale-95 shadow-glow-sm hover:shadow-glow disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <span className="material-icons-outlined text-xl group-hover:rotate-12 transition-transform">edit_note</span>
              <span>Escrever Redação</span>
            </button>

            <button
              onClick={onUpload}
              disabled={isLoading}
              className="px-8 py-5 bg-surface-container-lowest ghost-border text-on-surface-variant rounded-pill font-black text-label-lg transition-all hover:text-primary hover:shadow-card active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <span className="material-icons-outlined text-xl">add_a_photo</span>
              <span>Enviar Foto</span>
            </button>
          </div>
        </div>

        {/* Subtle background gradient */}
        <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-surface-container-low/50 to-transparent pointer-events-none z-0"></div>
      </div>
    </div>
  );
};

export default TopicCard;
