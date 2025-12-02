/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0D9488",       // teal
        primaryDark: "#0F766E",   // dark teal
        accent: "#D4A017",        // gold
        background: "#F8FAFC",    // light background
        surface: "#FFFFFF",       // white cards
        muted: "#E2E8F0",         // gray border
        textMain: "#0F172A",
        textSecondary: "#475569",
      },
      borderRadius: {
        base: "12px",
        lg: "18px",
      },
      boxShadow: {
        soft: "0 4px 12px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};
