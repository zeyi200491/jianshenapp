import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#18201e",
        sand: "#f3eee6",
        clay: "#d6c6af",
        olive: "#62705a",
        leaf: "#2f7a57",
        dusk: "#2d3748",
      },
      boxShadow: {
        panel: "0 18px 40px rgba(24, 32, 30, 0.12)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(99, 112, 90, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 112, 90, 0.08) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;

