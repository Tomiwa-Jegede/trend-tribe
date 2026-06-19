// src/pages/RegisterPage.jsx

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import FormInput from "../components/ui/FormInput";
import Alert from "../components/ui/Alert";
import {
  FiShoppingBag,
  FiArrowRight,
  FiUser,
  FiBook,
  FiLock,
  FiCheckSquare,
} from "react-icons/fi";

// ── Animation variants ─────────────────────────────────────────
const heroContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const fadeSlideUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

const TICKER_ITEMS = [
  { icon: "🎓", text: "Students only" },
  { icon: "🤝", text: "Meet on campus" },
  { icon: "🔒", text: "Safe peer-to-peer trading" },
  { icon: "⚡", text: "List in 60 seconds" },
  { icon: "🛍️", text: "Fashion, perfumes, electronics & more" },
  { icon: "📍", text: "Trade within your university" },
  { icon: "🧾", text: "No middlemen" },
  { icon: "🎯", text: "Built for campus life" },
  { icon: "💸", text: "Zero fees, zero commissions" },
  { icon: "🏫", text: "Campus-verified students" },
];

const STEPS = [
  {
    icon: FiUser,
    label: "Profile Info",
    desc: "Name & username",
    fields: ["fullName", "username", "email"],
  },
  {
    icon: FiBook,
    label: "School Details",
    desc: "School & matric number",
    fields: ["school", "matricNumber"],
  },
  {
    icon: FiLock,
    label: "Security",
    desc: "Set your password",
    fields: ["password", "confirmPassword"],
  },
  {
    icon: FiCheckSquare,
    label: "Agreements",
    desc: "Terms & privacy",
    fields: ["terms", "privacy"],
    isAgreement: true, // ← flags that these fields live in `agreements`, not `formData`
  },
];

const RegisterPage = () => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    school: "",
    matricNumber: "",
  });

  // ── Separate state for the two agreement checkboxes ─────────
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Derive active step from which fields are filled
  useEffect(() => {
    const filled = (step) =>
      step.fields.every((f) => {
        const value = step.isAgreement ? agreements[f] : formData[f];
        return typeof value === "boolean" ? value : value?.trim?.() || value;
      });

    if (filled(STEPS[3])) setActiveStep(3);
    else if (filled(STEPS[2])) setActiveStep(3);
    else if (filled(STEPS[1])) setActiveStep(2);
    else if (filled(STEPS[0])) setActiveStep(1);
    else setActiveStep(0);
  }, [formData, agreements]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (
      (name === "password" || name === "confirmPassword") &&
      errors.confirmPassword
    ) {
      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }
  };

  const handleAgreementChange = (key) => {
    setAgreements((prev) => ({ ...prev, [key]: !prev[key] }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    else if (formData.fullName.trim().length < 2)
      newErrors.fullName = "Full name must be at least 2 characters";

    if (!formData.username.trim()) newErrors.username = "Username is required";
    else if (formData.username.length < 3 || formData.username.length > 20)
      newErrors.username = "Username must be between 3 and 20 characters";
    else if (!/^[a-zA-Z0-9_]+$/.test(formData.username))
      newErrors.username = "Only letters, numbers, and underscores allowed";

    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Must be a valid email address";

    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";

    if (!formData.confirmPassword)
      newErrors.confirmPassword = "Please confirm your password";
    else if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";

    if (!formData.school.trim()) newErrors.school = "School is required";
    if (!formData.matricNumber.trim())
      newErrors.matricNumber = "Matric number is required";

    // ── New: required agreement checks ─────────────────────────
    if (!agreements.terms) {
      newErrors.terms = "You must agree to the Terms & Conditions";
    }
    if (!agreements.privacy) {
      newErrors.privacy = "You must agree to the Privacy Policy";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        school: formData.school.trim(),
        matricNumber: formData.matricNumber.trim(),
      };
      await api.post("/auth/register", payload);
      navigate("/verify-registration", { replace: true, state: { email: payload.email } });
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
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* ══ SPLIT LAYOUT ══════════════════════════════════════ */}
      <div className="flex flex-1 flex-row-reverse items-start">
        {/* ── Form (right side) ───────────────────────────── */}
        <div className="flex-1 flex items-start justify-center px-6 py-12 bg-white overflow-y-auto h-[calc(100vh-4rem)] no-scrollbar">
          <motion.div
            className="w-full max-w-md"
            variants={reduced ? {} : heroContainer}
            initial={reduced ? false : "hidden"}
            animate="visible"
          >
            {/* Logo + heading */}
            <motion.div
              variants={reduced ? {} : fadeIn}
              className="flex flex-col items-center mb-8"
            >
              <Link to="/" className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/30">
                  <FiShoppingBag className="text-white w-5 h-5" />
                </div>
                <span className="font-bold text-xl text-gray-900">
                  Trend<span className="text-primary-600">Tribe</span>
                </span>
              </Link>
              <h2 className="text-gray-900 text-2xl font-bold">
                Create your account
              </h2>
              <p className="text-gray-500 mt-1 text-sm">
                Join your campus marketplace — it's free
              </p>
            </motion.div>

            {/* Form card */}
            <motion.div
              variants={reduced ? {} : fadeSlideUp}
              className="card p-8 shadow-lg"
            >
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {serverError && (
                  <Alert
                    type="error"
                    message={serverError}
                    onDismiss={() => setServerError("")}
                  />
                )}

                {/* Section 1 — Profile */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                    <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                      <FiUser className="text-white w-3 h-3" />
                    </div>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Profile Info
                    </span>
                  </div>

                  <FormInput
                    label="Full Name"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    error={errors.fullName}
                    placeholder="Tomiwa Jegede"
                    required
                  />
                  <FormInput
                    label="Username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    error={errors.username}
                    placeholder="Jegede01"
                    required
                  />
                  <FormInput
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    placeholder="you@run.edu.ng"
                    required
                  />
                </div>

                {/* Section 2 — School */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                    <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                      <FiBook className="text-white w-3 h-3" />
                    </div>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      School Details
                    </span>
                  </div>

                  <FormInput
                    label="School"
                    name="school"
                    value={formData.school}
                    onChange={handleChange}
                    error={errors.school}
                    placeholder="Redeemer's University"
                    required
                  />
                  <FormInput
                    label="Matric Number"
                    name="matricNumber"
                    value={formData.matricNumber}
                    onChange={handleChange}
                    error={errors.matricNumber}
                    placeholder="e.g. Run/***/**/17200"
                    required
                  />
                </div>

                {/* Section 3 — Password */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                    <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                      <FiLock className="text-white w-3 h-3" />
                    </div>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Security
                    </span>
                  </div>

                  <FormInput
                    label="Password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    placeholder="At least 6 characters"
                    required
                  />
                  <FormInput
                    label="Confirm Password"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    placeholder="Re-enter your password"
                    required
                  />
                </div>

                {/* Section 4 — Agreements (NEW) */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                    <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                      <FiCheckSquare className="text-white w-3 h-3" />
                    </div>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Agreements
                    </span>
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreements.terms}
                      onChange={() => handleAgreementChange("terms")}
                      className={`mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-600
                                 focus:ring-2 focus:ring-primary-500 cursor-pointer ${
                                   errors.terms ? "border-red-400" : ""
                                 }`}
                    />
                    <span className="text-sm text-gray-600 leading-snug">
                      I agree to the{" "}
                      <Link
                        to="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 font-medium hover:text-primary-700
                                   underline underline-offset-2"
                      >
                        Terms &amp; Conditions
                      </Link>
                    </span>
                  </label>
                  {errors.terms && (
                    <p className="input-error -mt-1">{errors.terms}</p>
                  )}

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreements.privacy}
                      onChange={() => handleAgreementChange("privacy")}
                      className={`mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-600
                                 focus:ring-2 focus:ring-primary-500 cursor-pointer ${
                                   errors.privacy ? "border-red-400" : ""
                                 }`}
                    />
                    <span className="text-sm text-gray-600 leading-snug">
                      I agree to the{" "}
                      <Link
                        to="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 font-medium hover:text-primary-700
                                   underline underline-offset-2"
                      >
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                  {errors.privacy && (
                    <p className="input-error -mt-1">{errors.privacy}</p>
                  )}
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex items-center justify-center gap-2 py-3 mt-1"
                  whileHover={reduced ? {} : { scale: 1.02 }}
                  whileTap={reduced ? {} : { scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 380, damping: 20 }}
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <FiArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>

            <motion.p
              variants={reduced ? {} : fadeIn}
              className="text-center text-sm text-gray-500 mt-6"
            >
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-primary-600 font-semibold hover:text-primary-700"
              >
                Log in
              </Link>
            </motion.p>
          </motion.div>
        </div>

        {/* ── Dark hero panel (left side) ─────────────────── */}
        <div
          className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center sticky top-16 h-[calc(100vh-4rem)]"
          style={{ background: "#0F1F3D" }}
        >
          {/* Grid */}
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          {/* Glows */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "-10%",
              left: "-15%",
              width: "55%",
              height: "70%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 40% 40%, rgba(26,79,214,0.45), transparent 70%)",
              filter: "blur(80px)",
              pointerEvents: "none",
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: "-15%",
              left: "5%",
              width: "45%",
              height: "65%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 60% 60%, rgba(123,184,240,0.22), transparent 70%)",
              filter: "blur(100px)",
              pointerEvents: "none",
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "20%",
              left: "25%",
              width: "35%",
              height: "55%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 50% 50%, rgba(245,197,24,0.08), transparent 65%)",
              filter: "blur(90px)",
              pointerEvents: "none",
            }}
          />

          <motion.div
            className="relative z-10 flex flex-col items-start px-12 w-full max-w-lg"
            variants={reduced ? {} : heroContainer}
            initial={reduced ? false : "hidden"}
            animate="visible"
          >
            {/* Badge */}
            <motion.div
              variants={reduced ? {} : fadeIn}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-8"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: "#F5C518" }}
                />
                <span
                  className="relative inline-flex h-2 w-2 rounded-full"
                  style={{ background: "#F5C518" }}
                />
              </span>
              <span className="text-white/70 text-xs font-medium">
                Now open for your campus
              </span>
            </motion.div>

            {/* Headline */}
            <motion.div variants={reduced ? {} : fadeSlideUp} className="mb-10">
              <h3 className="text-white text-4xl font-extrabold leading-tight mb-4">
                Join your campus.
                <br />
                <span style={{ color: "#F5C518" }}>Start trading today.</span>
              </h3>
              <p className="text-white/60 text-base leading-relaxed max-w-sm">
                Create your free account in seconds and connect with verified
                students at your school.
              </p>
            </motion.div>

            {/* Step indicator */}
            <motion.div
              variants={reduced ? {} : fadeSlideUp}
              className="flex flex-col gap-4 w-full"
            >
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                const isDone = i < activeStep;
                const isCurrent = i === activeStep;
                return (
                  <motion.div
                    key={i}
                    className="flex items-center gap-4 px-5 py-4 rounded-2xl"
                    style={{
                      background: isCurrent
                        ? "rgba(245,197,24,0.10)"
                        : isDone
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(255,255,255,0.04)",
                      border: isCurrent
                        ? "1px solid rgba(245,197,24,0.35)"
                        : isDone
                          ? "1px solid rgba(255,255,255,0.12)"
                          : "1px solid rgba(255,255,255,0.07)",
                      transition: "all 0.4s ease",
                    }}
                    animate={
                      reduced ? {} : { opacity: isDone || isCurrent ? 1 : 0.45 }
                    }
                  >
                    {/* Icon circle */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isDone
                          ? "rgba(245,197,24,0.25)"
                          : isCurrent
                            ? "rgba(245,197,24,0.20)"
                            : "rgba(255,255,255,0.08)",
                        border:
                          isDone || isCurrent
                            ? "1px solid rgba(245,197,24,0.4)"
                            : "1px solid rgba(255,255,255,0.12)",
                        transition: "all 0.4s ease",
                      }}
                    >
                      {isDone ? (
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M3 8l3.5 3.5L13 5"
                            stroke="#F5C518"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <Icon
                          className="w-4 h-4"
                          style={{
                            color: isCurrent
                              ? "#F5C518"
                              : "rgba(255,255,255,0.4)",
                          }}
                        />
                      )}
                    </div>

                    {/* Labels */}
                    <div className="flex flex-col">
                      <span
                        className="text-sm font-semibold"
                        style={{
                          color:
                            isDone || isCurrent
                              ? "#fff"
                              : "rgba(255,255,255,0.4)",
                          transition: "color 0.4s ease",
                        }}
                      >
                        {step.label}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        {step.desc}
                      </span>
                    </div>

                    {/* Current pill */}
                    {isCurrent && (
                      <motion.span
                        className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(245,197,24,0.2)",
                          color: "#F5C518",
                          border: "1px solid rgba(245,197,24,0.3)",
                        }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        Current
                      </motion.span>
                    )}
                    {isDone && (
                      <span
                        className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.35)",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        Done
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        </div>
      </div>
      {/* end split layout */}

      {/* ══ TICKER BAR ════════════════════════════════════════ */}
      <div
        style={{
          background: "#0a1628",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          overflow: "hidden",
          position: "relative",
          paddingTop: "14px",
          paddingBottom: "14px",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "80px",
            background: "linear-gradient(90deg, #0a1628 0%, transparent 100%)",
            zIndex: 2,
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: "80px",
            background: "linear-gradient(270deg, #0a1628 0%, transparent 100%)",
            zIndex: 2,
            pointerEvents: "none",
          }}
        />
        <motion.div
          className="flex items-center"
          animate={reduced ? {} : { x: ["0%", "-50%"] }}
          transition={{ duration: 28, ease: "linear", repeat: Infinity }}
        >
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <div key={i} className="inline-flex items-center flex-shrink-0">
              <div className="inline-flex items-center gap-2 px-6">
                <span style={{ fontSize: "15px" }}>{item.icon}</span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.55)",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.01em",
                  }}
                >
                  {item.text}
                </span>
              </div>
              <span
                style={{
                  width: "3px",
                  height: "3px",
                  borderRadius: "50%",
                  background: "rgba(245,197,24,0.4)",
                  flexShrink: 0,
                }}
              />
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default RegisterPage;
