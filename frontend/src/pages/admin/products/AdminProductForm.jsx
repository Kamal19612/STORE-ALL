import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "react-toastify";
import adminProductService from "../../../services/adminProductService";
import productService from "../../../services/productService";
import ProductImagesField from "../../../components/admin/ProductImagesField";
import ProductPdfTemplateField from "../../../components/admin/ProductPdfTemplateField";
import useAuthStore from "../../../store/authStore";
import { useStaffBasePath } from "../../../hooks/useStaffBasePath";

const AdminProductForm = () => {
  const staffBase = useStaffBasePath();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const managerStoreId = location.state?.managerStoreId ?? user?.storeId;
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  // État du formulaire
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    categoryId: "",
    categoryName: "", // Ajout pour l'input libre
    price: "",
    oldPrice: "",
    stock: 0,
    shortDescription: "",
    description: "",
    imageUrl: "", // Pour l'URL directe (ex: Google Drive/Sheet)
    active: true,
    purchaseAllowed: true,
    requiresPdfForm: false,
    removeTemplatePdf: false,
  });

  const [mainImageFile, setMainImageFile] = useState(null);
  const [existingMainImageUrl, setExistingMainImageUrl] = useState(null);
  const [secondaryImageFiles, setSecondaryImageFiles] = useState([]);
  const [existingSecondaryImages, setExistingSecondaryImages] = useState([]);
  const [templatePdfFile, setTemplatePdfFile] = useState(null);
  const [existingTemplateName, setExistingTemplateName] = useState(null);
  const [removeTemplatePdf, setRemoveTemplatePdf] = useState(false);

  useEffect(() => {
    // Charger les catégories pour le select
    const loadCategories = async () => {
      try {
        const data = await productService.getCategories();
        setCategories(data);
      } catch (error) {
        toast.error("Erreur chargement catégories");
      }
    };

    loadCategories();
  }, []);

  // Charger le produit en édition (indépendamment des catégories : la liste peut être vide)
  useEffect(() => {
    if (!isEditMode || !id) return;

    adminProductService
      .getProductById(id, managerStoreId)
      .then((product) => {
        const priceStr =
          product.price != null && product.price !== ""
            ? String(product.price).replace(",", ".")
            : "";
        const oldPriceStr =
          product.oldPrice != null && product.oldPrice !== ""
            ? String(product.oldPrice).replace(",", ".")
            : "";
        setFormData({
          name: product.name ?? "",
          slug: product.slug ?? "",
          categoryId: product.categoryId ?? "",
          categoryName: product.categoryName ?? "",
          price: priceStr,
          oldPrice: oldPriceStr,
          stock: product.stock ?? 0,
          shortDescription: product.shortDescription ?? "",
          description: product.description ?? "",
          imageUrl: "",
          active: Boolean(product.active),
          purchaseAllowed: product.purchaseAllowed !== false,
          requiresPdfForm: Boolean(product.requiresPdfForm),
          removeTemplatePdf: false,
        });
        setExistingMainImageUrl(product.mainImage || null);
        setExistingTemplateName(product.templatePdfName || null);
        setTemplatePdfFile(null);
        setRemoveTemplatePdf(false);
        const secondaries = Array.isArray(product.secondaryImages)
          ? product.secondaryImages
          : [];
        setExistingSecondaryImages(secondaries);
        setMainImageFile(null);
        setSecondaryImageFiles([]);
      })
      .catch((e) => {
        console.error(e);
        toast.error("Erreur chargement produit");
      });
  }, [isEditMode, id, managerStoreId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Conversion automatique des liens Google Drive
    if (name === "imageUrl") {
      let cleanUrl = value;
      // Regex pour capturer l'ID d'un lien Google Drive standard
      const driveRegex = /https:\/\/drive\.google\.com\/file\/d\/([^/]+)/;
      const match = value.match(driveRegex);

      if (match && match[1]) {
        // Convertir en lien visualisable direct
        cleanUrl = `https://drive.google.com/uc?export=view&id=${match[1]}`;
      }

      setFormData((prev) => ({ ...prev, [name]: cleanUrl }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }

    // Génération automatique du slug depuis le nom
    if (name === "name" && !isEditMode) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      setFormData((prev) => ({ ...prev, slug }));
    }
  };

  const calculateStock = (val) => {
    // Helper si besoin
    return val;
  };

  const handlePdfTemplateChange = useCallback((next) => {
    if (next.error) {
      toast.error(next.error);
      return;
    }
    if (next.templatePdfFile !== undefined) {
      setTemplatePdfFile(next.templatePdfFile);
      if (next.templatePdfFile) {
        setRemoveTemplatePdf(false);
        setFormData((prev) => ({ ...prev, removeTemplatePdf: false }));
      }
    }
    if (next.removeTemplatePdf) {
      setTemplatePdfFile(null);
      setExistingTemplateName(null);
      setRemoveTemplatePdf(true);
      setFormData((prev) => ({ ...prev, removeTemplatePdf: true }));
      return;
    }
    if (next.removeTemplatePdf === false) {
      setRemoveTemplatePdf(false);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const hasMainImage =
        !!mainImageFile ||
        !!formData.imageUrl ||
        (!!existingMainImageUrl && isEditMode);

      if (!hasMainImage) {
        toast.error("Image principale obligatoire (URL ou fichier).");
        return;
      }

      const payload = {
        ...formData,
        stock: parseInt(formData.stock),
        price: parseFloat(formData.price),
        oldPrice: formData.oldPrice ? parseFloat(formData.oldPrice) : null,
        categoryName: formData.categoryName,
        categoryId: null, // On laisse le backend résoudre via le nom
        mainImageFile,
        secondaryImageFiles,
        templatePdfFile,
        removeTemplatePdf,
        secondaryImages: existingSecondaryImages, // URLs conservées (suppression/ré-ordre côté UI)
      };

      if (isEditMode) {
        await adminProductService.updateProduct(id, payload, managerStoreId);
        toast.success("Produit modifié avec succès");
      } else {
        await adminProductService.createProduct(payload, managerStoreId);
        toast.success("Produit créé avec succès");
      }
      navigate(`${staffBase}/products`);
    } catch (error) {
      console.error(error);
      const serverMsg = error?.response?.data?.message;
      toast.error(serverMsg || "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6">
      <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-8">
        <Link
          to={`${staffBase}/products`}
          className="p-2 bg-white dark:bg-[#242021] rounded-full border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            {isEditMode ? "Modifier le Produit" : "Nouveau Produit"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Remplissez les informations ci-dessous
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-8 pb-24">
        <div className="bg-white dark:bg-[#242021] p-4 sm:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 space-y-6 transition-colors">
          {/* Informations de base */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Nom du produit
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-[#1c191a] dark:text-white shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Slug (URL)
              </label>
              <input
                type="text"
                name="slug"
                required
                value={formData.slug}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 dark:border-white/20 rounded-xl bg-gray-50 dark:bg-[#1c191a]/50 text-gray-500 dark:text-gray-400 focus:bg-white dark:focus:bg-[#1c191a] focus:ring-2 focus:ring-primary outline-none shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Catégorie (Sélectionner ou Créer)
              </label>
              <input
                list="categories-list"
                name="categoryName"
                required
                value={formData.categoryName}
                onChange={handleChange}
                placeholder="Ex: APHRODISIAQUE, SEXTOY..."
                className="w-full px-4 py-3 border border-gray-200 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-[#1c191a] dark:text-white shadow-sm"
                autoComplete="off"
              />
              <datalist id="categories-list">
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Stock
              </label>
              <input
                type="number"
                name="stock"
                required
                min="0"
                value={formData.stock}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-[#1c191a] dark:text-white shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Prix (FCFA)
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="price"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-[#1c191a] dark:text-white shadow-sm"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">
                  FCFA
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Ancien Prix (Optionnel)
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="oldPrice"
                  min="0"
                  step="0.01"
                  value={formData.oldPrice}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-[#1c191a] dark:text-white shadow-sm"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">
                  FCFA
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Description courte
            </label>
            <textarea
              name="shortDescription"
              rows="2"
              value={formData.shortDescription}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-[#1c191a] dark:text-white shadow-sm"
            />
          </div>

          {/* Image */}
          <div>
            <ProductImagesField
              disabled={loading}
              value={{
                mainImageFile,
                mainImageUrl: formData.imageUrl,
                existingMainImageUrl,
                existingSecondaryImages,
                secondaryImageFiles,
              }}
              onChange={(next) => {
                setMainImageFile(next.mainImageFile || null);
                setExistingMainImageUrl(next.existingMainImageUrl || null);
                setSecondaryImageFiles(next.secondaryImageFiles || []);
                setExistingSecondaryImages(next.existingSecondaryImages || []);
                setFormData((prev) => ({ ...prev, imageUrl: next.mainImageUrl || "" }));
              }}
            />
          </div>

          <ProductPdfTemplateField
            disabled={loading}
            templatePdfFile={templatePdfFile}
            existingTemplateName={existingTemplateName}
            removeTemplatePdf={removeTemplatePdf}
            onChange={handlePdfTemplateChange}
          />

          {/* Checkbox Actif */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-white/10">
            <input
              type="checkbox"
              id="active"
              name="active"
              checked={formData.active}
              onChange={handleChange}
              className="w-5 h-5 text-primary border-gray-300 dark:border-gray-600 rounded focus:ring-primary bg-white dark:bg-[#1c191a]"
            />
            <label
              htmlFor="active"
              className="text-sm font-bold text-gray-700 dark:text-gray-300 select-none cursor-pointer"
            >
              Produit Actif (Visible sur la boutique) ?
            </label>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="purchaseAllowed"
              name="purchaseAllowed"
              checked={formData.purchaseAllowed}
              onChange={handleChange}
              className="w-5 h-5 text-primary border-gray-300 dark:border-gray-600 rounded focus:ring-primary bg-white dark:bg-[#1c191a]"
            />
            <label
              htmlFor="purchaseAllowed"
              className="text-sm font-bold text-gray-700 dark:text-gray-300 select-none cursor-pointer"
            >
              Autorisé à la vente (panier) — décocher pour bloquer l’achat sans retirer la fiche
            </label>
          </div>
        </div>

        {/* Boutons actions */}
        <div className="sticky bottom-0 z-20 -mx-3 sm:-mx-6 px-3 sm:px-6 py-3 bg-gray-50/95 dark:bg-[#1c191a]/90 backdrop-blur border-t border-gray-200/60 dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => navigate(`${staffBase}/products`)}
              className="px-6 py-3 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              )}
              <Save className="h-5 w-5" />
              {isEditMode ? "Enregistrer les modifications" : "Enregistrer"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminProductForm;
