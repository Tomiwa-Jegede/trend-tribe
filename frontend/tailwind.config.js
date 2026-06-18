// tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── TrendTribe brand — Moodboard 01 ──────────────────
        // Primary: Royal blue family (trust, professionalism)
        primary: {
          50:  "#EEF4FF",
          100: "#DAE8FF",
          200: "#B5D0FF",
          300: "#7BB8F0",
          400: "#4A90E2",
          500: "#1A4FD6",
          600: "#1340B8",   // ← main CTA color
          700: "#0F2E8A",
          800: "#0A1F5C",
          900: "#0F1F3D",   // ← deep navy
        },
        // Accent: Vivid yellow (energy, youth)
        accent: {
          50:  "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#F5C518",   // ← main yellow
          500: "#D4A017",
          600: "#B08000",
        },
        // Surface: Sage/mint (freshness, growth)
        sage: {
          50:  "#F4F9EE",
          100: "#E8F3DC",
          200: "#D4E8C2",   // ← moodboard mint
          300: "#B8D99A",
          400: "#8FC463",
          500: "#6AAF3D",
        },
        // Navy alias for direct use (e.g. text-navy-900)
        navy: {
          800: "#0A1F5C",
          900: "#0F1F3D",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      // ── Animation keyframes ────────────────────────────────
      keyframes: {
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%":       { backgroundPosition: "100% 50%" },
        },
        "blob-float": {
          "0%, 100%": { transform: "translate(0px, 0px)   scale(1)"    },
          "33%":       { transform: "translate(20px, -25px) scale(1.08)" },
          "66%":       { transform: "translate(-15px, 15px) scale(0.96)" },
        },
        "blob-float-alt": {
          "0%, 100%": { transform: "translate(0px, 0px)    scale(1)"    },
          "33%":       { transform: "translate(-20px, 20px) scale(1.06)" },
          "66%":       { transform: "translate(18px, -18px) scale(0.97)" },
        },
      },
      animation: {
        "gradient-shift": "gradient-shift 8s ease infinite",
        "blob-float":     "blob-float 10s ease-in-out infinite",
        "blob-float-alt": "blob-float-alt 13s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};