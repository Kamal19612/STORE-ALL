import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LayoutGroup, motion } from "framer-motion";

const tabMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

export default function AlibabaCategoryTabs({ categories, selected, onSelect }) {
  const tabs = ["Tous", ...categories];
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;

    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [tabs.length, updateScrollState]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const active = el.querySelector('[role="tab"][aria-selected="true"]');
    active?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selected]);

  const scrollBy = (direction) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 200, behavior: "smooth" });
  };

  return (
    <section className="ali-cat-rail" aria-label="Filtrer par catégorie">
      <div className="ali-cat-rail__nav">
        <motion.button
          type="button"
          className="ali-cat-rail__arrow ali-cat-rail__arrow--left"
          onClick={() => scrollBy(-1)}
          disabled={!canScrollLeft}
          aria-label="Catégories précédentes"
          whileTap={{ scale: 0.92 }}
        >
          <ChevronLeft className="h-4 w-4" />
        </motion.button>

        <div className="ali-cat-rail__track-wrap">
          <LayoutGroup id="ali-category-rail">
            <div ref={trackRef} className="ali-cat-rail__track" role="tablist">
              {tabs.map((cat, index) => {
                const isActive = selected === cat;
                const label = cat === "Tous" ? "Tous les produits" : cat;
                return (
                  <motion.button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`ali-cat-rail__tab ${isActive ? "is-active" : ""}`}
                    onClick={() => onSelect(cat)}
                    whileTap={{ scale: 0.96 }}
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
                        layoutId="aliActiveCategory"
                        className="ali-cat-rail__selection"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        aria-hidden
                      />
                    ) : null}
                    <span className="ali-cat-rail__tab-label">{label}</span>
                  </motion.button>
                );
              })}
            </div>
          </LayoutGroup>
        </div>

        <motion.button
          type="button"
          className="ali-cat-rail__arrow ali-cat-rail__arrow--right"
          onClick={() => scrollBy(1)}
          disabled={!canScrollRight}
          aria-label="Catégories suivantes"
          whileTap={{ scale: 0.92 }}
        >
          <ChevronRight className="h-4 w-4" />
        </motion.button>
      </div>
    </section>
  );
}
