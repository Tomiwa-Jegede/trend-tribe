// src/services/uploadService.js
import api from "../api/axios";

export const uploadImages = async (files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));

  const { data } = await api.post("/upload/images", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000, // 60s for uploads — overrides the default 10s
  });

  return { urls: data.urls, publicIds: data.publicIds };
};
