import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { FiEye, FiUsers, FiHeart, FiZap, FiLink } from "react-icons/fi";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13 } },
};

function Section({ children, className = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduced = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      variants={reduced ? {} : stagger}
      initial={reduced ? false : "hidden"}
      animate={inView ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const VALUES = [
  {
    icon: FiEye,
    title: "Visibility",
    desc: "We give student vendors the spotlight they deserve. No more selling only to friends — TrendTribe puts your business in front of the whole campus.",
  },
  {
    icon: FiUsers,
    title: "Community",
    desc: "We're not just a marketplace. We're a space where students support each other, celebrate wins, and grow together.",
  },
  {
    icon: FiHeart,
    title: "Support",
    desc: "Built for students by a student. We understand your hustle because we've lived it — every feature exists to make your life easier.",
  },
  {
    icon: FiZap,
    title: "Vibrance",
    desc: "Campus life is loud, colourful, and full of energy. TrendTribe reflects that — no bland corporate vibes, just authentic student culture.",
  },
  {
    icon: FiLink,
    title: "Connection",
    desc: "Every transaction on TrendTribe is more than a sale. It's a connection between two students making campus life work for them.",
  },
];

const AUDIENCE = [
  {
    emoji: "💼",
    tag: "The Profit Driven",
    name: "Elizabeth, 21",
    desc: "An introverted entrepreneur running a perfume business on campus. She's great at what she does — but visibility is her biggest challenge. TrendTribe gives her the reach she's been missing.",
  },
  {
    emoji: "✨",
    tag: "The Fashion Creative",
    name: "Adeola, 18",
    desc: "A mass comm student and fashion content creator who lives for great outfits. She knows student vendors exist on campus — she just can't find them. TrendTribe fixes that.",
  },
  {
    emoji: "💻",
    tag: "The Convenience Buyer",
    name: "Ebube, 19",
    desc: "A CS freshman still finding his feet on campus. He needs things he forgot to pack and doesn't know where to look. TrendTribe connects him to vendors who can deliver right to his dorm.",
  },
];

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

const AboutPage = () => {
  const reduced = useReducedMotion();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* ── Hero ───────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden flex items-center justify-center py-24 px-6"
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
            left: "-10%",
            width: "50%",
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
            bottom: "-10%",
            right: "-5%",
            width: "40%",
            height: "60%",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 60% 60%, rgba(123,184,240,0.18), transparent 70%)",
            filter: "blur(100px)",
            pointerEvents: "none",
          }}
        />

        <motion.div
          className="relative z-10 text-center max-w-2xl"
          variants={reduced ? {} : stagger}
          initial={reduced ? false : "hidden"}
          animate="visible"
        >
          <motion.div
            variants={reduced ? {} : fadeUp}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <span className="relative flex h-2 w-2">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: "#F5C518" }}
              />
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ background: "#F5C518" }}
              />
            </span>
            <span className="text-white/70 text-xs font-medium">Our Story</span>
          </motion.div>

          <motion.h1
            variants={reduced ? {} : fadeUp}
            className="text-white text-4xl md:text-5xl font-extrabold leading-tight mb-4"
          >
            Not your typical
            <br />
            <span style={{ color: "#F5C518" }}>marketplace.</span>
          </motion.h1>

          <motion.p
            variants={reduced ? {} : fadeUp}
            className="text-white/60 text-base md:text-lg leading-relaxed"
          >
            TrendTribe is a student-focused marketplace where students shop for
            trendy, useful products — and vendors connect with a vibrant campus
            audience. Built for students, by a student.
          </motion.p>
        </motion.div>
      </div>

      {/* ── Ticker ─────────────────────────────────────────── */}
      <div
        style={{
          background: "#0a1628",
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

      {/* ── Mission ────────────────────────────────────────── */}
      <div className="bg-white py-20 px-6">
        <Section className="max-w-3xl mx-auto text-center">
          <motion.p
            variants={reduced ? {} : fadeUp}
            className="text-xs font-semibold text-primary-600 uppercase tracking-widest mb-3"
          >
            Our Mission
          </motion.p>
          <motion.h2
            variants={reduced ? {} : fadeUp}
            className="text-gray-900 text-3xl md:text-4xl font-extrabold mb-6 leading-tight"
          >
            Visibility for vendors. Discovery for buyers. Community for
            everyone.
          </motion.h2>
          <motion.p
            variants={reduced ? {} : fadeUp}
            className="text-gray-500 text-base leading-relaxed"
          >
            Our mission is to help student vendors gain the visibility they
            deserve, help student shoppers find exactly what they're looking
            for, and foster a supportive community where every connection
            matters.
          </motion.p>
        </Section>
      </div>

      {/* ── What makes us different ────────────────────────── */}
      <div className="bg-gray-50 py-20 px-6">
        <Section className="max-w-4xl mx-auto">
          <motion.p
            variants={reduced ? {} : fadeUp}
            className="text-xs font-semibold text-primary-600 uppercase tracking-widest mb-3 text-center"
          >
            Our Edge
          </motion.p>
          <motion.h2
            variants={reduced ? {} : fadeUp}
            className="text-gray-900 text-3xl font-extrabold mb-4 text-center"
          >
            What makes TrendTribe different
          </motion.h2>
          <motion.p
            variants={reduced ? {} : fadeUp}
            className="text-gray-500 text-base text-center mb-12 max-w-xl mx-auto leading-relaxed"
          >
            Unlike generic platforms that treat students like any other user,
            TrendTribe was built from a real student experience — and it shows
            in every detail.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                emoji: "🎓",
                title: "Exclusively for students",
                desc: "Every buyer and seller is a verified campus student. No outsiders, no noise — just your community.",
              },
              {
                emoji: "🔍",
                title: "Smart discovery",
                desc: "We don't just list products. We surface the right vendors to the right students, making buying and selling effortless.",
              },
              {
                emoji: "🤝",
                title: "Community over competition",
                desc: "We encourage student entrepreneurs to support each other. Your win is the tribe's win.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={reduced ? {} : fadeUp}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center"
              >
                <div className="text-3xl mb-4">{item.emoji}</div>
                <h3 className="text-gray-900 font-bold text-base mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </Section>
      </div>

      {/* ── Brand Values ───────────────────────────────────── */}
      <div className="bg-white py-20 px-6">
        <Section className="max-w-5xl mx-auto">
          <motion.p
            variants={reduced ? {} : fadeUp}
            className="text-xs font-semibold text-primary-600 uppercase tracking-widest mb-3 text-center"
          >
            What We Stand For
          </motion.p>
          <motion.h2
            variants={reduced ? {} : fadeUp}
            className="text-gray-900 text-3xl font-extrabold mb-12 text-center"
          >
            Our values
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUES.map((v, i) => {
              const Icon = v.icon;
              return (
                <motion.div
                  key={i}
                  variants={reduced ? {} : fadeUp}
                  className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex gap-4"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-gray-900 font-bold text-base mb-1">
                      {v.title}
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      {v.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Section>
      </div>

      {/* ── Who we built this for ──────────────────────────── */}
      <div className="py-20 px-6" style={{ background: "#0F1F3D" }}>
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <Section className="max-w-5xl mx-auto relative z-10">
          <motion.p
            variants={reduced ? {} : fadeUp}
            className="text-xs font-semibold uppercase tracking-widest mb-3 text-center"
            style={{ color: "#F5C518" }}
          >
            Who We Built This For
          </motion.p>
          <motion.h2
            variants={reduced ? {} : fadeUp}
            className="text-white text-3xl font-extrabold mb-4 text-center"
          >
            Real students. Real problems. Real solutions.
          </motion.h2>
          <motion.p
            variants={reduced ? {} : fadeUp}
            className="text-white/50 text-sm text-center mb-12 max-w-lg mx-auto leading-relaxed"
          >
            TrendTribe was designed around three types of students we deeply
            understand.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {AUDIENCE.map((a, i) => (
              <motion.div
                key={i}
                variants={reduced ? {} : fadeUp}
                className="rounded-2xl p-6 flex flex-col gap-3"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div className="text-3xl">{a.emoji}</div>
                <div>
                  <span
                    className="text-xs font-semibold px-2 py-1 rounded-full"
                    style={{
                      background: "rgba(245,197,24,0.15)",
                      color: "#F5C518",
                      border: "1px solid rgba(245,197,24,0.25)",
                    }}
                  >
                    {a.tag}
                  </span>
                </div>
                <h3 className="text-white font-bold text-base">{a.name}</h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  {a.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </Section>
      </div>

      {/* ── CTA ────────────────────────────────────────────── */}
      <div className="bg-white py-20 px-6">
        <Section className="max-w-xl mx-auto text-center">
          <motion.h2
            variants={reduced ? {} : fadeUp}
            className="text-gray-900 text-3xl font-extrabold mb-4"
          >
            Ready to join the tribe?
          </motion.h2>
          <motion.p
            variants={reduced ? {} : fadeUp}
            className="text-gray-500 text-base mb-8"
          >
            Sign up free and start buying or selling with verified students on
            your campus today.
          </motion.p>
          <motion.a
            variants={reduced ? {} : fadeUp}
            href="/register"
            className="btn-primary inline-flex items-center gap-2 px-8 py-3 rounded-xl font-semibold"
          >
            Get Started Free
          </motion.a>
        </Section>
      </div>
    </div>
  );
};

export default AboutPage;
