/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./dashboard.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        orange: { 600: '#FF4F00' },
        aom: {
          orange: '#FF4F00',
          'orange-hover': '#FF6B2B',
          'orange-muted': '#CC3F00',
          sage: '#7C9A72',
          'sage-light': '#9BB593',
          'sage-muted': '#5C7A54',
          night: '#0A0A08',
          charcoal: '#141412',
          surface: '#1A1A17',
          cream: '#FAF5EF',
          'warm-white': '#F5F0EB',
          stone: '#A8A29E',
          'stone-muted': '#78716C',
          dim: '#57534E',
          border: '#292524',
          'border-hover': '#44403C',
        }
      },
      fontFamily: {
        headline: ['"Inter Tight"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }
    }
  },
  plugins: [],
}
