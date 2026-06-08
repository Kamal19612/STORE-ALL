import { motion } from "framer-motion";
import FilterIcon from "../../assets/filter-icon.png";

/**
 * Filtres catalogue desktop (sidebar) — partagé vitrine classique & Alibaba.
 */
export default function CatalogFilterSidebar({
  selectedCategory,
  onSelectCategory,
  categories = [],
  showAvailableOnly,
  onShowAvailableOnlyChange,
  productCount,
}) {
  return (
    <aside className="lg:block lg:col-span-1 desktop-sidebar">
      <div className="bg-transparent p-2 sticky top-24">
        <h2 className="text-lg font-bold mb-3 text-secondary flex items-center">
          <img src={FilterIcon} alt="Filtre" className="w-6 h-6 mr-2" />
          Filtres
        </h2>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Catégorie</label>
          <div className="space-y-2">
            <motion.button
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => onSelectCategory("Tous")}
              className={`relative block w-full text-left px-4 py-2 rounded-full text-xs transition-colors z-10 ${
                selectedCategory === "Tous" || !selectedCategory
                  ? "text-secondary font-bold"
                  : "hover:text-primary text-gray-600"
              }`}
            >
              {(selectedCategory === "Tous" || !selectedCategory) && (
                <motion.div
                  layoutId="activeCategory"
                  className="absolute inset-0 bg-primary rounded-full -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              Tous les produits
            </motion.button>
            {categories.map((cat) => (
              <motion.button
                key={cat}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className={`relative block w-full text-left px-4 py-2 rounded-full text-xs transition-colors capitalize z-10 ${
                  selectedCategory === cat
                    ? "text-secondary font-bold"
                    : "hover:text-primary text-gray-600"
                }`}
              >
                {selectedCategory === cat && (
                  <motion.div
                    layoutId="activeCategory"
                    className="absolute inset-0 bg-primary rounded-full -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                {cat.toLowerCase()}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="mb-3 pt-3 border-t border-gray-100">
          <label className="flex items-center space-x-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={showAvailableOnly}
              onChange={(e) => onShowAvailableOnlyChange(e.target.checked)}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-offset-0"
            />
            <span className="text-xs text-gray-700 group-hover:text-primary transition-colors">
              Disponibles uniquement
            </span>
          </label>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            <strong>{productCount}</strong> produit(s) trouvé(s)
          </p>
        </div>
      </div>
    </aside>
  );
}
