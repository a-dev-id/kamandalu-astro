/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{astro,html,js,jsx,ts,tsx}", // Scan all Astro pages and components
    "./public/**/*.html",
  ],
  theme: {
    extend: {
      fontFamily: {
        title: ["Plantin", "serif"],
        body: ["MrEavesMod", "sans-serif"],
        bodyBold: ["MrEavesModBold", "sans-serif"],
      },
      colors: {
        gold: "#916B2C", // Optional: tailwind color shortcut for your gold
      },
      aspectRatio: {
        "4/3": "4 / 3", // Ensure this works if you're not using the plugin
      },
    },
  },
  plugins: [],
};
