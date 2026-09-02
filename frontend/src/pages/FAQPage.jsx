import { useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  motion,
  useInView,
  useReducedMotion,
  AnimatePresence,
} from "framer-motion";
import { FiChevronDown } from "react-icons/fi";

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
  visible: { transition: { staggerChildren: 0.1 } },
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

const FAQS = [
  {
    category: "Getting Started",
    items: [
      {
        q: "Who can use TrendTribe?",
        a: "TrendTribe is for students. Anyone with a school email can buy. To sell, verify your RUN email (@run.edu.ng) and matric number. Buyers are verified by email OTP — sellers get extra checks.",
      },
      {
        q: "How does TrendTribe work?",
        a: "Sellers list items with photos and price. Buyers browse Fashion, Beauty and Personal Care, Gadgets, Accessories, Snacks and more, then tap Contact Seller to chat on WhatsApp. Meet on campus, check the item, pay cash or transfer.",
      },
      {
        q: "How do I verify my account?",
        a: "We send a 6-digit code to your email via Brevo. Enter it. The code expires in 10 minutes. Sellers also verify their RUN email and matric number. No link is sent.",
      },
    ],
  },
  {
    category: "For Sellers",
    items: [
      {
        q: "How do I list an item?",
        a: "Tap Sell, add up to 5 photos, set price, pick category and subcategory (for example Beauty → Others), choose condition and post. It takes under 60 seconds and shows instantly.",
      },
      {
        q: "What can I sell?",
        a: "Fashion, Beauty and Personal Care, Gadgets, Accessories, Snacks and other student items. No illegal or fake items.",
      },
      {
        q: "How do I get more buyers to see me?",
        a: "Keep your listing fresh. Listings hide after 30 days — you see a subtle bar in My Listings. Use 1 token to boost to the top of Marketplace for 24 hours as a Featured card, or keep 3 items up free.",
      },
      {
        q: "How do I get paid?",
        a: "You and the buyer meet on campus and pay by cash or bank transfer. TrendTribe does not hold money. Token purchases for extra listings or boosts are paid via Flutterwave.",
      },
    ],
  },
  {
    category: "For Buyers",
    items: [
      {
        q: "How do I find what I need?",
        a: "Open Marketplace, pick a category and subcategory, or search. Filters for price and condition help you narrow results. Featured listings sit at the top.",
      },
      {
        q: "Do sellers deliver?",
        a: "No delivery is promised. You meet on campus at a public place, check the item, then pay. That keeps it simple and safe.",
      },
      {
        q: "Can I bargain?",
        a: "Yes — on WhatsApp after you tap Contact Seller. The message is pre-filled with the item title, price and link. No in-app chat needed.",
      },
    ],
  },
  {
    category: "Safety & Trust",
    items: [
      {
        q: "How do I know a seller is real?",
        a: "Sellers are verified with a RUN school email and matric number. Buyers are verified by email code. You always see the seller’s profile and school.",
      },
      {
        q: "What if I have a problem?",
        a: "Email hello@trendtribe.ng and we will help within 24 hours.",
      },
      {
        q: "Can I report a listing?",
        a: "Yes. Every listing has a Report button. Choose Scam, Fake item, Inappropriate or Other. We review quickly.",
      },
    ],
  },
  {
    category: "Tokens & Pricing",
    items: [
      {
        q: "Do I need tokens to use TrendTribe?",
        a: "No. Browsing, saving, and contacting sellers on WhatsApp are free. Tokens are only for sellers who want more: a 4th active listing, to bring back a hidden 4th, to boost to Featured for 24h, or to keep an item up 14 more days. 1 token = ₦200.",
      },
      {
        q: "Do my 3 free listings come back?",
        a: "Yes. You get 3 active at a time for free, not 3 total. Hide or delete one and the free space comes back. The 4th active at the same time is what costs 1 token.",
      },
    ],
  },
];

function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  return (
    <motion.div
      variants={reduced ? {} : fadeUp}
      className="border border-gray-100 rounded-2xl overflow-hidden bg-white"
    >
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
      >
        <span className="text-gray-900 font-semibold text-sm">{q}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <FiChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-5 text-gray-500 text-sm leading-relaxed">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const FAQPage = () => {
  const reduced = useReducedMotion();
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      <Helmet>
        <title>FAQ — Trend Tribe</title>
        <meta
          name="description"
          content="Frequently asked questions about buying, selling, and using Trend Tribe on your campus."
        />
        <link rel="canonical" href="https://trendtribee.netlify.app/faq" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.flatMap((category) =>
              category.items.map((item) => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: item.a,
                },
              })),
            ),
          })}
        </script>
      </Helmet>
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
            bottom: "-10%",
            left: "-10%",
            width: "50%",
            height: "70%",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 40% 60%, rgba(26,79,214,0.4), transparent 70%)",
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
              💬 Frequently Asked Questions
            </span>
          </motion.div>
          <motion.h1
            variants={reduced ? {} : fadeUp}
            className="text-white text-4xl md:text-5xl font-extrabold leading-tight mb-4"
          >
            Got questions?
            <br />
            <span style={{ color: "#F5C518" }}>We've got answers.</span>
          </motion.h1>
          <motion.p
            variants={reduced ? {} : fadeUp}
            className="text-white/60 text-base leading-relaxed"
          >
            Everything you need to know about TrendTribe. Can't find what you're
            looking for? Email us at hello@trendtribe.ng
          </motion.p>
        </motion.div>
      </div>

      {/* ── FAQ Sections ───────────────────────────────────── */}
      <div className="bg-gray-50 flex-1 py-20 px-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-14">
          {FAQS.map((section, si) => (
            <Section key={si}>
              <motion.p
                variants={reduced ? {} : fadeUp}
                className="text-xs font-semibold text-primary-600 uppercase tracking-widest mb-2"
              >
                {section.category}
              </motion.p>
              <div className="flex flex-col gap-3">
                {section.items.map((item, ii) => (
                  <AccordionItem key={ii} q={item.q} a={item.a} />
                ))}
              </div>
            </Section>
          ))}
        </div>
      </div>

      {/* ── CTA ────────────────────────────────────────────── */}
      <div className="bg-white py-16 px-6">
        <Section className="max-w-xl mx-auto text-center">
          <motion.h2
            variants={reduced ? {} : fadeUp}
            className="text-gray-900 text-2xl font-bold mb-3"
          >
            Still have questions?
          </motion.h2>
          <motion.p
            variants={reduced ? {} : fadeUp}
            className="text-gray-500 text-sm mb-6"
          >
            Our team is happy to help. Reach out and we'll respond within 24
            hours.
          </motion.p>
          <motion.a
            variants={reduced ? {} : fadeUp}
            href="mailto:hello@trendtribe.ng"
            className="btn-primary inline-flex items-center gap-2 px-8 py-3 rounded-xl font-semibold"
          >
            Email Us
          </motion.a>
        </Section>
      </div>
    </div>
  );
};

export default FAQPage;
