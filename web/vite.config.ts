import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Project Pages URL: https://<user>.github.io/bobs-pocket-dungeon/
export default defineConfig({
  plugins: [react()],
  base: "/bobs-pocket-dungeon/",
});
