import api from "../api/axios";

export const getMyMessages = async (params = {}) => {
  const { data } = await api.get("/messages", { params });
  return data;
};
export const getMessage = async (id) => {
  const { data } = await api.get(`/messages/${id}`);
  return data.message;
};
export const markMessageRead = async (id) => {
  const { data } = await api.patch(`/messages/${id}/read`);
  return data;
};
export const markAllMessagesRead = async () => {
  const { data } = await api.post("/messages/read-all");
  return data;
};
export const deleteMessage = async (id) => {
  const { data } = await api.delete(`/messages/${id}`);
  return data;
};
export const deleteMessagesBulk = async (ids) => {
  const { data } = await api.post("/messages/bulk-delete", { ids });
  return data;
};
export const deleteAllMessages = async () => {
  const { data } = await api.delete("/messages");
  return data;
};
export const getUnreadCount = async () => {
  const { data } = await api.get("/messages/unread-count");
  return data.unreadCount;
};

// admin
export const broadcastMessage = async ({ subject, body }) => {
  const { data } = await api.post("/admin/messages/broadcast", { subject, body });
  return data;
};
export const shareListingToInbox = async (listingId, body) => {
  const { data } = await api.post(`/admin/listings/${listingId}/share`, { body });
  return data;
};
