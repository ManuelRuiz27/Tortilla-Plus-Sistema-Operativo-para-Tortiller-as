import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        tp: {
          bg: "var(--tp-bg)",
          surface: "var(--tp-surface)",
          soft: "var(--tp-surface-soft)",
          mutedSurface: "var(--tp-surface-muted)",
          primary: "var(--tp-primary)",
          primaryHover: "var(--tp-primary-hover)",
          secondary: "var(--tp-secondary)",
          brand: "var(--tp-brand)",
          brandDark: "var(--tp-brand-dark)",
          brandSoft: "var(--tp-brand-soft)",
          accent: "var(--tp-accent)",
          text: "var(--tp-text)",
          muted: "var(--tp-text-muted)",
          border: "var(--tp-border)",
          success: "var(--tp-success)",
          successBg: "var(--tp-success-bg)",
          warning: "var(--tp-warning)",
          warningBg: "var(--tp-warning-bg)",
          danger: "var(--tp-danger)",
          dangerHover: "var(--tp-danger-hover)",
          dangerBg: "var(--tp-danger-bg)",
          info: "var(--tp-info)",
          infoBg: "var(--tp-info-bg)"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        numeric: ["Roboto Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      }
    }
  },
  plugins: []
} satisfies Config;
