"use client";

import React from 'react';

export const TillmornDiamondGlyph: React.FC<{ size?: number; className?: string }> = ({
  size = 26,
  className = '',
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 26 26"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path
      fill="currentColor"
      d="M11.44 1.86q1.56-1.56 3.12 0l9.58 9.58q1.56 1.56 0 3.12l-9.58 9.58q-1.56 1.56-3.12 0l-9.58-9.58Q.3 13 1.86 11.44z"
    />
  </svg>
);

export const OverviewIcon: React.FC<{ className?: string }> = ({ className = 'w-[14px] h-[14px]' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M15 21V13C15 12.448 14.552 12 14 12H10C9.448 12 9 12.448 9 13V21"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3 10C3 9.412 3.259 8.853 3.709 8.472L10.709 2.472C11.454 1.843 12.546 1.843 13.291 2.472L20.291 8.472C20.741 8.853 21 9.412 21 10V19C21 20.105 20.105 21 19 21H5C3.895 21 3 20.105 3 19V10Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const LeadsIcon: React.FC<{ className?: string }> = ({ className = 'w-[14px] h-[14px]' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M16 21V19C16 16.791 14.209 15 12 15H6C3.791 15 2 16.791 2 19V21"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 3.128C17.764 3.585 18.996 5.177 18.996 7C18.996 8.823 17.764 10.415 16 10.872"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M22 21V19C21.999 17.177 20.765 15.586 19 15.13"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const SequencesIcon: React.FC<{ className?: string }> = ({ className = 'w-[14px] h-[14px]' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M22 7L13.009 12.727C12.388 13.088 11.621 13.088 11 12.727L2 7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect
      x="2"
      y="4"
      width="20"
      height="16"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const InboxIcon: React.FC<{ className?: string }> = ({ className = 'w-[14px] h-[14px]' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M22 12H16L14 15H10L8 12H2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.45 5.11L2 12V18C2 19.105 2.895 20 4 20H20C21.105 20 22 19.105 22 18V12L18.55 5.11C18.212 4.43 17.519 4 16.76 4H7.24C6.481 4 5.788 4.43 5.45 5.11Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const MeetingsIcon: React.FC<{ className?: string }> = ({ className = 'w-[14px] h-[14px]' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const AnalyticsIcon: React.FC<{ className?: string }> = ({ className = 'w-[14px] h-[14px]' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M3 3V19C3 20.105 3.895 21 5 21H21"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19 9L14 14L10 10L7 13"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const PlusIcon: React.FC<{ className?: string }> = ({ className = 'w-[12px] h-[12px]' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M5 12H19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 5V19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronDownMarkIcon: React.FC<{ className?: string; strokeWidth?: number }> = ({
  className = 'w-[12px] h-[12px]',
  strokeWidth = 2.4,
}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M6 9L12 15L18 9"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SearchTimelineIcon: React.FC<{ className?: string }> = ({
  className = 'w-[16px] h-[16px]',
}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
    <path
      d="M21 21L16.66 16.66"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ReplyTimelineIcon: React.FC<{ className?: string }> = ({
  className = 'w-[16px] h-[16px]',
}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M9 17L4 12L9 7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M20 18V16C20 13.791 18.209 12 16 12H4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CheckTimelineIcon: React.FC<{ className?: string }> = ({
  className = 'w-[16px] h-[16px]',
}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M20 6L9 17L4 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SlackHashIcon: React.FC<{ className?: string }> = ({
  className = 'w-[11px] h-[11px]',
}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M4 9H20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 15H20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 3L8 21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 3L14 21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ShieldCheckIcon: React.FC<{ className?: string }> = ({
  className = 'w-[22px] h-[22px]',
}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M20 13C20 18 16.5 20.5 12.34 21.95C12.122 22.024 11.886 22.02 11.67 21.94C7.5 20.5 4 18 4 13V6C4 5.448 4.448 5 5 5C7 5 9.5 3.8 11.24 2.28C11.678 1.906 12.322 1.906 12.76 2.28C14.51 3.81 17 5 19 5C19.552 5 20 5.448 20 6V13Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 12L11 14L15 10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SyncArrowsIcon: React.FC<{ className?: string }> = ({
  className = 'w-[14px] h-[14px]',
}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M3 12C3 7.029 7.029 3 12 3C14.516 3.009 16.931 3.991 18.74 5.74L21 8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M21 3V8H16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M21 12C21 16.971 16.971 21 12 21C9.484 20.991 7.069 20.009 5.26 18.26L3 16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 16H3V21"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ArrowRightIcon: React.FC<{ className?: string }> = ({
  className = 'w-[15px] h-[15px]',
}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowUpIcon: React.FC<{ className?: string }> = ({
  className = 'w-[15px] h-[15px]',
}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M5 12L12 5L19 12" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 19V5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CopyIcon: React.FC<{ className?: string }> = ({
  className = 'w-[13.5px] h-[13.5px]',
}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect
      x="8"
      y="8"
      width="14"
      height="14"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 16C2.9 16 2 15.1 2 14V4C2 2.9 2.9 2 4 2H14C15.1 2 16 2.9 16 4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

