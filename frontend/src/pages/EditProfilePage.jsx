// src/pages/EditProfilePage.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { updateProfile } from "../services/authService";
import { FiUser, FiCamera, FiArrowLeft, FiSave } from "react-icons/fi";

const fadeSlideUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const EditProfilePage = () => {
  const { user: currentUser, setUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    bio: "",
    school: "",
    whatsapp: "",
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (currentUser) {
      setForm({
        fullName: currentUser.fullName || "",
        bio: currentUser.bio || "",
        school: currentUser.school || "",
        whatsapp: currentUser.whatsapp || "",
      });
      setAvatarPreview(currentUser.avatar || null);
    }
  }, [currentUser]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const fields = { ...form };
      if (avatarFile) fields.avatar = avatarFile;
      const updated = await updateProfile(fields);
      if (setUser) setUser((prev) => ({ ...prev, ...updated }));
      navigate(`/profile/${currentUser.id}`);
    } catch (err) {
      setError("Failed to save changes. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Hero header ── */}
      <section
        className="relative text-white overflow-hidden py-14"
        style={{ background: "#0F1F3D" }}
      >
        {/* Grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Ambient glow */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "-20%",
            left: "-10%",
            width: "50%",
            height: "140%",
            borderRadius: "50%",
            background: "radial-gradient(circle at 40% 40%, rgba(26,79,214,0.35), transparent 70%)",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />

        <div className="container-app relative z-10">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-4"
          >
            <motion.button
              variants={fadeSlideUp}
              type="button"
              onClick={() => navigate(`/profile/${currentUser.id}`)}
              className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm font-medium transition-colors w-fit"
            >
              <FiArrowLeft className="w-4 h-4" />
              Back to profile
            </motion.button>

            <motion.div variants={fadeSlideUp} className="flex items-center gap-5">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-primary-800 flex items-center justify-center border-2 border-white/20">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <FiUser className="w-8 h-8 text-white/50" />
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Change photo"
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full
                             flex items-center justify-center border-2 border-white/20
                             hover:opacity-90 transition-opacity"
                  style={{ background: "#F5C518" }}
                >
                  <FiCamera className="w-3.5 h-3.5 text-gray-900" />
                </button>
              </div>

              <div>
                <h1 className="text-2xl font-extrabold text-white leading-tight">
                  Edit Profile
                </h1>
                <p className="text-white/55 text-sm mt-0.5">@{currentUser.username}</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Form card ── */}
      <section className="container-app py-10 flex-1">
        <motion.div
          className="max-w-lg"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeSlideUp} className="card p-6 sm:p-8">
            <div className="flex flex-col gap-5">

              {/* Full Name */}
              <div>
                <label className="input-label">Full Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Your full name"
                  value={form.fullName}
                  onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                />
              </div>

              {/* Bio */}
              <div>
                <label className="input-label">Bio</label>
                <textarea
                  className="input-field resize-none"
                  rows={3}
                  placeholder="Tell buyers a little about yourself…"
                  value={form.bio}
                  onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                />
              </div>

              {/* School */}
              <div>
                <label className="input-label">School</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. University of Lagos"
                  value={form.school}
                  onChange={(e) => setForm((p) => ({ ...p, school: e.target.value }))}
                />
              </div>

              {/* WhatsApp */}
              <div>
                <label className="input-label">WhatsApp Number</label>
                <p className="text-xs text-gray-400 mb-2">
                  This number will be shown on your listings so buyers can contact you.
                </p>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="e.g. +2348012345678"
                  value={form.whatsapp}
                  onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))}
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-accent-600 text-sm">{error}</p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  className="btn-primary flex items-center gap-2"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <FiSave className="w-4 h-4" />
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => navigate(`/profile/${currentUser.id}`)}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
};

export default EditProfilePage;
