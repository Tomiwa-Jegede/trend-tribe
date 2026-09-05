// src/context/FavoritesContext.jsx — Global Favorites State
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { toggleFavorite as apiToggleFavorite, getFavoriteIds } from "../services/listingService";
import { onRealtime } from "../services/socket";

const FavoritesContext = createContext(null);

export const FavoritesProvider = ({ children }) => {
  const { isAuthenticated, token, user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  // ── Load favorite IDs whenever auth/user changes — clear stale on switch ──
  const refreshFavoriteIds = useCallback(async () => {
    if (!isAuthenticated || !token) {
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
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (!isAuthenticated || !token || !user?.id) {
      setFavoriteIds(new Set());
      return;
    }
    setFavoriteIds(new Set());
    refreshFavoriteIds();
  }, [isAuthenticated, token, user?.id, refreshFavoriteIds]);

  // Real-time: keep hearts in sync across tabs/devices (no manual restart)
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    const off = onRealtime("favorite", ({ listingId, userId: uId, favorited }) => {
      if (uId !== user?.id) return; // only own favorites
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        favorited ? next.add(listingId) : next.delete(listingId);
        return next;
      });
    });
    return off;
  }, [isAuthenticated, token, user?.id]);

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