// src/components/listings/ListingCard.jsx

import { Link } from "react-router-dom";
import { FiMapPin, FiUser } from "react-icons/fi";
import { motion, useReducedMotion } from "framer-motion";

// ─── Condition badge color map ────────────────────────────────
const CONDITION_STYLES = {
  NEW: "bg-sage-100 text-sage-500",
  LIKE_NEW: "bg-primary-100 text-primary-600",
  GOOD: "bg-accent-100 text-accent-500",
  FAIR: "bg-accent-50 text-accent-600",
  POOR: "bg-navy-100 text-navy-900",
};

const CONDITION_LABELS = {
  NEW: "New",
  LIKE_NEW: "Like New",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
};

const formatPrice = (price) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(price);

// ─── Motion variants ──────────────────────────────────────────
const cardVariants = {
  // resting state
  rest: {
    y: 0,
    scale: 1,
    boxShadow: "0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)",
  },
  // desktop hover — lift + richer shadow
  hover: {
    y: -6,
    scale: 1.015,
    boxShadow:
      "0 20px 40px -8px rgba(22,163,74,0.18), 0 8px 16px -4px rgba(0,0,0,0.10)",
    transition: { type: "spring", stiffness: 340, damping: 22 },
  },
  // mobile / click tap feedback
  tap: {
    scale: 0.97,
    y: 0,
    boxShadow: "0 1px 4px 0 rgba(0,0,0,0.10)",
    transition: { type: "spring", stiffness: 400, damping: 20 },
  },
};

// Image zoom on hover
const imageVariants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.07,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

// Price tag springs in on mount
const priceVariants = {
  hidden: { opacity: 0, scale: 0.75, y: 6 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 380, damping: 18, delay: 0.15 },
  },
};

// Category label fades up on mount
const categoryVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut", delay: 0.05 },
  },
};

// ─────────────────────────────────────────────────────────────
const ListingCard = ({ listing }) => {
  const reduced = useReducedMotion();
  const { id, title, price, category, condition, images, location, seller } =
    listing;
  const thumbnail = images?.[0] || null;

  // When reduced motion is on — collapse everything to a simple fade
  const safeCard = reduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        whileHover: {},
        whileTap: {},
        transition: { duration: 0.25 },
      }
    : {
        initial: "rest",
        animate: "rest",
        whileHover: "hover",
        whileTap: "tap",
        variants: cardVariants,
      };

  return (
    <motion.div
      {...safeCard}
      className="rounded-2xl overflow-hidden bg-white cursor-pointer"
      style={{ willChange: "transform" }}
    >
      <Link
        to={`/listings/${id}`}
        className="flex flex-col h-full focus:outline-none 
                   focus-visible:ring-2 focus-visible:ring-primary-600 
                   focus-visible:ring-offset-2 rounded-2xl"
        aria-label={`View listing: ${title}`}
      >
        {/* ── Image ─────────────────────────────────────── */}
        <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
          {thumbnail ? (
            <motion.img
              src={thumbnail}
              alt={title}
              className="w-full h-full object-cover"
              style={{
                objectPosition: `${listing.coverPosition?.x ?? 50}% ${listing.coverPosition?.y ?? 50}%`,
              }}
              variants={reduced ? {} : imageVariants}
              initial={{ opacity: 0, filter: "blur(8px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center
                         bg-gradient-to-br from-sage-50 to-sage-100"
            >
              <span className="text-4xl opacity-40">🛍️</span>
            </div>
          )}

          {/* Condition badge */}
          <motion.span
            className={`badge absolute top-3 left-3 ${CONDITION_STYLES[condition]}`}
            initial={reduced ? {} : { opacity: 0, x: -8 }}
            animate={reduced ? {} : { opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {CONDITION_LABELS[condition]}
          </motion.span>

          {/* Hover overlay */}
          {!reduced && (
            <motion.div
              className="absolute inset-0 bg-navy-900 pointer-events-none"
              initial={{ opacity: 0 }}
              variants={{
                rest: { opacity: 0 },
                hover: { opacity: 0.06 },
              }}
              transition={{ duration: 0.25 }}
            />
          )}
        </div>

        {/* ── Content ───────────────────────────────────── */}
        <div className="p-4 flex flex-col gap-2 flex-1">
          {/* Category */}
          <motion.span
            className="text-xs font-semibold text-primary-600 uppercase tracking-wide"
            variants={reduced ? {} : categoryVariants}
            initial="hidden"
            animate="show"
          >
            {category.replace("_", " ")}
          </motion.span>

          {/* Title */}
          <h4
            className="text-gray-900 line-clamp-2 leading-snug
                         group-hover:text-primary-600 transition-colors duration-200"
          >
            {title}
          </h4>

          {/* Price */}
          <motion.p
            className="text-xl font-extrabold mt-1 text-primary-600"
            variants={reduced ? {} : priceVariants}
            initial="hidden"
            animate="show"
          >
            {formatPrice(price)}
          </motion.p>

          {/* Location */}
          {location && (
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
              <FiMapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          )}

          {/* Seller row */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <div
              className="w-6 h-6 bg-sage-100 rounded-full flex
                         items-center justify-center flex-shrink-0"
            >
              <FiUser className="w-3 h-3 text-primary-600" />
            </div>

            <span className="text-xs text-gray-500 truncate">
              {seller?.fullName || seller?.username}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ListingCard;
