import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

function Section({ children, className = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
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

const SECTIONS = [
  {
    title: "Information We Collect",
    body: "We collect information you provide when registering, such as your full name, username, email address, school name, and matric number. We also collect listing data, messages, and usage information to improve the platform.",
  },
  {
    title: "How We Use Your Information",
    body: "Your information is used to verify your student identity, enable buying and selling features, communicate important updates, and keep the platform safe. We do not sell your personal data to third parties.",
  },
  {
    title: "Data Sharing",
    body: "We only share your information with other TrendTribe users to the extent necessary for trades (e.g. your username and school). We do not share personal details like your matric number or email publicly.",
  },
  {
    title: "Data Security",
    body: "We use industry-standard encryption and security practices to protect your data. However, no online platform can guarantee absolute security. Please use a strong password and keep your credentials safe.",
  },
  {
    title: "Cookies",
    body: "We use cookies to keep you logged in and to understand how you use the platform. You can disable cookies in your browser settings, but some features may not work as expected.",
  },
  {
    title: "Your Rights",
    body: "You have the right to access, correct, or delete your personal data at any time. To make a request, contact us at hello@trendtribe.ng and we'll respond within 7 business days.",
  },
  {
    title: "Changes to This Policy",
    body: "We may update this Privacy Policy from time to time. We'll notify you of significant changes via email or an in-app notice. Continued use of TrendTribe after changes means you accept the updated policy.",
  },
  {
    title: "Contact",
    body: "For any privacy-related questions or concerns, reach out to us at hello@trendtribe.ng.",
  },
];

const PrivacyPage = () => {
  const reduced = useReducedMotion();
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* ── Hero ───────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden flex items-center justify-center py-20 px-6"
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
            top: "-20%",
            right: "-5%",
            width: "45%",
            height: "80%",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 60% 40%, rgba(26,79,214,0.4), transparent 70%)",
            filter: "blur(80px)",
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
            <span className="text-white/70 text-xs font-medium">
              🔒 Privacy Policy
            </span>
          </motion.div>
          <motion.h1
            variants={reduced ? {} : fadeUp}
            className="text-white text-4xl font-extrabold leading-tight mb-3"
          >
            Your privacy{" "}
            <span style={{ color: "#F5C518" }}>matters to us.</span>
          </motion.h1>
          <motion.p
            variants={reduced ? {} : fadeUp}
            className="text-white/50 text-sm"
          >
            Last updated: {__PRIVACY_LAST_UPDATED__|| "Not yet published"}
          </motion.p>
        </motion.div>
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      <div className="bg-gray-50 flex-1 py-16 px-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-10">
          <Section>
            <motion.p
              variants={reduced ? {} : fadeUp}
              className="text-gray-500 text-sm leading-relaxed"
            >
              This Privacy Policy explains how TrendTribe ("we", "us", "our")
              collects, uses, and protects your personal information when you
              use our platform. By using TrendTribe, you agree to the practices
              described below.
            </motion.p>
          </Section>
          {SECTIONS.map((s, i) => (
            <Section key={i}>
              <motion.h2
                variants={reduced ? {} : fadeUp}
                className="text-gray-900 text-lg font-bold mb-3"
              >
                {i + 1}. {s.title}
              </motion.h2>
              <motion.p
                variants={reduced ? {} : fadeUp}
                className="text-gray-500 text-sm leading-relaxed"
              >
                {s.body}
              </motion.p>
            </Section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
