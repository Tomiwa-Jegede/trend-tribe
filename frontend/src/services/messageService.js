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
export const sendMessage = async ({ listingId, body, recipientId }) => {
  const { data } = await api.post("/messages", { listingId, body, recipientId });
  return data.message;
};
export const getThread = async (listingId, withId) => {
  const { data } = await api.get("/messages/thread", { params: { listingId, with: withId } });
  return data.messages;
};
export const getPresence = async (ids) => {
  const { data } = await api.get("/messages/presence", { params: { ids: ids.join(",") } });
  return data;
};
export const markDelivered = async (id) => {
  const { data } = await api.post(`/messages/${id}/delivered`);
  return data;
};
export const getConversations = async () => {
  const { data } = await api.get("/messages/conversations");
  return data.conversations;
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
