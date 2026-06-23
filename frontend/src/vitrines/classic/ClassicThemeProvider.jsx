import { useEffect, useMemo } from "react";
import { useStorefrontBranding } from "../../context/StorefrontBrandingContext";
import { buildClassicThemeStyle } from "./utils/classicThemeStyle";
import { parseClassicVitrineConfig } from "./utils/parseVitrineConfig";
import "./classic-theme.css";

const ROOT_CLASS = "vitrine-classic-active";
const CSS_VARS = ["--primary", "--primary-dark", "--secondary", "--secondary-light", "--accent-soft", "--primary-rgb"];

/**
 * Applique les couleurs du modèle classique sur la vitrine et le document
 * (modales portées, checkout, paiement).
 */
export default function ClassicThemeProvider({ children }) {
  const { vitrineConfig } = useStorefrontBranding();
  const config = useMemo(() => parseClassicVitrineConfig(vitrineConfig), [vitrineConfig]);
  const themeStyle = useMemo(() => buildClassicThemeStyle(config), [config]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(ROOT_CLASS);
    for (const [key, value] of Object.entries(themeStyle)) {
      root.style.setProperty(key, value);
    }
    return () => {
      root.classList.remove(ROOT_CLASS);
      for (const key of CSS_VARS) {
        root.style.removeProperty(key);
      }
    };
  }, [themeStyle]);

  return (
    <div className="vitrine-classic min-h-full flex flex-col" style={themeStyle}>
      {children}
    </div>
  );
}
