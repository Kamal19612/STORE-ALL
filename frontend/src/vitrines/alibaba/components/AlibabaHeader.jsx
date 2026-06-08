import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Search, ShoppingCart } from "lucide-react";
import useCartStore from "../../../store/cartStore";
import CartDrawer from "../../../components/cart/CartDrawer";
import { BRAND_LOGO_SRC, BRAND_NAME } from "../../../config/branding";
import { useStorefrontBranding } from "../../../context/StorefrontBrandingContext";

export default function AlibabaHeader({ onSearchFocus }) {
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
      <header className="ali-header sticky top-0 z-50 bg-white border-b border-[var(--ali-border)]">
        <div className="mx-auto flex h-12 lg:h-16 max-w-7xl items-center justify-between gap-2 lg:gap-3 px-2 sm:px-6 lg:px-8">
          <Link to={shopHome} className="ali-header__brand flex items-center min-w-0 shrink lg:max-w-none">
            <img
              src={imgSrc}
              alt={imgAlt}
              className="ali-header__logo h-7 w-auto max-w-[96px] object-contain object-left lg:h-10 lg:max-w-[180px]"
              onError={() => setLogoFailed(true)}
            />
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              className="ali-btn-ghost md:hidden"
              aria-label="Rechercher"
              onClick={() => {
                const el = document.getElementById("ali-catalog-search");
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
                el?.focus();
                onSearchFocus?.();
              }}
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              type="button"
              id="cart-toggle"
              onClick={() => setIsCartOpen(true)}
              className="ali-btn-primary !min-h-[40px] !h-10 !px-4 !rounded-full relative"
              aria-label="Panier"
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span
                  id="cart-count"
                  className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#222] text-white text-[10px] font-bold"
                >
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
