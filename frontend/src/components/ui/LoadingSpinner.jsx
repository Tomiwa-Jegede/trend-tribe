import { motion, useReducedMotion } from "framer-motion";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const B = {
  green: "#16a34a",
  orange: "#f97316",
  yellow: "#facc15",
  navy: "#1e293b",
  light: "#f0fdf4",
};

// ─── Inject Apple-pulse keyframe once ────────────────────────────────────────
if (typeof document !== "undefined") {
  const id = "tt-pulse-kf";
  if (!document.getElementById(id)) {
    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = `
      @keyframes tt-pulse {
        0%, 100% { opacity: 0.45; }
        50%       { opacity: 1;    }
      }
      @media (prefers-reduced-motion: reduce) {
        .tt-pulse-el { animation: none !important; opacity: 0.7 !important; }
      }
    `;
    document.head.appendChild(s);
  }
}

// ─── Helper: pulse style with staggered delay ────────────────────────────────
const pulse = (delay = 0) => ({
  animation: `tt-pulse 1.8s ease-in-out ${delay}s infinite`,
  backgroundColor: "#e2e8f0",
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. ORBITING PRICE TAGS SPINNER
// ═════════════════════════════════════════════════════════════════════════════
export function PriceTagSpinner({ message = "Loading…" }) {
  const reduced = useReducedMotion();

  // Three tags: ₦ (green), 🏷 (orange), ★ (yellow)
  const tags = [
    { label: "₦", bg: B.green, color: "#fff", startAngle: 0 },
    { label: "🏷", bg: B.orange, color: "#fff", startAngle: 120 },
    { label: "★", bg: B.yellow, color: B.navy, startAngle: 240 },
  ];

  const RADIUS = 38; // orbit radius px
  const DURATION = 3.2; // one full revolution (s)
  const TAG_SIZE = 34; // pill width/height px

  return (
    <div
      className="flex flex-col items-center justify-center gap-6 py-16 select-none"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {/* ── Orbit stage ── */}
      <div
        className="relative"
        style={{ width: RADIUS * 2 + TAG_SIZE, height: RADIUS * 2 + TAG_SIZE }}
      >
        {/* Center dot */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 12,
            height: 12,
            backgroundColor: B.green,
            top: "50%",
            left: "50%",
            translate: "-50% -50%",
          }}
          animate={
            reduced
              ? {}
              : {
                  scale: [1, 1.35, 1],
                  opacity: [0.6, 1, 0.6],
                }
          }
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Orbit ring (faint) */}
        <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
          <circle
            cx="50%"
            cy="50%"
            r={RADIUS}
            fill="none"
            stroke={B.green}
            strokeWidth="1"
            strokeOpacity="0.12"
            strokeDasharray="4 6"
          />
        </svg>

        {/* Tags */}
        {tags.map((tag, i) => {
          const delay = (i / tags.length) * DURATION;
          const offset = (i / tags.length) * 360; // visual start position

          return (
            <motion.div
              key={tag.label}
              className="absolute flex items-center justify-center rounded-full text-sm font-bold shadow-md"
              style={{
                width: TAG_SIZE,
                height: TAG_SIZE,
                backgroundColor: tag.bg,
                color: tag.color,
                fontSize: tag.label === "🏷" ? 16 : 15,
                // Centre the tag in its own box
                top: "50%",
                left: "50%",
              }}
              aria-hidden="true"
              animate={
                reduced
                  ? { x: 0, y: 0, opacity: 0.8 }
                  : {
                      // Drive with raw rotate on the offset vector
                      x: Array.from({ length: 61 }, (_, k) => {
                        const angle =
                          ((k / 60) * 360 + offset) * (Math.PI / 180);
                        return Math.cos(angle) * RADIUS - TAG_SIZE / 2;
                      }),
                      y: Array.from({ length: 61 }, (_, k) => {
                        const angle =
                          ((k / 60) * 360 + offset) * (Math.PI / 180);
                        return Math.sin(angle) * RADIUS - TAG_SIZE / 2;
                      }),
                      scale: [1, 1.15, 1, 0.92, 1],
                      opacity: [0.85, 1, 0.85],
                    }
              }
              transition={
                reduced
                  ? {}
                  : {
                      x: {
                        duration: DURATION,
                        repeat: Infinity,
                        ease: "linear",
                        delay,
                      },
                      y: {
                        duration: DURATION,
                        repeat: Infinity,
                        ease: "linear",
                        delay,
                      },
                      scale: {
                        duration: DURATION / 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay,
                      },
                      opacity: {
                        duration: DURATION / 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay,
                      },
                    }
              }
            >
              {tag.label}
            </motion.div>
          );
        })}
      </div>

      {/* ── Breathing dots ── */}
      <div className="flex gap-2" aria-hidden="true">
        {[B.green, B.orange, B.yellow].map((c, i) => (
          <motion.span
            key={i}
            className="block w-2 h-2 rounded-full"
            style={{ backgroundColor: c }}
            animate={
              reduced
                ? {}
                : {
                    opacity: [0.3, 1, 0.3],
                    scale: [0.75, 1.2, 0.75],
                  }
            }
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* ── Message ── */}
      <p
        className="text-sm font-medium tracking-wide"
        style={{ color: B.navy, opacity: 0.6 }}
      >
        {message}
      </p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. SINGLE SKELETON CARD  (Apple-pulse — no sweep direction)
// ═════════════════════════════════════════════════════════════════════════════
function SkeletonCard({ delay = 0 }) {
  return (
    <div
      className="tt-pulse-el rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-100"
      style={{ animation: `tt-pulse 1.8s ease-in-out ${delay}s infinite` }}
      aria-hidden="true"
    >
      {/* Image block */}
      <div className="w-full h-44 tt-pulse-el" style={pulse(delay)} />

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div
          className="h-4 rounded-full w-3/4 tt-pulse-el"
          style={pulse(delay + 0.1)}
        />
        {/* Sub-label */}
        <div
          className="h-3 rounded-full w-1/2 tt-pulse-el"
          style={pulse(delay + 0.15)}
        />
        {/* Price + icon row */}
        <div className="flex items-center justify-between pt-1">
          <div
            className="h-5 rounded-full w-1/4 tt-pulse-el"
            style={{ ...pulse(delay + 0.2), backgroundColor: "#dcfce7" }}
          />
          <div
            className="h-7 w-7 rounded-full tt-pulse-el"
            style={pulse(delay + 0.2)}
          />
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. MARKETPLACE GRID SKELETON
// ═════════════════════════════════════════════════════════════════════════════
export function MarketplaceSkeleton({ count = 8 }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.3 }}
      aria-busy="true"
      aria-label="Loading listings"
    >
      <PriceTagSpinner message="Finding listings for you…" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mt-2">
        {Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: reduced ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduced ? 0 : 0.35,
              delay: reduced ? 0 : i * 0.045,
            }}
          >
            <SkeletonCard delay={(i % 4) * 0.12} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. LISTING DETAIL SKELETON
// ═════════════════════════════════════════════════════════════════════════════
export function DetailSkeleton() {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.3 }}
      className="max-w-4xl mx-auto px-4 py-8 space-y-6"
      aria-busy="true"
      aria-label="Loading listing"
    >
      {/* Hero image */}
      <div
        className="w-full h-72 sm:h-96 rounded-2xl tt-pulse-el"
        style={pulse(0)}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left — text info */}
        <div className="md:col-span-2 space-y-4">
          <div
            className="h-7  rounded-full w-2/3  tt-pulse-el"
            style={pulse(0.1)}
          />
          <div
            className="h-4  rounded-full w-1/3  tt-pulse-el"
            style={pulse(0.15)}
          />
          <div
            className="h-4  rounded-full w-full tt-pulse-el"
            style={pulse(0.2)}
          />
          <div
            className="h-4  rounded-full w-5/6  tt-pulse-el"
            style={pulse(0.25)}
          />
          <div
            className="h-4  rounded-full w-4/6  tt-pulse-el"
            style={pulse(0.3)}
          />
        </div>

        {/* Right — price card */}
        <div className="space-y-4 p-5 rounded-2xl bg-white shadow-sm border border-slate-100">
          <div
            className="h-8  rounded-full w-1/2  tt-pulse-el"
            style={pulse(0.1)}
          />
          <div
            className="h-5  rounded-full w-3/4  tt-pulse-el"
            style={pulse(0.15)}
          />
          <div
            className="h-11 rounded-xl  w-full  tt-pulse-el"
            style={pulse(0.2)}
          />
          <div
            className="h-11 rounded-xl  w-full  tt-pulse-el"
            style={pulse(0.25)}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. PROFILE PAGE SKELETON
// ═════════════════════════════════════════════════════════════════════════════
export function ProfileSkeleton() {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.3 }}
      className="max-w-5xl mx-auto px-4 py-8 space-y-8"
      aria-busy="true"
      aria-label="Loading profile"
    >
      {/* Avatar + name */}
      <div className="flex items-center gap-5">
        <div
          className="w-20 h-20 rounded-full shrink-0 tt-pulse-el"
          style={pulse(0)}
        />
        <div className="flex-1 space-y-3">
          <div
            className="h-6 rounded-full w-40 tt-pulse-el"
            style={pulse(0.1)}
          />
          <div
            className="h-4 rounded-full w-24 tt-pulse-el"
            style={pulse(0.15)}
          />
          <div
            className="h-3 rounded-full w-32 tt-pulse-el"
            style={pulse(0.2)}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[0, 0.1, 0.2].map((d, i) => (
          <div
            key={i}
            className="h-16 rounded-2xl tt-pulse-el"
            style={pulse(d)}
          />
        ))}
      </div>

      {/* Listings heading */}
      <div className="h-5 rounded-full w-32 tt-pulse-el" style={pulse(0.1)} />

      {/* Listings grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: reduced ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduced ? 0 : 0.3,
              delay: reduced ? 0 : i * 0.06,
            }}
          >
            <SkeletonCard delay={i * 0.1} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. MINI SPINNER  (for buttons / inline use — Step 26)
// ═════════════════════════════════════════════════════════════════════════════
export function MiniSpinner({ size = 18, color = B.green }) {
  const reduced = useReducedMotion();

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      animate={reduced ? {} : { rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
      aria-hidden="true"
    >
      <circle
        cx="9"
        cy="9"
        r="7"
        stroke={color}
        strokeWidth="2.5"
        strokeOpacity="0.2"
      />
      <path
        d="M9 2 A7 7 0 0 1 16 9"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </motion.svg>
  );
}

// ─── Default export — full-page fallback ─────────────────────────────────────
export default function LoadingSpinner({ message }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <PriceTagSpinner message={message} />
    </div>
  );
}
