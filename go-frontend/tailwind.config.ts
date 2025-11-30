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
        background: "var(--background)",
        foreground: "var(--foreground)",
        ide: {
          bg0: '#0e1116',
          bg1: '#151922',
          ink: '#e8ecf3',
          muted: '#98a2b3',
          blue: '#5aa3ff',
          green: '#62c2a0',
          amber: '#e7b95f',
          line: '#232837',
          ring: '#2d3344',
        },
      },
      borderRadius: { ide: '12px' },
    },
  },
  plugins: [],
};
export default config;
