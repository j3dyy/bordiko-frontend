import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The gateway base URL. Override with VITE_GATEWAY_URL when the gateway is not
// on http://localhost:8080.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
});
