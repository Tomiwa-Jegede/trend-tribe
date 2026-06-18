// src/components/listings/ListingForm.jsx — Now with real file upload

import { useState, useRef } from "react";
import FormInput from "../ui/FormInput";
import Alert from "../ui/Alert";
import { CATEGORIES, CONDITIONS } from "../../services/listingService";
import { uploadImages } from "../../services/uploadService";
import { FiArrowRight, FiX, FiPlus, FiImage } from "react-icons/fi";

const DEFAULT_FORM = {
  title: "",
  description: "",
  price: "",
  category: "",
  condition: "",
  location: "",
  images: [],
  imagePublicIds: [],
  coverPosition: { x: 50, y: 50 },
};

const MAX_IMAGES = 5;
const MAX_FILE_MB = 5;

const ListingForm = ({
  initialData,
  onSubmit,
  submitLabel = "Create Listing",
  loadingLabel = "Saving...",
}) => {
  const [formData, setFormData] = useState(
    initialData
      ? {
          title: initialData.title || "",
          description: initialData.description || "",
          price: initialData.price || "",
          category: initialData.category || "",
          condition: initialData.condition || "",
          location: initialData.location || "",
          images: initialData.images || [],
          imagePublicIds: initialData.imagePublicIds || [],
          coverPosition: initialData.coverPosition || { x: 50, y: 50 },
        }
      : DEFAULT_FORM,
  );

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = MAX_IMAGES - formData.images.length;

    if (remainingSlots <= 0) {
      setErrors((prev) => ({
        ...prev,
        images: `Maximum ${MAX_IMAGES} images allowed`,
      }));
      e.target.value = "";
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);

    const oversized = filesToUpload.find(
      (f) => f.size > MAX_FILE_MB * 1024 * 1024,
    );
    if (oversized) {
      setErrors((prev) => ({
        ...prev,
        images: `"${oversized.name}" exceeds ${MAX_FILE_MB}MB`,
      }));
      e.target.value = "";
      return;
    }

    setErrors((prev) => ({ ...prev, images: "" }));
    setUploadingSlot(true);

    try {
      const { urls, publicIds } = await uploadImages(filesToUpload);
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...urls],
        imagePublicIds: [...prev.imagePublicIds, ...publicIds],
      }));
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        images: err.response?.data?.error || "Upload failed. Please try again.",
      }));
    } finally {
      setUploadingSlot(false);
      e.target.value = "";
    }
  };

  const removeImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
      imagePublicIds: prev.imagePublicIds.filter((_, i) => i !== index),
      ...(index === 0 && { coverPosition: { x: 50, y: 50 } }),
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (
      formData.title.trim().length < 3 ||
      formData.title.trim().length > 100
    ) {
      newErrors.title = "Title must be between 3 and 100 characters";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (
      formData.description.trim().length < 10 ||
      formData.description.trim().length > 2000
    ) {
      newErrors.description =
        "Description must be between 10 and 2000 characters";
    }

    if (!formData.price) {
      newErrors.price = "Price is required";
    } else if (parseFloat(formData.price) <= 0) {
      newErrors.price = "Price must be a positive number";
    }

    if (!formData.category) newErrors.category = "Please select a category";
    if (!formData.condition) newErrors.condition = "Please select a condition";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit({ ...formData, price: parseFloat(formData.price) });
    } catch (err) {
      if (err.response?.data?.details) {
        const backendErrors = {};
        err.response.data.details.forEach((d) => {
          backendErrors[d.field] = d.message;
        });
        setErrors(backendErrors);
      } else {
        setServerError(
          err.response?.data?.error ||
            "Something went wrong. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const additionalImages = formData.images.slice(1);
  const additionalSlotsRemaining = MAX_IMAGES - 1 - additionalImages.length;
  const showUploadingInCover = uploadingSlot && formData.images.length === 0;
  const showUploadingInAdditional = uploadingSlot && formData.images.length > 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {serverError && (
        <Alert
          type="error"
          message={serverError}
          onDismiss={() => setServerError("")}
        />
      )}

      <FormInput
        label="Title"
        name="title"
        value={formData.title}
        onChange={handleChange}
        error={errors.title}
        placeholder="e.g. Introduction to Computer Science Textbook"
        required
      />

      <FormInput
        label="Description"
        name="description"
        textarea
        rows={5}
        value={formData.description}
        onChange={handleChange}
        error={errors.description}
        placeholder="Describe the item's condition, age, and any other relevant details..."
        required
      />

      <div className="grid sm:grid-cols-2 gap-5">
        <FormInput
          label="Price (₦)"
          name="price"
          type="number"
          min="0"
          value={formData.price}
          onChange={handleChange}
          error={errors.price}
          placeholder="5000"
          required
        />
        <FormInput
          label="Location (optional)"
          name="location"
          value={formData.location}
          onChange={handleChange}
          error={errors.location}
          placeholder="e.g. Unilag Campus"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="category" className="input-label">
            Category <span className="text-red-500 ml-0.5">*</span>
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className={`input-field ${errors.category ? "border-red-400" : ""}`}
          >
            <option value="">Select category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace("_", " ")}
              </option>
            ))}
          </select>
          {errors.category && <p className="input-error">{errors.category}</p>}
        </div>

        <div>
          <label htmlFor="condition" className="input-label">
            Condition <span className="text-red-500 ml-0.5">*</span>
          </label>
          <select
            id="condition"
            name="condition"
            value={formData.condition}
            onChange={handleChange}
            className={`input-field ${errors.condition ? "border-red-400" : ""}`}
          >
            <option value="">Select condition</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c.replace("_", " ")}
              </option>
            ))}
          </select>
          {errors.condition && (
            <p className="input-error">{errors.condition}</p>
          )}
        </div>
      </div>

      {/* ── Photo upload grid ────────────────────────────────── */}
      <div>
        <label className="input-label">
          Photos{" "}
          <span className="font-normal text-gray-400">
            (optional, max {MAX_IMAGES})
          </span>
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploadingSlot || formData.images.length >= MAX_IMAGES}
        />

        <div className="flex gap-2.5 mt-1">
          {/* ── Cover slot (large, left) ── */}
          <div className="flex-shrink-0 w-36">
            {formData.images[0] ? (
              // Filled cover slot with drag-to-reposition
              <div
                className="relative w-full aspect-square rounded-2xl overflow-hidden
                           border border-gray-200 group select-none"
                style={{ cursor: "grab" }}
                onMouseDown={(e) => {
                  const container = e.currentTarget;
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const startPosX = formData.coverPosition?.x ?? 50;
                  const startPosY = formData.coverPosition?.y ?? 50;

                  const onMove = (mv) => {
                    const rect = container.getBoundingClientRect();
                    const dx = ((mv.clientX - startX) / rect.width) * -100;
                    const dy = ((mv.clientY - startY) / rect.height) * -100;
                    const x = Math.min(100, Math.max(0, startPosX + dx));
                    const y = Math.min(100, Math.max(0, startPosY + dy));
                    container.style.cursor = "grabbing";
                    container.querySelector("img").style.objectPosition =
                      `${x}% ${y}%`;
                    setFormData((prev) => ({
                      ...prev,
                      coverPosition: { x, y },
                    }));
                  };

                  const onUp = () => {
                    container.style.cursor = "grab";
                    document.removeEventListener("mousemove", onMove);
                    document.removeEventListener("mouseup", onUp);
                  };

                  document.addEventListener("mousemove", onMove);
                  document.addEventListener("mouseup", onUp);
                }}
                onTouchStart={(e) => {
                  const container = e.currentTarget;
                  const touch = e.touches[0];
                  const startX = touch.clientX;
                  const startY = touch.clientY;
                  const startPosX = formData.coverPosition?.x ?? 50;
                  const startPosY = formData.coverPosition?.y ?? 50;

                  const onMove = (mv) => {
                    mv.preventDefault();
                    const t = mv.touches[0];
                    const rect = container.getBoundingClientRect();
                    const dx = ((t.clientX - startX) / rect.width) * -100;
                    const dy = ((t.clientY - startY) / rect.height) * -100;
                    const x = Math.min(100, Math.max(0, startPosX + dx));
                    const y = Math.min(100, Math.max(0, startPosY + dy));
                    container.querySelector("img").style.objectPosition =
                      `${x}% ${y}%`;
                    setFormData((prev) => ({
                      ...prev,
                      coverPosition: { x, y },
                    }));
                  };

                  const onEnd = () => {
                    document.removeEventListener("touchmove", onMove);
                    document.removeEventListener("touchend", onEnd);
                  };

                  document.addEventListener("touchmove", onMove, {
                    passive: false,
                  });
                  document.addEventListener("touchend", onEnd);
                }}
              >
                <img
                  src={formData.images[0]}
                  alt="Cover"
                  draggable={false}
                  className="w-full h-full object-cover transition-none pointer-events-none"
                  style={{
                    objectPosition: `${formData.coverPosition?.x ?? 50}% ${formData.coverPosition?.y ?? 50}%`,
                  }}
                />

                {/* Drag hint */}
                <div
                  className="absolute inset-0 flex items-center justify-center
                                bg-black/20 opacity-100 group-hover:opacity-0
                                transition-opacity duration-300 pointer-events-none"
                >
                  <span
                    className="text-white text-[11px] font-semibold tracking-wide
                                   bg-black/40 px-2.5 py-1 rounded-full"
                  >
                    Drag to reposition
                  </span>
                </div>

                {/* Cover badge */}
                <span
                  className="absolute bottom-0 left-0 right-0 text-center text-[10px]
                                 font-semibold text-white bg-black/40 py-1 tracking-wide
                                 pointer-events-none"
                >
                  Cover
                </span>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeImage(0)}
                  aria-label="Remove cover photo"
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full
                             bg-black/60 text-white flex items-center justify-center
                             opacity-0 group-hover:opacity-100 transition-opacity
                             hover:bg-black/80"
                >
                  <FiX className="w-3 h-3" />
                </button>
              </div>
            ) : showUploadingInCover ? (
              // Spinner while uploading first image
              <div
                className="w-full aspect-square rounded-2xl border-2 border-dashed
                              border-primary-400 bg-primary-50 flex items-center justify-center"
              >
                <span
                  className="w-5 h-5 border-2 border-primary-300
                                 border-t-primary-600 rounded-full animate-spin"
                />
              </div>
            ) : (
              // Empty cover slot
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Add cover photo"
                className="w-full aspect-square rounded-2xl border-2 border-dashed
                           border-gray-200 bg-gray-50 flex flex-col items-center
                           justify-center gap-1.5 text-gray-400
                           hover:border-primary-400 hover:bg-primary-50
                           hover:text-primary-500 transition-all duration-200
                           active:scale-95 group"
              >
                <FiPlus className="w-6 h-6 transition-transform duration-200 group-hover:scale-110" />
                <span className="text-[10px] font-semibold tracking-wide">
                  Cover
                </span>
              </button>
            )}
          </div>

          {/* ── Additional slots (2×2 grid, right) ── */}
          <div className="grid grid-cols-2 gap-2.5 flex-1">
            {/* Filled additional slots */}
            {additionalImages.map((url, i) => (
              <div
                key={url + i}
                className="relative aspect-square rounded-xl overflow-hidden
                           border border-gray-200 group"
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i + 1)}
                  aria-label="Remove photo"
                  className="absolute top-1 right-1 w-5 h-5 rounded-full
                             bg-black/60 text-white flex items-center justify-center
                             opacity-0 group-hover:opacity-100 transition-opacity
                             hover:bg-black/80"
                >
                  <FiX className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}

            {/* Uploading spinner in additional area */}
            {showUploadingInAdditional && (
              <div
                className="aspect-square rounded-xl border-2 border-dashed
                              border-primary-400 bg-primary-50 flex items-center justify-center"
              >
                <span
                  className="w-4 h-4 border-2 border-primary-300
                                 border-t-primary-600 rounded-full animate-spin"
                />
              </div>
            )}

            {/* Add (+) slot */}
            {!uploadingSlot &&
              additionalSlotsRemaining > 0 &&
              formData.images.length > 0 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Add photo"
                  className="aspect-square rounded-xl border-2 border-dashed
                           border-gray-200 bg-gray-50 flex flex-col items-center
                           justify-center gap-1 text-gray-400
                           hover:border-primary-400 hover:bg-primary-50
                           hover:text-primary-500 transition-all duration-200
                           active:scale-95 group"
                >
                  <FiPlus className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                  <span className="text-[9px] font-medium">Add</span>
                </button>
              )}
          </div>
        </div>

        {errors.images && <p className="input-error mt-1.5">{errors.images}</p>}

        {formData.images.length === 0 && !uploadingSlot && (
          <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
            <FiImage className="w-3.5 h-3.5 flex-shrink-0" />
            No photos added — a placeholder icon will be shown instead
          </p>
        )}

        {formData.images.length > 0 && (
          <p className="text-xs text-gray-400 mt-2">
            {formData.images.length} of {MAX_IMAGES} photo
            {formData.images.length !== 1 ? "s" : ""} added
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || uploadingSlot}
        className="btn-primary flex items-center justify-center gap-2 py-3 mt-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            {loadingLabel}
          </>
        ) : (
          <>
            {submitLabel}
            <FiArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
};

export default ListingForm;
