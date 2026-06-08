import api from "./api";

/**
 * Service d'authentification pour gérer les appels API
 */
const authService = {
  /**
   * Authentifie un utilisateur avec username et password
   * @param {string} username - Nom d'utilisateur ou email
   * @param {string} password - Mot de passe
   * @returns {Promise<Object>} - Données d'authentification (token, username, roles)
   * @throws {Error} - Erreur d'authentification
   */
  login: async (username, password) => {
    try {
      const response = await api.post("/login", {
        username,
        password,
      });

      return response.data;
    } catch (error) {
      // Gestion des erreurs HTTP
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message;

        if (status === 401) {
          throw new Error(
            message || "Identifiants incorrects. Veuillez réessayer.",
          );
        } else if (status === 403) {
          throw new Error("Accès non autorisé.");
        } else if (status === 500) {
          throw new Error("Erreur serveur. Veuillez réessayer plus tard.");
        } else {
          throw new Error(
            message || "Une erreur est survenue lors de la connexion.",
          );
        }
      } else if (error.request) {
        throw new Error(
          "Impossible de contacter le serveur. Vérifiez votre connexion.",
        );
      } else {
        throw new Error("Erreur inconnue lors de la connexion.");
      }
    }
  },

  /**
   * Déconnexion (nettoyage côté client uniquement)
   */
  logout: () => {
    localStorage.removeItem("token");
  },
};

export default authService;
