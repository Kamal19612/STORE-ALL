import api from "./api";
import { getManagerApiPrefix } from "./managerApiContext";

const adminUserService = {
  getAllUsers: async (scopeStoreId) => {
    const prefix = getManagerApiPrefix(scopeStoreId);
    const response = await api.get(`${prefix}/users`);
    return response.data;
  },

  createUser: async (scopeStoreId, user) => {
    const prefix = getManagerApiPrefix(scopeStoreId);
    const response = await api.post(`${prefix}/users`, user);
    return response.data;
  },

  updateUser: async (scopeStoreId, id, user) => {
    const prefix = getManagerApiPrefix(scopeStoreId);
    const response = await api.put(`${prefix}/users/${id}`, user);
    return response.data;
  },

  deleteUser: async (scopeStoreId, id) => {
    const prefix = getManagerApiPrefix(scopeStoreId);
    await api.delete(`${prefix}/users/${id}`);
  },

  updateRole: async (scopeStoreId, id, role) => {
    const prefix = getManagerApiPrefix(scopeStoreId);
    const response = await api.put(`${prefix}/users/${id}/role`, { role });
    return response.data;
  },

  getDeliveryAgentStatus: async (scopeStoreId, id) => {
    const prefix = getManagerApiPrefix(scopeStoreId);
    const response = await api.get(`${prefix}/users/${id}/delivery-agent`);
    return response.data;
  },
};

export default adminUserService;
