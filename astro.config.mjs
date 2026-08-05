import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://unsou-shikin.hakobu-family.com",
  trailingSlash: "never",
  build: {
    format: "directory",
  },
});
