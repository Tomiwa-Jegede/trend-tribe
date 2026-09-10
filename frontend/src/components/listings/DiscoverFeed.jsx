// src/components/listings/DiscoverFeed.jsx — TikTok-style infinite product feed
import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiHeart, FiLink2, FiMessageCircle, FiShoppingBag } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { useFavorites } from "../../context/FavoritesContext";
import { useToast } from "../../context/ToastContext";
import { getListings, incrementShare } from "../../services/listingService";
import { revealContact } from "../../services/contactService";
import useRealtime from "../../hooks/useRealtime";

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
    <div className="relative w-full h-full snap-start snap-always flex-shrink-0 bg-black flex items-center justify-center overflow-hidden">
      {/* Blurred backdrop fill — desktop only; mobile card is already full-bleed */}
      {thumbnail && (
        <img
          src={thumbnail}
          alt=""
          aria-hidden="true"
          className="block absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60"
        />
      )}

      {/* Card — aspect-locked on all breakpoints to preserve ratio, centered */}
      <div className="relative w-full h-full max-w-[430px] aspect-[9/16] max-h-[85vh] mx-auto rounded-2xl overflow-hidden shadow-2xl">
      <div className="absolute inset-0 block">
        {thumbnail ? (
          <>
            <img
              src={thumbnail}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60"
            />
            <img
              src={thumbnail}
              alt={listing.title}
              className="relative w-full h-full object-contain object-center"
              loading="lazy"
              decoding="async"
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-900 to-primary-700">
            <FiShoppingBag className="w-12 h-12 text-white/40" aria-hidden="true" />
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
        <p className="text-xl font-extrabold mb-1">{formatPrice(listing.price)}</p>
        <p className="text-xs text-white/70 mb-3" title="Views — detail page opens, unique per user per day, not counting you">
          {listing.views ?? 0} views
        </p>
        <Link
          to={`/listings/${listing.slug || listing.id}`}
          className="pointer-events-auto inline-flex items-center gap-1.5 bg-white text-black text-xs font-bold px-4 py-2 rounded-full w-fit shadow-md"
        >
          View Product
        </Link>
      </div>

      {/* ── Right action rail — counts just under icons, no emojis */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-4 z-10">
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={onFavorite}
            aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
          >
            <FiHeart className={`w-6 h-6 ${favorited ? "fill-red-500 text-red-500" : "text-white"}`} />
          </button>
          <span className="text-xs font-semibold text-white mt-1">{listing.favoriteCount ?? 0}</span>
        </div>
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={onShare}
            aria-label="Copy link"
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
          >
            <FiLink2 className="w-6 h-6 text-white" />
          </button>
          <span className="text-xs font-semibold text-white mt-1">{listing.shares ?? 0}</span>
        </div>
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={onContact}
          disabled={contactLoading || !listing.isAvailable}
          aria-label="Contact seller"
          className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center disabled:opacity-50"
        >
          <FiMessageCircle className="w-6 h-6 text-white" />
        </button>
          <span className="text-xs font-semibold text-white mt-1">{listing.contactViews ?? 0}</span>
        </div>
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

  const lastEvRef = useRef(new Map());
  const dedup = useCallback((key, ms = 900) => {
    const now = Date.now();
    const last = lastEvRef.current.get(key) || 0;
    if (now - last < ms) return true;
    lastEvRef.current.set(key, now);
    return false;
  }, []);

  // realtime — favorite / share / contact like views (deduped)
  const handleFavRealtime = useCallback(({ listingId, favorited, favoriteCount }) => {
    if (dedup(`fav:${listingId}:${favorited}:${favoriteCount ?? ''}`)) return;
    setListings((prev) => prev.map((l) => {
      if (l.id !== listingId) return l;
      if (favoriteCount !== undefined && favoriteCount !== null) return { ...l, favoriteCount };
      return { ...l, favoriteCount: Math.max(0, (l.favoriteCount ?? 0) + (favorited ? 1 : -1)) };
    }));
  }, [dedup]);
  const handleShareRealtime = useCallback(({ listingId, shares }) => {
    if (dedup(`share:${listingId}:${shares}`)) return;
    setListings((prev) => prev.map((l) => l.id === listingId ? { ...l, shares } : l));
  }, [dedup]);
  const handleContactRealtime = useCallback(({ listingId, contactViews }) => {
    if (dedup(`contact:${listingId}:${contactViews}`)) return;
    setListings((prev) => prev.map((l) => l.id === listingId ? { ...l, contactViews } : l));
  }, [dedup]);
  useRealtime("favorite", handleFavRealtime);
  useRealtime("listing:shared", handleShareRealtime);
  useRealtime("listing:contacted", handleContactRealtime);

  const shuffleArray = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Backend supports sort=random (ORDER BY RANDOM via shuffled IDs) + client shuffle for extra entropy and to break API cache
        const data = await getListings({ limit: 50, sort: "random" });
        if (!cancelled) setListings(shuffleArray(data.listings || []));
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
    const bumpShare = () => {
      incrementShare(listing.slug || listing.id).catch(() => {});
      setListings((prev) => prev.map((l) => (l.id === listing.id ? { ...l, shares: (l.shares ?? 0) + 1 } : l)));
    };
    if (navigator.share) {
      try {
        await navigator.share({ title: listing.title, url });
        bumpShare();
      } catch {
        // Share cancelled — no action needed
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
      bumpShare();
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  const handleContact = async (listing) => {
    if (!isAuthenticated) { navigate("/login", { state: { from: `/chat?thread=${listing.id}-${listing.seller.id}` } }); return; }
    try {
      const api = (await import("../../api/axios")).default;
      await api.post("/messages/conversations", { listingId: listing.id });
    } catch {}
    navigate(`/chat?thread=${listing.id}-${listing.seller.id}`);
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