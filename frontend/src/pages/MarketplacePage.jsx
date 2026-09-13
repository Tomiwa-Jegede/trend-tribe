// src/pages/MarketplacePage.jsx — Live API Version
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import ListingCard from "../components/listings/ListingCard";
import ListingCardSkeleton from "../components/listings/ListingCardSkeleton";
import FilterBar from "../components/listings/FilterBar";
import Pagination from "../components/ui/Pagination";
import Alert from "../components/ui/Alert";
import { getListings, SUBCATEGORIES_BY_CATEGORY, CATEGORIES as CATEGORY_VALUES, CATEGORY_META } from "../services/listingService";
import { FiInbox, FiArrowLeft } from "react-icons/fi";
import HomeTicker from "../components/home/HomeTicker";
import DiscoverFeed from "../components/listings/DiscoverFeed";
import useRealtime from "../hooks/useRealtime";
const ITEMS_PER_PAGE = 12;

const CATEGORIES = CATEGORY_VALUES.map((value) => ({ value, ...CATEGORY_META[value] }));
const SUBCATEGORY_DISPLAY = {
  MENS_FASHION: { label: "Men's Fashion", emoji: "👕" },
  FEMALE_FASHION: { label: "Female Fashion", emoji: "👚" },
  UNISEX_FASHION: { label: "Unisex Fashion", emoji: "👕👚" },
  JERSEY: { label: "Jersey", emoji: "🎽" },
  TIES: { label: "Ties", emoji: "👔" },
  SKIN_CARE: { label: "Skin Care", emoji: "🧴" },
  FRAGRANCE: { label: "Fragrance", emoji: "🌸" },
  HAIR_AND_WIGS: { label: "Hair and Wigs", emoji: "👱‍♀️" },
  OTHERS: { label: "Others", emoji: "🗂️" },
  PHONE_ACCESSORIES: { label: "Phone Accessories", emoji: "🎧" },
  JEWELRY: { label: "Jewelry", emoji: "💎" },
};

const MarketplacePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const prefersReducedMotion = useReducedMotion();

  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page"), 10) || 1,
  );

  const isBoosted = (l) => l.boostedUntil && new Date(l.boostedUntil) > new Date();
  const boostedListings = listings.filter(isBoosted);
  const normalListings = listings.filter((l) => !isBoosted(l));

    const [filters, setFilters] = useState({
      search: searchParams.get("search") || "",
      category: searchParams.get("category") || "",
      subcategory: searchParams.get("subcategory") || "",
      condition: searchParams.get("condition") || "",
      minPrice: searchParams.get("minPrice") || "",
      maxPrice: searchParams.get("maxPrice") || "",
    });

  const [picks, setPicks] = useState([]);
  const [picksLoading, setPicksLoading] = useState(false);
  useEffect(() => {
    if (filters.category) return;
    let cancelled = false;
    (async () => {
      setPicksLoading(true);
      try {
        const data = await getListings({ picks: true, limit: 8 });
        if (!cancelled) setPicks(data.listings || []);
      } catch { if (!cancelled) setPicks([]); }
      finally { if (!cancelled) setPicksLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [filters.category]);

  // ── Category / Discover view toggle (URL-synced) ─────────
  const view = searchParams.get("view") === "discover" ? "discover" : "category";
  const [viewDirection, setViewDirection] = useState(0);

  const handleSetView = (nextView) => {
    if (nextView === view) return;
    setViewDirection(nextView === "discover" ? 1 : -1);
    const params = new URLSearchParams(searchParams);
    if (nextView === "discover") params.set("view", "discover");
    else params.delete("view");
    setSearchParams(params, { replace: false });
  };

  const viewSlideVariants = {
    enter: (dir) => ({ x: dir > 0 ? "100%" : "-100%" }),
    center: { x: 0 },
    exit: (dir) => ({ x: dir > 0 ? "-100%" : "100%" }),
  };

  // ── Fetch listings from real API (only once a category is chosen) ──
  const fetchListings = useCallback(async () => {
    if (!filters.category) { setLoading(false); return; }
    if (SUBCATEGORIES_BY_CATEGORY[filters.category] && !filters.subcategory) { setLoading(false); return; }
    setLoading(true);
    setError("");
    try {
      const data = await getListings({
        ...filters,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      });
      setListings(data.listings);
      setPagination(data.pagination);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to load listings. Please check your connection and try again.",
      );
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage]);

  // ── Realtime: views / shares / favorite / contact — deduped (socket+pusher can double deliver)
  const lastEvRef = useRef(new Map());
  const dedup = useCallback((key, ms = 900) => {
    const now = Date.now();
    const last = lastEvRef.current.get(key) || 0;
    if (now - last < ms) return true;
    lastEvRef.current.set(key, now);
    return false;
  }, []);
  const handleViewed = useCallback(({ listingId, views }) => {
    if (dedup(`view:${listingId}:${views}`)) return;
    setListings((prev) => prev.map((l) => (l.id === listingId ? { ...l, views: Math.max((l.views ?? 0) + 1, views) } : l)));
    setPicks((prev) => prev.map((l) => (l.id === listingId ? { ...l, views: Math.max((l.views ?? 0) + 1, views) } : l)));
  }, [dedup]);
  const handleShared = useCallback(({ listingId, shares }) => {
    if (dedup(`share:${listingId}:${shares}`)) return;
    setListings((prev) => prev.map((l) => (l.id === listingId ? { ...l, shares } : l)));
    setPicks((prev) => prev.map((l) => (l.id === listingId ? { ...l, shares } : l)));
  }, [dedup]);
  const handleFavoriteRealtime = useCallback(({ listingId, favorited, favoriteCount }) => {
    if (dedup(`fav:${listingId}:${favorited}:${favoriteCount ?? ''}`)) return;
    if (favoriteCount !== undefined && favoriteCount !== null) {
      setListings((prev) => prev.map((l) => (l.id === listingId ? { ...l, favoriteCount } : l)));
      setPicks((prev) => prev.map((l) => (l.id === listingId ? { ...l, favoriteCount } : l)));
    } else {
      setListings((prev) => prev.map((l) => (l.id === listingId ? { ...l, favoriteCount: Math.max(0, (l.favoriteCount ?? 0) + (favorited ? 1 : -1)) } : l)));
      setPicks((prev) => prev.map((l) => (l.id === listingId ? { ...l, favoriteCount: Math.max(0, (l.favoriteCount ?? 0) + (favorited ? 1 : -1)) } : l)));
    }
  }, [dedup]);
  const handleContacted = useCallback(({ listingId, contactViews }) => {
    if (dedup(`contact:${listingId}:${contactViews}`)) return;
    setListings((prev) => prev.map((l) => (l.id === listingId ? { ...l, contactViews } : l)));
    setPicks((prev) => prev.map((l) => (l.id === listingId ? { ...l, contactViews } : l)));
  }, [dedup]);
  useRealtime("listing:viewed", handleViewed);
  useRealtime("listing:shared", handleShared);
  useRealtime("favorite", handleFavoriteRealtime);
  useRealtime("listing:contacted", handleContacted);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Natural: mount + focus — refetch without spinner
  useEffect(() => {
    const onFocus = () => fetchListings();
    const onVis = () => { if (document.visibilityState === "visible") fetchListings(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => { window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onVis); };
  }, [fetchListings]);

  // ── Sync filters + page to URL — preserve view=discover (avoid loop: compare before set, use view not searchParams object)
  useEffect(() => {
    const params = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params[key] = value;
    });
    if (currentPage > 1) params.page = String(currentPage);
    if (view === "discover") params.view = "discover";
    const curr = Object.fromEntries(searchParams.entries());
    // normalize: remove empty view, compare
    if (JSON.stringify(curr) === JSON.stringify(params)) return;
    setSearchParams(params, { replace: true });
  }, [filters, currentPage, view, setSearchParams]);
  // keep filters + currentPage in sync when user navigates via Browse by Category or back/forward (URL truth)
  useEffect(() => {
    const p = parseInt(searchParams.get("page"), 10);
    const nextPage = Number.isInteger(p) && p > 0 ? p : 1;
    if (nextPage !== currentPage) setCurrentPage(nextPage);
    const nextFilters = {
      search: searchParams.get("search") || "",
      category: searchParams.get("category") || "",
      subcategory: searchParams.get("subcategory") || "",
      condition: searchParams.get("condition") || "",
      minPrice: searchParams.get("minPrice") || "",
      maxPrice: searchParams.get("maxPrice") || "",
    };
    if (JSON.stringify(nextFilters) !== JSON.stringify(filters)) setFilters(nextFilters);
  }, [searchParams]);

  const handleFilterChange = (update) => {
    setFilters((prev) => ({ ...prev, ...update }));
    setCurrentPage(1); // reset to page 1 on filter change
  };

     const handleReset = () => {
      setFilters({
        search: "",
        category: "",
        subcategory: "",
        condition: "",
        minPrice: "",
        maxPrice: "",
      });
      setCurrentPage(1);
    };

      const handleSelectCategory = (value) => {
    setFilters((prev) => ({ ...prev, category: value, subcategory: "" }));
    setCurrentPage(1);
  };

  const handleChangeCategory = () => {
    setFilters((prev) => ({ ...prev, category: "", subcategory: "" }));
    setCurrentPage(1);
  };

  const handleSelectSubcategory = (value) => {
    setFilters((prev) => ({ ...prev, subcategory: value }));
    setCurrentPage(1);
  };

  const handleChangeSubcategory = () => {
    setFilters((prev) => ({ ...prev, subcategory: "" }));
    setCurrentPage(1);
  };

  const needsSubcategoryStep =
    Boolean(SUBCATEGORIES_BY_CATEGORY[filters.category]) && !filters.subcategory;
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Animation variants ────────────────────────────────────
  const gridVariants = {
    hidden: {},
    show: {
      transition: { staggerChildren: prefersReducedMotion ? 0 : 0.06 },
    },
  };

  const cardVariants = {
    hidden: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.4,
        ease: "easeOut",
      },
    },
  };

  const fadeVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { duration: prefersReducedMotion ? 0 : 0.3 },
    },
    exit: {
      opacity: 0,
      transition: { duration: prefersReducedMotion ? 0 : 0.2 },
    },
  };

  // Key that changes whenever the result set changes, so the grid
  // replays its stagger-in animation on every page OR filter change
  const resultsKey = `${currentPage}-${JSON.stringify(filters)}`;

  return (
    <>
      <Helmet>
        <title>Marketplace — Trend Tribe</title>
        <meta
          name="description"
          content="Browse books, electronics, clothing, and more for sale by students on your campus."
        />
        <link rel="canonical" href="https://trendtribe.app/marketplace" />
      </Helmet>

      <div className="relative overflow-hidden">
        <AnimatePresence initial={false} custom={viewDirection}>
          {view === "discover" ? (
            <motion.div
              key="discover-view"
              custom={viewDirection}
              variants={viewSlideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="fixed inset-0 z-30"
            >
              {/* ── Toggle overlay (fixed, floats above the feed) ── */}
              <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40">
                <div className="flex bg-white/20 backdrop-blur-xl rounded-full shadow-lg border border-white/30 p-0.5">
                  <button
                    onClick={() => handleSetView("category")}
                    className="px-3 py-1 text-xs font-semibold rounded-full transition-colors text-white/80"
                  >
                    Category
                  </button>
                  <button
                    onClick={() => handleSetView("discover")}
                    className="px-3 py-1 text-xs font-semibold rounded-full transition-colors bg-white/25 backdrop-blur-md text-white border border-white/40"
                  >
                    Discover
                  </button>
                </div>
              </div>
              <DiscoverFeed />
            </motion.div>
          ) : (
      <motion.div
        key="category-view"
        custom={viewDirection}
        variants={viewSlideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: [0.4, 0, 0.2, 1] }}
      >
      <HomeTicker variant="info" />

      {/* ── Toggle: in-flow, centered below the ticker (never overlaps content) ── */}
      <div className="relative flex justify-center pt-4 pb-2 z-40">
        <div className="flex bg-white/20 backdrop-blur-xl rounded-full shadow-lg border border-white/30 p-0.5">
          <button
            onClick={() => handleSetView("category")}
            className="px-3 py-1 text-xs font-semibold rounded-full transition-colors bg-primary-600/70 backdrop-blur-md text-white border border-white/50 shadow-sm"
          >
            Category
          </button>
          <button
            onClick={() => handleSetView("discover")}
            className="px-3 py-1 text-xs font-semibold rounded-full transition-colors text-gray-500"
          >
            Discover
          </button>
        </div>
      </div>

      <div className="container-app py-10">
        {/* ── Page Header ──────────────────────────────────── */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 break-words">
            {!filters.category
              ? "Categories"
              : needsSubcategoryStep
              ? CATEGORIES.find((c) => c.value === filters.category)?.label ??
                "Marketplace"
              : filters.subcategory
              ? SUBCATEGORY_DISPLAY[filters.subcategory]?.label ?? "Marketplace"
              : CATEGORIES.find((c) => c.value === filters.category)?.label ??
                "Marketplace"}
          </h1>
          {filters.category && !needsSubcategoryStep && (
            <p className="text-sm sm:text-base text-gray-600 mt-2 min-h-[20px] break-words">
              {loading
                ? "Loading listings…"
                : `${pagination?.totalCount ?? 0} item${
                    pagination?.totalCount !== 1 ? "s" : ""
                  } available`}
            </p>
          )}
        </div>

        {/* ── Trend Tribe Picks — Featured before category (x2, all shown, order curated) ── */}
        {!filters.category && (picksLoading || picks.length > 0) && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xs font-bold tracking-widest uppercase text-navy-900">Trend Tribe Picks</span>
              <span className="text-xs text-gray-400">· Featured before category</span>
              {picks.length > 0 && <span className="ml-auto text-xs font-medium text-navy-900 bg-primary-50 border border-primary-200 rounded-full px-2.5 py-1">{picks.length} picks</span>}
            </div>
            {picksLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {Array.from({ length: 4 }).map((_, i) => <ListingCardSkeleton key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {picks.map((listing) => (
                  <div key={`picks-${listing.id}`} className="relative">
                    <span className="absolute top-2 left-2 z-10 bg-navy-900 text-white text-[10px] font-bold px-2 py-1 rounded-full">★ Picks</span>
                    <ListingCard listing={listing} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Category Picker (shown until a category is chosen) ── */}
        {!filters.category ? (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: "easeOut" }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {CATEGORIES.map(({ label, emoji, value }) => (
              <button
                key={value}
                onClick={() => handleSelectCategory(value)}
                className="card p-6 flex flex-col items-center gap-3 hover:border-primary-300 hover:shadow-md transition-all text-center"
              >
                <span className="text-4xl">{emoji}</span>
                <span className="font-semibold text-gray-900">{label}</span>
              </button>
            ))}
          </motion.div>
        ) : needsSubcategoryStep ? (
          <>
            {/* ── Back to categories ─────────────────────────── */}
            <button
              onClick={handleChangeCategory}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
            >
              <FiArrowLeft className="w-4 h-4" />
              Change category
            </button>

            {/* ── Subcategory Picker ───────────────────────────── */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: "easeOut" }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {SUBCATEGORIES_BY_CATEGORY[filters.category].map((value) => {
                const display = SUBCATEGORY_DISPLAY[value] || {
                  label: value.replace(/_/g, " "),
                  emoji: "🗂️",
                };
                return (
                  <button
                    key={value}
                    onClick={() => handleSelectSubcategory(value)}
                    className="card p-6 flex flex-col items-center gap-3 hover:border-primary-300 hover:shadow-md transition-all text-center"
                  >
                    <span className="text-4xl">{display.emoji}</span>
                    <span className="font-semibold text-gray-900">{display.label}</span>
                  </button>
                );
              })}
            </motion.div>
          </>
        ) : (
          <>
            {/* ── Back to categories / subcategories ───────────── */}
            <button
              onClick={
                SUBCATEGORIES_BY_CATEGORY[filters.category]
                  ? handleChangeSubcategory
                  : handleChangeCategory
              }
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
            >
              <FiArrowLeft className="w-4 h-4" />
              {SUBCATEGORIES_BY_CATEGORY[filters.category]
                ? "Change subcategory"
                : "Change category"}
            </button>

            {/* ── Sticky, blurred Filter Bar ───────────────────── */}
            <div className="sticky top-16 z-40 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 mb-6 bg-white/80 backdrop-blur-md border-b border-gray-100">
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.4,
                  ease: "easeOut",
                }}
              >
                <FilterBar
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onReset={handleReset}
                  hideCategoryFilter
                  searchPlaceholder={`Search for ${
                    CATEGORIES.find((c) => c.value === filters.category)
                      ?.label ?? "items"
                  }...`}
                />
              </motion.div>
            </div>

            {/* ── Error State ──────────────────────────────────── */}
            {error && (
              <Alert type="error" message={error} onDismiss={() => setError("")} />
            )}

            {/* ── Featured Boosted Product Cards (Marketplace top only, A) ── */}
            {!loading && boostedListings.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-xs font-bold tracking-widest uppercase text-amber-600">Featured</span>
                  <span className="text-xs text-gray-400">· Sponsored · 24h</span>
                  <span className="ml-auto text-xs font-medium text-gray-500 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                    {boostedListings.length} featured
                  </span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {boostedListings.map((listing) => (
                    <div key={`boosted-${listing.id}`} className="relative">
                      <span className="absolute top-2 left-2 z-10 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-1 rounded-full">★ Featured</span>
                      <ListingCard listing={listing} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Listings Grid / Loading / Empty (cross-fade) ──── */}
            <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              variants={fadeVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </motion.div>
          ) : normalListings.length > 0 ? (
            <motion.div
              key={resultsKey}
              variants={fadeVariants}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              <motion.div
                className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
                variants={gridVariants}
                initial="hidden"
                animate="show"
              >
                {normalListings.map((listing) => (
                  <motion.div key={listing.id} variants={cardVariants}>
                    <ListingCard listing={listing} />
                  </motion.div>
                ))}
              </motion.div>

              <AnimatePresence>
                {pagination && pagination.totalPages > 1 && (
                  <motion.div
                    key="pagination"
                    initial={prefersReducedMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                  >
                    <Pagination
                      currentPage={pagination.currentPage}
                      totalPages={pagination.totalPages}
                      onPageChange={handlePageChange}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : !error && normalListings.length===0 && boostedListings.length===0 ? (
            <motion.div
              key="empty"
              variants={fadeVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <motion.div
                initial={
                  prefersReducedMotion ? false : { scale: 0.8, opacity: 0 }
                }
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.4,
                  ease: "easeOut",
                }}
                className="w-16 h-16 bg-gray-100 rounded-full flex items-center
                          justify-center mb-4"
              >
                <FiInbox className="w-7 h-7 text-gray-400" />
              </motion.div>
              <h4 className="text-gray-700 mb-2">No listings found</h4>
              <p className="text-gray-400 max-w-sm">
                Try adjusting your filters or search term to find what you're
                looking for.
              </p>
              <button onClick={handleReset} className="btn-secondary mt-6">
                Clear all filters
              </button>
            </motion.div>
          ) : null}
            </AnimatePresence>
          </>
        )}
      </div>
      </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default MarketplacePage;
