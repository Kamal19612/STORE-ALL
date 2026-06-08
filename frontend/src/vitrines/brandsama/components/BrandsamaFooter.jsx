import { useStorefrontBranding } from "../../../context/StorefrontBrandingContext";

export default function BrandsamaFooter() {
  const { displayName } = useStorefrontBranding();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--bs-border)] bg-[var(--bs-bg)] mt-auto">
      <div
        className="mx-auto px-4 py-8 text-center text-sm text-[var(--bs-text-muted)]"
        style={{ maxWidth: "var(--bs-max-width)" }}
      >
        <p>
          © {year} {displayName || "Boutique"} — Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
