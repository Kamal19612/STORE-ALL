import { useMemo } from "react";
import { useStorefrontBranding } from "../../context/StorefrontBrandingContext";
import { buildBrandsamaThemeStyle } from "./utils/brandsamaThemeStyle";
import { parseBrandsamaVitrineConfig } from "./utils/parseVitrineConfig";
import "./brandsama-theme.css";
import "./brandsama-theme-motion.css";

export default function BrandsamaThemeProvider({ children }) {
  const { displayName, vitrineConfig } = useStorefrontBranding();
  const config = useMemo(
    () => parseBrandsamaVitrineConfig(vitrineConfig, { displayName }),
    [vitrineConfig, displayName],
  );
  const themeStyle = useMemo(() => buildBrandsamaThemeStyle(config), [config]);

  return (
    <div className="vitrine-brandsama min-h-full flex flex-col" style={themeStyle}>
      {children}
    </div>
  );
}
