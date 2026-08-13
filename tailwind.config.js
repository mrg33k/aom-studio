/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./dashboard.html", "./outreach-plan.html", "./system.html", "./v2.html", "./proposals-isa.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        orange: { 600: '#E85D26' },
        aom: {
          // Bold Graphic v4 brand direction
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

          // Dark Frame system (v4)
          night: '#0C0C0C',
          'night-card': '#151515',
          'night-border': 'rgba(255,255,255,0.10)',
          'night-border-hover': 'rgba(255,255,255,0.18)',
          charcoal: '#141412',
          surface: '#1A1A17',
          'mid-dark': '#1A1A1A',
          'text-light': '#F0ECE6',
          'text-muted': '#8A847C',

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
        mono: ['"JetBrains Mono"', 'monospace'],
        'display-italic': ['"Playfair Display"', 'Georgia', 'serif'],
        'display-serif': ['"Playfair Display"', 'Georgia', 'serif'],
        anton: ['Anton', 'Archivo Black', 'system-ui', 'sans-serif'],
        hanken: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'orange-glow': '0 0 30px rgba(232,93,38,0.15)',
        'orange-glow-lg': '0 0 60px rgba(232,93,38,0.2)',
      }
    }
  },
  plugins: [],
}
