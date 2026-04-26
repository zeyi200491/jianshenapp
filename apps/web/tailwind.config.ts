import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: "#f7f0e4",
        forest: "#19352b",
        moss: "#5d7b5d",
        amber: "#b86b2b",
        rose: "#a34d47",
        slate: "#31424e",
        mist: "#dfe7de",
      },
      boxShadow: {
        soft: "0 20px 50px rgba(25, 53, 43, 0.12)",
      },
      backgroundImage: {
        mesh: "radial-gradient(circle at 20% 20%, rgba(184, 107, 43, 0.18), transparent 28%), radial-gradient(circle at 80% 0%, rgba(93, 123, 93, 0.2), transparent 24%), radial-gradient(circle at 80% 70%, rgba(25, 53, 43, 0.12), transparent 20%)",
      },
    },
  },
  plugins: [],
};

export default config;

