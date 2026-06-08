import { useState } from "react";
import ProductDetailModal from "../product/ProductDetailModal";
import { getProductMainImageSrc } from "../../utils/productMedia";

const SLOT_MOBILE = 102;
const SLOT_SM = 124;

export default function ProductCarouselStrip({ products, plainBackground = false }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const safeProducts = Array.isArray(products)
    ? products
    : Array.isArray(products?.content)
      ? products.content
      : [];
  const visible = safeProducts.filter(Boolean);

  if (visible.length === 0) return null;

  const N = visible.length;
  const pxMobile = N * SLOT_MOBILE;
  const pxSm = N * SLOT_SM;
  const copies = Math.max(4, Math.ceil(1600 / pxMobile) + 1);
  const items = Array.from({ length: copies }, () => visible).flat();
  const duration = Math.max(18, N * 2.5);

  return (
    <>
      <style>{`
        .strip-track {
          display: flex;
          width: max-content;
          animation: scrollStripMobile ${duration}s linear infinite;
        }
        .strip-track:hover { animation-play-state: paused; }
        @keyframes scrollStripMobile {
          from { transform: translate3d(0, 0, 0); }
          to   { transform: translate3d(-${pxMobile}px, 0, 0); }
        }
        @media (min-width: 640px) {
          .strip-track { animation-name: scrollStripSm; }
          @keyframes scrollStripSm {
            from { transform: translate3d(0, 0, 0); }
            to   { transform: translate3d(-${pxSm}px, 0, 0); }
          }
        }
        .strip-item {
          flex-shrink: 0;
          cursor: pointer;
          transition: transform 0.2s;
          width: 90px;
          margin-right: 12px;
        }
        @media (min-width: 640px) {
          .strip-item { width: 110px; margin-right: 14px; }
        }
        .strip-item:hover { transform: translateY(-4px); }
      `}</style>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3 px-1">
          <span
            className="w-1 h-5 rounded-full inline-block"
            style={{ backgroundColor: "var(--primary)" }}
          />
          <h2
            className="text-sm font-bold uppercase tracking-widest"
            style={{ color: "var(--secondary)" }}
          >
            Nos produits phares
          </h2>
        </div>

        <div
          className={`overflow-hidden rounded-xl py-2 ${plainBackground ? "bg-transparent" : ""}`}
          style={
            plainBackground ? undefined : { backgroundColor: "rgba(var(--primary-rgb), 0.06)" }
          }
        >
          <div className="strip-track">
            {items.map((product, index) => {
              const imageSrc = getProductMainImageSrc(product);
              return (
              <div
                key={`${product.id}-${index}`}
                className="strip-item"
                onClick={() => setSelectedProduct(product)}
                title={product.name}
              >
                <div className="flex flex-col items-center gap-1 w-full">
                  <div
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 shadow-md shrink-0"
                    style={{ borderColor: "var(--primary)" }}
                  >
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                        <span className="text-[10px] font-semibold px-1 text-center leading-tight">
                          Sans image
                        </span>
                      </div>
                    )}
                  </div>
                  <span
                    className="text-[10px] font-semibold text-center leading-tight line-clamp-2 w-full px-1"
                    style={{ color: "var(--secondary)", minHeight: "2.4em" }}
                  >
                    {product.name}
                  </span>
                  <span
                    className="text-[10px] font-bold text-center"
                    style={{ color: "var(--primary)" }}
                  >
                    {Number(product.price).toLocaleString("fr-FR")} F
                  </span>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      </div>

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </>
  );
}
