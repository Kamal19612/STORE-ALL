import { Search } from "lucide-react";

export default function AlibabaSearchBar({
  value,
  onChange,
  inputRef,
  className = "",
  compact = false,
}) {
  return (
    <div className={`relative ${className}`}>
      <Search
        className={`absolute top-1/2 -translate-y-1/2 text-[var(--ali-text-muted)] pointer-events-none ${
          compact ? "left-3 h-4 w-4" : "left-4 h-5 w-5"
        }`}
        aria-hidden
      />
      <input
        id="ali-catalog-search"
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Rechercher un produit…"
        className={compact ? "ali-input-search ali-input-search--compact" : "ali-input-search"}
        aria-label="Rechercher dans le catalogue"
        autoComplete="off"
      />
    </div>
  );
}
