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
        background: "#0D0E12",
        surface: {
          DEFAULT: "#16181F",
          card: "#16181F",
          hover: "#1D202A",
          border: "#252834",
        },
        lime: {
          DEFAULT: "#CCFF00",
          hover: "#B8E600",
          light: "#E1FF4D",
          dim: "rgba(204, 255, 0, 0.12)",
        },
        coral: {
          DEFAULT: "#FF3B5C",
          hover: "#E6304E",
          dim: "rgba(255, 59, 92, 0.12)",
        },
        biddrBlue: {
          DEFAULT: "#2563EB",
          light: "#3B82F6",
          dim: "rgba(37, 99, 235, 0.15)",
        },
        primaryText: "#FFFFFF",
        secondaryText: "#9CA3AF",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 25px rgba(204, 255, 0, 0.25)",
        "glow-sm": "0 0 12px rgba(204, 255, 0, 0.2)",
        "coral-glow": "0 0 20px rgba(255, 59, 92, 0.25)",
      },
      animation: {
        "pulse-subtle": "pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
