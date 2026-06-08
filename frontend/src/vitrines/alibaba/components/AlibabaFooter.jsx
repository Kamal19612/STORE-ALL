import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Mail, MapPin, Phone } from "lucide-react";
import { getPublicSettings } from "../../../services/api";
import { BRAND_NAME, BRAND_LOGO_SRC } from "../../../config/branding";
import { useStorefrontBranding } from "../../../context/StorefrontBrandingContext";

export default function AlibabaFooter() {
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

  const taglineName =
    (settings.store_name && String(settings.store_name).trim()) || displayName || BRAND_NAME;
  const imgSrc = logoFailed ? BRAND_LOGO_SRC : logoSrc;
  const address = settings.contact_address || "Abidjan, Côte d'Ivoire";
  const phone = settings.contact_phone || "+225 07 07 07 07 07";
  const email = settings.contact_email || "contact@store-all.local";

  return (
    <footer className="ali-footer mt-auto">
      <div className="ali-footer__main mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="ali-footer__grid">
          <div className="ali-footer__brand">
            <img
              src={imgSrc}
              alt={taglineName}
              className="ali-footer__logo h-8 sm:h-9 w-auto max-w-[130px] object-contain object-left"
              onError={() => setLogoFailed(true)}
            />
            <p className="ali-footer__tagline">
              {taglineName} — commande en ligne simple et livraison suivie.
            </p>
            {(settings.social_facebook || settings.social_instagram) && (
              <div className="ali-footer__social">
                {settings.social_facebook && (
                  <a
                    href={settings.social_facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ali-footer__social-link"
                    aria-label="Facebook"
                  >
                    <i className="fab fa-facebook" aria-hidden />
                  </a>
                )}
                {settings.social_instagram && (
                  <a
                    href={settings.social_instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ali-footer__social-link"
                    aria-label="Instagram"
                  >
                    <i className="fab fa-instagram" aria-hidden />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="ali-footer__col">
            <h3 className="ali-footer__heading">Informations</h3>
            <ul className="ali-footer__links">
              <li>
                <a href="#">Mentions légales</a>
              </li>
              <li>
                <a href="#">Conditions de vente</a>
              </li>
              <li>
                <a href="#">Politique de confidentialité</a>
              </li>
            </ul>
          </div>

          <div className="ali-footer__col">
            <h3 className="ali-footer__heading">Contact</h3>
            <ul className="ali-footer__contact">
              <li>
                <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                <span>{address}</span>
              </li>
              <li>
                <Phone className="h-4 w-4 shrink-0" aria-hidden />
                <a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>
              </li>
              <li>
                <Mail className="h-4 w-4 shrink-0" aria-hidden />
                <a href={`mailto:${email}`}>{email}</a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="ali-footer__bar">
        <p>
          &copy; {new Date().getFullYear()} {taglineName}.{" "}
          {settings.footer_copyright || "Tous droits réservés."}
        </p>
      </div>
    </footer>
  );
}
