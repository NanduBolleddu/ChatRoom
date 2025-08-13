/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          900: '#1a1a1a',
          800: '#2f3136',
          700: '#36393f',
          600: '#4f545c',
          500: '#72767d',
          400: '#b9bbbe',
          300: '#dcddde',
        },
        blue: {
          600: '#5865f2',
          700: '#4752c4',
        }
      },
      animation: {
        'bounce': 'bounce 1s infinite',
      }
    },
  },
  plugins: [],
}