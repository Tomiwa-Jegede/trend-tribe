// src/components/listings/DiscoverFeed.jsx — TikTok-style infinite product feed
import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiHeart, FiShare2, FiMessageCircle } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { useFavorites } from "../../context/FavoritesContext";
import { useToast } from "../../context/ToastContext";
import { getListings } from "../../services/listingService";
import { revealContact } from "../../services/contactService";

const formatPrice = (price) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(price);

// ─── Single full-screen product card ───────────────────────────
const DiscoverCard = ({ listing, favorited, onFavorite, onShare, onContact, contactLoading }) => {
  const thumbnail = listing.images?.[0] || null;

  return (
    <div className="relative w-full h-full snap-start snap-always flex-shrink-0 bg-black md:flex md:items-center md:justify-center md:overflow-hidden">
      {/* Blurred backdrop fill — desktop only; mobile card is already full-bleed */}
      {thumbnail && (
        <img
          src={thumbnail}
          alt=""
          aria-hidden="true"
          className="hidden md:block absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60"
        />
      )}

      {/* Card — full-bleed on mobile, constrained + centered on desktop */}
      <div className="relative w-full h-full md:max-w-[430px] md:aspect-[9/16] md:h-auto md:max-h-[85vh] md:rounded-2xl md:overflow-hidden md:shadow-2xl">
      <div className="absolute inset-0 block">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={listing.title}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-900 to-primary-700">
            <span className="text-6xl opacity-40">🛍️</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
      </div>

      {/* ── Bottom-left product info ── */}
      <div className="absolute bottom-8 left-4 right-20 text-white pointer-events-none">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/70 mb-1">
          {listing.category?.replace("_", " ")}
        </p>
        <h3 className="text-lg font-bold leading-snug line-clamp-2 mb-1">{listing.title}</h3>
        <p className="text-xl font-extrabold mb-3">{formatPrice(listing.price)}</p>
        <Link
          to={`/listings/${listing.slug || listing.id}`}
          className="pointer-events-auto inline-flex items-center gap-1.5 bg-white text-black text-xs font-bold px-4 py-2 rounded-full w-fit shadow-md"
        >
          View Product
        </Link>
      </div>

      {/* ── Right action rail ── */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
        <button
          type="button"
          onClick={onFavorite}
          aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
          className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
        >
          <FiHeart className={`w-6 h-6 ${favorited ? "fill-red-500 text-red-500" : "text-white"}`} />
        </button>
        <button
          type="button"
          onClick={onShare}
          aria-label="Share listing"
          className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
        >
          <FiShare2 className="w-6 h-6 text-white" />
        </button>
        <button
          type="button"
          onClick={onContact}
          disabled={contactLoading || !listing.isAvailable}
          aria-label="Contact seller"
          className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center disabled:opacity-50"
        >
          <FiMessageCircle className="w-6 h-6 text-white" />
        </button>
      </div>
      </div>
    </div>
  );
};

// ─── Feed container: fetch, infinite loop, action wiring ───────
const DISCOVER_SCROLL_KEY = "discoverFeedScrollIndex";

const DiscoverFeed = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contactLoadingId, setContactLoadingId] = useState(null);
  const containerRef = useRef(null);
  const itemHeightRef = useRef(0);
  const scrollEndTimerRef = useRef(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isFavorited, toggleFavorite } = useFavorites();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getListings({ limit: 50 });
        if (!cancelled) setListings(data.listings || []);
      } catch {
        if (!cancelled) setListings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    };
  }, []);

  // Triplicate the list so we can silently jump between copies for a seamless loop
  const loopItems = listings.length > 0 ? [...listings, ...listings, ...listings] : [];

  useLayoutEffect(() => {
    if (!containerRef.current || listings.length === 0) return;
    const container = containerRef.current;
    const itemHeight = container.clientHeight;
    itemHeightRef.current = itemHeight;

    const saved = Number(sessionStorage.getItem(DISCOVER_SCROLL_KEY));
    const savedIndex = Number.isInteger(saved) && saved >= 0 && saved < listings.length ? saved : 0;

    container.scrollTop = itemHeight * (listings.length + savedIndex); // resume on the middle copy, at the saved position
  }, [listings.length]);

  // Only correct the wraparound position once scrolling has fully settled —
  // doing it mid-scroll fights the browser's native snap animation and
  // causes a visible stutter at the loop boundary.
  const handleScroll = () => {
    if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    scrollEndTimerRef.current = setTimeout(() => {
      const container = containerRef.current;
      if (!container || listings.length === 0) return;
      const itemHeight = itemHeightRef.current || container.clientHeight;
      const total = listings.length;
      let index = Math.round(container.scrollTop / itemHeight);

      if (index < total || index >= total * 2) {
        const beforeListing = loopItems[index];
        const targetIndex = index < total ? index + total : index - total;
        const afterListing = loopItems[targetIndex];
        console.log("[wraparound]", {
          fromIndex: index,
          toIndex: targetIndex,
          beforeListingId: beforeListing?.id,
          afterListingId: afterListing?.id,
          sameListing: beforeListing?.id === afterListing?.id,
          beforeThumbnail: beforeListing?.images?.[0],
          afterThumbnail: afterListing?.images?.[0],
        });

        // Temporarily disable snap so the instant jump doesn't get animated
        container.style.scrollSnapType = "none";
        container.scrollTop = index < total
          ? container.scrollTop + itemHeight * total
          : container.scrollTop - itemHeight * total;
        // Restore snap on the next frame, after the jump has applied
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (container) container.style.scrollSnapType = "y mandatory";
          });
        });
        index = targetIndex;
      }

      // Persist position (relative to the original list) so returning from
      // a product page resumes here instead of restarting from the top.
      const logicalIndex = index - total;
      sessionStorage.setItem(DISCOVER_SCROLL_KEY, String(logicalIndex));
    }, 120);
  };

  const handleFavorite = (listing) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    toggleFavorite(listing.id).catch(() => {});
  };

  const handleShare = async (listing) => {
    const url = `${window.location.origin}/listings/${listing.slug || listing.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: listing.title, url });
      } catch {
        // Share cancelled — no action needed
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  const handleContact = async (listing) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    setContactLoadingId(listing.id);
    try {
      const result = await revealContact(listing.slug || listing.id);
      if (result.whatsapp) {
        const message = encodeURIComponent(
          `Hi ${listing.seller.fullName}, I'm interested in your listing:\n📦 Item: ${listing.title}\n💰 Price: ₦${listing.price}\n🔗 Listing: ${window.location.origin}/listings/${listing.slug || listing.id}\nIs this still available?`,
        );
        window.open(`https://wa.me/${result.whatsapp.replace(/\D/g, "")}?text=${message}`, "_blank");
      } else {
        toast.info(`${listing.seller.fullName} has not added a WhatsApp number.`);
      }
    } finally {
      setContactLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full bg-black relative overflow-hidden animate-pulse">
        <div className="absolute inset-0 bg-gray-800" />
        <div className="absolute bottom-8 left-4 right-20 flex flex-col gap-3">
          <div className="h-3 bg-gray-600 rounded w-1/4" />
          <div className="h-5 bg-gray-600 rounded w-3/4" />
          <div className="h-5 bg-gray-600 rounded w-1/2" />
          <div className="h-6 bg-gray-600 rounded w-1/3 mt-1" />
        </div>
        <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5">
          <div className="w-12 h-12 rounded-full bg-gray-600" />
          <div className="w-12 h-12 rounded-full bg-gray-600" />
          <div className="w-12 h-12 rounded-full bg-gray-600" />
        </div>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="w-full h-full bg-black flex flex-col items-center justify-center text-white/70 gap-2 px-6 text-center">
        <span className="text-4xl">🛍️</span>
        <p>No listings to discover yet.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="w-full h-full overflow-y-scroll snap-y snap-mandatory bg-black no-scrollbar"
    >
      {loopItems.map((listing, i) => (
        <DiscoverCard
          key={`${listing.id}-${i}`}
          listing={listing}
          favorited={isFavorited(listing.id)}
          onFavorite={() => handleFavorite(listing)}
          onShare={() => handleShare(listing)}
          onContact={() => handleContact(listing)}
          contactLoading={contactLoadingId === listing.id}
        />
      ))}
    </div>
  );
};

export default DiscoverFeed;