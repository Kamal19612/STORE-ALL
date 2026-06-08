import api from "./api";
import { getManagerApiPrefix } from "./managerApiContext";

const adminOrderService = {
  getAllOrders: async (page = 0, size = 50, managerStoreId) => {
    const prefix = getManagerApiPrefix(managerStoreId);
    const response = await api.get(`${prefix}/orders?page=${page}&size=${size}`);
    return response.data;
  },

  getOrderById: async (id, managerStoreId) => {
    const prefix = getManagerApiPrefix(managerStoreId);
    const response = await api.get(`${prefix}/orders/${id}`);
    return response.data;
  },

  updateOrderStatus: async (id, status, managerStoreId) => {
    const prefix = getManagerApiPrefix(managerStoreId);
    const response = await api.put(`${prefix}/orders/${id}/status`, { status });
    return response.data;
  },

  deleteOrder: async (id, managerStoreId) => {
    const prefix = getManagerApiPrefix(managerStoreId);
    await api.delete(`${prefix}/orders/${id}`);
  },

  getOrderHistory: async (orderId, managerStoreId) => {
    const prefix = getManagerApiPrefix(managerStoreId);
    const response = await api.get(`${prefix}/orders/${orderId}/history`);
    return response.data;
  },

  getWhatsAppNotificationLink: async (orderId, phoneNumber, managerStoreId) => {
    const prefix = getManagerApiPrefix(managerStoreId);
    let url = `${prefix}/orders/${orderId}/whatsapp-notification`;
    if (phoneNumber) {
      url += `?phoneNumber=${encodeURIComponent(phoneNumber)}`;
    }
    const response = await api.get(url);
    return response.data.link;
  },
};

export default adminOrderService;
