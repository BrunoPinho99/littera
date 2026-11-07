"use client";

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { TILLMORN_FONT_FAMILIES } from './TillmornFonts';

interface MarqueeBadge {
  text: string;
  fontFamily: string;
  isAccent?: boolean;
}

const SCHOOL_BADGES: MarqueeBadge[] = [
  { text: 'Padrão ENEM', fontFamily: TILLMORN_FONT_FAMILIES.sans, isAccent: true },
  { text: '5 competências', fontFamily: TILLMORN_FONT_FAMILIES.display },
  { text: 'Nota de 0 a 1000', fontFamily: TILLMORN_FONT_FAMILIES.sans },
  { text: 'Devolutiva em segundos', fontFamily: TILLMORN_FONT_FAMILIES.sans, isAccent: true },
  { text: 'Envios ilimitados', fontFamily: TILLMORN_FONT_FAMILIES.display },
  { text: 'Adequado à LGPD', fontFamily: TILLMORN_FONT_FAMILIES.sans },
];

export const LogoMarquee: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="w-full pt-[48px] pb-[40px] flex flex-col items-center">
      {/* Rótulo opcional institucional */}
      <span className="tm-sans text-[13px] font-medium tracking-[0.02em] uppercase text-[#8E929B] mb-[20px] select-none text-center">
        Escolas e cursinhos que zeraram a fila de correção
      </span>

      <motion.div
        id="escolas-faixa"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        style={{
          maskImage:
            'linear-gradient(90deg, transparent 0%, #000 12%, #000 88%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(90deg, transparent 0%, #000 12%, #000 88%, transparent 100%)',
        }}
        className="w-full max-w-[1360px] mx-auto overflow-hidden select-none"
      >
        <motion.div
          animate={prefersReducedMotion ? undefined : { x: ['0%', '-50%'] }}
          transition={
            prefersReducedMotion
              ? undefined
              : {
                  duration: 26,
                  ease: 'linear',
                  repeat: Infinity,
                }
          }
          className="flex w-max items-center will-change-transform"
        >
          {[0, 1, 2, 3].map((groupIndex) => (
            <div
              key={groupIndex}
              aria-hidden={groupIndex > 0}
              className="flex shrink-0 items-center gap-[48px] sm:gap-[64px] pr-[48px] sm:pr-[64px]"
            >
              {SCHOOL_BADGES.map((badge, bIdx) => (
                <div
                  key={`${groupIndex}-${badge.text}`}
                  className="flex items-center gap-[48px] sm:gap-[64px]"
                >
                  <span
                    style={{ fontFamily: badge.fontFamily }}
                    className={`text-[19px] sm:text-[21px] font-medium leading-none tracking-[-0.02em] whitespace-nowrap transition-colors duration-200 ${
                      badge.isAccent
                        ? 'text-[#0A0A0B]'
                        : 'text-[#8E929B] hover:text-[#0A0A0B]'
                    }`}
                  >
                    {badge.text}
                  </span>
                  {bIdx < SCHOOL_BADGES.length && (
                    <span
                      aria-hidden="true"
                      className="w-[4px] h-[4px] rounded-full bg-[#0A0A0B]/20 shrink-0"
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};
