import type { Config } from "tailwindcss";
// Paleta da marca Vero (CLAUDE.md §0) via preset compartilhado.
import veroPreset from "@vero/config/tailwind-preset";

const config: Config = {
  presets: [veroPreset as Partial<Config>],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
};

export default config;
