import { createContext, useContext, useMemo, useState } from "react";

const BrandsamaCatalogContext = createContext(null);

export function BrandsamaCatalogProvider({ children }) {
  const [searchQuery, setSearchQuery] = useState("");

  const value = useMemo(
    () => ({
      searchQuery,
      setSearchQuery,
    }),
    [searchQuery],
  );

  return (
    <BrandsamaCatalogContext.Provider value={value}>{children}</BrandsamaCatalogContext.Provider>
  );
}

export function useBrandsamaCatalog() {
  const ctx = useContext(BrandsamaCatalogContext);
  if (!ctx) {
    throw new Error("useBrandsamaCatalog must be used within BrandsamaCatalogProvider");
  }
  return ctx;
}
