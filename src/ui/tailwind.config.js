/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#051424',
          dim: '#051424',
          bright: '#2c3a4c',
          container: {
            lowest: '#010f1f',
            low: '#0d1c2d',
            DEFAULT: '#122131',
            high: '#1c2b3c',
            highest: '#273647'
          }
        },
        'on-surface': {
          DEFAULT: '#d4e4fa',
          variant: '#bbcabf'
        },
        'inverse-surface': '#d4e4fa',
        'inverse-on-surface': '#233143',
        outline: {
          DEFAULT: '#86948a',
          variant: '#3c4a42'
        },
        'surface-tint': '#4edea3',
        primary: {
          DEFAULT: '#4edea3',
          container: '#10b981',
          fixed: '#6ffbbe',
          'fixed-dim': '#4edea3'
        },
        'on-primary': {
          DEFAULT: '#003824',
          container: '#00422b',
          fixed: '#002113',
          'fixed-variant': '#005236'
        },
        'inverse-primary': '#006c49',
        secondary: {
          DEFAULT: '#7bd0ff',
          container: '#00a6e0',
          fixed: '#c4e7ff',
          'fixed-dim': '#7bd0ff'
        },
        'on-secondary': {
          DEFAULT: '#00354a',
          container: '#00374d',
          fixed: '#001e2c',
          'fixed-variant': '#004c69'
        },
        tertiary: {
          DEFAULT: '#ffb95f',
          container: '#e29100',
          fixed: '#ffddb8',
          'fixed-dim': '#ffb95f'
        },
        'on-tertiary': {
          DEFAULT: '#472a00',
          container: '#523200',
          fixed: '#2a1700',
          'fixed-variant': '#653e00'
        },
        error: {
          DEFAULT: '#ffb4ab',
          container: '#93000a'
        },
        'on-error': {
          DEFAULT: '#690005',
          container: '#ffdad6'
        },
        background: '#051424',
        'on-background': '#d4e4fa',
        'surface-variant': '#273647'
      },
      fontFamily: {
        sans: ['Geist', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      fontSize: {
        'headline-xl': ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.025em', fontWeight: '600' }],
        'headline-lg': ['1.75rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline-lg-mobile': ['1.375rem', { lineHeight: '1.75rem', letterSpacing: '-0.015em', fontWeight: '600' }],
        'headline-md': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em', fontWeight: '500' }],
        'headline-sm': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0em', fontWeight: '500' }],
        'body-lg': ['1rem', { lineHeight: '1.625rem', letterSpacing: '-0.005em', fontWeight: '400' }],
        'body-md': ['0.875rem', { lineHeight: '1.375rem', letterSpacing: '0em', fontWeight: '400' }],
        'body-sm': ['0.75rem', { lineHeight: '1.125rem', letterSpacing: '0.01em', fontWeight: '400' }],
        'code-md': ['0.8125rem', { lineHeight: '1.25rem', letterSpacing: '-0.01em', fontWeight: '400' }],
        'code-sm': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0em', fontWeight: '400' }],
        'label-md': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.04em', fontWeight: '500' }],
        'label-sm': ['0.625rem', { lineHeight: '0.875rem', letterSpacing: '0.06em', fontWeight: '500' }]
      },
      borderRadius: {
        sm: '0.125rem',
        DEFAULT: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px'
      },
      spacing: {
        '2xs': '0.125rem',
        xs: '0.25rem',
        sm: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        '2xl': '2rem',
        '3xl': '3rem'
      }
    }
  },
  plugins: []
};
