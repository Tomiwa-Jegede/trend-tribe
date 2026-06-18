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
