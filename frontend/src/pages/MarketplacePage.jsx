// src/pages/MarketplacePage.jsx — Live API Version
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import ListingCard from "../components/listings/ListingCard";
import ListingCardSkeleton from "../components/listings/ListingCardSkeleton";
import FilterBar from "../components/listings/FilterBar";
import Pagination from "../components/ui/Pagination";
import Alert from "../components/ui/Alert";
import { getListings, SUBCATEGORIES_BY_CATEGORY } from "../services/listingService";
import { FiInbox, FiArrowLeft } from "react-icons/fi";
import HomeTicker from "../components/home/HomeTicker";
const ITEMS_PER_PAGE = 12;

const CATEGORIES = [
  { label: "Accessories", emoji: "🔌💎", value: "ACCESSORIES" },
  { label: "Fashion", emoji: "👗", value: "FASHION" },
  { label: "Beauty & Personal Care", emoji: "💄", value: "BEAUTY_AND_PERSONAL_CARE" },
  { label: "Snacks", emoji: "🍿", value: "SNACKS" },
  { label: "Gadgets", emoji: "📱", value: "GADGETS" },
  { label: "Others", emoji: "🗂️", value: "OTHERS" },
];
const SUBCATEGORY_DISPLAY = {
  MENS_FASHION: { label: "Men's Fashion", emoji: "👕" },
  FEMALE_FASHION: { label: "Female Fashion", emoji: "👚" },
  UNISEX_FASHION: { label: "Unisex Fashion", emoji: "👕👚" },
  JERSEY: { label: "Jersey", emoji: "🎽" },
  TIES: { label: "Ties", emoji: "👔" },
  SKIN_CARE: { label: "Skin Care", emoji: "🧴" },
  FRAGRANCE: { label: "Fragrance", emoji: "🌸" },
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

  // ── Fetch listings from real API (only once a category is chosen) ──
  const fetchListings = useCallback(async () => {
    if (!filters.category) return;
    if (SUBCATEGORIES_BY_CATEGORY[filters.category] && !filters.subcategory) return;
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

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // ── Sync filters + page to URL ───────────────────────────
  useEffect(() => {
    const params = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params[key] = value;
    });
    if (currentPage > 1) params.page = currentPage;
    setSearchParams(params, { replace: true });
  }, [filters, currentPage]);

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
        <link rel="canonical" href="https://trendtribee.netlify.app/marketplace" />
      </Helmet>
      <HomeTicker variant="info" />
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
    </>
  );
};

export default MarketplacePage;
