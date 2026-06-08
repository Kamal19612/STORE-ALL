import api from "./api";

/**
 * Charge tout le catalogue d’un coup (approche héritée du catalogue PHP :
 * tous les produits avant {@code paginateProducts}).
 * Fallback sur pagination multipage si {@code GET /products/full} est indisponible (ancienne API).
 */
async function fetchFullProductCatalog(pageSize = 500) {
  try {
    // Prefer the /api/public alias to avoid any collision with /api/products/{slug}
    const response = await api.get("/public/products/full");
    const list = Array.isArray(response.data) ? response.data : [];
    return { content: list, totalElements: list.length };
  } catch (e) {
    // 404 = ancienne API ; 400 = tenant / erreur passerelle → repli liste paginée
    const st = e.response?.status;
    if (st !== 404 && st !== 400) throw e;
    console.warn(
      "[catalog] GET /products/full unavailable (status",
      st,
      "), falling back to paged /products",
    );
  }

  let page = 0;
  const all = [];
  const maxPages = 200;
  while (page < maxPages) {
    const response = await api.get(`/products?page=${page}&size=${pageSize}`);
    const chunk = response.data?.content ?? [];
    if (chunk.length === 0) break;
    all.push(...chunk);
    if (chunk.length < pageSize) break;
    page += 1;
  }
  return { content: all, totalElements: all.length };
}

const productService = {
  getAllProducts: async (page = 0, size = 10) => {
    const response = await api.get(`/products?page=${page}&size=${size}`);
    return response.data;
  },

  getFullProductCatalog: fetchFullProductCatalog,

  // Compat: certains écrans utilisent "id" mais l'API attend un slug
  getProductById: async (idOrSlug) => {
    return productService.getProductBySlug(idOrSlug);
  },

  getProductBySlug: async (slug) => {
    const response = await api.get(`/products/${slug}`);
    return response.data;
  },

  getTopProducts: async (limit = 10) => {
    const response = await api.get(`/products/top?limit=${limit}`);
    return response.data;
  },

  getCategories: async () => {
    const response = await api.get("/categories");
    return response.data;
  },
};

export default productService;
