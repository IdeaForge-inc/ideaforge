/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // DeepSeek-inspired blue-violet accent
        brand: {
          50: '#EEF1FF',
          100: '#DCE2FF',
          300: '#9DAEFF',
          400: '#7388FF',
          500: '#4D6BFE',
          600: '#3B57E8',
          700: '#2E45C4',
        },
        // Neutral surface ramp (deep, slightly cool — DeepSeek dark canvas)
        ink: {
          950: '#0E0F13',
          900: '#16171C',
          850: '#1B1D23',
          800: '#202329',
          700: '#2A2D35',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'JetBrains Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        'apple': '12px',
        'apple-lg': '18px',
        'apple-xl': '22px',
      },
      animation: {
        'fade-in': 'fadeIn 400ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in-up': 'fadeInUp 500ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scaleIn 350ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-soft': 'pulseSoft 1.8s ease-in-out infinite',
        'shimmer': 'shimmer 1.6s linear infinite',
        'float': 'float 7s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'toast-in': 'toastIn 480ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'toast-out': 'toastOut 320ms cubic-bezier(0.4, 0, 1, 1) both',
        'toast-progress': 'toastProgress linear forwards',
        'gradient-pan': 'gradientPan 6s ease infinite',
        'page-enter': 'pageEnter 450ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0, transform: 'translateY(6px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        fadeInUp: { '0%': { opacity: 0, transform: 'translateY(16px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        scaleIn: { '0%': { opacity: 0, transform: 'scale(0.96)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
        pulseSoft: { '0%, 100%': { opacity: 0.3 }, '50%': { opacity: 0.8 } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        glowPulse: { '0%, 100%': { opacity: 0.5 }, '50%': { opacity: 1 } },
        toastIn: { '0%': { opacity: 0, transform: 'translateX(120%) scale(0.92)' }, '100%': { opacity: 1, transform: 'translateX(0) scale(1)' } },
        toastOut: { '0%': { opacity: 1, transform: 'translateX(0) scale(1)' }, '100%': { opacity: 0, transform: 'translateX(120%) scale(0.92)' } },
        toastProgress: { '0%': { transform: 'scaleX(1)' }, '100%': { transform: 'scaleX(0)' } },
        gradientPan: { '0%, 100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        pageEnter: { '0%': { opacity: 0, transform: 'translateY(10px) scale(0.995)' }, '100%': { opacity: 1, transform: 'translateY(0) scale(1)' } },
      },
      boxShadow: {
        // Softer, more diffuse modern shadows
        'apple': '0 1px 2px rgba(16,18,27,0.04), 0 6px 20px rgba(16,18,27,0.06)',
        'apple-md': '0 2px 6px rgba(16,18,27,0.06), 0 12px 32px rgba(16,18,27,0.08)',
        'apple-lg': '0 6px 18px rgba(16,18,27,0.08), 0 24px 60px rgba(16,18,27,0.12)',
        'glow': '0 0 0 1px rgba(77,107,254,0.30), 0 10px 30px rgba(77,107,254,0.28)',
      },
    },
  },
  plugins: [],
};
