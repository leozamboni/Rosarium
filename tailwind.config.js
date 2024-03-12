/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: 'jit',
  content: ["./*.{html,js}"],
  theme: {
    extend: {
      colors: {
        white: "#fafafa",
        green: {
          500: "green",
          600: "#3b8043",
        },
        blue: "#0374ff",
        yellow: '#b49244',
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("tailwind-scrollbar")({ nocompatible: true }),
  ],
};
