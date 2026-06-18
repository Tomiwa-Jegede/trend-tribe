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
    title: "Eligibility",
    body: "TrendTribe is only available to currently enrolled university students. By creating an account, you confirm that you are a student at a registered institution and that all information you provide is accurate and truthful.",
  },
  {
    title: "Your Account",
    body: "You are responsible for maintaining the confidentiality of your account credentials. Any activity that occurs under your account is your responsibility. Do not impersonate another user or misrepresent your identity in any way. Please notify us immediately if you suspect unauthorized access to your account.",
  },
  {
    title: "Listings & Content",
    body: "You are solely responsible for the content you post on TrendTribe. Listings must be accurate, honest, and for items you genuinely own or have the right to sell. Prohibited items include weapons, illegal substances, counterfeit or stolen goods, and anything that violates Nigerian law or the rights of another person. Fake listings, misleading descriptions, and price manipulation are strictly prohibited.",
  },
  {
    title: "Seller Responsibilities",
    body: "As a seller on TrendTribe, you agree to list products with clear, honest descriptions and fair pricing. You must deliver items in the condition advertised and within any timeframe agreed upon with the buyer. Sellers who repeatedly fail to fulfil orders, post misleading listings, or engage in fraudulent behaviour may have their accounts suspended or permanently banned.",
  },
  {
    title: "Buyer Responsibilities",
    body: "As a buyer, you agree to provide accurate information when placing an order and to only confirm receipt of an item after you have actually received it in the condition described. Attempting to falsely claim non-delivery or initiating fraudulent disputes against sellers is a violation of these Terms and may result in account suspension.",
  },
  {
    title: "Free Trial & Subscription",
    body: "TrendTribe is completely free to use for all verified students during our current free access period. In the future, certain features may move to a subscription-based plan. We will give you clear advance notice before any paid plan is introduced, and you will never be charged without your explicit consent.",
  },
  {
    title: "Prohibited Conduct",
    body: "You agree not to: commit fraud, scams, or any illegal activity on the platform; harass, threaten, or deceive other users; post false or misleading listings; spam other users with unsolicited messages or promotions; attempt to bypass or compromise the security of TrendTribe; or use the platform for any purpose that is unlawful or harmful to others.",
  },
  {
    title: "Enforcement & Penalties",
    body: "TrendTribe may investigate any suspected violation of these Terms. If a violation is found, we may remove or disable listings, suspend or permanently ban accounts, withhold or cancel payments, and where necessary, report conduct to your university or relevant authorities. We aim to act fairly but reserve the right to take immediate action where user safety or platform integrity is at risk.",
  },
  {
    title: "Termination",
    body: "We reserve the right to suspend or terminate your account at any time if you violate these Terms or engage in conduct harmful to other users or the platform. You may also delete your account at any time by contacting our support team.",
  },
  {
    title: "Limitation of Liability",
    body: "TrendTribe is provided 'as is' without warranties of any kind. While we facilitate connections between buyers and sellers, we are not a party to any transaction and cannot guarantee the outcome of any trade. We are not liable for any losses, disputes, or damages arising from transactions or your use of the platform.",
  },
  {
    title: "Changes to Terms",
    body: "We may update these Terms at any time by posting a revised version on the platform. Continued use of TrendTribe after changes are posted constitutes your acceptance of the updated Terms. We will notify you of significant changes via email.",
  },
  {
    title: "Contact",
    body: "Questions about these Terms? Reach us at hello@trendtribe.ng.",
  },
];

const TermsPage = () => {
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
            top: "-10%",
            left: "-10%",
            width: "45%",
            height: "70%",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 40% 40%, rgba(26,79,214,0.4), transparent 70%)",
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
              📄 Terms of Service
            </span>
          </motion.div>
          <motion.h1
            variants={reduced ? {} : fadeUp}
            className="text-white text-4xl font-extrabold leading-tight mb-3"
          >
            Terms that are{" "}
            <span style={{ color: "#F5C518" }}>actually readable.</span>
          </motion.h1>
          <motion.p
            variants={reduced ? {} : fadeUp}
            className="text-white/50 text-sm"
          >
            Last updated: {__TERMS_LAST_UPDATED__|| "Not yet published"}
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
              Welcome to TrendTribe. By accessing or using our platform, you
              agree to be bound by these Terms of Service. Please read them
              carefully before using the app. Our goal is to keep TrendTribe
              safe, fair, and trusted for every student on campus.
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

export default TermsPage;
