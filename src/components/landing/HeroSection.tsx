"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ParticleTerrainCanvas } from './ParticleTerrainCanvas';
import { TillmornButton } from './TillmornButton';
import { HeroAppMockup } from './HeroAppMockup';
import { LogoMarquee } from './LogoMarquee';

const HERO_TITLE_LINES: string[][] = [
  ['Seus', 'alunos', 'escrevem', 'mais.'],
  ['Sua', 'escola', 'gasta', 'menos.'],
];

export const HeroSection: React.FC = () => {
  let wordCounter = 0;

  return (
    <section
      id="inicio"
      data-framer-name="Hero"
      className="relative w-full overflow-x-clip bg-white pt-[144px] sm:pt-[154px]"
    >
      {/* Interactive 3D Cobalt Particle Terrain Canvas (1440x742 exact Framer layer) */}
      <div className="absolute inset-x-0 top-0 h-[742px] z-0">
        <ParticleTerrainCanvas
          color="rgb(54, 174, 255)"
          background="rgba(255, 255, 255, 0.5)"
          bgMode="light"
          hueShift={49}
          brightness={2}
          grain={0.15}
          mouseGlow={true}
          glowRadius={120}
          fade={{ bottom: 215 }}
          terrain={{
            amplitude: 0.5,
            flow: 1.3,
            horizon: 0.52,
            scale: 1.05,
            speed: 0.05,
          }}
          light={{
            contrast: 1.9,
            depth: -0.5,
            followMouse: false,
            height: 0.55,
            x: -0.4,
          }}
          patches={{
            seed: 30,
            size: 0.95,
            speed: 0,
          }}
          ripple={{
            enabled: true,
            life: 2.6,
            lift: 0.12,
            speed: 1.4,
            strength: 0.9,
            width: 0.18,
          }}
          dust={{
            enabled: true,
            amount: 30000,
            coverage: 0.14,
            lift: 0.19,
            opacity: 0.63,
            outside: 0.63,
          }}
          grass={{ enabled: false }}
          dots={{
            enabled: true,
            columns: 250,
            coverage: 0.28,
            glow: 1.1,
            opacity: 0.96,
            size: 1.4,
          }}
        />
      </div>

      {/* Hero Copy & CTAs */}
      <div className="relative z-10 max-w-[1080px] mx-auto px-5 text-center flex flex-col items-center">
        <h1 className="tm-display text-[44px] sm:text-[68px] lg:text-[88px] xl:text-[96px] font-medium leading-[0.98] tracking-[-0.045em] text-[#0A0A0B]">
          {HERO_TITLE_LINES.map((line, lineIdx) => (
            <span key={lineIdx} className="block">
              {line.map((word, idxInLine) => {
                const currentWordIdx = wordCounter++;
                return (
                  <React.Fragment key={`${lineIdx}-${word}-${idxInLine}`}>
                    <motion.span
                      initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{
                        duration: 0.9,
                        delay: currentWordIdx * 0.055,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="inline-block will-change-transform"
                    >
                      {word}
                    </motion.span>
                    {idxInLine < line.length - 1 ? ' ' : null}
                  </React.Fragment>
                );
              })}
            </span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="mt-[24px] tm-sans text-[17px] sm:text-[19.5px] leading-[1.45] font-normal text-[#6B6F76] max-w-[760px]"
        >
          O Littera corrige redações no padrão ENEM, nas 5 competências, em segundos — com envios
          ilimitados e sem custo por folha.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.54, ease: [0.22, 1, 0.36, 1] }}
          className="mt-[32px] flex flex-wrap items-center justify-center gap-[10px]"
        >
          <TillmornButton label="Agendar reunião" variant="primary" href="#reuniao" />
          <TillmornButton
            label="Calcular minha economia"
            variant="secondary"
            href="#calculadora"
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="mt-[14px] tm-sans text-[13.5px] text-[#8E929B]"
        >
          Reunião de 30 minutos, com a simulação da sua escola.
        </motion.p>
      </div>

      {/* Full DOM-as-Illustration Dashboard Mockup (app.littera.com.br) */}
      <HeroAppMockup />

      {/* Faixa de Escolas / Selos (Dobra 2) */}
      <LogoMarquee />
    </section>
  );
};
