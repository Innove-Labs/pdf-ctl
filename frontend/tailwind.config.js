/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './tools/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#f8f8f6',
        surface: '#ffffff',
        border: '#e8e8e4',
        accent: {
          DEFAULT: '#d4380d',
          soft: '#fff1ed',
          hover: '#b32d09',
        },
        'text-primary': '#1a1a18',
        'text-secondary': '#6b6b66',
        'text-muted': '#9b9b95',
      },
      borderRadius: {
        card: '12px',
        sm: '8px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        md: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        hover: '0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
      },
      maxWidth: {
        content: '680px',
        wide: '1100px',
      },
    },
  },
  plugins: [],
};
