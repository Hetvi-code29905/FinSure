// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dark institutional palette
        base:     "#050c18",
        surface:  "#091220",
        elevated: "#0d1a2d",
        card:     "#0f1e32",
        hover:    "#132338",
        // Borders
        subtle:   "#1a2d45",
        border:   "#1e3550",
        strong:   "#254060",
        // Accent — electric blue
        accent: {
          DEFAULT: "#3b82f6",
          bright:  "#60a5fa",
          dim:     "#1d4ed8",
          glow:    "rgba(59,130,246,0.15)",
        },
        // Text
        primary:   "#e2ecf8",
        secondary: "#8aa5c4",
        muted:     "#4a6a8a",
        // Status
        success: "#10b981",
        warning: "#f59e0b",
        danger:  "#ef4444",
        info:    "#38bdf8",
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        body:    ["Inter", "sans-serif"],
        mono:    ["DM Mono", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        sm:     "0 1px 3px rgba(0,0,0,0.4)",
        md:     "0 4px 16px rgba(0,0,0,0.5)",
        lg:     "0 8px 32px rgba(0,0,0,0.6)",
        accent: "0 0 24px rgba(59,130,246,0.2)",
      },
    },
  },
  plugins: [],
};