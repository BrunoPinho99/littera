"use client";

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { TillmornButton } from './TillmornButton';
import { TillmornDiamondGlyph } from './TillmornIcons';

const FOOTER_LINKS = [
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Calculadora', href: '#calculadora' },
  { label: 'Recursos', href: '#recursos' },
  { label: 'Integrações', href: '#integracoes' },
  { label: 'Escolas', href: '#escolas' },
  { label: 'Como contratar', href: '#como-contratar' },
  { label: 'Dúvidas', href: '#duvidas' },
];

const SOCIAL_LINKS = [
  { label: 'Instagram', href: 'https://instagram.com' },
  { label: 'LinkedIn', href: 'https://linkedin.com' },
];

const LEGAL_LINKS = [
  { label: 'Privacidade', href: '#inicio' },
  { label: 'Termos', href: '#inicio' },
  { label: 'Encarregado de dados (LGPD)', href: '#inicio' },
];

export const CtaAndFooterSection: React.FC = () => {
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
      {/* Dobra 14: CTA Final — Comece a semana com a pilha zerada */}
      <section
        id="cta-final"
        data-framer-name="CTA Final"
        className="w-full bg-white pt-[120px] lg:pt-[150px] pb-[20px] px-3 sm:px-[20px]"
      >
        <div
          ref={ctaRef}
          data-framer-name="CTA Card"
          className="max-w-[1400px] mx-auto h-[520px] sm:h-[620px] lg:h-[680px] rounded-[36px] relative overflow-hidden flex flex-col items-center justify-center text-center px-6 bg-[#DCE7EE]"
        >
          {/* Foto de fundo: sala de aula iluminada com luz suave da manhã */}
          <motion.img
            src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=2200&q=85"
            alt="Sala de aula vazia com luz da manhã"
            aria-hidden="true"
            decoding="async"
            style={{ scale: skyScale }}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none will-change-transform"
          />

          {/* Scrim translúcido de legibilidade editorial */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-white/75 via-white/85 to-white/95 pointer-events-none"
          />

          <div className="relative z-10 max-w-[880px] flex flex-col items-center">
            <h2 className="tm-display text-[44px] sm:text-[68px] lg:text-[96px] font-medium leading-[0.96] tracking-[-0.05em] text-[#0A0A0B]">
              <motion.span
                initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
                whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                className="block"
              >
                Comece a semana
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
                whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.85, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="block text-[#2F5BFF]"
              >
                com a pilha zerada.
              </motion.span>
            </h2>

            <motion.div
              data-framer-name="CTAs"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="mt-[36px] flex flex-wrap items-center justify-center gap-[12px]"
            >
              <TillmornButton label="Agendar reunião" variant="primary" href="#reuniao" />
              <TillmornButton
                label="Calcular minha economia"
                variant="white"
                href="#calculadora"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Dobra 15: Footer */}
      <footer
        data-framer-name="Footer"
        className="w-full bg-white pt-[52px] pb-[42px] px-5 sm:px-[40px]"
      >
        <div className="max-w-[1360px] mx-auto flex flex-col">
          {/* Top Row */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-[24px] pb-[44px]">
            <a
              href="#inicio"
              onClick={(e) => handleSmoothAnchor(e, '#inicio')}
              className="inline-flex items-center gap-[10px] text-[#0A0A0B]"
              aria-label="Littera Início"
            >
              <TillmornDiamondGlyph size={26} />
              <span className="tm-display text-[20px] font-medium tracking-[0.2px] leading-none">
                Littera
              </span>
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
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleSmoothAnchor(e, item.href)}
                  className="tm-sans text-[13.5px] text-[#6B6F76] hover:text-[#0A0A0B] transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};
