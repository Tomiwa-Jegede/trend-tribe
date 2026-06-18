// src/pages/FeaturesPage.jsx

import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useInView } from "framer-motion";
import {
  FiSearch,
  FiShield,
  FiUsers,
  FiArrowRight,
  FiStar,
  FiHeart,
  FiMessageCircle,
  FiBell,
  FiCamera,
  FiTag,
  FiTrendingUp,
  FiSmartphone,
} from "react-icons/fi";

const heroContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const fadeSlideUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const sectionReveal = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const RevealSection = ({ children, className = "", delay = 0 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
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

// ── Feature card ──────────────────────────────────────────────
const FeatureCard = ({ icon, title, desc, delay = 0, comingSoon = false }) => {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      whileHover={reduced ? {} : { y: -4 }}
      className="card p-6 relative flex flex-col gap-3"
    >
      {comingSoon && (
        <span
          className="absolute top-4 right-4 text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ background: "#FEF3CD", color: "#856404" }}
        >
          Coming soon
        </span>
      )}
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: "#DAE8FF" }}
      >
        <span className="text-primary-600">{icon}</span>
      </div>
      <div>
        <h4 className="text-gray-900 mb-1">{title}</h4>
        <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
};

// ── How it works step ─────────────────────────────────────────
const Step = ({ number, title, desc, delay = 0 }) => {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className="flex gap-4"
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm mt-0.5"
        style={{ background: "#F5C518", color: "#0F1F3D" }}
      >
        {number}
      </div>
      <div>
        <h4 className="text-gray-900 mb-1">{title}</h4>
        <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
};

// ── Category pill ─────────────────────────────────────────────
const CATEGORIES = [
  { emoji: "👗", label: "Clothing" },
  { emoji: "👟", label: "Footwear" },
  { emoji: "🌸", label: "Perfumes" },
  { emoji: "💻", label: "Electronics" },
  { emoji: "📚", label: "Books" },
  { emoji: "🪑", label: "Furniture" },
  { emoji: "⚽", label: "Sports" },
  { emoji: "🍱", label: "Food" },
  { emoji: "✏️", label: "Stationery" },
  { emoji: "🛠️", label: "Services" },
];

// ── Main component ────────────────────────────────────────────
const FeaturesPage = () => {
  const reduced = useReducedMotion();

  return (
    <div className="flex flex-col">
      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section
        className="relative text-white overflow-hidden"
        style={{
          background: "#0F1F3D",
          paddingTop: "96px",
          paddingBottom: "96px",
        }}
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
            top: "-10%",
            left: "-10%",
            width: "50%",
            height: "70%",
            borderRadius: "50%",
            background:
              "radial-gradient(circle,rgba(26,79,214,0.4),transparent 70%)",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: "-15%",
            right: "0%",
            width: "40%",
            height: "60%",
            borderRadius: "50%",
            background:
              "radial-gradient(circle,rgba(245,197,24,0.08),transparent 70%)",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />

        <div className="container-app relative z-10">
          <motion.div
            variants={reduced ? {} : heroContainer}
            initial={reduced ? false : "hidden"}
            animate="visible"
            className="max-w-2xl"
          >
            {/* Badge */}
            <motion.div
              variants={reduced ? {} : fadeSlideUp}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-8"
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
                Built for campus life
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={reduced ? {} : fadeSlideUp}
              className="text-5xl lg:text-6xl font-extrabold leading-tight mb-6"
            >
              Everything you need
              <span className="block" style={{ color: "#F5C518" }}>
                to trade on campus
              </span>
            </motion.h1>

            <motion.p
              variants={reduced ? {} : fadeSlideUp}
              className="text-lg text-white/70 leading-relaxed mb-10 max-w-xl"
            >
              TrendTribe is a peer-to-peer marketplace built exclusively for
              university students. List an item, find a buyer, meet on campus —
              no fees, no middlemen, no drama.
            </motion.p>

            <motion.div
              variants={reduced ? {} : fadeSlideUp}
              className="flex flex-col sm:flex-row gap-4"
            >
              <motion.div
                whileHover={reduced ? {} : { scale: 1.04, y: -2 }}
                whileTap={reduced ? {} : { scale: 0.97 }}
                transition={{ type: "spring", stiffness: 380, damping: 20 }}
              >
                <Link
                  to="/marketplace"
                  className="inline-flex items-center justify-center gap-2 bg-white text-primary-700 font-bold px-8 py-4 rounded-2xl text-lg shadow-xl shadow-black/25 hover:bg-primary-50 transition-colors duration-200 w-full"
                >
                  <FiSearch className="w-5 h-5" />
                  Browse Listings
                </Link>
              </motion.div>
              <motion.div
                whileHover={reduced ? {} : { scale: 1.04, y: -2 }}
                whileTap={reduced ? {} : { scale: 0.97 }}
                transition={{ type: "spring", stiffness: 380, damping: 20 }}
              >
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 font-bold px-8 py-4 rounded-2xl text-lg transition-colors duration-200 w-full"
                  style={{
                    background: "#F5C518",
                    color: "#0F1F3D",
                    boxShadow: "0 8px 24px rgba(245,197,24,0.3)",
                  }}
                >
                  Join Free
                  <FiArrowRight className="w-5 h-5" />
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══ INFO BAR ══════════════════════════════════════════ */}
      <div
        style={{
          background: "#0a1628",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
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
          {[
            ...[
              { icon: "🎓", text: "Students only" },
              { icon: "🤝", text: "Meet on campus" },
              { icon: "🔒", text: "Safe peer-to-peer trading" },
              { icon: "⚡", text: "List in 60 seconds" },
              { icon: "🛍️", text: "Fashion, perfumes, electronics & more" },
              { icon: "📍", text: "Trade within your university" },
              { icon: "🧾", text: "No middlemen" },
              { icon: "🎯", text: "Built for campus life" },
            ],
            ...[
              { icon: "🎓", text: "Students only" },
              { icon: "🤝", text: "Meet on campus" },
              { icon: "🔒", text: "Safe peer-to-peer trading" },
              { icon: "⚡", text: "List in 60 seconds" },
              { icon: "🛍️", text: "Fashion, perfumes, electronics & more" },
              { icon: "📍", text: "Trade within your university" },
              { icon: "🧾", text: "No middlemen" },
              { icon: "🎯", text: "Built for campus life" },
            ],
          ].map((item, i) => (
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
      {/* ══ CORE FEATURES ═════════════════════════════════════ */}
      <section className="container-app py-20">
        <RevealSection className="text-center mb-14">
          <p className="text-primary-600 font-semibold text-sm uppercase tracking-widest mb-3">
            What you get
          </p>
          <h2 className="text-gray-900 mb-4">Features that actually matter</h2>
          <p className="text-gray-500 text-lg max-w-lg mx-auto">
            No bloat. Just the tools students need to buy and sell safely within
            their campus.
          </p>
        </RevealSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          <FeatureCard
            delay={0}
            icon={<FiSearch className="w-5 h-5" />}
            title="Search & filter"
            desc="Find exactly what you need with filters for category, price range, and item condition. Results update instantly."
          />
          <FeatureCard
            delay={0.05}
            icon={<FiTag className="w-5 h-5" />}
            title="List in 60 seconds"
            desc="Post an item fast. Upload photos, set your price, pick a category, and go live. Zero listing fees, zero commission."
          />
          <FeatureCard
            delay={0.1}
            icon={<FiCamera className="w-5 h-5" />}
            title="Multi-photo uploads"
            desc="Show your item from every angle. Buyers see exactly what they're getting before reaching out."
          />
          <FeatureCard
            delay={0.15}
            icon={<FiMessageCircle className="w-5 h-5" />}
            title="WhatsApp contact"
            desc={`Tap "Contact Seller" and you're taken straight to WhatsApp with the listing details pre-filled. Simple, fast, no accounts needed.`}
          />
          <FeatureCard
            delay={0.2}
            icon={<FiUsers className="w-5 h-5" />}
            title="Students only"
            desc="TrendTribe is for verified university and college students. Your campus, your community, your marketplace."
          />
          <FeatureCard
            delay={0.25}
            icon={<FiShield className="w-5 h-5" />}
            title="Safe, on-campus trading"
            desc="Meet in a public spot on campus, inspect the item, pay cash. No shipping, no scams, no uncertainty."
          />
          <FeatureCard
            delay={0.3}
            icon={<FiHeart className="w-5 h-5" />}
            title="Save listings"
            desc="Bookmark items you're interested in and come back to them later from your saved items page."
            comingSoon
          />
          <FeatureCard
            delay={0.35}
            icon={<FiStar className="w-5 h-5" />}
            title="Seller ratings"
            desc="Rate buyers and sellers after a trade. Build a reputation that makes future deals easier."
            comingSoon
          />
          <FeatureCard
            delay={0.4}
            icon={<FiBell className="w-5 h-5" />}
            title="Notifications"
            desc="Get alerted when someone enquires about your listing or when a saved item's price drops."
            comingSoon
          />
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════ */}
      <section className="py-20" style={{ background: "#EEF4FF" }}>
        <div className="container-app">
          <RevealSection className="text-center mb-14">
            <p className="text-primary-600 font-semibold text-sm uppercase tracking-widest mb-3">
              Simple by design
            </p>
            <h2 className="text-gray-900 mb-4">How TrendTribe works</h2>
            <p className="text-gray-500 text-lg max-w-lg mx-auto">
              Buying or selling takes minutes, not days.
            </p>
          </RevealSection>

          <div className="grid md:grid-cols-2 gap-16 items-start">
            {/* Selling */}
            <div>
              <RevealSection>
                <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                  <span className="text-2xl">🏷️</span> Selling an item
                </h3>
              </RevealSection>
              <div className="flex flex-col gap-7">
                <Step
                  number="1"
                  title="Create a free account"
                  desc="Sign up with your school email in under a minute. No credit card, no payment info needed."
                  delay={0}
                />
                <Step
                  number="2"
                  title="Post your listing"
                  desc="Upload photos, write a short description, set your price, and choose a category. Your item goes live immediately."
                  delay={0.08}
                />
                <Step
                  number="3"
                  title="Buyer contacts you on WhatsApp"
                  desc='When a student is interested, they tap "Contact Seller" and land in WhatsApp with your listing details already filled in.'
                  delay={0.16}
                />
                <Step
                  number="4"
                  title="Meet on campus & get paid"
                  desc="Agree on a spot, meet up, let them inspect the item, collect your money. Done."
                  delay={0.24}
                />
              </div>
            </div>

            {/* Buying */}
            <div>
              <RevealSection>
                <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                  <span className="text-2xl">🛒</span> Buying an item
                </h3>
              </RevealSection>
              <div className="flex flex-col gap-7">
                <Step
                  number="1"
                  title="Browse or search"
                  desc="Scroll the marketplace or search for exactly what you need. Filter by category, price, and condition."
                  delay={0}
                />
                <Step
                  number="2"
                  title="Check the listing"
                  desc="View photos, read the description, and see the seller's campus and profile."
                  delay={0.08}
                />
                <Step
                  number="3"
                  title="Message the seller on WhatsApp"
                  desc="Tap 'Contact Seller' — you'll be taken to WhatsApp with the item name, price, and photo link pre-filled. No awkward cold opens."
                  delay={0.16}
                />
                <Step
                  number="4"
                  title="Meet, inspect, and pay"
                  desc="Arrange a campus meet. Check the item in person before handing over any money. Simple and safe."
                  delay={0.24}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CATEGORIES ════════════════════════════════════════ */}
      <section className="container-app py-20">
        <RevealSection className="text-center mb-12">
          <p className="text-primary-600 font-semibold text-sm uppercase tracking-widest mb-3">
            What's on TrendTribe
          </p>
          <h2 className="text-gray-900 mb-4">10 categories, one marketplace</h2>
          <p className="text-gray-500 text-lg max-w-lg mx-auto">
            From jerseys to perfumes, textbooks to furniture — if a student owns
            it, it belongs here.
          </p>
        </RevealSection>

        <div className="flex flex-wrap gap-3 justify-center">
          {CATEGORIES.map(({ emoji, label }, i) => (
            <motion.div
              key={label}
              initial={reduced ? false : { opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.3, delay: i * 0.05, ease: "easeOut" }}
              whileHover={reduced ? {} : { scale: 1.06, y: -2 }}
              whileTap={reduced ? {} : { scale: 0.97 }}
            >
              <Link
                to={`/marketplace?category=${label.toUpperCase()}`}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border font-medium text-sm text-gray-700 bg-white hover:border-primary-400 hover:text-primary-700 transition-all duration-200"
                style={{ borderColor: "#D1D5DB" }}
              >
                <span className="text-lg">{emoji}</span>
                {label}
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══ COMMUNITY ═════════════════════════════════════════ */}
      <section className="py-20" style={{ background: "#EEF4FF" }}>
        <div className="container-app">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <RevealSection>
              <p className="text-primary-600 font-semibold text-sm uppercase tracking-widest mb-3">
                Your campus, your market
              </p>
              <h2 className="text-gray-900 mb-5">Built for your community, not the internet.</h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                TrendTribe isn't a general marketplace. It's yours — scoped to your campus,
                filled with people you pass in the hallway, and built around the way students
                actually trade: meet up, check it out, hand over cash.
              </p>
              <div className="flex flex-col gap-4">
                {[
                  ["People you actually know", "Every seller is a student on your campus. No strangers, no couriers, no guessing."],
                  ["Meet where you feel safe", "Arrange meetups at the library, cafeteria, or any familiar spot on campus."],
                  ["No awkward negotiations", "Price is set upfront. Message on WhatsApp, agree, show up. That's it."],
                  ["A community that grows with you", "The more students join, the better the deals. Invite your friends and grow the market together."],
                ].map(([title, desc], i) => (
                  <motion.div
                    key={title}
                    initial={reduced ? false : { opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08, ease: "easeOut" }}
                    className="flex gap-3"
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                      style={{ background: "#F5C518", color: "#0F1F3D" }}
                    >
                      ✓
                    </div>
                    <div>
                      <p className="text-gray-900 font-semibold text-sm">{title}</p>
                      <p className="text-gray-500 text-sm">{desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </RevealSection>

            <RevealSection delay={0.1}>
              <div
                className="rounded-3xl p-10 text-center relative overflow-hidden"
                style={{ background: "#0F1F3D" }}
              >
                <div aria-hidden="true" style={{ position:"absolute",top:"-20px",right:"-20px",width:"140px",height:"140px",borderRadius:"50%",background:"rgba(245,197,24,0.15)",filter:"blur(40px)" }} />
                <div aria-hidden="true" style={{ position:"absolute",bottom:"-20px",left:"-20px",width:"120px",height:"120px",borderRadius:"50%",background:"rgba(123,184,240,0.12)",filter:"blur(40px)" }} />
                <div className="relative">
                  <p className="text-5xl mb-4">🏫</p>
                  <p className="text-white font-bold text-xl mb-2">Your campus ecosystem</p>
                  <p className="text-white/55 text-sm mb-8 leading-relaxed">
                    Every listing, every seller, every deal — all within your university walls.
                  </p>
                  <div className="flex flex-col gap-3 text-left">
                    {[
                      ["🎓", "Students-only community"],
                      ["📍", "Campus-scoped listings"],
                      ["🤝", "In-person, cash transactions"],
                      ["💬", "Direct WhatsApp contact"],
                      ["🔒", "No strangers, no shipping"],
                    ].map(([icon, label]) => (
                      <div key={label} className="flex items-center gap-3 text-white/75 text-sm">
                        <span className="text-base">{icon}</span>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>
      {/* ══ ROADMAP ═══════════════════════════════════════════ */}
      <section className="container-app py-20">
        <RevealSection className="text-center mb-12">
          <p className="text-primary-600 font-semibold text-sm uppercase tracking-widest mb-3">
            What's next
          </p>
          <h2 className="text-gray-900 mb-4">On the roadmap</h2>
          <p className="text-gray-500 text-lg max-w-lg mx-auto">
            These features are in the pipeline. They'll roll out as the platform
            grows.
          </p>
        </RevealSection>

        <div className="grid sm:grid-cols-3 gap-5">
          {[
            {
              emoji: "⭐",
              title: "Seller ratings",
              desc: "Build trust with a reputation system after each trade.",
            },
            {
              emoji: "❤️",
              title: "Saved items",
              desc: "Wishlist listings and revisit them when you're ready.",
            },
            {
              emoji: "🔔",
              title: "Notifications",
              desc: "Alerts for new messages, price drops, and listing activity.",
            },
          ].map(({ emoji, title, desc }, i) => (
            <motion.div
              key={title}
              initial={reduced ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: "easeOut" }}
              className="card p-6 flex flex-col gap-3 border-dashed"
            >
              <span className="text-3xl">{emoji}</span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-gray-900">{title}</h4>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "#FEF3CD", color: "#856404" }}
                  >
                    Soon
                  </span>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══ CTA ═══════════════════════════════════════════════ */}
      <section className="container-app pb-20">
        <RevealSection>
          <div
            className="rounded-3xl p-12 text-center text-white relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, #0F1F3D 0%, #1340B8 60%, #1A4FD6 100%)",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: "-40px",
                right: "-40px",
                width: "200px",
                height: "200px",
                borderRadius: "50%",
                background: "rgba(245,197,24,0.15)",
                filter: "blur(50px)",
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                bottom: "-40px",
                left: "-40px",
                width: "180px",
                height: "180px",
                borderRadius: "50%",
                background: "rgba(123,184,240,0.12)",
                filter: "blur(50px)",
              }}
            />
            <div className="relative">
              <h2 className="text-4xl font-extrabold mb-4">
                Ready to start trading?
              </h2>
              <p className="text-white/70 text-lg mb-8 max-w-md mx-auto">
                Join your campus community on TrendTribe. Free while we grow — be an early member.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.div
                  whileHover={reduced ? {} : { scale: 1.05, y: -2 }}
                  whileTap={reduced ? {} : { scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 380, damping: 20 }}
                >
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 font-bold px-8 py-4 rounded-2xl text-lg shadow-lg transition-colors duration-200"
                    style={{ background: "#F5C518", color: "#0F1F3D" }}
                  >
                    Create Free Account <FiArrowRight className="w-5 h-5" />
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={reduced ? {} : { scale: 1.05, y: -2 }}
                  whileTap={reduced ? {} : { scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 380, damping: 20 }}
                >
                  <Link
                    to="/marketplace"
                    className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/25 text-white font-bold px-8 py-4 rounded-2xl hover:bg-white/20 transition-colors duration-200 text-lg"
                  >
                    Browse First
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </RevealSection>
      </section>
    </div>
  );
};

export default FeaturesPage;
