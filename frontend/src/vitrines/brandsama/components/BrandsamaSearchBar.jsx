import { Search } from "lucide-react";

export default function BrandsamaSearchBar({ value, onChange, inputRef, className = "", id = "bs-catalog-search" }) {
  return (
    <div className={`relative ${className}`}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--bs-text-muted)] pointer-events-none"
        aria-hidden
      />
      <input
        id={id}
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Rechercher un produit…"
        className="bs-search-input w-full"
        aria-label="Rechercher dans le catalogue"
        autoComplete="off"
      />
    </div>
  );
}
