// src/components/listings/ListingCard.jsx

import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiMapPin, FiUser, FiHeart } from "react-icons/fi";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useFavorites } from "../../context/FavoritesContext";

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
  rest: {
    y: 0,
    scale: 1,
    boxShadow: "0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)",
  },
  hover: {
    y: -6,
    scale: 1.015,
    boxShadow:
      "0 20px 40px -8px rgba(22,163,74,0.18), 0 8px 16px -4px rgba(0,0,0,0.10)",
    transition: { type: "spring", stiffness: 340, damping: 22 },
  },
  tap: {
    scale: 0.97,
    y: 0,
    boxShadow: "0 1px 4px 0 rgba(0,0,0,0.10)",
    transition: { type: "spring", stiffness: 400, damping: 20 },
  },
};

const imageVariants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.07,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const priceVariants = {
  hidden: { opacity: 0, scale: 0.75, y: 6 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 380, damping: 18, delay: 0.15 },
  },
};

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
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isFavorited, toggleFavorite } = useFavorites();
  const { id, title, price, category, condition, images, location, seller } =
    listing;
  const allImages = images && images.length > 0 ? images : [null];
  const favorited = isFavorited(id);
  const [idx, setIdx] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const draggingRef = useRef(false);
  const containerRef = useRef(null);

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    toggleFavorite(id).catch(() => {});
  };

  const onStart = (clientX) => {
    if (allImages.length <= 1) return;
    startXRef.current = clientX;
    draggingRef.current = false;
    setIsDragging(true);
  };
  const onMove = (clientX) => {
    if (!isDragging || allImages.length <= 1) return;
    const diff = clientX - startXRef.current;
    if (Math.abs(diff) > 5) draggingRef.current = true;
    // clamp drag so you feel resistance at edges
    let clamped = diff;
    if ((idx === 0 && diff > 0) || (idx === allImages.length - 1 && diff < 0)) {
      clamped = diff * 0.35;
    }
    setDragOffset(clamped);
  };
  const onEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const threshold = Math.min(80, (containerRef.current?.offsetWidth || 300) * 0.22);
    if (draggingRef.current) {
      if (dragOffset < -threshold && idx < allImages.length - 1) setIdx((p) => p + 1);
      else if (dragOffset > threshold && idx > 0) setIdx((p) => p - 1);
    }
    setDragOffset(0);
    setTimeout(() => { draggingRef.current = false; }, 60);
  };

  const handleTouchStart = (e) => onStart(e.touches[0].clientX);
  const handleTouchMove = (e) => onMove(e.touches[0].clientX);
  const handleImageTap = (e) => {
    if (draggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    navigate(`/listings/${id}`);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    onStart(e.clientX);
    const move = (ev) => onMove(ev.clientX);
    const up = () => {
      onEnd();
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

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
      className="rounded-2xl overflow-hidden bg-white cursor-pointer flex flex-col h-full"
      style={{ willChange: "transform" }}
    >
      {/* ── Image — swipeable on mobile, follows finger ─────── */}
      <div
        ref={containerRef}
        className="relative aspect-[4/3] bg-gray-100 overflow-hidden select-none touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={onEnd}
        onMouseDown={handleMouseDown}
        onClick={handleImageTap}
        style={{ cursor: allImages.length > 1 ? (isDragging ? "grabbing" : "grab") : "pointer" }}
      >
        {/* Track */}
        <div
          className="flex h-full"
          style={{
            width: `${allImages.length * 100}%`,
            transform: `translateX(calc(-${idx * (100 / allImages.length)}% + ${dragOffset}px))`,
            transition: isDragging ? "none" : "transform 0.32s cubic-bezier(0.32,0.72,0,1)",
          }}
        >
          {allImages.map((src, i) => (
            <div key={i} className="h-full flex-shrink-0" style={{ width: `${100 / allImages.length}%` }}>
              {src ? (
                <img
                  src={src}
                  alt={`${title} ${i + 1}`}
                  className="w-full h-full object-cover pointer-events-none"
                  style={{ objectPosition: `${listing.coverPosition?.x ?? 50}% ${listing.coverPosition?.y ?? 50}%` }}
                  draggable={false}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sage-50 to-sage-100">
                  <span className="text-4xl opacity-40">🛍️</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Condition badge */}
        <motion.span
          className={`badge absolute top-3 left-3 ${CONDITION_STYLES[condition]} pointer-events-none`}
          initial={reduced ? {} : { opacity: 0, x: -8 }}
          animate={reduced ? {} : { opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {CONDITION_LABELS[condition]}
        </motion.span>

        {/* Favorite heart */}
        <motion.button
          type="button"
          onClick={handleFavoriteClick}
          aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
          initial={reduced ? {} : { opacity: 0, scale: 0.8 }}
          animate={reduced ? {} : { opacity: 1, scale: 1 }}
          whileTap={reduced ? {} : { scale: 0.85 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
        >
          <FiHeart className={`w-4 h-4 transition-colors ${favorited ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
        </motion.button>

        {/* Dots */}
        {allImages.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-none">
            {allImages.map((_, i) => (
              <span
                key={i}
                className={`rounded-full transition-all duration-200 ${i === idx ? "w-5 h-1.5 bg-white shadow" : "w-1.5 h-1.5 bg-white/60"}`}
              />
            ))}
          </div>
        )}
        {/* Tap dots hit area */}
        {allImages.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 h-8 flex items-center justify-center gap-1.5">
            {allImages.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIdx(i);
                }}
                aria-label={`View image ${i + 1}`}
                className={`rounded-full ${i === idx ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/70"} shadow-sm`}
              />
            ))}
          </div>
        )}

        {!reduced && (
          <motion.div
            className="absolute inset-0 bg-navy-900 pointer-events-none"
            initial={{ opacity: 0 }}
            variants={{ rest: { opacity: 0 }, hover: { opacity: 0.06 } }}
            transition={{ duration: 0.25 }}
          />
        )}
      </div>

      {/* ── Content — links to detail ──────────────────────── */}
      <Link
        to={`/listings/${id}`}
        className="p-3 sm:p-4 flex flex-col gap-1.5 sm:gap-2 flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded-b-2xl"
        aria-label={`View listing: ${title}`}
      >
        <motion.span
          className="text-[11px] sm:text-xs font-semibold text-primary-600 uppercase tracking-wide truncate"
          variants={reduced ? {} : categoryVariants}
          initial="hidden"
          animate="show"
        >
          {category.replace("_", " ")}
        </motion.span>
        <h4 className="text-sm sm:text-[15px] lg:text-base font-semibold text-gray-900 line-clamp-2 leading-snug break-words">
          {title}
        </h4>
        <motion.p
          className="text-lg sm:text-xl font-extrabold mt-1 text-primary-600 break-words"
          variants={reduced ? {} : priceVariants}
          initial="hidden"
          animate="show"
        >
          {formatPrice(price)}
        </motion.p>
        {location && (
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
            <FiMapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        )}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <div className="w-6 h-6 bg-sage-100 rounded-full flex items-center justify-center flex-shrink-0">
            <FiUser className="w-3 h-3 text-primary-600" />
          </div>
          <span className="text-xs text-gray-500 truncate">{seller?.fullName || seller?.username}</span>
        </div>
      </Link>
    </motion.div>
  );
};

export default ListingCard;
