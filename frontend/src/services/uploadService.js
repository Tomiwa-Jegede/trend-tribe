// src/services/uploadService.js
import api from "../api/axios";

export const uploadImages = async (files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));

  const { data } = await api.post("/upload/images", formData, {
    timeout: 60000, // 60s for uploads — let browser set boundary
  });

  return { urls: data.urls, publicIds: data.publicIds };
};
