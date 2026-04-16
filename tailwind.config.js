/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        mist: '#f4f7f4',
        pine: '#12372a',
        sage: '#84a98c',
        sand: '#efe7da',
        clay: '#d7c3a5',
      },
      boxShadow: {
        calm: '0 24px 60px rgba(18, 55, 42, 0.12)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
