import { Link, useParams } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import useCartStore from "../../store/cartStore";
import CartDrawer from "../cart/CartDrawer";
import { BRAND_NAME, BRAND_LOGO_SRC } from "../../config/branding";
import { useStorefrontBranding } from "../../context/StorefrontBrandingContext";

const Header = () => {
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
    <header className="sticky top-0 z-50 bg-secondary text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo - Positioned left on all screens */}
          <div className="flex-shrink-0 flex items-center h-full py-4">
            <Link to={shopHome} className="flex items-center gap-3 group">
              <img
                src={imgSrc}
                alt={imgAlt}
                className="h-12 w-auto object-contain max-w-[200px]"
                onError={() => setLogoFailed(true)}
              />
            </Link>
          </div>

          {/* Navigation Desktop - Vide pour l'instant */}
          <nav className="hidden md:flex space-x-8"></nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <button
              id="cart-toggle"
              onClick={() => setIsCartOpen(true)}
              className={`relative px-4 py-2 rounded-lg transition-transform hover:scale-105 active:scale-95 bg-primary text-secondary ${itemCount > 0 ? "animate-pulse-fast border-2 border-white shadow-lg" : ""}`}
            >
              <ShoppingCart className="h-6 w-6" />
              <span
                id="cart-count"
                className={`absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-white text-xs font-bold shadow-sm ${itemCount > 0 ? "animate-bounce-scale" : ""}`}
              >
                {itemCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </header>
  );
};

export default Header;
