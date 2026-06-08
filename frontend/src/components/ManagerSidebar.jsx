import {
  useState,
  createContext,
  useContext,
  useMemo,
  useEffect,
  useRef,
  memo,
} from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Image as ImageIcon,
  Settings,
  LogOut,
  ChevronLeft,
  Sun,
  Moon,
  Menu,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { BRAND_LOGO_SRC } from "../config/branding";

const SidebarContext = createContext();

const LG_MIN_MEDIA = "(min-width: 1024px)";

/**
 * Menu manager : statistiques, commandes, produits, carrousel, paramètres (réseaux sociaux, etc.).
 */
export default function ManagerSidebar({
  user,
  staffBase,
  storeLabel,
  /** Nom affiché en en-tête sidebar (stores.name ou repli code / marque). */
  boutiqueName,
  /** URL logo boutique (stores.logo_url), résolue côté parent. */
  boutiqueLogoSrc,
  logout,
  isMobileOpen,
  onMobileClose,
}) {
  const [expanded, setExpanded] = useState(true);
  const [logoFailed, setLogoFailed] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const asideRef = useRef(null);

  const [isLargeScreen, setIsLargeScreen] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(LG_MIN_MEDIA).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(LG_MIN_MEDIA);
    const sync = () => setIsLargeScreen(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setLogoFailed(false);
  }, [boutiqueLogoSrc]);

  const isDesktopCollapsed = !expanded;
  const isDrawerHiddenMobileOnly = !isLargeScreen && !isMobileOpen;

  useEffect(() => {
    if (isMobileOpen || isLargeScreen) return;
    const asideEl = asideRef.current;
    const activeEl = document.activeElement;
    if (asideEl && activeEl && asideEl.contains(activeEl) && typeof activeEl.blur === "function") {
      activeEl.blur();
    }
  }, [isMobileOpen, isLargeScreen]);

  const menuItems = useMemo(() => {
    const b = staffBase.replace(/\/$/, "");
    return [
      { path: `${b}/dashboard`, icon: LayoutDashboard, text: "Dashboard" },
      { path: `${b}/orders`, icon: ShoppingBag, text: "Commandes" },
      { path: `${b}/products`, icon: Package, text: "Produits" },
      { path: `${b}/slider`, icon: ImageIcon, text: "Carrousel" },
      { path: `${b}/settings`, icon: Settings, text: "Paramètres" },
    ];
  }, [staffBase]);

  const contextValue = useMemo(
    () => ({ expanded, theme, onMobileClose }),
    [expanded, theme, onMobileClose],
  );

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <SidebarContext.Provider value={contextValue}>
        <aside
          ref={asideRef}
          className={`
            fixed lg:static inset-y-0 left-0 z-50 flex flex-col
            bg-white dark:bg-[#242021]
            border-r border-gray-200 dark:border-white/10
            shadow-2xl overflow-hidden
            transition-transform duration-300 ease-in-out
            rounded-r-2xl lg:rounded-none
            ${isDesktopCollapsed ? "lg:w-20" : "lg:w-64"} w-[55vw]
            ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
          aria-hidden={isDrawerHiddenMobileOnly ? true : undefined}
          inert={isDrawerHiddenMobileOnly ? true : undefined}
        >
          <div className="flex items-center px-3 h-16 shrink-0 relative overflow-hidden">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative group cursor-pointer shrink-0 w-8 h-8">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#f5ad41] to-[#d89a35] rounded-full opacity-75 group-hover:opacity-100 blur transition-opacity duration-200" />
                <img
                  src={logoFailed ? BRAND_LOGO_SRC : boutiqueLogoSrc}
                  onError={() => setLogoFailed(true)}
                  alt={boutiqueName}
                  className="relative w-8 h-8 object-contain rounded-full bg-white/80 dark:bg-black/20"
                />
              </div>
              <span
                translate="no"
                className={`font-brand-serif font-bold text-xl text-[#242021] dark:text-[#f5ad41] tracking-wide whitespace-nowrap transition-opacity duration-200
                  ${isDesktopCollapsed ? "lg:opacity-0 lg:w-0 lg:overflow-hidden" : "opacity-100"}`}
              >
                {boutiqueName}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setExpanded((curr) => !curr)}
              className="
                p-2 rounded-full
                bg-white/50 dark:bg-[#3a3638]/50
                hover:bg-[#f5ad41]/20 dark:hover:bg-[#f5ad41]/20
                text-gray-600 dark:text-gray-300
                border border-white/20 dark:border-white/5
                backdrop-blur-sm shadow-sm
                transition-colors duration-200 hidden lg:flex items-center justify-center
                absolute -right-3 top-1/2 -translate-y-1/2 z-50
              "
            >
              {isDesktopCollapsed ? <Menu size={20} /> : <ChevronLeft size={16} />}
            </button>

            <button
              type="button"
              onClick={onMobileClose}
              className="p-2 rounded-lg text-gray-500 dark:text-[#f5ad41] hover:bg-gray-100 dark:hover:bg-white/10 lg:hidden ml-auto shrink-0 transition-colors"
              aria-label="Fermer le menu"
            >
              <ChevronLeft size={22} />
            </button>
          </div>

          {!isDesktopCollapsed && (
            <p className="px-3 pb-2 text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate">
              Boutique · {boutiqueName}
            </p>
          )}

          <ul className="flex-1 px-2 space-y-1 py-3 overflow-y-auto overflow-x-hidden no-scrollbar">
            {menuItems.map((item) => (
              <ManagerSidebarItem
                key={item.path}
                {...item}
                active={
                  location.pathname === item.path ||
                  location.pathname.startsWith(`${item.path}/`)
                }
              />
            ))}
          </ul>

          <div className="p-3 border-t border-gray-200/30 dark:border-white/10 mx-2 mb-2 shrink-0 space-y-2">
            <button
              type="button"
              onClick={toggleTheme}
              className={`
                flex items-center p-3 rounded-lg w-full cursor-pointer
                hover:bg-gray-100 dark:hover:bg-white/10
                text-[#242021] dark:text-[#f5ad41]
                transition-colors duration-200
                ${isDesktopCollapsed ? "lg:justify-center" : "justify-start gap-3"}
              `}
            >
              <div className="shrink-0">
                {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
              </div>
              <span
                className={`whitespace-nowrap font-medium text-sm
                  ${isDesktopCollapsed ? "lg:hidden" : ""}`}
              >
                {theme === "light" ? "Mode Sombre" : "Mode Clair"}
              </span>
            </button>

            <div
              className={`flex items-center p-2.5 rounded-lg bg-white/40 dark:bg-[#3a3638]/40 border border-white/20 dark:border-white/5 shadow-sm backdrop-blur-md
                ${isDesktopCollapsed ? "lg:justify-center" : "gap-3"}`}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#f5ad41] to-[#d89a35] flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0">
                {user?.username?.charAt(0).toUpperCase() || "M"}
              </div>

              <div className={`flex-1 min-w-0 ${isDesktopCollapsed ? "lg:hidden" : ""}`}>
                <h4 className="font-semibold text-sm text-[#242021] dark:text-white truncate">
                  {user?.username || "Manager"}
                </h4>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                  Manager
                </p>
              </div>

              <button
                type="button"
                onClick={logout}
                className={`p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 text-gray-400 transition-colors shrink-0
                  ${isDesktopCollapsed ? "lg:hidden" : ""}`}
                title="Se déconnecter"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>
      </SidebarContext.Provider>
    </>
  );
}

const ManagerSidebarItem = memo(function ManagerSidebarItem({
  icon: Icon,
  text,
  active,
  path,
}) {
  const { expanded, onMobileClose } = useContext(SidebarContext);
  const isCollapsed = !expanded;

  const handleClick = () => {
    if (window.innerWidth < 1024 && onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <li>
      <Link
        to={path}
        onClick={handleClick}
        className={`
          relative flex items-center py-2.5 px-3
          font-medium text-sm rounded-xl cursor-pointer
          transition-all duration-200 group
          ${
            active
              ? "bg-gradient-to-r from-[#f5ad41]/20 to-[#f5ad41]/5 text-[#d89a35] dark:text-[#f5ad41] shadow-[0_0_20px_rgba(245,173,65,0.15)] ring-1 ring-[#f5ad41]/30"
              : "text-gray-700 dark:text-gray-300 hover:text-[#242021] dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10"
          }
          justify-start gap-3 ${isCollapsed ? "lg:justify-center lg:gap-0" : ""}
        `}
      >
        <Icon
          size={20}
          className={`shrink-0 transition-transform duration-200 ${active ? "scale-110" : "group-hover:scale-110"}`}
        />

        <span
          className={`whitespace-nowrap transition-opacity duration-200
            ${isCollapsed ? "lg:opacity-0 lg:w-0 lg:overflow-hidden lg:absolute" : "opacity-100"}`}
        >
          {text}
        </span>

        {active && (
          <motion.div
            layoutId="manager-sidebar-active-pill"
            className={`absolute left-0 w-1 h-6 bg-[#f5ad41] rounded-r-full ${isCollapsed ? "lg:hidden" : ""}`}
          />
        )}

        {isCollapsed && (
          <div
            className="
              absolute left-full top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 ml-4
              bg-[#242021] dark:bg-white text-white dark:text-[#242021] text-xs font-semibold
              invisible opacity-0 -translate-x-2 transition-all duration-200
              group-hover:visible group-hover:opacity-100 group-hover:translate-x-0
              z-50 whitespace-nowrap shadow-xl border border-white/10
              hidden lg:block
            "
          >
            {text}
            <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-[#242021] dark:bg-white rotate-45" />
          </div>
        )}
      </Link>
    </li>
  );
});
