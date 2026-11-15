"use client";

import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { TillmornButton } from './TillmornButton';
import { LegalModal } from '../../../components/LegalModal';

const FOOTER_LINKS = [
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Calculadora', href: '#calculadora' },
  { label: 'Recursos', href: '#recursos' },
  { label: 'Integrações', href: '#integracoes' },
  { label: 'Como contratar', href: '#como-contratar' },
  { label: 'Dúvidas', href: '#duvidas' },
];

const SOCIAL_LINKS = [
  { label: 'Instagram', href: 'https://instagram.com' },
  { label: 'LinkedIn', href: 'https://linkedin.com' },
];

const LEGAL_LINKS: { label: string; tab: 'termos' | 'privacidade' | 'lgpd' | 'seguranca' }[] = [
  { label: 'Privacidade', tab: 'privacidade' },
  { label: 'Termos', tab: 'termos' },
  { label: 'Encarregado de dados (LGPD)', tab: 'lgpd' },
];

export const CtaAndFooterSection: React.FC = () => {
  const [legalTab, setLegalTab] = useState<'termos' | 'privacidade' | 'lgpd' | 'seguranca' | null>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ctaRef,
    offset: ['start end', 'center center'],
  });
  const skyScale = useTransform(scrollYProgress, [0, 1], [1.08, 1]);

  const handleSmoothAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <>
      {/* Dobra 15: Footer */}
      <footer
        data-framer-name="Footer"
        className="w-full bg-white pt-[52px] pb-[42px] px-5 sm:px-[40px]"
      >
        <div className="max-w-[1360px] mx-auto flex flex-col">
          {/* Top Row */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-[24px] pb-[44px]">
            <a
              href="/"
              className="inline-flex items-center justify-center text-[#0A0A0B]"
              aria-label="Littera Início"
            >
              <img src="/assets/littera-logo.png" alt="Littera" className="block h-7 lg:h-8 w-auto" />
            </a>

            <nav
              aria-label="Links do rodapé"
              className="flex flex-wrap items-center gap-x-[28px] gap-y-[10px]"
            >
              {FOOTER_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleSmoothAnchor(e, link.href)}
                  className="tm-sans text-[14.5px] text-[#6B6F76] hover:text-[#0A0A0B] transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="h-[1px] w-full bg-[#0A0A0B]/[0.07]" />

          {/* Bottom Row */}
          <div className="pt-[24px] flex flex-wrap items-center justify-between gap-y-[16px] gap-x-[24px]">
            <span className="tm-sans text-[13.5px] text-[#6B6F76]">
              © 2026 Littera Tecnologia Educacional
            </span>

            <div className="flex flex-wrap items-center gap-x-[22px] gap-y-[8px]">
              {SOCIAL_LINKS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tm-sans text-[13.5px] text-[#6B6F76] hover:text-[#0A0A0B] transition-colors"
                >
                  {item.label}
                </a>
              ))}
              <span className="text-[#0A0A0B]/20 hidden sm:inline">·</span>
              {LEGAL_LINKS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setLegalTab(item.tab)}
                  className="tm-sans text-[13.5px] text-[#6B6F76] hover:text-[#0A0A0B] transition-colors cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <LegalModal
        isOpen={Boolean(legalTab)}
        onClose={() => setLegalTab(null)}
        initialTab={legalTab || 'termos'}
      />
    </>
  );
};
