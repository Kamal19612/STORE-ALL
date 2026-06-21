import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Loader2, X } from "lucide-react";
import { toast } from "react-toastify";

import useCartStore from "../../store/cartStore";
import usePdfFormModalStore from "../../store/pdfFormModalStore";
import {
  extractPdfFormFields,
  fetchProductPdfTemplate,
  fillPdfTemplate,
  validatePdfFieldValues,
} from "../../utils/pdfFormUtils";

const ProductPdfFormModal = () => {
  const product = usePdfFormModalStore((s) => s.product);
  const close = usePdfFormModalStore((s) => s.close);
  const addItem = useCartStore((s) => s.addItem);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [templateBuffer, setTemplateBuffer] = useState(null);
  const [error, setError] = useState(null);

  const productSlug = product?.slug;
  const productId = product?.id;

  useEffect(() => {
    if (!productSlug) return undefined;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let cancelled = false;
    setLoading(true);
    setError(null);
    setFields([]);
    setValues({});
    setTemplateBuffer(null);

    (async () => {
      try {
        const buffer = await fetchProductPdfTemplate(productSlug);
        if (cancelled) return;
        const extracted = await extractPdfFormFields(buffer);
        if (cancelled) return;
        const initial = {};
        extracted.forEach((field) => {
          initial[field.name] = field.kind === "checkbox" ? false : "";
        });
        setTemplateBuffer(buffer);
        setFields(extracted);
        setValues(initial);
      } catch (err) {
        if (!cancelled) {
          const msg =
            err?.response?.data?.message ||
            err?.message ||
            "Impossible de charger le formulaire PDF.";
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      document.body.style.overflow = prev;
    };
  }, [productSlug, productId]);

  if (!product) return null;

  const handleChange = (name, kind, raw) => {
    setValues((prev) => ({
      ...prev,
      [name]: kind === "checkbox" ? Boolean(raw) : raw,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!templateBuffer) return;

    try {
      validatePdfFieldValues(fields, values);
    } catch (err) {
      toast.error(err.message);
      return;
    }

    setSubmitting(true);
    try {
      const filledPdfBlob = await fillPdfTemplate(templateBuffer, values);
      addItem(product, { pdfFieldValues: values, filledPdfBlob });
      toast.success("✓ Produit personnalisé ajouté au panier");
      close();
    } catch (err) {
      toast.error(err?.message || "Erreur lors de la génération du PDF.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !submitting) close();
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/55 z-[400] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-form-modal-title"
    >
      <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-xl flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-primary mb-1">
              <FileText className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-xs font-bold uppercase tracking-wide">Formulaire produit</span>
            </div>
            <h2 id="pdf-form-modal-title" className="text-lg font-bold text-gray-900 leading-tight">
              {product.name}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Renseignez les informations demandées. Le document sera enregistré avec votre commande.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-sm">Chargement du formulaire…</p>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {!loading && !error
              ? fields.map((field, index) => (
                  <div key={`${field.name}-${index}`}>
                    {field.kind === "checkbox" ? (
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(values[field.name])}
                          onChange={(e) => handleChange(field.name, field.kind, e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-semibold text-gray-800">{field.label}</span>
                      </label>
                    ) : (
                      <>
                        <label
                          htmlFor={field.fieldId || `pdf-field-${index}`}
                          className="block text-sm font-bold text-gray-700 mb-1.5"
                        >
                          {field.label}
                        </label>
                        {field.kind === "select" && field.options?.length > 0 ? (
                          <select
                            id={field.fieldId || `pdf-field-${index}`}
                            value={values[field.name] ?? ""}
                            onChange={(e) => handleChange(field.name, field.kind, e.target.value)}
                            required
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                          >
                            <option value="">— Choisir —</option>
                            {field.options.map((opt) => (
                              <option key={`${field.name}-${opt}`} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id={field.fieldId || `pdf-field-${index}`}
                            type={
                              field.kind === "text" &&
                              /exemplaire|quantit|nombre|qty/i.test(field.name)
                                ? "number"
                                : "text"
                            }
                            min={0}
                            value={values[field.name] ?? ""}
                            onChange={(e) => handleChange(field.name, field.kind, e.target.value)}
                            required
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                          />
                        )}
                      </>
                    )}
                  </div>
                ))
              : null}
          </div>

          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 shrink-0 flex gap-3">
            <button
              type="button"
              onClick={close}
              disabled={submitting}
              className="flex-1 py-3 rounded-lg border border-gray-200 text-gray-700 font-bold text-sm hover:bg-white transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !!error || submitting}
              className="flex-1 py-3 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: "var(--primary)", color: "var(--secondary)" }}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Ajouter au panier
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default ProductPdfFormModal;
