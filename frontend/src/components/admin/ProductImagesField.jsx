import { useEffect, useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Upload, Trash2, Link as LinkIcon } from "lucide-react";

const MAX_SECONDARY = 5;
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/jpg"]);

function validateImageFile(file) {
  if (!file) return { ok: false, reason: "Fichier manquant" };
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, reason: "Formats autorisés: JPG, PNG" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, reason: "Taille max: 2MB" };
  }
  return { ok: true };
}

/**
 * Champ images produit:
 * - Image principale: URL OU fichier (drag&drop)
 * - Images secondaires: fichiers multiples (drag&drop), previews, suppression (max 5)
 *
 * Contrat:
 * - value.mainImageFile: File | null
 * - value.mainImageUrl: string
 * - value.existingMainImageUrl: string | null (mode édition)
 * - value.existingSecondaryImages: string[] (URLs conservées)
 * - value.secondaryImageFiles: File[] (nouveaux fichiers)
 */
const ProductImagesField = ({ value, onChange, disabled = false }) => {
  const mainInputRef = useRef(null);
  const secondaryInputRef = useRef(null);

  const [dragMain, setDragMain] = useState(false);
  const [dragSecondary, setDragSecondary] = useState(false);

  const mainPreviewUrl = useMemo(() => {
    if (value.mainImageFile) return URL.createObjectURL(value.mainImageFile);
    if (value.mainImageUrl) return value.mainImageUrl;
    return value.existingMainImageUrl || "";
  }, [value.mainImageFile, value.mainImageUrl, value.existingMainImageUrl]);

  useEffect(() => {
    if (!value.mainImageFile) return;
    const url = URL.createObjectURL(value.mainImageFile);
    return () => URL.revokeObjectURL(url);
  }, [value.mainImageFile]);

  const secondaryPreviews = useMemo(() => {
    const existing = (value.existingSecondaryImages || []).map((url) => ({
      key: `existing:${url}`,
      url,
      kind: "existing",
    }));
    const news = (value.secondaryImageFiles || []).map((file, idx) => ({
      key: `new:${idx}:${file.name}:${file.size}`,
      url: URL.createObjectURL(file),
      kind: "new",
      file,
    }));
    return [...existing, ...news];
  }, [value.existingSecondaryImages, value.secondaryImageFiles]);

  useEffect(() => {
    const newOnes = secondaryPreviews.filter((p) => p.kind === "new");
    return () => newOnes.forEach((p) => URL.revokeObjectURL(p.url));
  }, [secondaryPreviews]);

  const update = (patch) => onChange({ ...value, ...patch });

  const pickMain = (file) => {
    const v = validateImageFile(file);
    if (!v.ok) return v;
    update({ mainImageFile: file, mainImageUrl: "" });
    return { ok: true };
  };

  const addSecondary = (files) => {
    const currentCount =
      (value.existingSecondaryImages?.length || 0) + (value.secondaryImageFiles?.length || 0);
    const remaining = Math.max(0, MAX_SECONDARY - currentCount);
    const next = [];

    for (const f of files) {
      if (next.length >= remaining) break;
      const v = validateImageFile(f);
      if (v.ok) next.push(f);
    }

    if (next.length === 0) {
      return {
        ok: false,
        reason:
          currentCount >= MAX_SECONDARY
            ? `Maximum ${MAX_SECONDARY} images secondaires`
            : "Aucune image valide (JPG/PNG, 2MB max)",
      };
    }

    update({ secondaryImageFiles: [...(value.secondaryImageFiles || []), ...next] });
    return { ok: true };
  };

  const onMainDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragMain(false);
    if (disabled) return;

    const file = e.dataTransfer?.files?.[0];
    const res = pickMain(file);
    if (!res.ok) {
      // laisser le parent afficher une toast si besoin
    }
  };

  const onSecondaryDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragSecondary(false);
    if (disabled) return;

    const files = Array.from(e.dataTransfer?.files || []);
    addSecondary(files);
  };

  const removeExistingSecondary = (url) => {
    update({
      existingSecondaryImages: (value.existingSecondaryImages || []).filter((u) => u !== url),
    });
  };

  const removeNewSecondaryAt = (indexInNew) => {
    const next = [...(value.secondaryImageFiles || [])];
    next.splice(indexInNew, 1);
    update({ secondaryImageFiles: next });
  };

  const secondaryNewStartIndex = (value.existingSecondaryImages || []).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
            Image principale (obligatoire)
          </label>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              URL (optionnel)
            </p>
            <input
              type="url"
              name="mainImageUrl"
              disabled={disabled}
              placeholder="https://exemple.com/image.jpg"
              value={value.mainImageUrl || ""}
              onChange={(e) =>
                update({
                  mainImageUrl: e.target.value,
                  mainImageFile: null,
                })
              }
              className="w-full px-4 py-3 border border-gray-200 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-[#1c191a] dark:text-white shadow-sm"
            />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Collez l’URL directe de l’image (finissant par .jpg, .png…). Les liens « proxy »
              (Startpage, aperçu Google) sont convertis automatiquement quand c’est possible.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Ou fichier (JPG/PNG, 2MB max)
            </p>

            <div
              role="button"
              tabIndex={0}
              onClick={() => !disabled && mainInputRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault();
                if (!disabled) setDragMain(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragMain(false);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }}
              onDrop={onMainDrop}
              className={`w-full rounded-2xl border-2 border-dashed p-4 transition-colors ${
                dragMain
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 dark:border-white/15 bg-white dark:bg-[#1c191a]"
              } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ImageIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-700 dark:text-gray-200">
                    Glisser-déposer une image
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    ou cliquer pour sélectionner
                  </div>
                </div>
              </div>

              <input
                ref={mainInputRef}
                type="file"
                accept="image/jpeg,image/png"
                disabled={disabled}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (!file) return;
                  pickMain(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
            Prévisualisation (image principale)
          </label>
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#1c191a] overflow-hidden">
            <div className="aspect-square w-full flex items-center justify-center">
              {mainPreviewUrl ? (
                <img src={mainPreviewUrl} alt="Preview" className="w-full h-full object-contain" />
              ) : (
                <div className="text-sm text-gray-400 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Aucune image
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
            Images secondaires (max {MAX_SECONDARY})
          </label>
          <button
            type="button"
            disabled={disabled}
            onClick={() => secondaryInputRef.current?.click()}
            className="px-3 py-2 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/15 transition-colors disabled:opacity-60"
          >
            Ajouter
          </button>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => !disabled && secondaryInputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            if (!disabled) setDragSecondary(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragSecondary(false);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDrop={onSecondaryDrop}
          className={`w-full rounded-2xl border-2 border-dashed p-4 transition-colors ${
            dragSecondary
              ? "border-primary bg-primary/5"
              : "border-gray-200 dark:border-white/15 bg-white dark:bg-[#1c191a]"
          } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Glisser-déposer des images secondaires
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            JPG/PNG, 2MB max. Limite: {MAX_SECONDARY}.
          </div>

          <input
            ref={secondaryInputRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            disabled={disabled}
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length === 0) return;
              addSecondary(files);
              e.target.value = "";
            }}
          />
        </div>

        {secondaryPreviews.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {secondaryPreviews.map((p, idx) => {
              const isExisting = p.kind === "existing";
              const newIndex = idx - secondaryNewStartIndex;
              return (
                <div
                  key={p.key}
                  className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#1c191a]"
                >
                  <div className="aspect-square w-full">
                    <img src={p.url} alt="secondary" className="w-full h-full object-cover" />
                  </div>

                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => (isExisting ? removeExistingSecondary(p.url) : removeNewSecondaryAt(newIndex))}
                      className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductImagesField;

