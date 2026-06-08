import { useState, useEffect } from "react";
import {
  Trash2,
  Upload,
  Plus,
  Save,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import sliderService from "../../../services/sliderService";
import { useScopedManagerStoreId } from "../../../hooks/useScopedManagerStoreId";

const AdminSlider = () => {
  const storeId = useScopedManagerStoreId();
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // State pour le nouveau slide
  const [newSlide, setNewSlide] = useState({
    title: "",
    description: "",
    displayOrder: 10,
    active: true,
    imageFile: null,
  });
  const [previewUrl, setPreviewUrl] = useState("");

  const fetchSlides = async () => {
    if (storeId == null) {
      setLoading(false);
      return;
    }
    try {
      const data = await sliderService.getAll(storeId);
      setSlides(Array.isArray(data) ? data : []);
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.message || "Erreur chargement carrousel";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId == null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchSlides();
  }, [storeId]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewSlide({ ...newSlide, imageFile: file });
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("title", newSlide.title);
      formData.append("description", newSlide.description || "");
      formData.append("displayOrder", newSlide.displayOrder);
      formData.append("active", newSlide.active);

      if (newSlide.imageUrl) {
        formData.append("imageUrl", newSlide.imageUrl);
      }

      if (newSlide.imageFile) {
        formData.append("image", newSlide.imageFile);
      }

      console.log("!!! FRONTEND DEBUG: Sending FormData !!!");
      for (let pair of formData.entries()) {
        if (pair[1] instanceof File) {
          console.log(`- ${pair[0]}: File(name=${pair[1].name}, size=${pair[1].size})`);
        } else {
          console.log(`- ${pair[0]}: ${pair[1]}`);
        }
      }

      await sliderService.create(formData, storeId);
      toast.success("Image ajoutée !");
      setIsAdding(false);
      setNewSlide({
        title: "",
        description: "",
        displayOrder: 10,
        active: true,
        imageFile: null,
      });
      setPreviewUrl("");
      fetchSlides();
    } catch (error) {
      console.error("Erreur détaillée:", error);
      const errorMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Erreur inconnue";
      toast.error("Erreur: " + errorMsg);
    }
  };

  const handleDelete = async (id) => {
    if (storeId == null) {
      toast.error("Boutique non identifiée. Reconnectez-vous.");
      return;
    }
    if (!window.confirm("Supprimer cette image ?")) return;

    setDeletingId(id);
    try {
      await sliderService.delete(id, storeId);
      setSlides((prev) => prev.filter((s) => s.id !== id));
      toast.success("Image supprimée");
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Erreur suppression";
      toast.error("Erreur: " + errorMsg);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActive = async (slide) => {
    try {
      const formData = new FormData();
      formData.append(
        "slider",
        JSON.stringify({
          ...slide,
          active: !slide.active,
        }),
      );
      await sliderService.update(slide.id, formData, storeId);
      fetchSlides();
    } catch (error) {
      toast.error("Erreur mise à jour statut");
    }
  };

  /// NOTE: Reordering Drag&Drop is complex to implement perfectly in one go.
  /// For now, we allow editing the "Order" number directly.

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-5 sm:mb-8">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white">
            Gestion Carrousel
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Images de la page d'accueil
          </p>
        </div>
        <button
          onClick={() => {
            if (!isAdding) {
              const nextOrder = slides.length > 0 
                ? Math.min(...slides.map(s => s.displayOrder)) - 1 
                : 10;
              setNewSlide({
                title: "",
                description: "",
                displayOrder: nextOrder,
                active: true,
                imageFile: null,
              });
              setPreviewUrl("");
            }
            setIsAdding(!isAdding);
          }}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 flex items-center gap-2 shadow-lg shadow-primary/25"
        >
          {isAdding ? (
            "Annuler"
          ) : (
            <>
              <Plus className="h-5 w-5" /> Ajouter une image
            </>
          )}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-[#242021] p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 mb-6 sm:mb-8 animate-fade-in transition-colors">
          <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">
            Nouvelle Diapositive
          </h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Titre (Optionnel)
                </label>
                <input
                  type="text"
                  value={newSlide.title}
                  onChange={(e) =>
                    setNewSlide({ ...newSlide, title: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 dark:border-white/10 bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Ex: Nouvelle Collection"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newSlide.description}
                  onChange={(e) =>
                    setNewSlide({ ...newSlide, description: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 dark:border-white/10 bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Petite description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ordre d'affichage
                </label>
                <input
                  type="number"
                  value={newSlide.displayOrder}
                  onChange={(e) =>
                    setNewSlide({
                      ...newSlide,
                      displayOrder: parseInt(e.target.value),
                    })
                  }
                  className="w-full p-2 border border-gray-300 dark:border-white/10 bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Image Upload / URL */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Image
              </label>

              <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="flex-1 w-full">
                  <div className="border-2 border-dashed border-gray-300 dark:border-white/10 rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Cliquez pour uploader un fichier
                    </span>
                  </div>
                </div>

                <div className="flex items-center text-gray-400 font-medium">
                  OU
                </div>

                <div className="flex-1 w-full">
                  <input
                    type="text"
                    value={newSlide.imageUrl}
                    onChange={(e) => {
                      setNewSlide({ ...newSlide, imageUrl: e.target.value });
                      setPreviewUrl(e.target.value); // Preview URL directly
                    }}
                    className="w-full p-3 border border-gray-300 dark:border-white/10 bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="Coller une URL d'image externe..."
                  />
                </div>
              </div>

              {previewUrl && (
                <div className="mt-4 relative w-full h-48 bg-gray-100 dark:bg-black/20 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium shadow-lg shadow-green-600/20"
              >
                <Save className="h-5 w-5" /> Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des slides */}
      <div className="space-y-4">
        {storeId == null && !loading ? (
          <p className="text-center text-amber-700 dark:text-amber-400 p-10 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            Session sans boutique associée. Déconnectez-vous puis reconnectez-vous.
          </p>
        ) : loading ? (
          <p className="text-center text-gray-500 dark:text-gray-400">
            Chargement...
          </p>
        ) : slides.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 p-10 bg-gray-50 dark:bg-[#242021] rounded-lg border border-gray-100 dark:border-white/10">
            Aucune image dans le carrousel.
          </p>
        ) : (
          slides.map((slide) => (
            <div
              key={slide.id}
              className="bg-white dark:bg-[#242021] p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 flex flex-row items-center gap-3 sm:gap-4 transition-colors"
            >
              {/* Image Preview */}
              <div className="h-16 w-24 sm:h-20 sm:w-32 bg-gray-100 dark:bg-white/5 rounded-lg overflow-hidden shrink-0 border border-gray-200 dark:border-white/10">
                <img
                  src={slide.imageUrl}
                  alt={slide.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-800 dark:text-white text-sm sm:text-base truncate">
                  {slide.title || "Sans titre"}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {slide.imageUrl}
                </p>
                <div className="mt-1.5 flex items-center gap-3 text-xs sm:text-sm flex-wrap">
                  <span className="text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/10 px-2 py-1 rounded">
                    Ordre: {slide.displayOrder}
                  </span>
                  <button
                    onClick={() => toggleActive(slide)}
                    className={`flex items-center gap-1 font-medium ${slide.active ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}
                  >
                    {slide.active ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {slide.active ? "Actif" : "Inactif"}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <button
                type="button"
                onClick={() => handleDelete(slide.id)}
                disabled={deletingId === slide.id}
                className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-40"
                title="Supprimer"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminSlider;
