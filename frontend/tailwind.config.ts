import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        chainlink: {
          blue: "#375BD2",
          "blue-light": "#4A6FE5",
          "blue-dark": "#2A48A8",
          dark: "#1A1F36",
          "dark-light": "#242B45",
          navy: "#0D1026",
        },
        surface: {
          primary: "#111827",
          secondary: "#1F2937",
          tertiary: "#374151",
        },
        status: {
          success: "#22C55E",
          "success-muted": "#166534",
          warning: "#F59E0B",
          "warning-muted": "#92400E",
          error: "#EF4444",
          "error-muted": "#991B1B",
        },
      },
      boxShadow: {
        glow: "0 0 20px rgba(55, 91, 210, 0.15)",
        "glow-lg": "0 0 40px rgba(55, 91, 210, 0.2)",
        card: "0 4px 24px rgba(0, 0, 0, 0.3)",
      },
    },
  },
  plugins: [],
};
export default config;
