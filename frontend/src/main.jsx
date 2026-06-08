import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import "./styles/performance-optimizations.css";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

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

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
);
