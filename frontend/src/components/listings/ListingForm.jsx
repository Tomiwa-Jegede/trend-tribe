// src/components/listings/ListingForm.jsx — Shared Create/Edit Form

import { useState } from "react";
import FormInput from "../ui/FormInput";
import Alert from "../ui/Alert";
import { CATEGORIES, CONDITIONS } from "../../services/listingService";
import { FiArrowRight, FiX, FiImage } from "react-icons/fi";

const DEFAULT_FORM = {
  title: "",
  description: "",
  price: "",
  category: "",
  condition: "",
  location: "",
  images: [], // array of URL strings for now
};

const ListingForm = ({
  initialData, // pass existing listing when editing
  onSubmit, // async (formData) => {}
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
        }
      : DEFAULT_FORM,
  );

  const [imageUrlInput, setImageUrlInput] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // ── Image URL management (simple URL-based, no file upload in scope) ──
  const addImageUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) return;

    if (formData.images.length >= 5) {
      setErrors((prev) => ({ ...prev, images: "Maximum 5 images allowed" }));
      return;
    }

    try {
      new URL(url); // validate it's a real URL
    } catch {
      setErrors((prev) => ({ ...prev, images: "Please enter a valid URL" }));
      return;
    }

    setFormData((prev) => ({ ...prev, images: [...prev.images, url] }));
    setImageUrlInput("");
    setErrors((prev) => ({ ...prev, images: "" }));
  };

  const removeImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  // ── Validation (mirrors backend rules exactly) ───────────
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
      await onSubmit({
        ...formData,
        price: parseFloat(formData.price),
      });
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
        {/* Category select */}
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

        {/* Condition select */}
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

      {/* ── Image URLs ─────────────────────────────────── */}
      <div>
        <label className="input-label">Image URLs (optional, max 5)</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={imageUrlInput}
            onChange={(e) => setImageUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addImageUrl();
              }
            }}
            placeholder="https://example.com/image.jpg"
            className="input-field"
          />
          <button
            type="button"
            onClick={addImageUrl}
            className="btn-secondary px-4 whitespace-nowrap"
          >
            Add
          </button>
        </div>
        {errors.images && <p className="input-error">{errors.images}</p>}

        {/* Image preview chips */}
        {formData.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {formData.images.map((url, i) => (
              <div
                key={i}
                className="relative w-16 h-16 rounded-xl overflow-hidden
                           border border-gray-200 group"
              >
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-0.5 right-0.5 bg-black/60 text-white
                             rounded-full p-1 opacity-0 group-hover:opacity-100
                             transition-opacity"
                >
                  <FiX className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {formData.images.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
            <FiImage className="w-3.5 h-3.5" />
            No images added — a placeholder icon will be shown instead
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary flex items-center justify-center gap-2 py-3 mt-2"
      >
        {loading ? (
          <>
            <span
              className="w-4 h-4 border-2 border-white/40
                             border-t-white rounded-full animate-spin"
            />
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
