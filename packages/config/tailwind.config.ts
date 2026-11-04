import type { Config } from 'tailwindcss';

const config: Omit<Config, 'content'> = {
  darkMode: ['class'],
  theme: {
    fontFamily: {
      sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'monospace'],
    },
    fontSize: {
      xs: ['12px', { lineHeight: '16px' }],
      sm: ['14px', { lineHeight: '20px' }],
      base: ['16px', { lineHeight: '24px' }],
      lg: ['20px', { lineHeight: '28px' }],
      xl: ['24px', { lineHeight: '32px' }],
      '2xl': ['32px', { lineHeight: '40px' }],
    },
    spacing: {
      0: '0px',
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      5: '20px',
      6: '24px',
      7: '28px',
      8: '32px',
      9: '36px',
      10: '40px',
      11: '44px',
      12: '48px',
      14: '56px',
      16: '64px',
      20: '80px',
      24: '96px',
    },
    borderRadius: {
      none: '0px',
      control: '6px',
      panel: '10px',
      full: '9999px',
    },
    boxShadow: {
      none: 'none',
      floating: '0 4px 12px rgba(0, 0, 0, 0.4)',
    },
    transitionDuration: {
      DEFAULT: '150ms',
      fast: '120ms',
      normal: '150ms',
      slow: '180ms',
    },
    transitionTimingFunction: {
      DEFAULT: 'cubic-bezier(0, 0, 0.2, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
    },
    extend: {
      colors: {
        base: 'var(--color-bg-base)',
        surface: 'var(--color-bg-surface)',
        'surface-hover': 'var(--color-bg-surface-hover)',
        primary: 'var(--color-text-primary)',
        muted: 'var(--color-text-muted)',
        border: 'var(--color-border)',
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          text: 'var(--color-accent-text)',
        },
        'accent-secondary': {
          DEFAULT: 'var(--color-accent-secondary)',
          hover: 'var(--color-accent-secondary-hover)',
        },
        success: 'var(--color-success)',
        danger: 'var(--color-danger)',
        warning: 'var(--color-warning)',
      },
    },
  },
  plugins: [],
};

export default config;
