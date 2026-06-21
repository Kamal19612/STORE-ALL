import { useId, useRef } from "react";
import { FileText, Trash2, Upload } from "lucide-react";

const MAX_PDF_BYTES = 5 * 1024 * 1024;

function isPdfFile(file) {
  if (!file) return false;
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return type === "application/pdf" || type === "application/x-pdf" || name.endsWith(".pdf");
}

/**
 * Upload optionnel d'un PDF modèle AcroForm pour produits personnalisables.
 */
const ProductPdfTemplateField = ({
  disabled = false,
  templatePdfFile,
  existingTemplateName,
  requiresPdfForm,
  removeTemplatePdf,
  onChange,
}) => {
  const inputRef = useRef(null);
  const inputId = useId();

  const handlePickClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleFileChange = (e) => {
    e.stopPropagation();
    const file = e.target.files?.[0] || null;

    if (!file) {
      onChange({ templatePdfFile: null });
      return;
    }

    if (file.size > MAX_PDF_BYTES) {
      e.target.value = "";
      onChange({ templatePdfFile: null, error: "PDF trop volumineux (max 5 Mo)." });
      return;
    }

    if (!isPdfFile(file)) {
      e.target.value = "";
      onChange({ templatePdfFile: null, error: "Seuls les fichiers PDF sont acceptés." });
      return;
    }

    onChange({
      templatePdfFile: file,
      removeTemplatePdf: false,
      error: null,
    });
  };

  const handleRemove = () => {
    if (inputRef.current) inputRef.current.value = "";
    onChange({
      templatePdfFile: null,
      removeTemplatePdf: true,
      error: null,
    });
  };

  const showExisting = existingTemplateName && !removeTemplatePdf && !templatePdfFile;
  const selectedName = templatePdfFile?.name;

  return (
    <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-white/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
            PDF personnalisable (optionnel)
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Le PDF doit contenir des champs de formulaire (AcroForm). Le client le remplira avant
            d&apos;ajouter le produit au panier.
          </p>
        </div>
        <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
      </div>

      {showExisting && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#1c191a]/50">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
              {existingTemplateName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Modèle actuel</p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={handleRemove}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Retirer
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept=".pdf,application/pdf"
        disabled={disabled}
        onChange={handleFileChange}
        className="sr-only"
        tabIndex={-1}
      />

      <div
        className={`flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed transition-colors ${
          disabled
            ? "opacity-50 border-gray-200 dark:border-white/10"
            : "border-gray-200 dark:border-white/15"
        }`}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={handlePickClick}
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-primary disabled:cursor-not-allowed"
        >
          <Upload className="h-4 w-4 text-primary shrink-0" />
          {selectedName ? "Remplacer le PDF" : "Choisir un PDF modèle"}
        </button>
        {selectedName ? (
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-full">
            {selectedName}
            {templatePdfFile?.size
              ? ` (${(templatePdfFile.size / 1024).toFixed(0)} Ko)`
              : ""}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id={`${inputId}-requires`}
          name="requiresPdfForm"
          checked={Boolean(requiresPdfForm)}
          disabled={disabled || (!showExisting && !templatePdfFile)}
          onChange={(e) => onChange({ requiresPdfForm: e.target.checked })}
          className="w-5 h-5 text-primary border-gray-300 dark:border-gray-600 rounded focus:ring-primary bg-white dark:bg-[#1c191a]"
        />
        <label
          htmlFor={`${inputId}-requires`}
          className="text-sm font-bold text-gray-700 dark:text-gray-300 select-none cursor-pointer"
        >
          Exiger le remplissage du PDF avant ajout au panier
        </label>
      </div>
    </div>
  );
};

export default ProductPdfTemplateField;
