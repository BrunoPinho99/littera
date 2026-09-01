/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./index.tsx"
  ],
  darkMode: "class",
  theme: {
    extend: {
      /* ─── SCHOLASTIC LUMINARY COLOR SYSTEM ─── */
      colors: {
        /* Primary */
        primary:             "#004ac6",
        "primary-container":  "#2563eb",
        "on-primary":        "#ffffff",
        "primary-fixed":     "#d3e4ff",

        /* Secondary */
        secondary:              "#5b6b7d",
        "secondary-container":  "#dfe3ee",
        "on-secondary-container":"#1a1e2b",

        /* Tertiary */
        tertiary:               "#6f5fa0",
        "tertiary-container":   "#ece3ff",

        /* Surface Hierarchy (The "Fine Paper" Stack) */
        surface:                  "#faf8ff",
        "surface-container-low":  "#f2f3ff",
        "surface-container-lowest":"#ffffff",
        "surface-container-high": "#e8e9f5",
        "surface-variant":        "#e2e1ec",

        /* On-Surface */
        "on-surface":           "#131b2e",
        "on-surface-variant":   "#49454f",

        /* Outline */
        "outline-variant":      "#c7c5d0",

        /* Legacy compat */
        "primary-dark":  "#003ba0",
        "primary-light": "#93b4f5",
        "surface-dark":  "#161B22",
      },

      /* ─── TYPOGRAPHY ─── */
      fontFamily: {
        display: ['"Plus Jakarta Sans"', "Inter", "sans-serif"],
        sans:    ["Inter", '"Plus Jakarta Sans"', "sans-serif"],
      },
      fontSize: {
        "display-lg": ["3.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "900" }],
        "display-md": ["2.75rem", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "900" }],
        "display-sm": ["2.25rem", { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "800" }],
        "headline-lg": ["2rem", { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "800" }],
        "headline-md": ["1.75rem", { lineHeight: "1.3", fontWeight: "700" }],
        "headline-sm": ["1.5rem", { lineHeight: "1.35", fontWeight: "700" }],
        "title-lg":    ["1.25rem", { lineHeight: "1.4", fontWeight: "700" }],
        "title-md":    ["1rem",   { lineHeight: "1.45", fontWeight: "600" }],
        "body-lg":     ["1rem",   { lineHeight: "1.6", fontWeight: "400" }],
        "body-md":     ["0.875rem", { lineHeight: "1.6", fontWeight: "400" }],
        "body-sm":     ["0.8125rem", { lineHeight: "1.5", fontWeight: "400" }],
        "label-lg":    ["0.875rem", { lineHeight: "1.4", fontWeight: "700", letterSpacing: "0.01em" }],
        "label-md":    ["0.75rem",  { lineHeight: "1.4", fontWeight: "700", letterSpacing: "0.02em" }],
        "label-sm":    ["0.6875rem",{ lineHeight: "1.35", fontWeight: "800", letterSpacing: "0.05em" }],
      },

      /* ─── BORDER RADIUS ─── */
      borderRadius: {
        DEFAULT: "0.75rem",
        "card":  "1.5rem",
        "pill":  "9999px",
        "input": "0.75rem",
      },

      /* ─── ELEVATION: Ambient Shadows ─── */
      boxShadow: {
        "ambient":    "0px 20px 40px rgba(19, 27, 46, 0.06)",
        "ambient-lg": "0px 30px 60px rgba(19, 27, 46, 0.08)",
        "glow":       "0 0 24px rgba(0, 74, 198, 0.25)",
        "glow-sm":    "0 0 12px rgba(0, 74, 198, 0.15)",
        "card":       "0 2px 12px rgba(19, 27, 46, 0.05)",
        "inner":      "inset 0 2px 6px rgba(19, 27, 46, 0.04)",
        "premium":    "0px 20px 40px rgba(19, 27, 46, 0.06)",
        "none":       "none",
      },

      /* ─── ANIMATIONS ─── */
      animation: {
        "float":      "float 3s ease-in-out infinite",
        "fade-in":    "fadeIn 0.4s ease-out",
        "fade-in-up": "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1)",
        "shimmer":    "shimmer 2s linear infinite",
        "spin-slow":  "spin 3s linear infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "count-in":   "countIn 0.3s cubic-bezier(0.16,1,0.3,1)",
      },
      keyframes: {
        float:     { "0%, 100%": { transform: "translateY(0px)" },  "50%": { transform: "translateY(-6px)" } },
        fadeIn:    { from: { opacity: "0" }, to: { opacity: "1" } },
        fadeInUp:  { from: { opacity: "0", transform: "translateY(16px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        shimmer:   { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(200%)" } },
        countIn:   { from: { opacity: "0", transform: "scale(0.7)" }, to: { opacity: "1", transform: "scale(1)" } },
      },

      /* ─── SPACING ─── */
      spacing: {
        "section": "8rem",  /* 128px – distance between major sections */
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
}
