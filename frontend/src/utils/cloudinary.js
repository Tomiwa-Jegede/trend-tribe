// frontend/src/utils/cloudinary.js — Cloudinary on-the-fly transform helper
export function cldUrl(url, { width, quality = "auto", format = "auto" } = {}) {
  if (!url || !url.includes("/upload/")) return url;
  const t = [`f_${format}`, `q_${quality}`, width && `w_${width}`].filter(Boolean).join(",");
  return url.replace("/upload/", `/upload/${t}/`);
}
