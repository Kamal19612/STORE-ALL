import { useCallback, useEffect, useMemo, useState } from "react";
import ProductDetailModal from "../product/ProductDetailModal";
import { getProductMainImageSrc } from "../../utils/productMedia";

function StripThumb({ product, imageSrc, ready, broken, onSelect }) {
  const showPhoto = Boolean(imageSrc && ready && !broken);

  return (
    <button
      type="button"
      className="strip-item group flex shrink-0 items-center justify-center border-0 bg-transparent p-0 cursor-pointer"
      onClick={() => onSelect(product)}
      title={product.name}
      aria-label={product.name}
    >
      <span
        className="strip-thumb block w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 shadow-md"
        style={{
          borderColor: "var(--primary)",
          backgroundColor: "#e5e7eb",
          backgroundImage: showPhoto ? `url("${imageSrc}")` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
    </button>
  );
}

export default function ProductCarouselStrip({ products, plainBackground = false }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loadedUrls, setLoadedUrls] = useState(() => new Set());
  const [brokenUrls, setBrokenUrls] = useState(() => new Set());

  const safeProducts = Array.isArray(products)
    ? products
    : Array.isArray(products?.content)
      ? products.content
      : [];
  const visible = useMemo(() => safeProducts.filter(Boolean), [safeProducts]);

  const imageUrls = useMemo(() => {
    const urls = visible.map((p) => getProductMainImageSrc(p)).filter(Boolean);
    return [...new Set(urls)];
  }, [visible]);

  useEffect(() => {
    setLoadedUrls(new Set());
    setBrokenUrls(new Set());
    if (imageUrls.length === 0) return undefined;

    let cancelled = false;
    const loaded = new Set();
    const broken = new Set();

    const markLoaded = (src) => {
      if (cancelled || loaded.has(src)) return;
      loaded.add(src);
      setLoadedUrls(new Set(loaded));
    };

    const markBroken = (src) => {
      if (cancelled || broken.has(src)) return;
      broken.add(src);
      setBrokenUrls(new Set(broken));
    };

    imageUrls.forEach((src) => {
      const img = new Image();
      img.referrerPolicy = "no-referrer";
      img.decoding = "async";
      img.onload = () => markLoaded(src);
      img.onerror = () => markBroken(src);
      img.src = src;
    });

    return () => {
      cancelled = true;
    };
  }, [imageUrls]);

  const handleSelect = useCallback((product) => {
    setSelectedProduct(product);
  }, []);

  if (visible.length === 0) return null;

  const duration = Math.max(22, visible.length * 3);

  const renderSegment = (segmentKey) =>
    visible.map((product) => {
      const imageSrc = getProductMainImageSrc(product);
      return (
        <StripThumb
          key={`${segmentKey}-${product.id}`}
          product={product}
          imageSrc={imageSrc}
          ready={!imageSrc || loadedUrls.has(imageSrc)}
          broken={Boolean(imageSrc && brokenUrls.has(imageSrc))}
          onSelect={handleSelect}
        />
      );
    });

  return (
    <>
      <style>{`
        .strip-viewport {
          isolation: isolate;
          transform: translateZ(0);
        }
        .strip-track {
          display: flex;
          width: max-content;
          animation: stripMarquee ${duration}s linear infinite;
        }
        .strip-track:hover {
          animation-play-state: paused;
        }
        .strip-segment {
          display: flex;
          align-items: center;
          gap: 20px;
          padding-right: 20px;
          flex-shrink: 0;
        }
        @media (min-width: 640px) {
          .strip-segment {
            gap: 28px;
            padding-right: 28px;
          }
        }
        @keyframes stripMarquee {
          from { transform: translate3d(0, 0, 0); }
          to   { transform: translate3d(-50%, 0, 0); }
        }
        .strip-item:focus-visible .strip-thumb {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }
        .strip-item:hover .strip-thumb {
          transform: translateY(-4px);
        }
        .strip-thumb {
          transition: transform 0.2s ease;
        }
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
          className={`strip-viewport overflow-hidden rounded-xl py-3 ${plainBackground ? "bg-transparent" : ""}`}
          style={
            plainBackground ? undefined : { backgroundColor: "rgba(var(--primary-rgb, 245, 173, 65), 0.06)" }
          }
          aria-label="Produits phares"
        >
          <div className="strip-track">
            <div className="strip-segment">{renderSegment("a")}</div>
            <div className="strip-segment" aria-hidden="true">
              {renderSegment("b")}
            </div>
          </div>
        </div>
      </div>

      {selectedProduct && (
        <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </>
  );
}
