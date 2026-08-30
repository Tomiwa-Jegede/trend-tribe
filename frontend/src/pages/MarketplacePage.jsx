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
import { getListings } from "../services/listingService";
import { FiInbox, FiArrowLeft } from "react-icons/fi";
import HomeTicker from "../components/home/HomeTicker";
const ITEMS_PER_PAGE = 12;

const CATEGORIES = [
  { label: "Books", emoji: "📚", value: "BOOKS" },
  { label: "Electronics", emoji: "💻", value: "ELECTRONICS" },
  { label: "Clothing", emoji: "👗", value: "CLOTHING" },
  { label: "Furniture", emoji: "🪑", value: "FURNITURE" },
  { label: "Stationery", emoji: "✏️", value: "STATIONERY" },
  { label: "Sports", emoji: "⚽", value: "SPORTS" },
  { label: "Food", emoji: "🍱", value: "FOOD" },
  { label: "Services", emoji: "🛠️", value: "SERVICES" },
];

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

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    category: searchParams.get("category") || "",
    condition: searchParams.get("condition") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
  });

  // ── Fetch listings from real API (only once a category is chosen) ──
  const fetchListings = useCallback(async () => {
    if (!filters.category) return;
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
      condition: "",
      minPrice: "",
      maxPrice: "",
    });
    setCurrentPage(1);
  };

  const handleSelectCategory = (value) => {
    setFilters((prev) => ({ ...prev, category: value }));
    setCurrentPage(1);
  };

  const handleChangeCategory = () => {
    setFilters((prev) => ({ ...prev, category: "" }));
    setCurrentPage(1);
  };

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
        <div className="mb-8">
          <h1 className="text-gray-900">Marketplace</h1>
          <p className="text-gray-500 mt-2">
            {loading
              ? "Loading listings…"
              : `${pagination?.totalCount ?? 0} item${
                  pagination?.totalCount !== 1 ? "s" : ""
                } available`}
          </p>
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
        ) : (
          <>
            {/* ── Back to categories ─────────────────────────── */}
            <button
              onClick={handleChangeCategory}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
            >
              <FiArrowLeft className="w-4 h-4" />
              Change category
            </button>

            {/* ── Sticky, blurred Filter Bar ───────────────────── */}
            <div className="sticky top-0 z-20 -mx-4 px-4 py-3 mb-6 bg-white/80 backdrop-blur-md border-b border-gray-100">
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
                />
              </motion.div>
            </div>

            {/* ── Error State ──────────────────────────────────── */}
            {error && (
              <Alert type="error" message={error} onDismiss={() => setError("")} />
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
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </motion.div>
          ) : listings.length > 0 ? (
            <motion.div
              key={resultsKey}
              variants={fadeVariants}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              <motion.div
                className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
                variants={gridVariants}
                initial="hidden"
                animate="show"
              >
                {listings.map((listing) => (
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
          ) : !error ? (
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
