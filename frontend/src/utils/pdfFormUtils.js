import api from "../services/api";
import { reloadIfStaleModuleError } from "./reloadOnStaleModule";

let pdfLibModulePromise = null;

async function loadPdfLib() {
  if (!pdfLibModulePromise) {
    pdfLibModulePromise = import("pdf-lib").catch((err) => {
      pdfLibModulePromise = null;
      if (reloadIfStaleModuleError(err)) {
        return new Promise(() => {});
      }
      throw err;
    });
  }
  return pdfLibModulePromise;
}

function humanizeFieldName(name) {
  return String(name || "")
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function fieldKind(field) {
  const type = field?.constructor?.name || "";
  if (type.includes("CheckBox")) return "checkbox";
  if (type.includes("Dropdown") || type.includes("OptionList") || type.includes("Radio")) {
    return "select";
  }
  return "text";
}

function safeFieldId(name, index) {
  const base = String(name || `field-${index}`)
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `pdf-field-${base || index}`;
}

/**
 * Normalise la réponse axios (ArrayBuffer, Uint8Array, etc.).
 */
export function normalizePdfBuffer(data) {
  if (data == null) {
    throw new Error("Réponse PDF vide.");
  }
  if (data instanceof ArrayBuffer) {
    return data;
  }
  if (ArrayBuffer.isView(data)) {
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }
  if (data instanceof Blob) {
    throw new Error("Réponse PDF inattendue (Blob). Réessayez.");
  }
  if (typeof data === "string") {
    throw new Error("Impossible de charger le PDF modèle (réponse invalide).");
  }
  throw new Error("Format de PDF non reconnu.");
}

/**
 * Télécharge le PDF modèle d'un produit (array buffer).
 */
export async function fetchProductPdfTemplate(slug) {
  if (!slug) {
    throw new Error("Produit invalide (slug manquant).");
  }
  const response = await api.get(`/products/${encodeURIComponent(slug)}/pdf-template`, {
    responseType: "arraybuffer",
  });
  return normalizePdfBuffer(response.data);
}

/**
 * Extrait les champs AcroForm d'un PDF.
 */
export async function extractPdfFormFields(arrayBuffer) {
  const { PDFDocument } = await loadPdfLib();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  if (!fields.length) {
    throw new Error("Ce PDF ne contient aucun champ de formulaire.");
  }

  const extracted = [];
  fields.forEach((field, index) => {
    try {
      const name = field.getName();
      if (!name) return;
      const kind = fieldKind(field);
      let options = [];
      if (kind === "select" && typeof field.getOptions === "function") {
        try {
          options = field.getOptions().map((opt) => String(opt));
        } catch {
          options = [];
        }
      }
      extracted.push({
        name,
        kind,
        label: humanizeFieldName(name),
        options,
        fieldId: safeFieldId(name, index),
      });
    } catch {
      // Champ PDF non lisible — ignoré
    }
  });

  if (!extracted.length) {
    throw new Error("Aucun champ de formulaire exploitable dans ce PDF.");
  }

  return extracted;
}

/**
 * Remplit le PDF modèle et retourne un Blob.
 */
export async function fillPdfTemplate(arrayBuffer, fieldValues) {
  const { PDFCheckBox, PDFDocument, PDFDropdown, PDFOptionList, PDFTextField } =
    await loadPdfLib();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const form = pdfDoc.getForm();

  for (const [name, value] of Object.entries(fieldValues)) {
    let field;
    try {
      field = form.getField(name);
    } catch {
      continue;
    }

    const type = field?.constructor?.name || "";
    if (field instanceof PDFTextField || type.includes("TextField")) {
      field.setText(value == null ? "" : String(value));
    } else if (field instanceof PDFCheckBox || type.includes("CheckBox")) {
      if (value === true || value === "true" || value === "1" || value === "on") {
        field.check();
      } else {
        field.uncheck();
      }
    } else if (
      field instanceof PDFDropdown ||
      field instanceof PDFOptionList ||
      type.includes("Dropdown") ||
      type.includes("OptionList")
    ) {
      if (value != null && String(value).length > 0) {
        field.select(String(value));
      }
    }
  }

  try {
    form.flatten();
  } catch {
    // Certains PDF refusent flatten.
  }

  const bytes = await pdfDoc.save();
  return new Blob([bytes], { type: "application/pdf" });
}

export function validatePdfFieldValues(fields, values) {
  const missing = fields
    .filter((f) => f.kind !== "checkbox")
    .filter((f) => {
      const v = values[f.name];
      return v == null || String(v).trim() === "";
    })
    .map((f) => f.label);

  if (missing.length > 0) {
    throw new Error(`Champs obligatoires : ${missing.join(", ")}`);
  }
}
