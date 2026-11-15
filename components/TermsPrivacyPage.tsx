import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LegalContent } from './LegalContent';

export const TermsPrivacyPage: React.FC<{ defaultTab?: 'termos' | 'privacidade' | 'lgpd' | 'seguranca' }> = ({
  defaultTab = 'termos'
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] flex flex-col">
      {/* Top Bar with brand and back button */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md border-b border-gray-200/80 dark:border-white/10 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/" className="inline-flex items-center">
            <img src="/assets/littera-logo.png" alt="Littera" className="h-7 w-auto" />
          </a>
          <span className="hidden sm:inline text-xs font-bold text-gray-400">|</span>
          <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider text-gray-500">
            Termos Legais e LGPD
          </span>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
        >
          <span className="material-icons-outlined text-sm">arrow_back</span>
          Voltar
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 my-4">
        <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-xl border border-gray-100 dark:border-white/5 overflow-hidden">
          <LegalContent initialTab={defaultTab} isModal={false} />
        </div>
      </main>
    </div>
  );
};
