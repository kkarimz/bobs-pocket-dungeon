import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub project Pages: https://kkarimz.github.io/bobs-pocket-dungeon/
// Switch base to "/" later for Cloudflare / custom domain at root.
export default defineConfig({
  plugins: [react()],
  base: "/bobs-pocket-dungeon/",
});
