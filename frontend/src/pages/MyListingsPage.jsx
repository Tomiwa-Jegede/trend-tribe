// src/pages/MyListingsPage.jsx — Seller home: ghost management (Wayfinder #6 ship-as-is)
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const GHOST_DAYS = 30;

const isGhost = (listing) => {
  if (!listing.isAvailable) return false;
  const ageDays = (Date.now() - new Date(listing.createdAt).getTime()) / 86400000;
  return ageDays > GHOST_DAYS && (listing.favoriteCount ?? 0) === 0;
};

const daysLeft = (listing) => {
  const created = new Date(listing.createdAt).getTime();
  const elapsed = (Date.now() - created) / 86400000;
  return Math.max(0, Math.ceil(GHOST_DAYS - elapsed));
};

const isBoosted = (listing) => listing.boostedUntil && new Date(listing.boostedUntil) > new Date();
const boostedHoursLeft = (listing) => {
  if (!isBoosted(listing)) return 0;
  return Math.max(0, Math.ceil((new Date(listing.boostedUntil).getTime() - Date.now()) / 3600000));
};

const MyListingsPage = () => {
  const { user, refreshUser } = useAuth();
  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [toggling, setToggling] = useState(null);

  const fetchMyListings = async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data } = await api.get("/listings/me", { params: { limit: 24, sort: "newest" } });
      setListings(data.listings);
      setPagination(data.pagination);
    } catch (e) {
      setErr(e.response?.data?.error || "Failed to load your listings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyListings();
  }, []);

  const handleToggle = async (listing) => {
    setToggling(listing.id);
    setErr(null);
    try {
      const nextAvailable = !listing.isAvailable;
      try {
        await api.put(`/listings/${listing.id}`, { isAvailable: nextAvailable });
      } catch (e) {
        if (e.response?.status === 402 && e.response?.data?.needsTokenConfirm) {
          const ok = confirm(e.response.data.error + "\n\nConfirm to spend 1 token?");
          if (!ok) throw e;
          await api.put(`/listings/${listing.id}`, { isAvailable: nextAvailable, confirmSpend: true });
          refreshUser?.();
        } else {
          throw e;
        }
      }
      setListings((prev) =>
        prev.map((l) =>
          l.id === listing.id ? { ...l, isAvailable: nextAvailable, soldAt: nextAvailable ? null : new Date().toISOString(), archivedAt: nextAvailable ? null : l.archivedAt } : l
        )
      );
      if (!listing.isAvailable) refreshUser?.();
    } catch (e) {
      setErr(e.response?.data?.error || "Failed to update listing");
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (listing) => {
    if (!confirm(`Delete "${listing.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/listings/${listing.id}`);
      setListings((prev) => prev.filter((l) => l.id !== listing.id));
      refreshUser?.();
    } catch (e) {
      setErr(e.response?.data?.error || "Failed to delete");
    }
  };

  const handleBoost = async (listing) => {
    setToggling(listing.id);
    setErr(null);
    try {
      try {
        const { data } = await api.post(`/listings/${listing.id}/boost`, {});
        setListings((prev) => prev.map((l) => (l.id === listing.id ? { ...l, boostedAt: data.listing.boostedAt, boostedUntil: data.listing.boostedUntil } : l)));
        refreshUser?.();
      } catch (e) {
        if (e.response?.status === 402 && e.response?.data?.needsTokenConfirm) {
          const ok = confirm(e.response.data.error + "\n\nConfirm to spend 1 token for 24h Featured on top of Marketplace?");
          if (!ok) throw e;
          const { data } = await api.post(`/listings/${listing.id}/boost`, { confirmSpend: true });
          setListings((prev) => prev.map((l) => (l.id === listing.id ? { ...l, boostedAt: data.listing.boostedAt, boostedUntil: data.listing.boostedUntil } : l)));
          refreshUser?.();
        } else {
          throw e;
        }
      }
    } catch (e) {
      setErr(e.response?.data?.error || "Failed to boost");
    } finally {
      setToggling(null);
    }
  };

  const freeSlotsUsed = pagination ? pagination.totalCount : listings.length;
  const FREE_LIMIT = 3;
  const freeLeft = Math.max(0, FREE_LIMIT - freeSlotsUsed);
  const isAdmin = user?.role === "ADMIN";
  const tokenDisplay = !isAdmin && user?.tokenBalance != null ? user.tokenBalance : null;

  return (
    <div className="container-app py-8">
      <Helmet>
        <title>My Listings — Trend Tribe</title>
      </Helmet>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">My Listings</h1>
          <p className="text-sm text-gray-500 mt-1">
            {freeLeft} free space{freeLeft !== 1 ? "s" : ""} left{tokenDisplay != null ? ` · You have ${tokenDisplay} token${tokenDisplay !== 1 ? "s" : ""}` : ""}. Hide or delete one and you get your free space back.
          </p>
        </div>
        <Link to="/create-listing" className="inline-flex items-center justify-center font-bold px-6 py-3 rounded-2xl text-sm" style={{ background: "#F5C518", color: "#0F1F3D" }}>
          + Create listing
        </Link>
      </div>

      {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{err}</div>}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 card">
          <p className="text-gray-500 mb-4">You have no listings yet.</p>
          <Link to="/create-listing" className="text-primary-600 font-semibold">Create your first listing →</Link>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((l) => {
              const ghost = isGhost(l);
              const left = daysLeft(l);
              const boosted = isBoosted(l);
              const bLeft = boostedHoursLeft(l);
              const pctLeft = Math.max(0, Math.min(100, ((GHOST_DAYS - left) / GHOST_DAYS) * 100));
              return (
                <div key={l.id} className={`card overflow-hidden ${ghost ? "ring-2 ring-amber-300" : ""} ${boosted ? "ring-2 ring-amber-400" : ""} ${!l.isAvailable ? "opacity-60" : ""}`}>
                  <div className="relative h-48 bg-gray-100 overflow-hidden">
                    {l.images?.[0] ? (
                      <img src={l.images[0]} alt={l.title} className="w-full h-full object-cover" style={l.coverPosition ? { objectPosition: `${l.coverPosition.x}% ${l.coverPosition.y}%` } : undefined} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
                    )}
                    {boosted && <span className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-1 rounded-full">★ Featured · {bLeft}h left</span>}
                    {ghost && <span className={`absolute bg-amber-400 text-amber-900 text-xs font-bold px-2 py-1 rounded-full ${boosted ? "top-9 left-2" : "top-2 left-2"}`}>GHOST — will hide in {left}d</span>}
                    {!l.isAvailable && <span className="absolute top-2 right-2 bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded-full">HIDDEN</span>}
                    {/* subtle 30d timer bar — seller + admin only (not on public cards) */}
                    {l.isAvailable && <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10"><div className="h-full bg-amber-400 transition-all" style={{ width: `${pctLeft}%`, opacity: 0.9 }} /></div>}
                  </div>
                  <div className="p-4">
                    <Link to={`/listings/${l.id}`} className="font-bold text-gray-900 line-clamp-1 hover:text-primary-600">{l.title}</Link>
                    <p className="text-primary-600 font-extrabold mt-1">₦{Number(l.price).toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {l.category} {l.subcategory ? `· ${l.subcategory}` : ""} · {l.condition} · {new Date(l.createdAt).toLocaleDateString()} · ♥ {l.favoriteCount ?? 0} {l.reportCount ? `· ⚑ ${l.reportCount}` : ""}
                    </p>
                    {l.isAvailable ? <p className="text-xs text-gray-400 mt-1">{left}d left before auto-hide</p> : <p className="text-xs text-gray-400 mt-1">Hidden from marketplace — toggle to re-activate</p>}
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <button
                        onClick={() => handleToggle(l)}
                        disabled={toggling === l.id}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full border ${l.isAvailable ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100" : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`}
                      >
                        {toggling === l.id ? "..." : l.isAvailable ? "Mark Sold / Hide" : "Re-activate"}
                      </button>
                      {l.isAvailable && !boosted && (
                        <button
                          onClick={() => handleBoost(l)}
                          disabled={toggling === l.id}
                          className="text-xs font-bold px-3 py-1.5 rounded-full border border-amber-400 bg-amber-400 text-amber-900 hover:bg-amber-500"
                          title="Boost to Featured on top of Marketplace for 24h"
                        >
                          Boost 24h · 1🪙
                        </button>
                      )}
                      {boosted && <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-800">★ Featured {bLeft}h</span>}
                      <Link to={`/listings/${l.id}/edit`} className="text-xs font-bold px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50">
                        Edit
                      </Link>
                      <button onClick={() => handleDelete(l)} className="text-xs font-bold px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {pagination && pagination.totalPages > 1 && (
            <p className="text-center text-sm text-gray-500 mt-6">
              Page {pagination.currentPage} of {pagination.totalPages} — {pagination.totalCount} total
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default MyListingsPage;
