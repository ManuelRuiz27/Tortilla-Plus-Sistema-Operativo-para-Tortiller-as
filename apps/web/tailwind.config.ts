import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        tp: {
          bg: "#faf7ef",
          surface: "#ffffff",
          soft: "#f3eadb",
          primary: "#b56b1f",
          primaryHover: "#945719",
          secondary: "#2f5d50",
          text: "#241a12",
          muted: "#6f6257",
          border: "#e0d3c2",
          success: "#2f7d4f",
          warning: "#c98118",
          danger: "#b83a32",
          info: "#2f5d7c"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
} satisfies Config;
