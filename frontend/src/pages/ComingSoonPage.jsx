// src/pages/ComingSoonPage.jsx

import { useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import HomeTicker from "../components/home/HomeTicker";
const heroContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const getCountdown = (targetDate) => {
  const now = new Date();
  const target = new Date(targetDate);

  const diff = target.getTime() - now.getTime();

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
};
const fadeSlideUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const CountdownCard = ({ title, countdown, accent }) => (
  <div
    className="rounded-3xl border border-white/10 p-3 sm:p-5 flex-1"
    style={{ background: "rgba(255,255,255,0.06)" }}
  >
    <p
      className="text-xs uppercase tracking-[0.25em] mb-4 font-semibold break-words"
      style={{ color: accent }}
    >
      {title}
    </p>

    <div className="grid grid-cols-4 gap-1 sm:gap-3 text-center">
      {[
        { label: "Days", value: countdown.days },
        { label: "Hours", value: countdown.hours },
        { label: "Min", value: countdown.minutes },
        { label: "Sec", value: countdown.seconds },
      ].map((item) => (
        <div key={item.label}>
          <div
            className="font-extrabold"
            style={{ color: "#F5C518", fontSize: "clamp(1rem, 4vw, 1.875rem)" }}
          >
            {String(item.value).padStart(2, "0")}
          </div>

          <div className="text-white/45 text-xs mt-1">{item.label}</div>
        </div>
      ))}
    </div>
  </div>
);

// Map routes to human-readable names & icons
const PAGE_META = {
  "/messages": {
    icon: "💬",
    name: "Messages",
    desc: "In-app messaging between buyers and sellers.",
    launchDate: "August 23, 2026",
  },

  "/saved": {
    icon: "❤️",
    name: "Saved Items",
    desc: "Your personal wishlist of bookmarked listings.",
    launchDate: "August 23, 2026",
  },

  "/notifications": {
    icon: "🔔",
    name: "Notifications",
    desc: "Alerts for listing activity, price drops, and more.",
    launchDate: "August 23, 2026",
  },

  "/profile": {
    icon: "👤",
    name: "Profile Settings",
    desc: "Edit your bio, photo, and university info.",
    launchDate: "August 23, 2026",
  },

  "/my-listings": {
    icon: "📋",
    name: "My Listings",
    desc: "Manage, edit, and re-post your active listings.",
    launchDate: "August 23, 2026",
  },

  "/admin": {
    icon: "🛠️",
    name: "Admin Panel",
    desc: "Platform management tools — for admins only.",
    launchDate: "August 23, 2026",
  },

  "/features": {
    icon: "✨",
    name: "Features",
    desc: "Additional TrendTribe experiences and enhancements.",
    launchDate: "July 12, 2026",
  },
};

const ComingSoonPage = () => {
  const reduced = useReducedMotion();
  const { pathname } = useLocation();
  const [phaseTwoCountdown, setPhaseTwoCountdown] = useState(
    getCountdown("2026-08-23T00:00:00+01:00"),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseTwoCountdown(getCountdown("2026-08-23T00:00:00+01:00"));
    }, 1000);

    return () => clearInterval(interval);
  }, []);
  const meta = PAGE_META[pathname] ?? {
    icon: "🚀",
    name: "This Feature",
    desc: "We're putting the finishing touches on this experience.",
    launchDate: "August 23, 2026",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
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

      {/* Ambient glows */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-15%",
          left: "-10%",
          width: "55%",
          height: "70%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle,rgba(26,79,214,0.45),transparent 70%)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "-15%",
          right: "-5%",
          width: "45%",
          height: "60%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle,rgba(245,197,24,0.08),transparent 70%)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "30%",
          left: "30%",
          width: "35%",
          height: "50%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle,rgba(123,184,240,0.1),transparent 65%)",
          filter: "blur(90px)",
          pointerEvents: "none",
        }}
      />

      {/* Content */}
      <div className="container-app relative z-10 py-12 md:py-24 overflow-hidden">
        <motion.div
          className="max-w-lg w-full text-center mx-auto overflow-hidden"
          variants={reduced ? {} : heroContainer}
          initial={reduced ? false : "hidden"}
          animate="visible"
        >
          {/* Badge */}
          <motion.div
            variants={reduced ? {} : fadeSlideUp}
            className="flex justify-center mb-8"
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2">
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
                Launching {meta.launchDate}
              </span>
            </div>
          </motion.div>
          <motion.div variants={reduced ? {} : fadeSlideUp} className="mb-6 sm:mb-10">
            <p className="text-white/35 text-xs uppercase tracking-[0.25em] mb-4 text-center">
              Countdown to Launch
            </p>

            <div className="grid gap-4">
              <CountdownCard
                title="🌟 Full Experience Launch • August 23"
                countdown={phaseTwoCountdown}
                accent="#F5C518"
              />
            </div>

            <p className="text-white/30 text-xs text-center mt-4">
              All countdowns are shown in Nigeria time (WAT).
            </p>
          </motion.div>
          {/* Icon */}
          <motion.div
            variants={reduced ? {} : fadeSlideUp}
            className="text-7xl mb-6 select-none"
            style={{ filter: "drop-shadow(0 8px 24px rgba(245,197,24,0.2))" }}
          >
            {meta.icon}
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={reduced ? {} : fadeSlideUp}
            className="font-extrabold text-white mb-4 leading-tight" style={{ fontSize: "clamp(1.6rem, 5vw, 3rem)" }}
          >
            <>
              {meta.name}
              <span style={{ color: "#F5C518" }}>
                {" "}
                launches {meta.launchDate}
              </span>
            </>
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={reduced ? {} : fadeSlideUp}
            className="text-white/65 leading-relaxed mb-6 sm:mb-10" style={{ fontSize: "clamp(0.95rem, 3vw, 1.125rem)" }}
          >
            {meta.desc} This experience officially opens on{" "}
            <strong>{meta.launchDate}</strong>. Join the notification list and
            we'll let you know the moment it's live.
          </motion.p>
          <motion.div variants={reduced ? {} : fadeSlideUp} className="mb-6 sm:mb-10">
            <p className="text-white/30 text-xs uppercase tracking-widest mb-4">
              Meanwhile, here's what's trending on TrendTribe
            </p>

            <HomeTicker variant="marketplace" />
          </motion.div>
          {/* WhatsApp community */}
          <motion.div variants={reduced ? {} : fadeSlideUp} className="mb-6 sm:mb-10">
            <div
              className="rounded-3xl border border-white/15 p-4 sm:p-6 text-center"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <div className="text-4xl mb-4">💬</div>

              <h3 className="text-white font-bold text-lg mb-2">
                Join our WhatsApp Community
              </h3>

              <p className="text-white/60 text-sm leading-relaxed mb-6">
                Get launch updates, feature announcements, and early access news
                directly on WhatsApp.
              </p>

              <motion.a
                href="https://chat.whatsapp.com/HWJAMqgI9ebITZp4CorXOm?s=cl&p=i&ilr=2&amv=1"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={reduced ? {} : { scale: 1.03, y: -2 }}
                whileTap={reduced ? {} : { scale: 0.97 }}
                className="inline-flex items-center justify-center gap-2 font-bold px-6 py-4 rounded-2xl text-sm transition-opacity duration-200 hover:opacity-90"
                style={{
                  background: "#25D366",
                  color: "#FFFFFF",
                }}
              >
                Join WhatsApp Group
                <FiArrowRight className="w-4 h-4" />
              </motion.a>

              <p className="text-white/30 text-xs mt-4">
                We'll only share important updates.
              </p>
            </div>
          </motion.div>

          {/* Divider */}
          <motion.div
            variants={reduced ? {} : fadeSlideUp}
            className="border-t border-white/10 mb-8"
          />

          {/* Navigation options */}
          <motion.div
            variants={reduced ? {} : fadeSlideUp}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <motion.div
              whileHover={reduced ? {} : { scale: 1.04, y: -2 }}
              whileTap={reduced ? {} : { scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 20 }}
            >
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold px-6 py-3 rounded-2xl hover:bg-white/15 transition-colors duration-200 text-sm w-full"
              >
                <FiArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
            </motion.div>
            <motion.div
              whileHover={reduced ? {} : { scale: 1.04, y: -2 }}
              whileTap={reduced ? {} : { scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 20 }}
            >
              <Link
                to="/marketplace"
                className="inline-flex items-center justify-center gap-2 font-semibold px-6 py-3 rounded-2xl text-sm w-full transition-opacity duration-200 hover:opacity-90"
                style={{ background: "#F5C518", color: "#0F1F3D" }}
              >
                Browse Listings
                <FiArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>
          {/* Marketplace preview */}

          {/* What's live */}
          <motion.div variants={reduced ? {} : fadeSlideUp} className="mt-12">
            <p className="text-white/30 text-xs uppercase tracking-widest mb-4">
              Available right now
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { label: "Marketplace", to: "/marketplace" },
                { label: "Create listing", to: "/create-listing" },
                { label: "Browse categories", to: "/marketplace" },
                { label: "Contact sellers", to: "/marketplace" },
              ].map(({ label, to }) => (
                <Link
                  key={label}
                  to={to}
                  className="text-xs font-medium px-3 py-1.5 rounded-full border border-white/15 text-white/55 hover:text-white/80 hover:border-white/30 transition-colors duration-200"
                >
                  {label}
                </Link>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default ComingSoonPage;
