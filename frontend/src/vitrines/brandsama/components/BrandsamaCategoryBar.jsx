import { useEffect, useRef } from "react";
import { LayoutGroup, motion } from "framer-motion";

const tabMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

/** Catégories mobile — chips contourés, cadre animé sans fond plein. */
export default function BrandsamaCategoryBar({ categories, selected, onSelect }) {
  const tabs = ["Tous", ...categories];
  const trackRef = useRef(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const active = el.querySelector('[role="tab"][aria-selected="true"]');
    active?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selected]);

  return (
    <nav className="bs-mcat lg:hidden" aria-label="Catégories">
      <div ref={trackRef} className="bs-mcat__track" role="tablist">
        <LayoutGroup id="bs-category-mobile">
          {tabs.map((cat, index) => {
            const isActive = selected === cat;
            const label = cat === "Tous" ? "Tous les produits" : cat;
            return (
              <motion.button
                key={cat}
                type="button"
                role="tab"
                aria-selected={isActive}
                whileTap={{ scale: 0.96 }}
                className={`bs-mcat__tab ${isActive ? "is-active" : ""}`}
                onClick={() => onSelect(cat)}
                initial={tabMotion.initial}
                animate={tabMotion.animate}
                transition={{
                  delay: index * 0.04,
                  duration: 0.28,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {isActive ? (
                  <motion.span
                    layoutId="bsMcatSelection"
                    className="bs-mcat__selection"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    aria-hidden
                  />
                ) : null}
                <span className="bs-mcat__tab-label">{label}</span>
              </motion.button>
            );
          })}
        </LayoutGroup>
      </div>
    </nav>
  );
}
