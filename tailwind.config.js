/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        neon: { green: "#39ff14", red: "#ff073a", purple: "#b026ff" }
      }
    }
  },
  plugins: []
}
