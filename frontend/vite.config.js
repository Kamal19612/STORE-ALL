import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Ports : frontend/.env — FRONTEND_DEV_PORT, FRONTEND_PREVIEW_PORT, BACKEND_PORT (repli SERVER_PORT).

function intEnv(env, key, fallback) {
  const raw = env[key];
  if (raw === undefined || String(raw).trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const devPort = intEnv(env, "FRONTEND_DEV_PORT", 5176);
  const previewPort = intEnv(env, "FRONTEND_PREVIEW_PORT", 4273);
  const backendPort =
    (env.BACKEND_PORT && String(env.BACKEND_PORT).trim()) ||
    (env.SERVER_PORT && String(env.SERVER_PORT).trim()) ||
    "8085";
  const backendOrigin = `http://127.0.0.1:${backendPort}`;

  // Si tu développes derrière un reverse-proxy HTTPS (ex: https://ton-domaine.tld),
  // tu peux activer un HMR explicite via:
  //   VITE_HMR_HOST=ton-domaine.tld
  //   VITE_HMR_PROTOCOL=wss
  //   VITE_HMR_CLIENT_PORT=443
  const hmrHost = env.VITE_HMR_HOST?.trim();
  const hmr =
    hmrHost && hmrHost.length > 0
      ? {
          host: hmrHost,
          protocol: env.VITE_HMR_PROTOCOL?.trim() || "wss",
          clientPort: Number(env.VITE_HMR_CLIENT_PORT || 443),
        }
      : undefined;

  return {
    plugins: [react(), tailwindcss()],
    test: {
      environment: "node",
      include: ["src/**/*.test.{js,jsx}"],
    },
    server: {
      host: "0.0.0.0",
      // strictPort : si le port est pris, Vite échoue au lieu d’incrémenter (évite deux origines → localStorage divergent).
      port: devPort,
      strictPort: true,
      proxy: {
        "/api": {
          target: backendOrigin,
          changeOrigin: true,
        },
        "/uploads": {
          target: backendOrigin,
          changeOrigin: true,
        },
      },
      allowedHosts: [
  "store.socialracine.com"
],
      hmr,
    },
    preview: {
      host: "0.0.0.0",
      port: previewPort,
      strictPort: true,
    },
  };
});
