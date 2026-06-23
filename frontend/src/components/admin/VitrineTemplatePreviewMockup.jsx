/**
 * Maquette statique du rendu vitrine (aperçu admin, pas la vraie page).
 */
export function DefaultVitrineMockup({ storeName, logoUrl, primaryColor, secondaryColor }) {
  const primary = primaryColor && /^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : "#f5ad41";
  const secondary = secondaryColor && /^#[0-9A-Fa-f]{6}$/.test(secondaryColor) ? secondaryColor : "#242021";
  return (
    <div className="h-full flex flex-col bg-gray-100 text-[10px] leading-tight">
      <header
        className="flex items-center justify-between px-3 py-2 text-white shrink-0"
        style={{ backgroundColor: secondary }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-5 max-w-[72px] object-contain" />
          ) : (
            <span className="font-bold truncate">{storeName || "Boutique"}</span>
          )}
        </div>
        <span className="shrink-0 rounded-md px-2 py-0.5 font-bold" style={{ backgroundColor: primary, color: secondary }}>
          🛒 2
        </span>
      </header>
      <div className="flex-1 p-2 space-y-2 overflow-hidden">
        <div
          className="h-8 rounded-lg border"
          style={{
            background: `linear-gradient(to right, ${primary}66, ${secondary}33)`,
            borderColor: `${primary}4d`,
          }}
        />
        <div className="grid grid-cols-2 gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200/80">
              <div className="aspect-[4/3] bg-gray-200" />
              <div className="p-1.5">
                <div className="h-1.5 w-8 rounded mb-1" style={{ backgroundColor: `${primary}4d` }} />
                <div className="h-2 w-full bg-gray-300 rounded mb-1" />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[9px]" style={{ color: primary }}>
                    12 000 F
                  </span>
                  <span
                    className="rounded-md px-1 py-0.5 text-[8px] font-bold"
                    style={{ backgroundColor: primary, color: secondary }}
                  >
                    +
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AlibabaVitrineMockup({ storeName, logoUrl, heroTitle, heroSubtitle, accentColor }) {
  const brand = accentColor && /^#[0-9A-Fa-f]{6}$/.test(accentColor) ? accentColor : "#FF6600";
  return (
    <div
      className="h-full flex flex-col bg-white text-[10px] leading-tight"
      style={{ "--preview-brand": brand }}
    >
      <header className="flex items-center justify-between px-3 py-2 border-b border-[#E5E7EB] shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-5 max-w-[72px] object-contain" />
          ) : (
            <span className="font-semibold text-black truncate">{storeName || "Boutique"}</span>
          )}
        </div>
        <span
          className="shrink-0 rounded-full text-white px-2 py-0.5 font-semibold text-[9px]"
          style={{ background: brand }}
        >
          🛒
        </span>
      </header>
      <div className="bg-[#F4F4F4] px-2 py-2 border-b border-[#E5E7EB] shrink-0">
        <p className="font-semibold text-[#333] text-[11px] line-clamp-1">{heroTitle || storeName || "Boutique"}</p>
        <p className="text-[#767676] text-[9px] line-clamp-1 mt-0.5">{heroSubtitle || "Catalogue professionnel"}</p>
        <div
          className="mt-1.5 h-5 rounded-full border-2 bg-white flex items-center px-2 text-[#767676]"
          style={{ borderColor: brand }}
        >
          🔍 Rechercher…
        </div>
      </div>
      <div className="px-2 py-1 shrink-0 border-b border-[#E5E7EB] flex gap-1 overflow-hidden">
        <span className="px-2 py-0.5 shrink-0 text-[9px] font-medium border border-[#E5E7EB] rounded" style={{ color: brand, background: "#fff" }}>
          Tous
        </span>
        <span className="px-2 py-0.5 shrink-0 text-[#767676] text-[9px] border border-[#E5E7EB] rounded bg-[#F4F4F4]">Cat. A</span>
        <span className="px-2 py-0.5 shrink-0 text-[#767676] text-[9px] border border-[#E5E7EB] rounded bg-[#F4F4F4]">Cat. B</span>
      </div>
      <p className="px-2 pt-1.5 text-[9px] font-semibold text-[#333] shrink-0">Produits phares</p>
      <div className="px-2 pb-1 flex gap-1 shrink-0 overflow-hidden">
        {[1, 2, 3].map((i) => (
          <div key={i} className="shrink-0 w-14 h-10 border border-[#E5E7EB] bg-[#F4F4F4]" />
        ))}
      </div>
      <div className="flex-1 px-2 pb-2 pt-1 grid grid-cols-3 gap-1 overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="border border-[#E5E7EB] bg-white flex flex-col">
            <div className="aspect-square bg-[#F4F4F4]" />
            <div className="p-1 flex-1 flex flex-col justify-between">
              <div className="h-1.5 w-full bg-gray-200 mb-0.5" />
              <div className="flex justify-between items-center gap-0.5">
                <span className="font-semibold text-[8px]" style={{ color: brand }}>
                  8k F
                </span>
                <span
                  className="rounded-full w-3 h-3 flex items-center justify-center text-white text-[7px]"
                  style={{ background: brand }}
                >
                  +
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BrandsamaVitrineMockup({
  storeName,
  logoUrl,
  heroTitle,
  heroSubtitle,
  primaryColor,
  heroCyan,
}) {
  const primary = primaryColor && /^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : "#5861F2";
  const cyan = heroCyan && /^#[0-9A-Fa-f]{6}$/.test(heroCyan) ? heroCyan : "#1DD8D8";
  return (
    <div className="h-full flex flex-col bg-white text-[10px] leading-tight">
      <header className="flex items-center gap-2 px-3 py-2 border-b border-[#E6E6E6] shrink-0">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="h-5 max-w-[64px] object-contain" />
        ) : (
          <span className="font-bold truncate">{storeName || "Boutique"}</span>
        )}
        <div className="hidden sm:block flex-1 h-4 rounded border border-[#E6E6E6] bg-[#F8F8F8]" />
        <span className="shrink-0 rounded px-2 py-0.5 text-white text-[9px] font-semibold" style={{ background: primary }}>
          🛒
        </span>
      </header>
      <div
        className="shrink-0 px-2 py-3 text-white"
        style={{ background: `linear-gradient(135deg, ${cyan}bb, ${primary}88)` }}
      >
        <p className="font-bold text-[11px] line-clamp-1">{heroTitle || storeName || "Boutique"}</p>
        <p className="text-[9px] opacity-90 line-clamp-1 mt-0.5">{heroSubtitle || "Catalogue moderne"}</p>
      </div>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="hidden sm:block w-[52px] shrink-0 border-r border-[#E6E6E6] p-1 space-y-0.5">
          <div className="h-3 rounded bg-[#F0F2FF] w-full" style={{ borderLeft: `2px solid ${primary}` }} />
          <div className="h-3 rounded bg-[#F8F8F8] w-full" />
          <div className="h-3 rounded bg-[#F8F8F8] w-full" />
        </div>
        <div className="flex-1 p-1.5 grid grid-cols-2 gap-1 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border border-[#E6E6E6] rounded p-1 bg-white shadow-sm">
              <div className="aspect-[3/4] bg-[#F8F8F8] rounded-sm" />
              <div className="h-1.5 w-full bg-gray-200 mt-1 rounded" />
              <p className="font-bold text-[8px] mt-0.5" style={{ color: primary }}>
                12k F
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function UnavailableVitrineMockup({ label }) {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gray-100 text-gray-500 p-4 text-center">
      <p className="text-xs font-medium">{label}</p>
      <p className="text-[10px] mt-1 opacity-80">Modèle à venir</p>
    </div>
  );
}
