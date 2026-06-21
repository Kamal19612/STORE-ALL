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

function resolveHmrConfig(env, devPort) {
  const publicOrigin = env.VITE_DEV_PUBLIC_ORIGIN?.trim();
  const hmrHost = env.VITE_HMR_HOST?.trim();

  if (publicOrigin) {
    try {
      const url = new URL(publicOrigin);
      const isHttps = url.protocol === "https:";
      return {
        origin: publicOrigin.replace(/\/$/, ""),
        hmr: {
          host: hmrHost || url.hostname,
          protocol: env.VITE_HMR_PROTOCOL?.trim() || (isHttps ? "wss" : "ws"),
          clientPort: intEnv(
            env,
            "VITE_HMR_CLIENT_PORT",
            url.port ? Number(url.port) : isHttps ? 443 : 80,
          ),
        },
      };
    } catch {
      console.warn("[vite] VITE_DEV_PUBLIC_ORIGIN invalide — HMR local.");
    }
  }

  if (hmrHost) {
    return {
      hmr: {
        host: hmrHost,
        protocol: env.VITE_HMR_PROTOCOL?.trim() || "wss",
        clientPort: intEnv(env, "VITE_HMR_CLIENT_PORT", 443),
      },
    };
  }

  // Dev local uniquement (localhost:5176) — pas de clientPort forcé.
  return { hmr: true };
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

  const proxyDev = resolveHmrConfig(env, devPort);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    test: {
      environment: "node",
      include: ["src/**/*.test.{js,jsx}"],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react/jsx-runtime", "pdf-lib"],
    },
    // Évite les conflits de cache si plusieurs projets Vite partagent node_modules.
    cacheDir: "node_modules/.vite-store-all",
    server: {
      host: "0.0.0.0",
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
      allowedHosts: ["store.socialracine.com", "localhost", "127.0.0.1"],
      ...proxyDev,
    },
    preview: {
      host: "0.0.0.0",
      port: previewPort,
      strictPort: true,
    },
  };
});
