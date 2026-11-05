"use client";

import React, { useEffect } from 'react';
import { ReactLenis } from 'lenis/react';
import { LayoutGroup } from 'framer-motion';
import { TillmornFonts } from '../../components/landing/TillmornFonts';

export interface MarketingLayoutProps {
  children: React.ReactNode;
}

export const MarketingLayout: React.FC<MarketingLayoutProps> = ({ children }) => {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = 'Littera — Correção de redação ENEM com IA para escolas';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Correções ilimitadas de redação no padrão ENEM, em segundos. Menos custo com banca corretora, mais evolução para seus alunos.'
      );
    }
  }, []);

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        duration: 1.15,
        smoothWheel: true,
      }}
    >
      <TillmornFonts />
      <LayoutGroup>
        <div className="tm-root min-h-screen bg-white text-[#0A0A0B] antialiased selection:bg-[#2F5BFF]/15 selection:text-[#0A0A0B]">
          {children}
        </div>
      </LayoutGroup>
    </ReactLenis>
  );
};

export default MarketingLayout;
