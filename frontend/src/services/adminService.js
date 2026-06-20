// src/services/adminService.js — Centralized Admin API Layer

import api from "../api/axios";

export const getAdminStats = async () => {
  const { data } = await api.get("/admin/stats");
  return data; // { totalUsers, totalListings, activeListings, newUsers, newListings }
};

export const getAdminListings = async (params = {}) => {
  const { data } = await api.get("/admin/listings", { params });
  return data; // { listings, pagination }
};

export const deleteAdminListing = async (id) => {
  const { data } = await api.delete(`/admin/listings/${id}`);
  return data; // { message }
};

export const getAdminUsers = async (params = {}) => {
  const { data } = await api.get("/admin/users", { params });
  return data; // { users, pagination }
};

export const deleteAdminUser = async (id) => {
  const { data } = await api.delete(`/admin/users/${id}`);
  return data; // { message }
};

export const getAdminReports = async () => {
  const { data } = await api.get("/admin/reports");
  return data; // { reports }
};

export const ignoreAdminReport = async (id) => {
  const { data } = await api.patch(`/admin/reports/${id}/ignore`);
  return data; // { message }
};