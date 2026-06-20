// src/services/listingService.js — Centralized Listing API Layer

import api from "../api/axios";

// ─── Constants (moved here from mockListings.js) ───────────────
export const CATEGORIES = [
  "BOOKS",
  "ELECTRONICS",
  "CLOTHING",
  "FURNITURE",
  "STATIONERY",
  "SPORTS",
  "FOOD",
  "SERVICES",
  "OTHER",
];

export const CONDITIONS = ["NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR"];

// ─── GET /api/listings (with query params) ─────────────────────
export const getListings = async (filters = {}) => {
  const params = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      params[key] = value;
    }
  });

  const { data } = await api.get("/listings", { params });
  return data; // { listings, pagination, filters }
};

// ─── GET /api/listings/:id ──────────────────────────────────────
export const getListingById = async (id) => {
  const { data } = await api.get(`/listings/${id}`);
  return data.listing;
};

// ─── POST /api/listings ─────────────────────────────────────────
export const createListing = async (listingData) => {
  const { data } = await api.post("/listings", listingData);
  return data.listing;
};

// ─── PUT /api/listings/:id ───────────────────────────────────────
export const updateListing = async (id, listingData) => {
  const { data } = await api.put(`/listings/${id}`, listingData);
  return data.listing;
};

// ─── DELETE /api/listings/:id ────────────────────────────────────
export const deleteListing = async (id) => {
  const { data } = await api.delete(`/listings/${id}`);
  return data;
};

// ─── GET /api/listings/user/:userId ─────────────────────────────
export const getListingsByUser = async (userId, params = {}) => {
  const { data } = await api.get(`/listings/user/${userId}`, { params });
  return data; // { seller, listings, pagination }
};

// ─── POST /api/listings/:id/report ──────────────────────────────
export const reportListing = async (id, reason) => {
  const { data } = await api.post(`/listings/${id}/report`, { reason });
  return data; // { message }
};
