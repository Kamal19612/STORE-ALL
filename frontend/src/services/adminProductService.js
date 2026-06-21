import api from "./api";
import { getManagerApiPrefix } from "./managerApiContext";

const adminProductService = {
  getAllProducts: async (page = 0, size = 10, search = "", managerStoreId) => {
    const prefix = getManagerApiPrefix(managerStoreId);
    const params = new URLSearchParams({
      page,
      size,
      search,
    });
    const response = await api.get(`${prefix}/products?${params.toString()}`);
    return response.data;
  },

  createProduct: async (productData, managerStoreId) => {
    const prefix = getManagerApiPrefix(managerStoreId);
    const formData = new FormData();
    const { imageFile, mainImageFile, secondaryImageFiles, templatePdfFile, ...jsonPayload } = productData;

    formData.append("product", JSON.stringify(jsonPayload));

    const effectiveMain = mainImageFile || imageFile;
    if (effectiveMain) formData.append("mainImage", effectiveMain);

    if (Array.isArray(secondaryImageFiles)) {
      secondaryImageFiles.forEach((file) => {
        if (file) formData.append("secondaryImages", file);
      });
    }

    if (templatePdfFile) formData.append("templatePdf", templatePdfFile);

    const response = await api.post(`${prefix}/products`, formData);
    return response.data;
  },

  updateProduct: async (id, productData, managerStoreId) => {
    const prefix = getManagerApiPrefix(managerStoreId);
    const formData = new FormData();
    const { imageFile, mainImageFile, secondaryImageFiles, templatePdfFile, ...jsonPayload } = productData;

    formData.append("product", JSON.stringify(jsonPayload));

    const effectiveMain = mainImageFile || imageFile;
    if (effectiveMain) formData.append("mainImage", effectiveMain);

    if (Array.isArray(secondaryImageFiles)) {
      secondaryImageFiles.forEach((file) => {
        if (file) formData.append("secondaryImages", file);
      });
    }

    if (templatePdfFile) formData.append("templatePdf", templatePdfFile);

    const response = await api.put(`${prefix}/products/${id}`, formData);
    return response.data;
  },

  deleteProduct: async (id, managerStoreId) => {
    const prefix = getManagerApiPrefix(managerStoreId);
    await api.delete(`${prefix}/products/${id}`);
  },

  deleteAllProducts: async (managerStoreId) => {
    const prefix = getManagerApiPrefix(managerStoreId);
    const response = await api.delete(`${prefix}/products`);
    return response.data;
  },

  getProductById: async (id, managerStoreId) => {
    const prefix = getManagerApiPrefix(managerStoreId);
    const response = await api.get(`${prefix}/products/${id}`);
    return response.data;
  },

  importProducts: async (file, managerStoreId) => {
    const prefix = getManagerApiPrefix(managerStoreId);
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post(`${prefix}/products/import`, formData);
    return response.data;
  },

  importFromGoogleSheets: async (spreadsheetId, sheetGid, managerStoreId) => {
    const prefix = getManagerApiPrefix(managerStoreId);
    const params = new URLSearchParams();
    if (spreadsheetId) params.set("spreadsheetId", spreadsheetId);
    if (sheetGid != null && sheetGid !== "") params.set("sheetGid", String(sheetGid));
    const q = params.toString();
    const url = `${prefix}/products/import-google-sheets${q ? `?${q}` : ""}`;
    const response = await api.post(url);
    return response.data;
  },

  syncGoogleSheet: async (managerStoreId) => {
    const prefix = getManagerApiPrefix(managerStoreId);
    const response = await api.post(`${prefix}/products/google-sheets-sync`);
    return response.data;
  },

  getSheetConfig: async (managerStoreId) => {
    const prefix = getManagerApiPrefix(managerStoreId);
    const response = await api.get(`${prefix}/products/sheet-config`);
    return response.data;
  },

  exportCatalogCsv: async (managerStoreId) => {
    const prefix = getManagerApiPrefix(managerStoreId);
    const response = await api.get(`${prefix}/products/export-csv`, { responseType: "blob" });
    const cd = response.headers["content-disposition"] || response.headers["Content-Disposition"];
    let filename = "products.csv";
    if (cd) {
      const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(cd) || /filename="([^"]+)"/i.exec(cd);
      if (m) filename = decodeURIComponent(m[1].trim());
    }
    const url = URL.createObjectURL(response.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

export default adminProductService;
