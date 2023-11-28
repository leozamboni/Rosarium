import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    outDir: "build",
    rollupOptions: {
      input: {
        main: "./index.html",
        rosary: "./rosary.html",
      },
    },
  },
});
