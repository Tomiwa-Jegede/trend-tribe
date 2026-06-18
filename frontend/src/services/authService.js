// src/services/authService.js — Centralized Auth API Layer

import api from "../api/axios";

export const verifyEmail = async (otp) => {
  const { data } = await api.post("/auth/verify-email", { otp });
  return data; // { message, user }
};

export const resendOtp = async () => {
  const { data } = await api.post("/auth/resend-otp");
  return data; // { message }
};

export const forgotPassword = async (email) => {
  const { data } = await api.post("/auth/forgot-password", { email });
  return data; // { message }
};

export const resetPassword = async (token, newPassword) => {
  const { data } = await api.post("/auth/reset-password", {
    token,
    newPassword,
  });
  return data; // { message }
};

export const updateProfile = async (fields) => {
  const formData = new FormData();
  if (fields.avatar) formData.append("avatar", fields.avatar);
  if (fields.fullName) formData.append("fullName", fields.fullName);
  if (fields.bio) formData.append("bio", fields.bio);
  if (fields.school) formData.append("school", fields.school);
  if (fields.whatsapp) formData.append("whatsapp", fields.whatsapp);

  const { data } = await api.patch("/auth/profile", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000,
  });

  return data.user;
};