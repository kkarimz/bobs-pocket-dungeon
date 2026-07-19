import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Use "/" for Cloudflare Pages / custom domain.
// For GitHub project Pages only, set base to "/bobs-pocket-dungeon/".
export default defineConfig({
  plugins: [react()],
  base: "/",
});
