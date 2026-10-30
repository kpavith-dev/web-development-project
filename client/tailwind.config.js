/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Design System Foundation Colors
        canvas: {
          DEFAULT: '#080D1A',
          deep: '#04070E',
          subtle: '#0D1527',
        },
        secondary: {
          DEFAULT: '#101A2E',
          light: '#172540',
          dark: '#0A111F',
        },
        card: {
          DEFAULT: '#142238',
          hover: '#192B47',
          active: '#1E3354',
          subtle: '#0F1A2B',
        },
        // Primary Blue Token Scale
        primary: {
          DEFAULT: '#3B82F6',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
          950: '#172554',
          blue: '#3B82F6',
        },
        // Cyan Token Scale
        cyan: {
          DEFAULT: '#22D3EE',
          50: '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
          700: '#0E7490',
          800: '#155E75',
          900: '#164E63',
          950: '#083344',
          accent: '#22D3EE',
        },
        // Text Color Tokens
        'text-main': '#F8FAFC',
        'text-secondary': '#94A3B8',
        'text-muted': '#64748B',
      },
      textColor: {
        main: '#F8FAFC',
        secondary: '#94A3B8',
        muted: '#64748B',
      },
      backgroundColor: {
        canvas: '#080D1A',
        secondary: '#101A2E',
        card: '#142238',
      },
      borderColor: {
        canvas: '#080D1A',
        secondary: '#101A2E',
        card: '#142238',
        subtle: 'rgba(255, 255, 255, 0.08)',
        highlight: 'rgba(255, 255, 255, 0.15)',
        'glow-cyan': 'rgba(34, 211, 238, 0.35)',
        'glow-blue': 'rgba(59, 130, 246, 0.35)',
      },
      // 3D & Depth Shadows
      boxShadow: {
        '3d-sm': '0 4px 6px -1px rgba(0, 0, 0, 0.45), 0 2px 4px -2px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        '3d': '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        '3d-lg': '0 20px 35px -10px rgba(0, 0, 0, 0.75), 0 10px 20px -5px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.16)',
        '3d-hover': '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 25px -4px rgba(34, 211, 238, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.22)',
        'glow-cyan-sm': '0 0 15px -2px rgba(34, 211, 238, 0.3)',
        'glow-cyan': '0 0 25px -3px rgba(34, 211, 238, 0.38)',
        'glow-cyan-lg': '0 0 40px -4px rgba(34, 211, 238, 0.5)',
        'glow-blue-sm': '0 0 15px -2px rgba(59, 130, 246, 0.3)',
        'glow-blue': '0 0 25px -3px rgba(59, 130, 246, 0.38)',
        'glow-blue-lg': '0 0 40px -4px rgba(59, 130, 246, 0.5)',
        'inner-bevel': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.12), inset 0 -1px 0 0 rgba(0, 0, 0, 0.4)',
        'inner-depth': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.55)',
      },
      // 3D SaaS Gradients
      backgroundImage: {
        'gradient-canvas': 'radial-gradient(ellipse at 50% 0%, #101A2E 0%, #080D1A 80%)',
        'gradient-card': 'linear-gradient(145deg, rgba(20, 34, 56, 0.9) 0%, rgba(16, 26, 46, 0.95) 100%)',
        'gradient-card-elevated': 'linear-gradient(145deg, rgba(25, 43, 71, 0.95) 0%, rgba(18, 30, 52, 0.98) 100%)',
        'gradient-card-hover': 'linear-gradient(145deg, rgba(28, 48, 80, 0.98) 0%, rgba(20, 34, 56, 1) 100%)',
        'gradient-primary': 'linear-gradient(135deg, #3B82F6 0%, #22D3EE 100%)',
        'gradient-primary-hover': 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
        'gradient-accent': 'linear-gradient(135deg, #22D3EE 0%, #3B82F6 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)',
        'gradient-danger': 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      },
      // Border Radius Tokens
      borderRadius: {
        '2.5xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      // Transitions & Easing Tokens
      transitionTimingFunction: {
        'bounce-soft': 'cubic-bezier(0.16, 1, 0.3, 1)',
        '3d': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
      },
    },
  },
  plugins: [],
};
