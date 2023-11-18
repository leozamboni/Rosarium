/** @type {import('tailwindcss').Config} */
module.exports = {
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
        gray: {
          600: "#3b3b3b",
          900: "#1c1c1c",
          // 900: "#dbdbdb",
        },
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("tailwind-scrollbar")({ nocompatible: true }),
  ],
};
