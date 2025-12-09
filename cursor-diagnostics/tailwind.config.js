/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx,vue}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#0D9488",
        primaryDark: "#0F766E",
        accent: "#D4A017",
        bgLight: "#F8FAFC",
        background: "#F8FAFC", // Alias for bgLight
        bgBase: "#F8FAFC", // Alias for bgLight
        surface: "#FFFFFF",
        card: "#FFFFFF", // Alias for surface
        muted: "#E2E8F0",
        borderColor: "#E2E8F0", // Alias for muted
        textMain: "#0F172A",
        textSecondary: "#475569",
      },
      borderRadius: {
        base: "12px",
        lg: "18px",
      },
      boxShadow: {
        soft: "0 4px 12px rgba(0,0,0,0.08)",
      }
    },
  },
  plugins: [],
};
