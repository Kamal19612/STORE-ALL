import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import useCartStore from "../../../store/cartStore";
import CartDrawer from "../../../components/cart/CartDrawer";
import { BRAND_LOGO_SRC, BRAND_NAME } from "../../../config/branding";
import { useStorefrontBranding } from "../../../context/StorefrontBrandingContext";
import { useBrandsamaCatalog } from "../BrandsamaCatalogContext";

export default function BrandsamaHeader() {
  const { searchQuery, setSearchQuery } = useBrandsamaCatalog();
  const { storeCode } = useParams();
  const { displayName, logoSrc } = useStorefrontBranding();
  const shopHome = storeCode
    ? `/${storeCode}`
    : `/${(import.meta.env.VITE_STORE_CODE || "spirit").trim().toLowerCase()}`;
  const items = useCartStore((state) => state.items);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
  }, [logoSrc]);

  const imgSrc = logoFailed ? BRAND_LOGO_SRC : logoSrc;
  const imgAlt = displayName || BRAND_NAME;

  return (
    <>
      <header className="bs-header">
        <div className="bs-header-inner">
          <Link to={shopHome} className="flex items-center shrink-0 min-w-0">
            <img
              src={imgSrc}
              alt={imgAlt}
              className="h-9 w-auto max-w-[140px] object-contain"
              onError={() => setLogoFailed(true)}
            />
          </Link>

          <div className="hidden md:block flex-1 max-w-xl mx-4">
            <BrandsamaSearchInline value={searchQuery} onChange={setSearchQuery} />
          </div>

          <button
            type="button"
            id="cart-toggle"
            onClick={() => setIsCartOpen(true)}
            className="bs-btn-primary !min-h-[44px] shrink-0 ml-auto relative"
            aria-label="Panier"
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span
                id="cart-count"
                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#0e0e0e] text-white text-[10px] font-bold"
              >
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}

function BrandsamaSearchInline({ value, onChange }) {
  return (
    <div className="relative">
      <input
        id="bs-catalog-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Rechercher…"
        className="bs-search-input w-full"
        aria-label="Rechercher"
        autoComplete="off"
      />
    </div>
  );
}
