import { Outlet } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { useStorefrontBranding } from "../context/StorefrontBrandingContext";
import AlibabaThemeProvider from "../vitrines/alibaba/AlibabaThemeProvider";
import AlibabaHeader from "../vitrines/alibaba/components/AlibabaHeader";
import AlibabaFooter from "../vitrines/alibaba/components/AlibabaFooter";
import BrandsamaThemeProvider from "../vitrines/brandsama/BrandsamaThemeProvider";
import { BrandsamaCatalogProvider } from "../vitrines/brandsama/BrandsamaCatalogContext";
import BrandsamaHeader from "../vitrines/brandsama/components/BrandsamaHeader";
import BrandsamaFooter from "../vitrines/brandsama/components/BrandsamaFooter";

/**
 * En-tête / pied de page vitrine selon {@code vitrineTemplate} (classique vs marketplace Alibaba).
 */
export default function StorefrontLayoutShell() {
  const { vitrineTemplate, loading } = useStorefrontBranding();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-500">
        <p className="text-sm">Chargement de la boutique…</p>
      </div>
    );
  }

  if (vitrineTemplate === "alibaba") {
    return (
      <AlibabaThemeProvider>
        <div className="flex flex-col min-h-screen">
          <AlibabaHeader />
          <main className="flex-grow bg-white">
            <Outlet />
          </main>
          <AlibabaFooter />
        </div>
      </AlibabaThemeProvider>
    );
  }

  if (vitrineTemplate === "brandsama") {
    return (
      <BrandsamaThemeProvider>
        <BrandsamaCatalogProvider>
          <div className="flex flex-col min-h-screen">
            <BrandsamaHeader />
            <main className="flex-grow">
              <Outlet />
            </main>
            <BrandsamaFooter />
          </div>
        </BrandsamaCatalogProvider>
      </BrandsamaThemeProvider>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow bg-gray-50">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
