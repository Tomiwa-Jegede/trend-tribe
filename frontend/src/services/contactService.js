// src/services/contactService.js
import api from "../api/axios";

export const revealContact = async (listingId, confirmSpend = false) => {
  try {
    const { data } = await api.post(`/listings/${listingId}/contact`, { confirmSpend });
    return { ok: true, ...data }; // { ok, whatsapp }
  } catch (err) {
    if (err.response?.status === 402) {
      return { ok: false, needsTokenConfirm: true, ...err.response.data };
    }
    throw err;
  }
};
