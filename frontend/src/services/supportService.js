import api from "../api/axios";

export const contactSupport = async (message) => {
  const { data } = await api.post("/support/contact", { message });
  return data.message;
};
export const getSupportThread = async () => {
  const { data } = await api.get("/support/thread");
  return data.messages;
};
export const listSupportThreads = async () => {
  const { data } = await api.get("/admin/support");
  return data.threads;
};
export const confirmSupport = async (userId) => {
  const { data } = await api.post(`/admin/support/${userId}/confirm`);
  return data;
};
export const replySupport = async (userId, message) => {
  const { data } = await api.post(`/admin/support/${userId}/message`, { message });
  return data.message;
};
