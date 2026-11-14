import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: "#070D0F",
          900: "#0B1215",
          850: "#0F191E",
          800: "#121D23",
          700: "#192830",
        },
        emeraldPulse: {
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
        },
      },
      fontVariantNumeric: {
        tabular: "tabular-nums",
      },
    },
  },
  plugins: [],
};

export default config;
