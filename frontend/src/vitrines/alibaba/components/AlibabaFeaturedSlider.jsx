import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductDetailModal from "../../../components/product/ProductDetailModal";
import { getProductMainImageSrc } from "../../../utils/productMedia";

function getSlideRole(index, activeIndex) {
  const distance = Math.abs(index - activeIndex);
  if (distance === 0) return "is-center";
  if (distance === 1) return "is-near";
  return "is-far";
}

/**
 * Produits phares — bande horizontale : image centrale mise en avant,
 * les autres restent visibles en arrière-plan.
 */
export default function AlibabaFeaturedSlider({ products, className = "" }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [trackOffset, setTrackOffset] = useState(0);

  const trackRef = useRef(null);
  const windowRef = useRef(null);

  const visible = useMemo(() => {
    const list = Array.isArray(products)
      ? products
      : Array.isArray(products?.content)
        ? products.content
        : [];
    return list.filter(Boolean);
  }, [products]);

  const centerActiveSlide = useCallback(() => {
    const track = trackRef.current;
    const windowEl = windowRef.current;
    if (!track || !windowEl) return;

    const item = track.children[currentSlide];
    if (!item) return;

    const windowCenter = windowEl.offsetWidth / 2;
    const itemCenter = item.offsetLeft + item.offsetWidth / 2;
    setTrackOffset(windowCenter - itemCenter);
  }, [currentSlide]);

  useEffect(() => {
    setCurrentSlide(0);
  }, [visible.length]);

  useLayoutEffect(() => {
    centerActiveSlide();
    const windowEl = windowRef.current;
    if (!windowEl) return undefined;

    const observer = new ResizeObserver(centerActiveSlide);
    observer.observe(windowEl);
    return () => observer.disconnect();
  }, [centerActiveSlide, visible.length]);

  useEffect(() => {
    if (visible.length <= 1) return undefined;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % visible.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [visible.length]);

  const showSlide = (index) => {
    setCurrentSlide((index + visible.length) % visible.length);
  };

  const handleItemClick = (index) => {
    if (index === currentSlide) {
      setSelectedProduct(visible[index]);
      return;
    }
    showSlide(index);
  };

  if (visible.length === 0) return null;

  return (
    <>
      <section className={`ali-featured-slider ${className}`} aria-label="Nos produits phares">
        <header className="ali-featured-slider__head">
          <h2 className="ali-featured-slider__title">Nos produits phares</h2>
        </header>

        <div className="ali-featured-slider__stage">
          {visible.length > 1 && (
            <button
              type="button"
              className="ali-featured-slider__nav ali-featured-slider__nav--prev"
              onClick={() => showSlide(currentSlide - 1)}
              aria-label="Produit précédent"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
          )}

          <div className="ali-featured-slider__window" ref={windowRef}>
            <div className="ali-featured-slider__focus-ring" aria-hidden />
            <ul
              ref={trackRef}
              className="ali-featured-slider__track"
              style={{ transform: `translateX(${trackOffset}px)` }}
            >
              {visible.map((product, index) => {
                const imageSrc = getProductMainImageSrc(product);
                const role = getSlideRole(index, currentSlide);

                return (
                  <li
                    key={product.id}
                    className={`ali-featured-slider__item ${role}`}
                  >
                    <button
                      type="button"
                      className="ali-featured-slider__thumb-btn"
                      onClick={() => handleItemClick(index)}
                      aria-label={
                        index === currentSlide
                          ? `Voir ${product.name}`
                          : `Afficher ${product.name}`
                      }
                      aria-current={index === currentSlide ? "true" : undefined}
                    >
                      <div className="ali-featured-slider__thumb">
                        {imageSrc ? (
                          <img
                            src={imageSrc}
                            alt={product.name}
                            loading={Math.abs(index - currentSlide) <= 1 ? "eager" : "lazy"}
                            referrerPolicy="no-referrer"
                            draggable={false}
                          />
                        ) : (
                          <span className="ali-featured-slider__placeholder">—</span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {visible.length > 1 && (
            <button
              type="button"
              className="ali-featured-slider__nav ali-featured-slider__nav--next"
              onClick={() => showSlide(currentSlide + 1)}
              aria-label="Produit suivant"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          )}
        </div>

        {visible.length > 1 && (
          <div className="ali-featured-slider__dots" role="tablist" aria-label="Pagination produits">
            {visible.map((product, index) => (
              <button
                key={product.id}
                type="button"
                role="tab"
                className={`ali-featured-slider__dot ${index === currentSlide ? "is-active" : ""}`}
                onClick={() => showSlide(index)}
                aria-label={`Aller au produit ${index + 1}`}
                aria-selected={index === currentSlide}
              />
            ))}
          </div>
        )}
      </section>

      {selectedProduct && (
        <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </>
  );
}
