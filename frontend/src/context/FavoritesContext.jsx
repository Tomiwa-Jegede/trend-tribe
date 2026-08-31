// src/context/FavoritesContext.jsx — Global Favorites State
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { toggleFavorite as apiToggleFavorite, getFavoriteIds } from "../services/listingService";

const FavoritesContext = createContext(null);

export const FavoritesProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  // ── Load favorite IDs whenever auth state changes ────────────
  const refreshFavoriteIds = useCallback(async () => {
    if (!isAuthenticated) {
      setFavoriteIds(new Set());
      return;
    }
    setLoading(true);
    try {
      const ids = await getFavoriteIds();
      setFavoriteIds(new Set(ids));
    } catch {
      // Silently ignore — hearts just won't show as filled
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshFavoriteIds();
  }, [refreshFavoriteIds]);

  const isFavorited = (listingId) => favoriteIds.has(listingId);

  // ── Optimistic toggle: update UI immediately, revert on failure ──
  const toggleFavorite = async (listingId) => {
    const wasFavorited = favoriteIds.has(listingId);

    setFavoriteIds((prev) => {
      const next = new Set(prev);
      wasFavorited ? next.delete(listingId) : next.add(listingId);
      return next;
    });

    try {
      const { favorited } = await apiToggleFavorite(listingId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        favorited ? next.add(listingId) : next.delete(listingId);
        return next;
      });
      return favorited;
    } catch (err) {
      // Revert optimistic update on failure
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        wasFavorited ? next.add(listingId) : next.delete(listingId);
        return next;
      });
      throw err;
    }
  };

  const value = {
    favoriteIds,
    isFavorited,
    toggleFavorite,
    refreshFavoriteIds,
    loading,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
};

export default FavoritesContext;