import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getPublicSettings } from "../../services/api";
import { BRAND_NAME, BRAND_LOGO_SRC } from "../../config/branding";
import { useStorefrontBranding } from "../../context/StorefrontBrandingContext";

const Footer = () => {
  const { pathname } = useLocation();
  const { displayName, logoSrc } = useStorefrontBranding();
  const [settings, setSettings] = useState({});
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
  }, [logoSrc]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await getPublicSettings();
        setSettings(response.data);
      } catch (error) {
        console.error("Erreur chargement footer:", error);
      }
    };
    fetchSettings();
  }, [pathname]);

  const taglineName = (settings.store_name && String(settings.store_name).trim()) || displayName || BRAND_NAME;
  const imgSrc = logoFailed ? BRAND_LOGO_SRC : logoSrc;
  const imgAlt = displayName || BRAND_NAME;

  return (
    <footer className="bg-secondary text-gray-400 py-6 md:py-12">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          <div className="col-span-2">
            <img
              src={imgSrc}
              alt={imgAlt}
              className="h-8 w-auto mb-2 md:h-12 md:mb-4 max-w-[120px] md:max-w-[200px] object-contain"
              onError={() => setLogoFailed(true)}
            />
            <p className="mt-1 md:mt-4 max-w-xs text-xs md:text-base leading-snug line-clamp-2 md:line-clamp-none">
              Votre boutique en ligne {taglineName} : sélection soignée, commande simple et
              suivi jusqu’à la livraison.
            </p>
            <div className="mt-2 md:mt-4 flex space-x-3 md:space-x-4">
              {settings.social_facebook && (
                <a
                  href={settings.social_facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <i className="fab fa-facebook text-lg md:text-xl"></i>
                </a>
              )}
              {settings.social_instagram && (
                <a
                  href={settings.social_instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <i className="fab fa-instagram text-lg md:text-xl"></i>
                </a>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-white font-bold mb-2 md:mb-4 uppercase tracking-widest text-xs md:text-sm">
              Liens Utiles
            </h3>
            <ul className="space-y-1 md:space-y-2 text-xs md:text-sm">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Mentions Légales
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Conditions de Vente
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Politique de Confidentialité
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold mb-2 md:mb-4 uppercase tracking-widest text-xs md:text-sm">
              Contact
            </h3>
            <ul className="space-y-1 md:space-y-2 text-xs md:text-sm">
              <li>📍 {settings.contact_address || "Abidjan, Côte d'Ivoire"}</li>
              <li>📞 {settings.contact_phone || "+225 07 07 07 07 07"}</li>
              <li>✉️ {settings.contact_email || "contact@store-all.local"}</li>
            </ul>
          </div>
        </div>

        <div className="mt-5 pt-4 md:mt-12 md:pt-8 border-t border-secondary-light text-center text-[10px] md:text-xs">
          <p>
            &copy; {new Date().getFullYear()} {taglineName}.{" "}
            {settings.footer_copyright || "Tous droits réservés."} Design & Code
            avec ❤️
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
