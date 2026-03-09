/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./dashboard.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        orange: { 600: '#E85D26' },
        aom: {
          // Bold Graphic brand direction
          cream: '#FDF6EC',
          'cream-dark': '#EDE7DF',
          'cream-alt': '#F5EFE6',
          black: '#0A0A0A',
          orange: '#E85D26',
          'orange-hover': '#D14E1C',
          'orange-muted': '#C44A1F',
          gold: '#C9A84C',
          'gold-light': '#D4B85E',
          'warm-gray': '#7A7267',
          'light-border': '#D9D3CB',

          // Dark surfaces (modals, video overlays, preloader)
          night: '#0A0A0A',
          charcoal: '#141412',
          surface: '#1A1A17',

          // Legacy aliases for components not yet refactored
          'warm-white': '#F5F0EB',
          stone: '#7A7267',
          'stone-muted': '#9A9189',
          dim: '#A89F96',
          border: '#D9D3CB',
          'border-hover': '#C4BDB4',

          // Accent
          sage: '#7C9A72',
          'sage-light': '#9BB593',
          'sage-muted': '#5C7A54',
        }
      },
      fontFamily: {
        headline: ['Syne', 'system-ui', 'sans-serif'],
        body: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"Space Grotesk"', 'monospace'],
      }
    }
  },
  plugins: [],
}
