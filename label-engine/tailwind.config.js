/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dark surfaces
        bg: "#0b0d12",
        surface: "#161920",
        surface2: "#1d2129",
        border: "#252a33",
        borderStrong: "#363c48",
        // Text
        fg: "#e4e6eb",
        muted: "#8a93a6",
        subtle: "#5a6272",
        // Accents — blue
        accent: {
          DEFAULT: "#3b82f6", // blue-500
          hover: "#2563eb", // blue-600
          soft: "#0f2a52", // dark blue tint for dark-mode backgrounds
          fg: "#ffffff",
        },
        guide: "#ec4899", // pink-500 for alignment guides
        danger: "#ef4444",
        success: "#10b981",
        warning: "#f59e0b",
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
        panel: "0 1px 2px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};
