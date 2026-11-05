"use client";

import React, { useEffect } from 'react';

const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Funnel+Display:wght@400;500;600;700&family=Funnel+Sans:wght@400;500;600;700&family=Geist+Mono:wght@500&family=Geist:wght@400;500;600;700&family=Instrument+Serif&display=swap';

export const TILLMORN_FONT_FAMILIES = {
  display: '"Funnel Display", "Plus Jakarta Sans", Inter, sans-serif',
  sans: '"Funnel Sans", Inter, sans-serif',
  instrumentSerif: '"Instrument Serif", Georgia, serif',
  fraunces: '"Fraunces", Georgia, serif',
  geist: '"Geist", Inter, sans-serif',
  geistMono: '"Geist Mono", monospace',
} as const;

export const TillmornFonts: React.FC = () => {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'tillmorn-google-fonts';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = GOOGLE_FONTS_HREF;
      document.head.appendChild(link);
    }
  }, []);

  return (
    <style>{`
      .tm-root {
        font-family: "Funnel Sans", Inter, -apple-system, BlinkMacSystemFont, sans-serif;
        color: #0A0A0B;
        background-color: #FFFFFF;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      .tm-display {
        font-family: "Funnel Display", Inter, -apple-system, BlinkMacSystemFont, sans-serif;
      }
      .tm-sans {
        font-family: "Funnel Sans", Inter, -apple-system, BlinkMacSystemFont, sans-serif;
      }
      .tm-roll {
        display: inline-flex;
        position: relative;
        overflow: hidden;
        vertical-align: top;
      }
      .tm-roll > span {
        display: inline-block;
        transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .tm-roll > span:nth-child(2) {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        transform: translateY(110%);
      }
      .tm-btn:hover .tm-roll > span:first-child {
        transform: translateY(-110%);
      }
      .tm-btn:hover .tm-roll > span:nth-child(2) {
        transform: translateY(0%);
      }
    `}</style>
  );
};

