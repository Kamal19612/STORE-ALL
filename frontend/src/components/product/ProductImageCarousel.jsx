import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { resolveProductImageList, resolveProductImageUrl } from "../../utils/productMedia";

const fallbackSvg =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600'%3E%3Crect width='600' height='600' fill='none'/%3E%3C/svg%3E";

const ProductImageCarousel = ({ mainImage, secondaryImages, alt }) => {
  const images = useMemo(() => {
    const list = resolveProductImageList(
      [mainImage, ...(secondaryImages || [])].filter(Boolean).map((s) => String(s).trim()),
    );
    const seen = new Set();
    return list.filter((u) => (seen.has(u) ? false : (seen.add(u), true)));
  }, [mainImage, secondaryImages]);

  const [index, setIndex] = useState(0);

  const active = images[index] || resolveProductImageUrl(mainImage) || fallbackSvg;
  const hasMany = images.length > 1;

  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setIndex((i) => (i + 1) % images.length);

  return (
    <div className="product-image-carousel bg-transparent rounded-lg overflow-hidden">
      <div className="product-image-carousel__stage relative aspect-square w-full bg-transparent flex items-center justify-center">
        <img
          src={active}
          alt={alt}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />

        {hasMany && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow transition-colors"
              aria-label="Image précédente"
            >
              <ChevronLeft className="h-5 w-5 text-gray-800" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow transition-colors"
              aria-label="Image suivante"
            >
              <ChevronRight className="h-5 w-5 text-gray-800" />
            </button>
          </>
        )}
      </div>

      {hasMany && (
        <div className="p-3 bg-transparent">
          <div className="flex gap-2 overflow-x-auto">
            {images.map((url, i) => (
              <button
                key={`${url}:${i}`}
                type="button"
                onClick={() => setIndex(i)}
                className={`shrink-0 rounded-lg overflow-hidden border-2 transition-colors bg-transparent ${
                  i === index ? "border-primary" : "border-transparent"
                }`}
                aria-label={`Voir image ${i + 1}`}
              >
                <img src={url} alt="" className="h-16 w-16 object-cover bg-transparent" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductImageCarousel;
