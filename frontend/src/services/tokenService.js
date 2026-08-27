import api from "../api/axios";

export const initTokenPurchase = async (quantity) => {
  const { data } = await api.post("/payments/init", { quantity });
  return data; // { authorizationUrl, reference }
};

export const verifyTokenPurchase = async (reference) => {
  const { data } = await api.get("/payments/verify", { params: { reference } });
  return data; // { ok, status, quantity }
};