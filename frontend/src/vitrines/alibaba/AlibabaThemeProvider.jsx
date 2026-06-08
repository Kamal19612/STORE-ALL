import { useMemo } from "react";
import { useStorefrontBranding } from "../../context/StorefrontBrandingContext";
import { buildAlibabaAccentCssVars } from "./utils/alibabaAccentStyle";
import { parseAlibabaVitrineConfig } from "./utils/parseVitrineConfig";
import "./alibaba-theme.css";

/**
 * Applique le design system Alibaba (couleur d’accent incluse sur header, panier, checkout).
 */
export default function AlibabaThemeProvider({ children }) {
  const { displayName, vitrineConfig } = useStorefrontBranding();
  const accentColor = useMemo(() => {
    const cfg = parseAlibabaVitrineConfig(vitrineConfig, { displayName });
    return cfg.accentColor;
  }, [vitrineConfig, displayName]);

  const themeStyle = useMemo(() => buildAlibabaAccentCssVars(accentColor), [accentColor]);

  return (
    <div className="vitrine-alibaba min-h-full flex flex-col" style={themeStyle}>
      {children}
    </div>
  );
}
