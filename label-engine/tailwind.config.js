/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f7fa",
          100: "#e4e9f0",
          200: "#c8d2df",
          300: "#9fb0c4",
          400: "#6d84a1",
          500: "#4a6485",
          600: "#364e6b",
          700: "#2a3e55",
          800: "#1f2d3f",
          900: "#141c29",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(15,23,42,0.06), 0 4px 12px rgba(15,23,42,0.04)",
      },
    },
  },
  plugins: [],
};
