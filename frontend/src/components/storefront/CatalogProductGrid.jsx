import { AnimatePresence, motion } from "framer-motion";
import ProductCard from "../product/ProductCard";

/**
 * Grille produits catalogue — markup identique vitrine classique.
 */
export default function CatalogProductGrid({
  products,
  onResetFilters,
  emptyMessage = "Essayez de modifier vos filtres",
  gridClassName = "catalog-product-grid grid grid-cols-2 lg:grid-cols-4 gap-4 w-full items-start",
}) {
  return (
    <AnimatePresence mode="wait">
      {products.length === 0 ? (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="bg-white rounded-lg shadow-md p-12 text-center"
        >
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucun produit trouvé</h3>
          <p className="text-gray-500">{emptyMessage}</p>
          {onResetFilters ? (
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-4 text-primary hover:text-primary-dark font-medium underline"
            >
              Réinitialiser les filtres
            </button>
          ) : null}
        </motion.div>
      ) : (
        <motion.div
          key="grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={gridClassName}
        >
          {products.map((product, index) => (
            <ProductCard
              key={
                product.id != null
                  ? `id:${product.id}`
                  : product.slug
                    ? `slug:${product.slug}`
                    : `idx:${index}`
              }
              product={product}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
