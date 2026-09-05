// src/pages/FavoritesPage.jsx — Saved / Favorited Listings
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import ListingCard from "../components/listings/ListingCard";
import ListingCardSkeleton from "../components/listings/ListingCardSkeleton";
import Pagination from "../components/ui/Pagination";
import Alert from "../components/ui/Alert";
import { getMyFavorites } from "../services/listingService";
import { useFavorites } from "../context/FavoritesContext";
import { FiHeart } from "react-icons/fi";
import useRealtime from "../hooks/useRealtime";

const ITEMS_PER_PAGE = 12;

const FavoritesPage = () => {
  const [searchParams] = useSearchParams();
  const prefersReducedMotion = useReducedMotion();
  const { favoriteIds } = useFavorites();

  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page"), 10) || 1,
  );

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMyFavorites({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      });
      setListings(data.listings);
      setPagination(data.pagination);
    } catch (err) {
      if (import.meta.env.DEV) console.error("[FavoritesPage fetch]", err?.response?.data || err.message, err);
      setError(
        err.response?.data?.error ||
          "Failed to load your favorites. Please check your connection and try again.",
      );
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchFavorites();
    // Re-fetch whenever the favorited-ids set changes size (e.g. user
    // unfavorites a listing from this very page and the list should shrink)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFavorites, favoriteIds.size]);

  // Real-time: socket when favorite toggled elsewhere (no manual refresh)
  const pollFavorites = useCallback(() => {
    const silent = async () => {
      try {
        const data = await getMyFavorites({ page: currentPage, limit: ITEMS_PER_PAGE });
        setListings(data.listings);
        setPagination(data.pagination);
      } catch {}
    };
    silent();
  }, [currentPage]);
  useRealtime("favorite", pollFavorites, { enabled: true });

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Filter against the live favoriteIds set so unfavoriting a card removes
  // it from view instantly, without waiting on the background re-fetch.
  const displayedListings = listings.filter((l) => favoriteIds.has(l.id));

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
      transition: { duration: prefersReducedMotion ? 0 : 0.4, ease: "easeOut" },
    },
  };

  return (
    <>
      <Helmet>
        <title>My Favorites — Trend Tribe</title>
        <meta
          name="description"
          content="Listings you've saved on Trend Tribe."
        />
      </Helmet>
      <div className="container-app py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 break-words">My Favorites</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2 min-h-[20px] break-words">
            {loading
              ? "Loading your favorites…"
              : `${pagination?.totalCount ?? displayedListings.length} item${
                  (pagination?.totalCount ?? displayedListings.length) !== 1 ? "s" : ""
                } saved${!loading && pagination && pagination.totalCount !== displayedListings.length ? ` · ${displayedListings.length} on this page` : ""}`}
          </p>
        </div>

        {error && (
          <Alert type="error" message={error} onDismiss={() => setError("")} />
        )}

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
          ) : displayedListings.length > 0 ? (
            <motion.div
              key={currentPage}
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
                {displayedListings.map((listing) => (
                  <motion.div key={listing.id} variants={cardVariants}>
                    <ListingCard listing={listing} />
                  </motion.div>
                ))}
              </motion.div>

              {pagination && pagination.totalPages > 1 && (
                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              variants={fadeVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FiHeart className="w-7 h-7 text-gray-400" />
              </div>
              <h4 className="text-gray-700 mb-2">No favorites yet</h4>
              <p className="text-gray-400 max-w-sm mb-6">
                Tap the heart on any listing to save it here for later.
              </p>
              <Link to="/marketplace" className="btn-primary">
                Browse Marketplace
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default FavoritesPage;