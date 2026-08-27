// src/services/frederickService.js

import api from "../api/axios";

export const askFrederick = async (message) => {
  const { data } = await api.post("/frederick/chat", { message });
  return data; // { reply, products }
};
