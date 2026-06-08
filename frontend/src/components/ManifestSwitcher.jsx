import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Injecte dynamiquement le manifest PWA adapté à la route courante.
 * - Pages login (/login, /admin/login) → manifest-staff.json (start_url: /login)
 * - Toutes les autres pages              → manifest.json (start_url: /)
 *
 * Chrome crée deux PWA distinctes grâce aux champs "id" différents.
 */
const STAFF_ROUTES = ["/login", "/admin/login"];

export default function ManifestSwitcher() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isStaff = STAFF_ROUTES.includes(pathname);
    const href = isStaff ? "/manifest-staff.json" : "/manifest.json";

    let link = document.querySelector('link[rel="manifest"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }

    if (link.href !== href) {
      link.href = href;
    }
  }, [pathname]);

  return null;
}