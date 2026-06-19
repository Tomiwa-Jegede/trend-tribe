// src/components/home/HomeTicker.jsx

import { motion, useReducedMotion } from "framer-motion";

// ── Ticker data ────────────────────────────────────────────────
export const TICKER_ROW_1 = [
  { emoji: "👔", name: "Striped Silk Tie", price: "₦4,500", hot: true },
  { emoji: "👕", name: "Plain White Tee — M", price: "₦3,200", hot: false },
  { emoji: "👔", name: "Slim Oxford Shirt", price: "₦8,000", hot: false },
  { emoji: "👕", name: "Oversized Black Tee", price: "₦4,000", hot: true },
  { emoji: "👔", name: "Polka Dot Tie", price: "₦3,500", hot: false },
  { emoji: "👕", name: "Graphic Print Tee", price: "₦5,500", hot: false },
  { emoji: "👔", name: "Navy Linen Shirt", price: "₦9,500", hot: false },
  { emoji: "👕", name: "Plain Tee Bundle ×3", price: "₦9,000", hot: true },
  { emoji: "👔", name: "Checkered Tie", price: "₦3,800", hot: false },
  { emoji: "🧣", name: "Wool Scarf", price: "₦2,800", hot: false },
];

export const TICKER_ROW_2 = [
  { emoji: "🥇", name: "Man Utd Jersey 24/25", price: "₦12,000", hot: true },
  { emoji: "👖", name: "Slim Fit Black Jeans", price: "₦7,500", hot: false },
  { emoji: "🥇", name: "Real Madrid Jersey", price: "₦14,000", hot: true },
  { emoji: "👖", name: "Ripped Denim — W30", price: "₦8,200", hot: false },
  { emoji: "🥇", name: "Chelsea Away Kit", price: "₦11,500", hot: false },
  { emoji: "👖", name: "High-waist Mom Jeans", price: "₦9,000", hot: false },
  { emoji: "🥇", name: "Super Eagles Jersey", price: "₦10,000", hot: true },
  { emoji: "👖", name: "Straight Leg Jeans", price: "₦6,800", hot: false },
  { emoji: "🥇", name: "Barcelona Home Jersey", price: "₦13,000", hot: false },
  { emoji: "👖", name: "Cargo Pants — Khaki", price: "₦7,200", hot: false },
];

export const TICKER_ROW_3 = [
  { emoji: "🌸", name: "Lattafa Asad EDP", price: "₦18,000", hot: true },
  { emoji: "⌚", name: "Casio G-Shock Black", price: "₦22,000", hot: false },
  { emoji: "🌸", name: "Armaf Club de Nuit", price: "₦25,000", hot: true },
  { emoji: "🕶️", name: "Ray-Ban Wayfarers", price: "₦15,000", hot: false },
  { emoji: "🌸", name: "Zara Warm Leather", price: "₦9,000", hot: false },
  { emoji: "💍", name: "Gold Chain Necklace", price: "₦5,500", hot: false },
  { emoji: "🌸", name: "Ajmal Shadow EDP", price: "₦16,500", hot: true },
  { emoji: "🧢", name: "Nike Snapback Cap", price: "₦4,500", hot: false },
  { emoji: "🌸", name: "Victoria's Secret Mist", price: "₦8,500", hot: false },
  { emoji: "👜", name: "Mini Crossbody Bag", price: "₦7,800", hot: false },
];

export const TICKER_ROW_4 = [
  { emoji: "👗", name: "Floral Midi Dress", price: "₦11,000", hot: true },
  { emoji: "🧥", name: "Corduroy Jacket — L", price: "₦16,500", hot: false },
  { emoji: "👗", name: "Ankara Co-ord Set", price: "₦14,000", hot: true },
  { emoji: "🧥", name: "Puffer Jacket — Navy", price: "₦22,000", hot: false },
  { emoji: "👟", name: "Air Force 1 — Sz 42", price: "₦38,000", hot: true },
  { emoji: "👗", name: "Satin Wrap Dress", price: "₦9,500", hot: false },
  { emoji: "👟", name: "Adidas Samba — Sz 41", price: "₦42,000", hot: false },
  { emoji: "🧥", name: "Denim Jacket — XL", price: "₦13,000", hot: false },
  { emoji: "👗", name: "Two-piece Linen Set", price: "₦12,500", hot: false },
  { emoji: "👟", name: "New Balance 574", price: "₦35,000", hot: true },
];

// ── Info bar data ──────────────────────────────────────────────
export const INFO_ITEMS = [
  { icon: "🎓", text: "Students only" },
  { icon: "🤝", text: "Meet on campus" },
  { icon: "🔒", text: "Safe peer-to-peer trading" },
  { icon: "⚡", text: "List in 60 seconds" },
  { icon: "🛍️", text: "Fashion, perfumes, electronics & more" },
  { icon: "📍", text: "Trade within your university" },
  { icon: "🧾", text: "No middlemen" },
  { icon: "🎯", text: "Built for campus life" },
];

// ── Ticker Item ────────────────────────────────────────────────
const TickerItem = ({ item }) => (
  <div
    className={`
      inline-flex items-center gap-2 px-4 py-2 mx-2 rounded-full border flex-shrink-0
      ${
        item.hot
          ? "bg-accent-100/10 border-accent-400/20"
          : "bg-white/5 border-white/10"
      }
    `}
  >
    <span className="text-sm leading-none">{item.emoji}</span>

    <span
      className={
        item.hot
          ? "text-white/85 text-xs font-semibold"
          : "text-white/60 text-xs font-medium"
      }
    >
      {item.name}
    </span>

    <span className="w-1 h-1 rounded-full bg-white/20 flex-shrink-0" />

    <span className="text-xs font-bold" style={{ color: "#F5C518" }}>
      {item.price}
    </span>
  </div>
);

// ── Ticker Row ────────────────────────────────────────────────
export const TickerRow = ({ items, direction = "left", duration = 30 }) => {
  const reduced = useReducedMotion();
  const doubled = [...items, ...items];

  return (
    <div className="relative flex overflow-hidden py-1">
      <div
        className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{
          background: "linear-gradient(90deg, #0F1F3D 0%, transparent 100%)",
        }}
      />

      <div
        className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{
          background: "linear-gradient(270deg, #0F1F3D 0%, transparent 100%)",
        }}
      />

      <motion.div
        className="flex items-center"
        style={{ willChange: "transform" }}
        animate={
          reduced
            ? {}
            : {
                x: direction === "left" ? ["0%", "-50%"] : ["-50%", "0%"],
              }
        }
        transition={{
          duration,
          ease: "linear",
          repeat: Infinity,
        }}
      >
        {doubled.map((item, i) => (
          <TickerItem key={i} item={item} />
        ))}
      </motion.div>
    </div>
  );
};

// ── Info Bar ──────────────────────────────────────────────────
export const InfoBar = () => {
  const reduced = useReducedMotion();
  const doubled = [...INFO_ITEMS, ...INFO_ITEMS];

  return (
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
        style={{ willChange: "transform" }}
        animate={reduced ? {} : { x: ["0%", "-50%"] }}
        transition={{
          duration: 28,
          ease: "linear",
          repeat: Infinity,
        }}
      >
        {doubled.map((item, i) => (
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
  );
};
// ── Reusable Export ────────────────────────────────────────────
const HomeTicker = ({ variant = "hero" }) => {
  if (variant === "info") {
    return <InfoBar />;
  }

  if (variant === "hero") {
    return (
      <div
        className="absolute inset-0 flex flex-col justify-around py-10 pointer-events-none"
        aria-hidden="true"
        style={{ opacity: 0.45 }}
      >
        <TickerRow items={TICKER_ROW_1} direction="left" duration={32} />
        <TickerRow items={TICKER_ROW_2} direction="right" duration={26} />
        <TickerRow items={TICKER_ROW_3} direction="left" duration={36} />
        <TickerRow items={TICKER_ROW_4} direction="right" duration={29} />
      </div>
    );
  }

  // marketplace/features/default
  return (
    <div className="rounded-3xl overflow-hidden bg-[#0F1F3D] py-6">
      <TickerRow items={TICKER_ROW_1} duration={32} />
      <TickerRow items={TICKER_ROW_2} direction="right" duration={36} />
      <TickerRow items={TICKER_ROW_3} duration={34} />
      <TickerRow items={TICKER_ROW_4} direction="right" duration={38} />
    </div>
  );
};

export default HomeTicker;