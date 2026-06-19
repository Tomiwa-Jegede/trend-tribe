// src/pages/LoginPage.jsx

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import FormInput from "../components/ui/FormInput";
import Alert from "../components/ui/Alert";
import {
  FiShoppingBag,
  FiArrowRight,
  FiShield,
  FiUsers,
  FiZap,
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
  { icon: "🎓", text: "Built for students, by a student" },
  { icon: "👁️", text: "Get seen on campus" },
  { icon: "🤝", text: "Student vendors, student buyers" },
  { icon: "🌟", text: "Your hustle deserves visibility" },
  { icon: "👗", text: "Fashion, perfumes, electronics & more" },
  { icon: "📍", text: "Shop within your university" },
  { icon: "💛", text: "Community over competition" },
  { icon: "⚡", text: "List your product in 60 seconds" },
  { icon: "💸", text: "Zero fees, zero commissions" },
  { icon: "🔥", text: "Where student entrepreneurs shine" },
  { icon: "🏫", text: "Exclusively for students" },
  { icon: "📦", text: "Delivered to your dorm" },
];

const FLOAT_CARDS = [
  {
    icon: "💻",
    title: "MacBook Pro 2021",
    category: "Electronics",
    price: "₦350,000",
    top: "8%",
    left: "4%",
    delay: 0,
    duration: 4.2,
  },
  {
    icon: "📚",
    title: "Engineering Textbooks",
    category: "Books",
    price: "₦8,500",
    top: "26%",
    left: "46%",
    delay: 0.6,
    duration: 3.8,
  },
  {
    icon: "👟",
    title: "Nike Air Force 1",
    category: "Clothing",
    price: "₦45,000",
    top: "48%",
    left: "6%",
    delay: 1.1,
    duration: 4.6,
  },
  {
    icon: "🌸",
    title: "Armaf Club de Nuit",
    category: "Perfumes",
    price: "₦25,000",
    top: "66%",
    left: "42%",
    delay: 0.3,
    duration: 3.5,
  },
  {
    icon: "🪑",
    title: "Study Desk",
    category: "Furniture",
    price: "₦22,000",
    top: "84%",
    left: "8%",
    delay: 0.9,
    duration: 4.0,
  },
];

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const reduced = useReducedMotion();

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectTo = location.state?.from || "/";
  const emailVerified = location.state?.emailVerified || false;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.identifier.trim()) {
      newErrors.identifier = "Email or username is required";
    }
    if (!formData.password.trim()) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", formData);
      login(data.token, data.user);
      navigate(data.user.isVerified ? redirectTo : "/verify-email", {
        replace: true,
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
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* ══ SPLIT LAYOUT ══════════════════════════════════════ */}
      <div className="flex flex-1 flex-row-reverse">
        {/* ── Form (right side visually, left in DOM) ────────── */}
        <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
          <motion.div
            className="w-full max-w-md"
            variants={reduced ? {} : heroContainer}
            initial={reduced ? false : "hidden"}
            animate="visible"
          >
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
              <h2 className="text-gray-900 text-2xl font-bold">Welcome back</h2>
              <p className="text-gray-500 mt-1 text-sm">
                Log in to continue trading on campus
              </p>
            </motion.div>

            <motion.div
              variants={reduced ? {} : fadeSlideUp}
              className="card p-8 shadow-lg"
            >
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {emailVerified && (
                  <Alert
                    type="success"
                    message="Email verified! Please log in to continue."
                    onDismiss={() => {}}
                  />
                )}
                {serverError && (
                  <Alert
                    type="error"
                    message={serverError}
                    onDismiss={() => setServerError("")}
                  />
                )}

                <FormInput
                  label="Email or Username"
                  name="identifier"
                  type="text"
                  value={formData.identifier}
                  onChange={handleChange}
                  error={errors.identifier}
                  placeholder="you@run.edu.ng or Username"
                  required
                />

                <FormInput
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  placeholder="••••••••"
                  required
                />

                <div className="flex justify-end -mt-2">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary-600 font-medium hover:text-primary-700"
                  >
                    Forgot password?
                  </Link>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex items-center justify-center gap-2 py-3 mt-2"
                  whileHover={reduced ? {} : { scale: 1.02 }}
                  whileTap={reduced ? {} : { scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 380, damping: 20 }}
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    <>
                      Log In
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
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-primary-600 font-semibold hover:text-primary-700"
              >
                Sign up free
              </Link>
            </motion.p>
          </motion.div>
        </div>

        {/* ── Animated panel (left side visually) ───────────── */}
        <div
          className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center"
          style={{ background: "#0F1F3D" }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
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

            <motion.div variants={reduced ? {} : fadeSlideUp} className="mb-10">
              <h3 className="text-white text-4xl font-extrabold leading-tight mb-4">
                Your campus.
                <br />
                <span style={{ color: "#F5C518" }}>Your marketplace.</span>
              </h3>
              <p className="text-white/60 text-base leading-relaxed max-w-sm">
                Buy and sell with students from your school. Safe, fast, and
                built for campus life.
              </p>
            </motion.div>

            <motion.div
              variants={reduced ? {} : fadeIn}
              className="relative w-full h-72 mb-10"
            >
              {FLOAT_CARDS.map((card, i) => (
                <motion.div
                  key={i}
                  className="absolute flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{
                    top: card.top,
                    left: card.left,
                    minWidth: "190px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    backdropFilter: "blur(12px)",
                  }}
                  animate={reduced ? {} : { y: [0, -10, 0] }}
                  transition={{
                    duration: card.duration,
                    delay: card.delay,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <span className="text-2xl">{card.icon}</span>
                  <div className="text-left">
                    <p className="text-white text-xs font-semibold leading-tight">
                      {card.title}
                    </p>
                    <p className="text-white/50 text-xs">{card.category}</p>
                    <p
                      className="text-sm font-bold mt-0.5"
                      style={{ color: "#F5C518" }}
                    >
                      {card.price}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              variants={reduced ? {} : fadeSlideUp}
              className="flex flex-col gap-4 w-full"
            ></motion.div>
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

export default LoginPage;
