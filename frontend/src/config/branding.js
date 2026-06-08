/**
 * Identité de la boutique / plateforme (surcharge via variables VITE_BRAND_* dans .env).
 */
export const BRAND_NAME = (import.meta.env.VITE_BRAND_NAME ?? "STORE").trim();

export const BRAND_LOGO_SRC = (import.meta.env.VITE_BRAND_LOGO ?? "/logo-store.svg").trim();

/** Nom court (PWA, notifications) */
export const BRAND_SHORT_NAME = (import.meta.env.VITE_BRAND_SHORT_NAME ?? "STORE").trim();
