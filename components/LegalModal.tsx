import React from 'react';
import { LegalContent } from './LegalContent';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'termos' | 'privacidade' | 'lgpd' | 'seguranca';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'termos',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-surface-dark rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 animate-scale-up border border-gray-100 dark:border-white/10">
        <LegalContent initialTab={initialTab} onClose={onClose} isModal={true} />
      </div>
    </div>
  );
};
