"use client";

import React, { useRef, useState } from 'react';

export type TillmornButtonVariant = 'primary' | 'secondary' | 'compact' | 'ghost' | 'white';

interface TillmornButtonProps {
  label: string;
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  variant?: TillmornButtonVariant;
  className?: string;
}

const VARIANT_CLASSES: Record<TillmornButtonVariant, string> = {
  primary:
    'bg-[#0A0A0B] hover:bg-[#2A2B30] text-white px-[22px] py-[14px] text-[15.5px] leading-[1.3] font-medium rounded-full',
  secondary:
    'bg-[#F4F5F7] hover:bg-[#E9EBEF] text-[#0A0A0B] px-[22px] py-[14px] text-[15.5px] leading-[1.3] font-medium rounded-full',
  compact:
    'bg-[#0A0A0B] hover:bg-[#2A2B30] text-white px-[18px] py-[11px] text-[15.5px] leading-[1.3] font-medium rounded-full',
  ghost:
    'bg-transparent hover:bg-[#0A0A0B]/[0.05] text-[#0A0A0B] px-[18px] py-[11px] text-[15px] leading-[1.3] font-medium rounded-full',
  white:
    'bg-white hover:bg-[#F4F5F7] text-[#0A0A0B] px-[22px] py-[14px] text-[15.5px] leading-[1.3] font-medium rounded-full',
};

export const TillmornButton: React.FC<TillmornButtonProps> = ({
  label,
  href,
  onClick,
  variant = 'primary',
  className = '',
}) => {
  const ref = useRef<HTMLAnchorElement & HTMLButtonElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [pressed, setPressed] = useState(false);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.18;
    const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.3;
    setOffset({ x: dx, y: dy });
  };

  const handlePointerLeave = () => {
    setOffset({ x: 0, y: 0 });
    setPressed(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    if (onClick) {
      onClick(e);
    }
    if (href && href.startsWith('#')) {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const sharedProps = {
    ref: ref as any,
    onPointerMove: handlePointerMove,
    onPointerLeave: handlePointerLeave,
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onClick: handleClick,
    style: {
      transform: `translate3d(${offset.x.toFixed(2)}px, ${offset.y.toFixed(2)}px, 0) scale(${pressed ? 0.96 : 1})`,
      transition:
        'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
    } as React.CSSProperties,
    className: `tm-btn tm-sans inline-flex items-center justify-center select-none whitespace-nowrap cursor-pointer ${VARIANT_CLASSES[variant]} ${className}`,
  };

  const content = (
    <span className="tm-roll">
      <span>{label}</span>
      <span aria-hidden="true">{label}</span>
    </span>
  );

  if (href) {
    return (
      <a href={href} {...sharedProps}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" {...sharedProps}>
      {content}
    </button>
  );
};

