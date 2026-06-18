// src/pages/HomePage.jsx

import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useInView } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  FiSearch,
  FiShield,
  FiUsers,
  FiArrowRight,
  FiStar,
} from "react-icons/fi";

import HomeTicker from "../components/home/HomeTicker";

// ── Static data ────────────────────────────────────────────────
const CATEGORIES = [
  { label: "Books", emoji: "📚", value: "BOOKS" },
  { label: "Electronics", emoji: "💻", value: "ELECTRONICS" },
  { label: "Clothing", emoji: "👗", value: "CLOTHING" },
  { label: "Furniture", emoji: "🪑", value: "FURNITURE" },
  { label: "Stationery", emoji: "✏️", value: "STATIONERY" },
  { label: "Sports", emoji: "⚽", value: "SPORTS" },
  { label: "Food", emoji: "🍱", value: "FOOD" },
  { label: "Services", emoji: "🛠️", value: "SERVICES" },
];

const FEATURES = [
  {
    icon: <FiUsers className="w-6 h-6 text-primary-600" />,
    title: "Students Only",
    desc: "A trusted community built exclusively for university and college students.",
  },
  {
    icon: <FiSearch className="w-6 h-6 text-primary-600" />,
    title: "Easy Discovery",
    desc: "Search, filter by category, condition, and price to find exactly what you need.",
  },
  {
    icon: <FiShield className="w-6 h-6 text-primary-600" />,
    title: "Safe Trading",
    desc: "Meet on campus, inspect before you buy. Simple and secure peer-to-peer trading.",
  },
  {
    icon: <FiStar className="w-6 h-6 text-primary-600" />,
    title: "Free to Use",
    desc: "No listing fees, no commissions. Post your items and connect with buyers for free.",
  },
];

// ── Framer Motion variants ─────────────────────────────────────
const heroContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

const fadeSlideUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

const sectionReveal = {
  hidden: {
    opacity: 0,
    y: 32,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

// ── Scroll-reveal wrapper ──────────────────────────────────────
const RevealSection = ({ children, className = "", delay = 0 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, {
    once: true,
    margin: "-80px",
  });

  const reduced = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={reduced ? {} : sectionReveal}
      initial={reduced ? false : "hidden"}
      animate={inView ? "visible" : "hidden"}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
};

// ── Main component ─────────────────────────────────────────────
const HomePage = () => {
  const { isAuthenticated } = useAuth();
  const reduced = useReducedMotion();

  return (
    <div className="flex flex-col">
      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section
        className="relative text-white overflow-hidden min-h-[88vh] flex items-center"
        style={{ background: "#0F1F3D" }}
      >
        {/* ── Grid texture ── */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* ── Static ambient glows ── */}
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
            zIndex: 0,
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
            zIndex: 0,
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
            zIndex: 0,
          }}
        />

        {/* ── Ticker rows — full bleed background ── */}
        <HomeTicker variant="hero" />

        {/* ── Dark scrim so text pops ── */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(135deg,rgba(15,31,61,0.65) 0%,rgba(15,31,61,0.35) 50%,rgba(15,31,61,0.58) 100%)",
          }}
        />

        {/* ── Foreground content ── */}
        <div className="container-app relative z-10 w-full py-24 lg:py-32">
          <div className="flex justify-start">
            {/* ── Left: Hero text ── */}
            <motion.div
              className="max-w-xl"
              variants={reduced ? {} : heroContainer}
              initial={reduced ? false : "hidden"}
              animate="visible"
            >
              {/* Launch badge */}
              <motion.div
                variants={reduced ? {} : fadeIn}
                className="inline-flex items-center gap-2 bg-white/10
             backdrop-blur-sm border border-white/20 rounded-full
             px-4 py-2 mb-8"
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
                <span className="text-sm font-semibold text-white/90">
                  Now open for your campus
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                variants={reduced ? {} : fadeSlideUp}
                className="text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6"
              >
                Buy & Sell Within
                <motion.span
                  variants={reduced ? {} : fadeSlideUp}
                  className="block relative"
                  style={{ color: "#F5C518" }}
                >
                  Your Campus
                  <span
                    className="absolute left-0 -bottom-1 h-0.5 w-2/3 rounded-full"
                    style={{ background: "#F5C518", opacity: 0.4 }}
                  />
                </motion.span>
              </motion.h1>

              {/* Subheading */}
              <motion.p
                variants={reduced ? {} : fadeSlideUp}
                className="text-lg text-white/75 leading-relaxed mb-10"
              >
                TrendTribe connects students to buy, sell, and trade fashion,
                accessories, perfumes and more — all within your university
                community. No fees, no middlemen.
              </motion.p>

              {/* CTAs */}
              <motion.div
                variants={reduced ? {} : fadeSlideUp}
                className="flex flex-col sm:flex-row gap-4 mb-12"
              >
                <motion.div
                  whileHover={reduced ? {} : { scale: 1.04, y: -2 }}
                  whileTap={reduced ? {} : { scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 380, damping: 20 }}
                >
                  <Link
                    to="/marketplace"
                    className="inline-flex items-center justify-center gap-2
                               bg-white text-primary-700 font-bold px-8 py-4
                               rounded-2xl text-lg shadow-xl shadow-black/25
                               hover:bg-primary-50 transition-colors duration-200 w-full"
                  >
                    <FiSearch className="w-5 h-5" />
                    Browse Listings
                  </Link>
                </motion.div>

                {!isAuthenticated ? (
                  <motion.div
                    whileHover={reduced ? {} : { scale: 1.04, y: -2 }}
                    whileTap={reduced ? {} : { scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 380, damping: 20 }}
                  >
                    <Link
                      to="/register"
                      className="inline-flex items-center justify-center gap-2
                                 font-bold px-8 py-4 rounded-2xl text-lg
                                 transition-colors duration-200 w-full"
                      style={{
                        background: "#F5C518",
                        color: "#0F1F3D",
                        boxShadow: "0 8px 24px rgba(245,197,24,0.35)",
                      }}
                    >
                      Join Free
                      <motion.span
                        animate={reduced ? {} : { x: [0, 4, 0] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <FiArrowRight className="w-5 h-5" />
                      </motion.span>
                    </Link>
                  </motion.div>
                ) : (
                  <motion.div
                    whileHover={reduced ? {} : { scale: 1.04, y: -2 }}
                    whileTap={reduced ? {} : { scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 380, damping: 20 }}
                  >
                    <Link
                      to="/create-listing"
                      className="inline-flex items-center justify-center gap-2
                                 bg-white/10 backdrop-blur-sm border border-white/30
                                 text-white font-bold px-8 py-4 rounded-2xl
                                 hover:bg-white/20 transition-colors duration-200
                                 text-lg w-full"
                    >
                      Sell an Item
                      <motion.span
                        animate={reduced ? {} : { x: [0, 4, 0] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <FiArrowRight className="w-5 h-5" />
                      </motion.span>
                    </Link>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ INFO BAR ══════════════════════════════════════════ */}
      <HomeTicker variant="info" />

      {/* ══ CATEGORIES ════════════════════════════════════════ */}
      <section className="container-app py-20">
        <RevealSection className="text-center mb-12">
          <h2 className="text-gray-900 mb-4">Browse by Category</h2>
          <p className="text-gray-500 text-lg max-w-lg mx-auto">
            Find exactly what you need — from jerseys and perfumes to dorm
            furniture.
          </p>
        </RevealSection>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {CATEGORIES.map(({ label, emoji, value }, i) => (
            <motion.div
              key={value}
              initial={reduced ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
            >
              <motion.div
                whileHover={reduced ? {} : { y: -4, scale: 1.03 }}
                whileTap={reduced ? {} : { scale: 0.97 }}
                transition={{ type: "spring", stiffness: 380, damping: 22 }}
              >
                <Link
                  to={`/marketplace?category=${value}`}
                  className="card flex flex-col items-center gap-3 p-5 cursor-pointer group"
                >
                  <span className="text-3xl group-hover:scale-110 transition-transform duration-200">
                    {emoji}
                  </span>
                  <span className="text-xs font-semibold text-gray-600 group-hover:text-primary-600 transition-colors text-center">
                    {label}
                  </span>
                </Link>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══ FEATURES ══════════════════════════════════════════ */}
      <section className="py-20" style={{ background: "#EEF4FF" }}>
        <div className="container-app">
          <RevealSection className="text-center mb-12">
            <h2 className="text-gray-900 mb-4">Why TrendTribe?</h2>
            <p className="text-gray-500 text-lg max-w-lg mx-auto">
              Built by students, for students. Everything you need to trade
              safely within your campus.
            </p>
          </RevealSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={reduced ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: i * 0.1, ease: "easeOut" }}
                whileHover={
                  reduced
                    ? {}
                    : { y: -4, boxShadow: "0 12px 32px rgba(0,0,0,0.08)" }
                }
                className="card p-6 cursor-default"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "#DAE8FF" }}
                >
                  {icon}
                </div>
                <h4 className="text-gray-900 mb-2">{title}</h4>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA SECTION ═══════════════════════════════════════ */}
      {!isAuthenticated && (
        <section className="container-app py-20">
          <RevealSection>
            <div
              className="rounded-3xl p-12 text-center text-white relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, #0F1F3D 0%, #1340B8 60%, #1A4FD6 100%)",
              }}
            >
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                aria-hidden="true"
              >
                <div
                  className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-20"
                  style={{ background: "#F5C518", filter: "blur(48px)" }}
                />
                <div
                  className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full opacity-15"
                  style={{ background: "#7BB8F0", filter: "blur(48px)" }}
                />
              </div>

              <div className="relative">
                <motion.h2
                  className="text-4xl font-extrabold mb-4"
                  initial={reduced ? false : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  Ready to Start Trading?
                </motion.h2>

                <motion.p
                  className="text-white/70 text-lg mb-8 max-w-md mx-auto"
                  initial={reduced ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                >
                  Join thousands of students already buying and selling on
                  TrendTribe. It's completely free.
                </motion.p>

                <motion.div
                  className="flex flex-col sm:flex-row gap-4 justify-center"
                  initial={reduced ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                >
                  <motion.div
                    whileHover={reduced ? {} : { scale: 1.05, y: -2 }}
                    whileTap={reduced ? {} : { scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 380, damping: 20 }}
                  >
                    <Link
                      to="/register"
                      className="inline-flex items-center justify-center gap-2
                                 font-bold px-8 py-4 rounded-2xl text-lg
                                 shadow-lg transition-colors duration-200"
                      style={{ background: "#F5C518", color: "#0F1F3D" }}
                    >
                      Create Free Account
                      <FiArrowRight className="w-5 h-5" />
                    </Link>
                  </motion.div>

                  <motion.div
                    whileHover={reduced ? {} : { scale: 1.05, y: -2 }}
                    whileTap={reduced ? {} : { scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 380, damping: 20 }}
                  >
                    <Link
                      to="/marketplace"
                      className="inline-flex items-center justify-center gap-2
                                 bg-white/10 border border-white/25 text-white
                                 font-bold px-8 py-4 rounded-2xl hover:bg-white/20
                                 transition-colors duration-200 text-lg"
                    >
                      Browse First
                    </Link>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </RevealSection>
        </section>
      )}
    </div>
  );
};

export default HomePage;
