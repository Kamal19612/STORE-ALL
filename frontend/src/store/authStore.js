import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api from "../services/api";
import { AUTH_PERSIST_LOCALSTORAGE_KEY } from "./authStorageKey";

/**
 * Store Zustand pour gérer l'état d'authentification
 * Persiste le token dans localStorage pour que la session survive
 * au redémarrage de la PWA installée (standalone).
 */
const useAuthStore = create(
  persist(
    (set, get) => ({
      // État
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      /**
       * Connecte l'utilisateur et stocke le token JWT
       * @param {Object} authData - { token, username, roles }
       */
      login: (authData) => {
        // Nouvelle logique avec List<String> depuis le back
        // authData.roles : ex. ["ROLE_MANAGER"] ou ["ROLE_SUPER_ADMIN"]
        const roles = Array.isArray(authData.roles) ? authData.roles : [];

        // IMPORTANT: ne pas prendre `roles[0]` (ordre non garanti).
        // On choisit le rôle le plus élevé connu pour le frontend.
        const pickPrimaryRole = (springRoles) => {
          const normalized = springRoles
            .filter(Boolean)
            .map((r) => String(r).trim())
            .map((r) => (r.startsWith("ROLE_") ? r.slice("ROLE_".length) : r));

          const priority = ["SUPER_ADMIN", "MANAGER", "DELIVERY_AGENT"];

          for (const p of priority) {
            if (normalized.includes(p)) return p;
          }

          // Fallback: premier rôle normalisé
          return normalized.length ? normalized[0] : null;
        };

        const role = pickPrimaryRole(roles);

        const user = {
          username: authData.username,
          role: role,
          storeId: authData.storeId ?? null,
          storeCode:
            authData.storeCode != null && String(authData.storeCode).trim() !== ""
              ? String(authData.storeCode).trim()
              : null,
          storeName:
            authData.storeName != null && String(authData.storeName).trim() !== ""
              ? String(authData.storeName).trim()
              : null,
          storeLogoUrl:
            authData.storeLogoUrl != null && String(authData.storeLogoUrl).trim() !== ""
              ? String(authData.storeLogoUrl).trim()
              : null,
        };

        // localStorage persiste entre les sessions — nécessaire pour la PWA standalone

        set({
          user,
          token: authData.token,
          isAuthenticated: true,
        });
      },

      /**
       * Déconnecte l'utilisateur et nettoie le state
       */
      logout: async () => {
        // Évite un double-appel si déjà déconnecté
        if (!get().token) {
          localStorage.removeItem(AUTH_PERSIST_LOCALSTORAGE_KEY);
          set({ user: null, token: null, isAuthenticated: false });
          return;
        }
        try {
          await api.post("/logout");
        } catch (error) {
          console.error("Erreur déconnexion serveur (ignorée):", error);
        } finally {
          localStorage.removeItem(AUTH_PERSIST_LOCALSTORAGE_KEY);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
        }
      },

      /**
       * Vérifie si l'utilisateur est toujours authentifié
       * @returns {boolean}
       */
      checkAuth: () => {
        const { token, user } = get();

        if (token && user) {
          return true;
        }

        // Nettoyer le state sans appeler l'API (pas de session à fermer)
        set({ user: null, token: null, isAuthenticated: false });
        return false;
      },

      /**
       * Met à jour l'état de chargement
       * @param {boolean} loading
       */
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: AUTH_PERSIST_LOCALSTORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export default useAuthStore;
