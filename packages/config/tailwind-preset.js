// Preset Tailwind compartilhado (web + mobile via NativeWind).
// Consumo: em cada app, `tailwind.config.js` → { presets: [require("@vero/config/tailwind-preset")], content: [...] }
// Paleta da marca Vero (CLAUDE.md §0): índigo/teal profundo + acento menta no check.
/** @type {import("tailwindcss").Config} */
module.exports = {
  content: [],
  theme: {
    extend: {
      colors: {
        vero: {
          // base confiante de saúde (índigo/teal profundo)
          900: "#0d1b2a",
          800: "#14283d",
          700: "#1b3a5b",
          600: "#22507c",
          500: "#2b6cb0",
          // acento fresco (verde-menta / ciano) — traço do check
          accent: "#2dd4bf",
          "accent-dark": "#14b8a6",
        },
      },
    },
  },
  plugins: [],
};
