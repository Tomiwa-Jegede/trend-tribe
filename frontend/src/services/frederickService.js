// src/services/frederickService.js
import api from "../api/axios";

export const askFrederick = async (message, confirmSpend = false, image = null, sessionId = null) => {
  try {
    const formData = new FormData();
    formData.append("message", message);
    formData.append("confirmSpend", confirmSpend);
    if (sessionId) {
      formData.append("sessionId", sessionId);
    }
    if (image) {
      formData.append("image", image);
    }
    const { data } = await api.post("/frederick/chat", formData, {
      headers: { "Content-Type": undefined }, // let the browser set multipart boundary
    });
    return { ok: true, ...data }; // { ok, reply, products }
  } catch (err) {
    if (err.response?.status === 402) {
      return { ok: false, needsTokenConfirm: true, ...err.response.data };
    }
    throw err;
  }
};
