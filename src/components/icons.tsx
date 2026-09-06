/**
 * Inline SVG icons (Lucide-derived geometry). Never emoji — emoji render
 * inconsistently across devices and are announced badly by screen readers.
 * All are decorative by default (aria-hidden); the surrounding control carries
 * the accessible name.
 */
type IconProps = { className?: string };

const base = (className?: string) => ({
  className: className ?? "h-5 w-5",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false as const,
});

export const WhatsappIcon = ({ className }: IconProps) => (
  <svg
    className={className ?? "h-5 w-5"}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
    focusable={false}
  >
    <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 5L2 22l5.2-1.36a9.9 9.9 0 0 0 4.84 1.24h.01c5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2Zm0 18.2h-.01a8.24 8.24 0 0 1-4.2-1.15l-.3-.18-3.1.81.83-3.02-.2-.31a8.22 8.22 0 0 1-1.26-4.39c0-4.55 3.7-8.25 8.25-8.25 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.42 5.84c0 4.55-3.71 8.24-8.26 8.24Zm4.52-6.17c-.25-.13-1.47-.72-1.69-.8-.23-.09-.39-.13-.56.12-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.84-.2-.49-.4-.42-.55-.43h-.47c-.16 0-.43.06-.65.31-.22.25-.85.83-.85 2.03s.87 2.35.99 2.51c.12.17 1.71 2.62 4.15 3.67.58.25 1.03.4 1.39.51.58.19 1.11.16 1.53.1.47-.07 1.47-.6 1.68-1.18.2-.58.2-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z" />
  </svg>
);

export const PhoneIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
  </svg>
);

export const MailIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 6L2 7" />
  </svg>
);

export const PinIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const ClockIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

export const InstagramIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

/**
 * The same mark painted in Instagram's gradient, for the places where it sits on
 * the page rather than on a button — where btn-instagram's gradient background
 * does the colouring instead and this glyph would be gradient on gradient.
 *
 * The gradient id is fixed rather than generated: repeated ids resolve to the
 * first definition in the document, which is exactly the same gradient, and a
 * generated one would differ between the server and client renders.
 */
export const InstagramColorIcon = ({ className }: IconProps) => (
  <svg {...base(className)} stroke="url(#ffu-ig)">
    <defs>
      <linearGradient id="ffu-ig" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="#da2f69" />
        <stop offset="38%" stopColor="#c13584" />
        <stop offset="70%" stopColor="#833ab4" />
        <stop offset="100%" stopColor="#2a51d8" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="url(#ffu-ig)" stroke="none" />
  </svg>
);

export const SearchIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const DownloadIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M12 3v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M4 21h16" />
  </svg>
);

export const ArrowRightIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

export const MenuIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const CloseIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const StarIcon = ({ className, filled }: IconProps & { filled?: boolean }) => (
  <svg
    className={className ?? "h-4 w-4"}
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinejoin="round"
    aria-hidden
    focusable={false}
  >
    <path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9Z" />
  </svg>
);

export const SparkIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
  </svg>
);

export const BoxIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M21 8v8a2 2 0 0 1-1 1.7l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.7l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8Z" />
    <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
  </svg>
);

export const HeartIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M20.8 5.6a5.4 5.4 0 0 0-7.7 0L12 6.7l-1.1-1.1a5.4 5.4 0 1 0-7.7 7.7l8.8 8.8 8.8-8.8a5.4 5.4 0 0 0 0-7.7Z" />
  </svg>
);
