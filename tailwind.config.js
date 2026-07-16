/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        page: '#F6F5FB',
        surface: '#FFFFFF',
        ink: '#1F2233',
        muted: '#6B6E85',
        violet: '#7C5CFC',
        'violet-soft': '#EFEBFF',
        yellow: '#FFC857',
        green: '#2FBF71',
        'green-soft': '#E8FBF0',
        coral: '#FF5C7A',
        'coral-soft': '#FFE4E9',
        blue: '#3DB4E0',
        gold: '#B8860B',
        'gold-soft': '#FFF3D6',
      },
      fontFamily: {
        display: ['"Baloo 2"', 'sans-serif'],
        body: ['"Nunito Sans"', 'system-ui', 'sans-serif'],
        data: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        pill: '999px',
      },
    },
  },
  plugins: [],
}
