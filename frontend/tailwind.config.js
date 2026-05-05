/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        iad: {
          blue: "#1B3A6B",
          "blue-soft": "#EBF0F8",
          pink: "#E91E8C",
          "pink-soft": "#FCE4F1",
          gray: "#F8F9FA",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
