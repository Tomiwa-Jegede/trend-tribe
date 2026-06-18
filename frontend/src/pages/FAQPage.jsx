import { useRef, useState } from "react";
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
        a: "TrendTribe is exclusively for university students — both student vendors who want to grow their business and student shoppers looking for what they need on campus. Every user is verified.",
      },
      {
        q: "How does TrendTribe work?",
        a: "Student vendors list their products to gain visibility among their campus community. Student buyers browse, discover vendors, and connect with them directly to make purchases.",
      },
      {
        q: "How do I verify my student status?",
        a: "Sign up with your school email and matric number. We'll send a verification link to confirm your account before you can buy or sell.",
      },
    ],
  },
  {
    category: "For Vendors",
    items: [
      {
        q: "How do I list my products?",
        a: "Hit the 'Sell' button, add photos, set a price, and publish. The whole process takes under 60 seconds — and your product is instantly visible to students on your campus.",
      },
      {
        q: "What can I sell on TrendTribe?",
        a: "Anything students need — fashion, perfumes, electronics, textbooks, furniture, gadgets, food, and more. Illegal, counterfeit, or prohibited items are not allowed.",
      },
      {
        q: "How does TrendTribe help me get more customers?",
        a: "TrendTribe puts your business in front of your entire campus community — not just your friends. Student shoppers actively browse the platform looking for vendors, giving you the visibility you've been missing.",
      },
      {
        q: "How do I receive payments?",
        a: "Payments are handled directly between you and your buyer — via bank transfer or cash on delivery. TrendTribe does not process or hold payments.",
      },
    ],
  },
  {
    category: "For Buyers",
    items: [
      {
        q: "How do I find what I'm looking for?",
        a: "Browse the marketplace by category or search for specific products. Every listing is from a verified student vendor on your campus — no strangers, no uncertainty.",
      },
      {
        q: "Can vendors deliver to my dorm?",
        a: "Many vendors on TrendTribe offer delivery within campus. Check the listing details or message the vendor directly to arrange delivery to your dorm or a convenient spot.",
      },
      {
        q: "Can I negotiate prices?",
        a: "Yes! Use the chat feature to message a vendor and agree on a price that works for both of you.",
      },
    ],
  },
  {
    category: "Safety & Trust",
    items: [
      {
        q: "How do I know vendors are real students?",
        a: "Every vendor on TrendTribe is verified using their school email and matric number. You're always dealing with a real, enrolled student from your campus.",
      },
      {
        q: "What if I have an issue with a transaction?",
        a: "Contact our support team at hello@trendtribe.ng and we'll help resolve it as quickly as possible.",
      },
      {
        q: "Can I report a suspicious listing or user?",
        a: "Absolutely. Every listing and profile has a report button. Our team reviews all reports promptly and takes action where necessary.",
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
            href="/contact"
            className="btn-primary inline-flex items-center gap-2 px-8 py-3 rounded-xl font-semibold"
          >
            Contact Us
          </motion.a>
        </Section>
      </div>
    </div>
  );
};

export default FAQPage;
