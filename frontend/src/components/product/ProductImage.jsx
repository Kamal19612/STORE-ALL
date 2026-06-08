import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { getProductMainImageSrc } from "../../utils/productMedia";

/**
 * Image produit avec URL normalisée et repli si chargement impossible.
 */
export default function ProductImage({
  product,
  src,
  alt = "",
  className = "",
  wrapperClassName = "",
  showPlaceholder = true,
  loading = "lazy",
  decoding = "async",
}) {
  const resolved = src != null ? src : getProductMainImageSrc(product);
  const [activeSrc, setActiveSrc] = useState(resolved);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setActiveSrc(resolved);
    setFailed(false);
  }, [resolved]);

  if (!activeSrc || failed) {
    if (!showPlaceholder) return null;
    return (
      <div
        className={`flex items-center justify-center bg-[var(--ali-surface,#f3f4f6)] text-[var(--ali-text-muted,#9ca3af)] ${wrapperClassName}`}
        aria-hidden={!alt}
      >
        <ImageOff className="h-8 w-8 opacity-60" />
      </div>
    );
  }

  return (
    <img
      src={activeSrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
