import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        srank: {
          bg: "#0A0A0F",
          surface: "#12121A",
          card: "#1A1A25",
          border: "#2A2A3A",
          hover: "#252535",
          primary: { DEFAULT: "#7C3AED", 400: "#925EF8", 600: "#6320D0" },
          cyan: { DEFAULT: "#06B6D4", 400: "#22D3EE" },
          green: { DEFAULT: "#10B981", 400: "#34D399" },
          amber: { DEFAULT: "#F59E0B" },
          red: { DEFAULT: "#EF4444" },
          text: { primary: "#F1F5F9", secondary: "#94A3B8", muted: "#64748B" },
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
