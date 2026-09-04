import api from "../api/axios";

export const getMoneyAnalytics = async (days = 30) => {
  const { data } = await api.get("/admin/analytics/money", { params: { days } });
  return data;
};
export const getFunnelAnalytics = async () => {
  const { data } = await api.get("/admin/analytics/funnel");
  return data;
};
export const getSupplyAnalytics = async () => {
  const { data } = await api.get("/admin/analytics/supply");
  return data;
};
export const getGrowthAnalytics = async () => {
  const { data } = await api.get("/admin/analytics/growth");
  return data;
};
export const getSearchAnalytics = async () => {
  const { data } = await api.get("/admin/analytics/search");
  return data;
};
export const getTrustAnalytics = async () => {
  const { data } = await api.get("/admin/analytics/trust");
  return data;
};
