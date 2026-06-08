import api from "./api";
import { getManagerApiPrefix } from "./managerApiContext";

const sliderService = {
  getPublicAll: async () => {
    const response = await api.get("/sliders");
    return response.data;
  },

  getAll: async (managerStoreId) => {
    const prefix = getManagerApiPrefix(managerStoreId);
    const response = await api.get(`${prefix}/sliders`);
    return response.data;
  },

  create: async (formData, managerStoreId) => {
    const prefix = getManagerApiPrefix(managerStoreId);
    const response = await api.post(`${prefix}/sliders`, formData);
    return response.data;
  },

  delete: async (id, managerStoreId) => {
    const prefix = getManagerApiPrefix(managerStoreId);
    await api.delete(`${prefix}/sliders/${id}`);
  },

  toggleActive: async (id, managerStoreId) => {
    const prefix = getManagerApiPrefix(managerStoreId);
    const response = await api.put(`${prefix}/sliders/${id}/toggle`);
    return response.data;
  },

  update: async (id, formData, managerStoreId) => {
    return sliderService.toggleActive(id, managerStoreId);
  },
};

export default sliderService;
