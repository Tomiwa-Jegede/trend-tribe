// src/services/uploadService.js
import api from "../api/axios";

export const uploadImages = async (files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));

  const { data } = await api.post("/upload/images", formData, {
    headers: { "Content-Type": undefined }, // let browser set multipart boundary (was application/json -> req.files empty)
    timeout: 60000,
  });

  return { urls: data.urls, publicIds: data.publicIds };
};
