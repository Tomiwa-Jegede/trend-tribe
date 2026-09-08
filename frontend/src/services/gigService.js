// src/services/gigService.js
import api from "../api/axios";

export const getGigs = async (params = {}) => {
  const { data } = await api.get("/gigs", { params });
  return data;
};
export const getMyGigs = async () => {
  const { data } = await api.get("/gigs/mine");
  return data;
};
export const createGig = async ({ description, whatsapp, amount, timerHours }) => {
  const { data } = await api.post("/gigs", { description, whatsapp, amount, timerHours });
  return data;
};
export const claimGig = async (id) => {
  const { data } = await api.post(`/gigs/${id}/claim`);
  return data;
};
export const confirmGig = async (id) => {
  const { data } = await api.post(`/gigs/${id}/confirm`);
  return data;
};
export const cancelGig = async (id) => {
  const { data } = await api.post(`/gigs/${id}/cancel`);
  return data;
};
export const renewGig = async (id, timerHours) => {
  const { data } = await api.post(`/gigs/${id}/renew`, { timerHours });
  return data;
};
export const refundExpiredGig = async (id) => {
  const { data } = await api.post(`/gigs/${id}/refund-expired`);
  return data;
};
export const disputeGig = async (id) => {
  const { data } = await api.post(`/gigs/${id}/dispute`);
  return data;
};
export const withdrawGig = async ({ amount, bankCode, accountNumber, pin }) => {
  const { data } = await api.post("/gigs/withdraw", { amount, bankCode, accountNumber, pin });
  return data;
};
export const getGigAccount = async () => {
  const { data } = await api.get("/gigs/account");
  return data;
};
export const resolveGigAccount = async (accountNumber) => {
  const { data } = await api.post("/gigs/resolve", { accountNumber });
  return data;
};
export const transferGig = async ({ toAccountNumber, amount, pin }) => {
  const { data } = await api.post("/gigs/transfer", { toAccountNumber, amount, pin });
  return data;
};
export const getGigTransfers = async () => {
  const { data } = await api.get("/gigs/transfers");
  return data;
};
export const initGigPayment = async (amount) => {
  const { data } = await api.post("/gigs/payments/init", { amount });
  return data;
};
export const verifyGigPayment = async (reference, transaction_id) => {
  const { data } = await api.get("/gigs/payments/verify", { params: { reference, transaction_id } });
  return data;
};
