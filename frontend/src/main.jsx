import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./styles/vendorFonts.css";
import "./index.css";
import "./styles/performance-optimizations.css";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { reloadIfStaleModuleError } from "./utils/reloadOnStaleModule.js";
import { registerAppServiceWorker } from "./utils/registerServiceWorker";

// Vite : dep pré-bundlée ou chunk obsolète après redémarrage du serveur dev (504 Outdated Optimize Dep).
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    reloadIfStaleModuleError(event.payload);
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Données considérées fraîches pendant 5 minutes → pas de refetch au retour sur l'onglet
      staleTime: 5 * 60 * 1000,
      // Données gardées en cache 10 minutes après que le composant se démonte
      gcTime: 10 * 60 * 1000,
      // Ne pas refetch automatiquement quand l'onglet reprend le focus
      refetchOnWindowFocus: false,
      // Ne pas refetch à la reconnexion réseau (évite les re-render mobiles)
      refetchOnReconnect: false,
      // Pas de retry automatique sur erreur (les erreurs 4xx ne doivent pas être retentées)
      retry: false,
    },
  },
});

// Hors StrictMode : évite double enregistrement SW en dev (React StrictMode).
registerAppServiceWorker();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
);
