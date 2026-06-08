import { StorefrontBrandingProvider } from "../context/StorefrontBrandingContext";
import StorefrontLayoutShell from "./StorefrontLayoutShell";

const MainLayout = () => (
  <StorefrontBrandingProvider>
    <StorefrontLayoutShell />
  </StorefrontBrandingProvider>
);

export default MainLayout;
