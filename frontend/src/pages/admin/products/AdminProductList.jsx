import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Upload,
  Download,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-toastify";
import adminProductService from "../../../services/adminProductService";
import ImportProductModal from "../../../components/admin/ImportProductModal";
import { useStaffBasePath } from "../../../hooks/useStaffBasePath";

const AdminProductList = () => {
  const staffBase = useStaffBasePath();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [clearLoading, setClearLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const debounceTimer = useRef(null);

  const navigate = useNavigate();

  // Debounce : attend 400ms après la dernière frappe avant de lancer la recherche
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setPage(0);
      setDebouncedSearch(value);
    }, 400);
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminProductService.getAllProducts(page, 10, debouncedSearch);
      setProducts(data.content || []);
      setTotalPages(data.totalPages || 0);
    } catch (error) {
      console.error("Erreur chargement produits:", error);
      toast.error("Impossible de charger les produits");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) {
      try {
        await adminProductService.deleteProduct(id);
        toast.success("Produit supprimé définitivement");
        setProducts((prev) => prev.filter((p) => p.id !== id));
        fetchProducts();
      } catch (error) {
        toast.error("Erreur lors de la suppression");
      }
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Le debounce gère déjà la requête — rien à faire ici
  };

  const handleExportCsv = async () => {
    setExportLoading(true);
    try {
      await adminProductService.exportCatalogCsv();
      toast.success("Export CSV téléchargé");
    } catch (e) {
      toast.error("Échec export CSV");
    } finally {
      setExportLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (clearConfirmText !== "VIDER") return;
    setClearLoading(true);
    try {
      const result = await adminProductService.deleteAllProducts();
      toast.success(`Catalogue vidé — ${result.deletedCount} produit(s) supprimé(s)`);
      setIsClearModalOpen(false);
      setClearConfirmText("");
      fetchProducts();
    } catch (error) {
      toast.error("Erreur lors de la suppression du catalogue");
    } finally {
      setClearLoading(false);
    }
  };

  return (
    <div className="p-2 sm:p-4">
      <div className="flex flex-col gap-3 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white">
              Gestion des Produits
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Gérez votre catalogue</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setIsClearModalOpen(true); setClearConfirmText(""); }}
              className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 text-xs sm:text-sm py-2 px-3 rounded-lg font-semibold border border-red-200 dark:border-red-800"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Vider</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exportLoading}
              className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-200 text-xs sm:text-sm py-2 px-3 rounded-lg border border-emerald-200 dark:border-emerald-800 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{exportLoading ? "…" : "Export CSV"}</span>
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm py-2 px-3 rounded-lg"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Importer</span>
            </button>
            <Link
              to={`${staffBase}/products/new`}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-secondary text-xs sm:text-sm py-2 px-3 rounded-lg font-bold"
            >
              <Plus className="h-4 w-4" />
              <span>Nouveau</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-[#242021] p-3 rounded-lg border border-gray-100 dark:border-white/10 mb-4">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 dark:bg-[#1c191a] dark:text-white rounded-lg text-sm"
            value={search}
            onChange={handleSearchChange}
          />
        </form>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#242021] rounded-lg p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="h-16 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            </div>
          ))
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Aucun produit trouvé.</div>
        ) : (
          products.map((product) => (
            <div key={product.id} className="bg-white dark:bg-[#242021] rounded-lg shadow-sm border border-gray-100 dark:border-white/10 p-3">
              <div className="flex gap-3">
                <div className="h-16 w-16 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-[#1c191a] shrink-0">
                  <img src={product.mainImage || "/placeholder.png"} alt={product.name} className="h-full w-full object-contain" loading="lazy" decoding="async" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white text-sm truncate">{product.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{product.categoryName}</div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-bold text-primary dark:text-primary-400">{product.price.toLocaleString()} FCA</span>
                    <div className="flex gap-1">
                      <button onClick={() => navigate(`${staffBase}/products/edit/${product.id}`)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white dark:bg-[#242021] rounded-xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-[#1c191a] border-b border-gray-200 dark:border-white/10">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Image</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nom</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Catégorie</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Prix</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Stock</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Statut</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white p-1">
                      <img src={product.mainImage || "/placeholder.png"} alt={product.name} className="h-full w-full object-contain" loading="lazy" decoding="async" />
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white text-sm">{product.name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 hidden md:table-cell text-sm">{product.categoryName}</td>
                  <td className="px-4 py-3 font-bold text-primary dark:text-primary-400 text-sm">{product.price.toLocaleString()} FCA</td>
                  <td className="px-4 py-3 text-sm hidden sm:table-cell">
                    {product.stock > 0 ? <span className="text-green-600 font-bold">{product.stock}</span> : <span className="text-red-500 font-bold">Rupture</span>}
                  </td>
                  <td className="px-4 py-3 text-sm hidden sm:table-cell">
                    {product.active ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Actif
                      </span>
                    ) : (
                      <span className="text-gray-400 flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> Archivé
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => navigate(`${staffBase}/products/edit/${product.id}`)} className="p-2 text-gray-500 hover:text-blue-600 rounded-lg"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(product.id)} className="p-2 text-gray-500 hover:text-red-600 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {products.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 bg-white dark:bg-[#242021] p-3 rounded-lg border border-gray-100 dark:border-white/10">
          <span className="text-xs sm:text-sm text-gray-500">Page {page + 1} sur {totalPages > 0 ? totalPages : 1}</span>
          <div className="flex gap-2 self-end sm:self-auto">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50 disabled:opacity-50">Précédent</button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1} className="px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50 disabled:opacity-50">Suivant</button>
          </div>
        </div>
      )}

      <ImportProductModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => fetchProducts()}
      />

      {/* Modal confirmation — Vider le catalogue */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-[#242021] rounded-2xl shadow-2xl w-full max-w-md p-6 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Vider le catalogue</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Cette action supprimera <strong className="text-red-600">définitivement</strong> tous les produits ainsi que les lignes de commande associées. Elle est <strong>irréversible</strong>.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Tapez <strong className="text-red-600 font-mono">VIDER</strong> pour confirmer :
            </p>
            <input
              type="text"
              value={clearConfirmText}
              onChange={(e) => setClearConfirmText(e.target.value)}
              placeholder="VIDER"
              className="w-full px-4 py-2 border border-gray-300 dark:border-white/20 rounded-lg mb-4 text-sm bg-white dark:bg-[#1c191a] dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setIsClearModalOpen(false); setClearConfirmText(""); }}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                onClick={handleClearAll}
                disabled={clearConfirmText !== "VIDER" || clearLoading}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {clearLoading && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                Supprimer tout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductList;
