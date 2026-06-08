import { LayoutGroup, motion } from "framer-motion";

const tabMotion = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
};

/** Sidebar catégories desktop — même style contouré que mobile. */
export default function BrandsamaSidebar({ categories, selected, onSelect }) {
  const tabs = ["Tous", ...categories];

  return (
    <aside className="bs-sidebar">
      <nav aria-label="Catégories">
        <p className="bs-sidebar-title">Catégories</p>
        <LayoutGroup id="bs-category-sidebar">
          <div className="bs-sidebar-list">
            {tabs.map((cat, index) => {
              const isActive = selected === cat;
              const label = cat === "Tous" ? "Tous les produits" : cat;
              return (
                <motion.button
                  key={cat}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  className={`bs-mcat__tab bs-sidebar-item ${isActive ? "is-active" : ""}`}
                  onClick={() => onSelect(cat)}
                  initial={tabMotion.initial}
                  animate={tabMotion.animate}
                  transition={{
                    delay: index * 0.03,
                    duration: 0.28,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {isActive ? (
                    <motion.span
                      layoutId="bsMcatSelectionSidebar"
                      className="bs-mcat__selection"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      aria-hidden
                    />
                  ) : null}
                  <span className="bs-mcat__tab-label">{label}</span>
                </motion.button>
              );
            })}
          </div>
        </LayoutGroup>
      </nav>
    </aside>
  );
}
