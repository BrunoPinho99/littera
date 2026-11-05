"use client";

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TillmornDiamondGlyph } from './TillmornIcons';
import { TillmornButton } from './TillmornButton';

interface NavLinkItem {
  label: string;
  href: string;
}

const DESKTOP_NAV_LINKS: NavLinkItem[] = [
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Calculadora', href: '#calculadora' },
  { label: 'Recursos', href: '#recursos' },
  { label: 'Escolas', href: '#escolas' },
  { label: 'Dúvidas', href: '#duvidas' },
];

const MOBILE_EXTRA_LINKS: NavLinkItem[] = [
  { label: 'Integrações', href: '#integracoes' },
  { label: 'Como contratar', href: '#como-contratar' },
];

export const FloatingNavbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let rafId = 0;

    const update = () => {
      rafId = 0;
      const y = window.scrollY;
      const delta = y - lastScrollY.current;

      setScrolled(y > 16);

      if (y <= 66) {
        setHidden(false);
      } else if (delta > 4) {
        setHidden(true);
      } else if (delta < -4) {
        setHidden(false);
      }

      lastScrollY.current = y;
    };

    const onScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setMobileOpen(false);
    if (href.startsWith('#')) {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const allMobileLinks = [...DESKTOP_NAV_LINKS, ...MOBILE_EXTRA_LINKS];

  return (
    <header
      data-framer-name="Navbar"
      style={{
        transform: hidden && !mobileOpen ? 'translateY(-110%)' : 'translateY(0%)',
        transition:
          'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.3s ease, border-color 0.3s ease',
      }}
      className={`fixed top-0 inset-x-0 z-50 will-change-transform ${
        scrolled || mobileOpen
          ? 'backdrop-blur-md bg-[#FAF9F6]/85 border-b border-black/[0.05]'
          : 'backdrop-blur-[6px] bg-white/40 border-b border-transparent'
      }`}
    >
      <div className="max-w-[1440px] mx-auto h-[66px] px-5 md:px-[40px] flex items-center justify-between relative">
        {/* Brand Wordmark */}
        <a
          href="#inicio"
          onClick={(e) => handleAnchorClick(e, '#inicio')}
          className="inline-flex items-center gap-[10px] text-[#0A0A0B] select-none shrink-0"
          aria-label="Littera Início"
        >
          <TillmornDiamondGlyph size={26} className="text-[#0A0A0B]" />
          <span className="tm-display text-[20px] leading-[24px] font-medium tracking-[0.2px] text-[#0A0A0B]">
            Littera
          </span>
        </a>

        {/* Centered Desktop Navigation */}
        <nav
          aria-label="Navegação principal"
          className="hidden lg:flex items-center gap-[32px] absolute left-1/2 -translate-x-1/2"
        >
          {DESKTOP_NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => handleAnchorClick(e, item.href)}
              className="tm-sans text-[15px] leading-[19.5px] font-medium text-[#6B6F76] hover:text-[#0A0A0B] transition-colors duration-200 whitespace-nowrap"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden lg:flex items-center gap-[6px] shrink-0">
          <TillmornButton label="Entrar" variant="ghost" href="/login" />
          <TillmornButton label="Agendar reunião" variant="compact" href="#reuniao" />
        </div>

        {/* Mobile Menu Trigger */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
          aria-expanded={mobileOpen}
          className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-full text-[#0A0A0B] hover:bg-black/[0.05] transition-colors"
        >
          <span className="relative w-[18px] h-[12px] flex flex-col justify-between">
            <span
              style={{
                transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                transform: mobileOpen ? 'translateY(5px) rotate(45deg)' : 'none',
              }}
              className="block w-full h-[1.75px] bg-[#0A0A0B] rounded-full origin-center"
            />
            <span
              style={{
                transition: 'opacity 0.2s ease',
                opacity: mobileOpen ? 0 : 1,
              }}
              className="block w-full h-[1.75px] bg-[#0A0A0B] rounded-full"
            />
            <span
              style={{
                transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                transform: mobileOpen ? 'translateY(-5.25px) rotate(-45deg)' : 'none',
              }}
              className="block w-full h-[1.75px] bg-[#0A0A0B] rounded-full origin-center"
            />
          </span>
        </button>
      </div>

      {/* Mobile Dropdown Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="lg:hidden overflow-hidden border-t border-black/[0.05] bg-[#FAF9F6]/95 backdrop-blur-xl"
          >
            <div className="px-5 py-5 flex flex-col gap-3">
              {allMobileLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleAnchorClick(e, item.href)}
                  className="tm-sans py-1.5 text-[16px] font-medium text-[#6B6F76] hover:text-[#0A0A0B] transition-colors"
                >
                  {item.label}
                </a>
              ))}
              <div className="pt-3 mt-1 border-t border-black/[0.06] flex items-center gap-2.5">
                <TillmornButton
                  label="Entrar"
                  variant="secondary"
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1"
                />
                <TillmornButton
                  label="Agendar reunião"
                  variant="compact"
                  href="#reuniao"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 py-[13px]"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
