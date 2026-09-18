// src/pages/MyListingsPage.jsx — Seller home: ghost management (Wayfinder #6 ship-as-is)
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import TokenIcon from "../components/ui/TokenIcon";
import InfoModal from "../components/ui/InfoModal";
import { FiHeart, FiLink2, FiMessageCircle } from "react-icons/fi";
import { cldUrl } from "../utils/cloudinary";

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
const useBoostCountdown = (until) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, new Date(until).getTime() - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return { diff, days, hours, mins, secs };
};
const BoostTimer = ({ listing }) => {
  const { diff, days, hours, mins, secs } = useBoostCountdown(listing.boostedUntil);
  if (diff <= 0) return null;
  const tierLabel = listing.boostTier === 2 ? "Picks" : "Featured";
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${String(hours).padStart(2, "0")}h`);
  parts.push(`${String(mins).padStart(2, "0")}m`);
  parts.push(`${String(secs).padStart(2, "0")}s`);
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-800">
      ★ {tierLabel} · {parts.join(" ")} left
    </span>
  );
};
const BoostTopBadge = ({ listing }) => {
  const { diff, days, hours, mins, secs } = useBoostCountdown(listing.boostedUntil);
  if (diff <= 0) return null;
  const tierLabel = listing.boostTier === 2 ? "Picks" : "Featured";
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${String(hours).padStart(2, "0")}h`);
  parts.push(`${String(mins).padStart(2, "0")}m`);
  return (
    <span className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-1 rounded-full">
      ★ {tierLabel} · {parts.join(" ")}
    </span>
  );
};

const diagnosis = (l) => {
  if ((l.views ?? 0) > 20 && (l.favoriteCount ?? 0) === 0) return "Try a brighter cover photo — top sellers show front on white.";
  if ((l.views ?? 0) > 20 && (l.contactViews ?? 0) === 0) return "Check price vs category avg and ensure WhatsApp is set in profile.";
  if ((l.views ?? 0) < 10 && l.isAvailable && !isBoosted(l)) return "Boost 1 token → randomized Discover for fresh eyes.";
  return null;
};

const MyListingsPage = () => {
  const { user, refreshUser } = useAuth();
  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [boostDays, setBoostDays] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tt_boostDays") || "{}"); } catch { return {}; }
  });
  useEffect(() => {
    try { localStorage.setItem("tt_boostDays", JSON.stringify(boostDays)); } catch {}
  }, [boostDays]);

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
        await api.put(`/listings/${listing.slug || listing.id}`, { isAvailable: nextAvailable });
      } catch (e) {
        if (e.response?.status === 402 && e.response?.data?.needsTokenConfirm) {
          const ok = confirm(e.response.data.error + "\n\nConfirm to spend 1 token?");
          if (!ok) throw e;
          await api.put(`/listings/${listing.slug || listing.id}`, { isAvailable: nextAvailable, confirmSpend: true });
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
      await api.delete(`/listings/${listing.slug || listing.id}`);
      setListings((prev) => prev.filter((l) => l.id !== listing.id));
      refreshUser?.();
    } catch (e) {
      setErr(e.response?.data?.error || "Failed to delete");
    }
  };

  const handleBoost = async (listing, tier = 1, daysOverride) => {
    setToggling(listing.id);
    setErr(null);
    const days = daysOverride ?? boostDays[listing.id] ?? 1;
    try {
      try {
        const { data } = await api.post(`/listings/${listing.slug || listing.id}/boost`, { tier, days });
        setListings((prev) => prev.map((l) => (l.id === listing.id ? { ...l, boostedAt: data.listing.boostedAt, boostedUntil: data.listing.boostedUntil, boostTier: data.listing.boostTier } : l)));
        refreshUser?.();
      } catch (e) {
        if (e.response?.status === 402 && e.response?.data?.needsTokenConfirm) {
          const cost = e.response.data.cost ?? (tier === 2 ? 2 * days : days);
          const respTier = e.response.data.tier || tier;
          const respDays = e.response.data.days || days;
          const tierLabel = respTier === 2 ? `Picks (Featured + top 5) ${respDays}d — ${cost} tokens` : `Top 5 category ${respDays}d — ${cost} token${cost>1?"s":""}`;
          const ok = confirm(e.response.data.error + `\n\nConfirm to spend ${cost} token${cost>1?"s":""} for ${tierLabel}? Re-boost to climb if pushed down.`);
          if (!ok) throw e;
          const { data } = await api.post(`/listings/${listing.slug || listing.id}/boost`, { tier: respTier, days: respDays, confirmSpend: true });
          setListings((prev) => prev.map((l) => (l.id === listing.id ? { ...l, boostedAt: data.listing.boostedAt, boostedUntil: data.listing.boostedUntil, boostTier: data.listing.boostTier } : l)));
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
    <div className="container-app py-6 sm:py-8">
      <Helmet>
        <title>My Listings — Trend Tribe</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 break-words">My Listings</h1>
            <InfoModal title="How Boost works">
              <p><span className="font-semibold text-gray-900">What is Boost?</span><br/>Boost puts your listing at the top of Marketplace so more people see it and click.</p>
              <p><span className="font-semibold text-gray-900">Boost X1 — 1 token per day (Standard)</span><br/>Puts you in the top 5 of your category and in the Featured row at the top of Marketplace. Great for normal sales. If someone else boosts after you, they move above you — just tap Re-boost to climb again.</p>
              <p><span className="font-semibold text-gray-900">Boost X2 Picks — 2 tokens per day (Premium)</span><br/>You get everything in X1, <b>plus</b> you are in <b>Picks</b> — a special 5-item row right at the very top that every visitor sees first, no matter what category they browse. Picks is curated and always shown, so your item gets double display: Featured + Picks. Use X2 when you want to sell fast — e.g. a hot jacket, sneakers, or phone. It costs 2× because you get 2 spots. Re-boost also moves you to the front of Picks.</p>
              <p><span className="font-semibold text-gray-900">Example</span><br/>Fashion jacket with X1 for 3 days = top 5 in Fashion for 3 days (3 tokens). Same jacket with X2 for 3 days = top 5 in Fashion <b>and</b> in Picks for 3 days (6 tokens).</p>
              <p><span className="font-semibold text-gray-900">Days</span><br/>Pick 1 to 30 days next to the buttons. Cost: X1 = 1 token × days, X2 = 2 tokens × days. We show both days and price on the button, e.g. <b>X1 · 3d · 3</b> or <b>X2 · 3d · 6</b>.</p>
              <p><span className="font-semibold text-gray-900">After you boost</span><br/>You will see a live timer in days — e.g. “Featured · 2d 05h 12m 30s left” — counting down every second. When it ends, it just goes back to normal — you don’t lose the listing.</p>
            </InfoModal>
          </div>
          <p className="text-sm text-gray-600 mt-1 break-words">
            {freeLeft} free space{freeLeft !== 1 ? "s" : ""} left{tokenDisplay != null ? ` · You have ${tokenDisplay} token${tokenDisplay !== 1 ? "s" : ""}` : ""}. Hide or delete one and you get your free space back.
          </p>
          {pagination && (
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {pagination.totalCount} listing{pagination.totalCount !== 1 ? "s" : ""} total · Page {pagination.currentPage} of {pagination.totalPages}
            </p>
          )}
        </div>
        <Link to="/create-listing" className="inline-flex items-center justify-center font-bold px-6 py-3 rounded-2xl text-sm w-full sm:w-auto shrink-0" style={{ background: "#F5C518", color: "#0F1F3D" }}>
          + Create listing
        </Link>
      </div>

      {(user?.role === "BUYER" || user?.role === "USER") ? (
        <div className="text-center py-16 card">
          <p className="text-gray-600 mb-2">Buyers don't have listings.</p>
          <p className="text-sm text-gray-500 mb-4">Upgrade to seller to create and manage listings.</p>
          <Link to={`/profile/${user.slug || user.id}`} className="btn-primary inline-flex">Become a Seller →</Link>
        </div>
      ) : (
        <>
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
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                      <img src={cldUrl(l.images[0], { width: 400 })} alt={l.title} loading="lazy" decoding="async" className="w-full h-full object-cover" style={l.coverPosition ? { objectPosition: `${l.coverPosition.x}% ${l.coverPosition.y}%` } : undefined} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
                    )}
                    {boosted && <BoostTopBadge listing={l} />}
                    {ghost && <span className={`absolute bg-amber-400 text-amber-900 text-xs font-bold px-2 py-1 rounded-full ${boosted ? "top-9 left-2" : "top-2 left-2"}`}>GHOST — will hide in {left}d</span>}
                    {!l.isAvailable && <span className="absolute top-2 right-2 bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded-full">HIDDEN</span>}
                    {/* subtle 30d timer bar — seller + admin only (not on public cards) */}
                    {l.isAvailable && <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10"><div className="h-full bg-amber-400 transition-all" style={{ width: `${pctLeft}%`, opacity: 0.9 }} /></div>}
                  </div>
                  <div className="p-4">
                    <Link to={`/listings/${l.slug || l.id}`} className="font-bold text-gray-900 line-clamp-1 hover:text-primary-600">{l.title}</Link>
                    <p className="text-primary-600 font-extrabold mt-1">₦{Number(l.price).toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1" title="Views — detail page opens, unique per user per day, not counting you">
                      {l.views ?? 0} views
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {l.category} {l.subcategory ? `· ${l.subcategory}` : ""} · {l.condition} · {new Date(l.createdAt).toLocaleDateString()} · ♥ {l.favoriteCount ?? 0} {l.reportCount ? `· ⚑ ${l.reportCount}` : ""}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex flex-col items-center">
                        <FiHeart className="w-4 h-4 text-gray-400" />
                        <span className="text-[11px] text-gray-500 mt-0.5">{l.favoriteCount ?? 0}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <FiLink2 className="w-4 h-4 text-gray-400" />
                        <span className="text-[11px] text-gray-500 mt-0.5">{l.shares ?? 0}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <FiMessageCircle className="w-4 h-4 text-gray-400" />
                        <span className="text-[11px] text-gray-500 mt-0.5">{l.contactViews ?? 0}</span>
                      </div>
                    </div>
                    {diagnosis(l) && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 mt-1">{diagnosis(l)}</p>}
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
                        <div className="flex flex-wrap items-center gap-2 w-full">
                          <label className="text-xs text-gray-500 flex items-center gap-1">
                            Days:
                            <select
                              value={boostDays[l.id] ?? 1}
                              onChange={(e) => setBoostDays((prev) => ({ ...prev, [l.id]: parseInt(e.target.value, 10) }))}
                              className="text-xs border border-gray-200 rounded-full px-2 py-1 bg-white"
                              disabled={toggling === l.id}
                            >
                              {[1,2,3,5,7,14,30].map((n) => (
                                <option key={n} value={n}>{n}d</option>
                              ))}
                            </select>
                          </label>
                          {(() => { const d = boostDays[l.id] ?? 1; return (
                            <>
                              <button
                                onClick={() => handleBoost(l, 1, d)}
                                disabled={toggling === l.id}
                                className="text-xs font-bold px-2.5 py-1.5 rounded-full border border-amber-400 bg-amber-400 text-amber-900 hover:bg-amber-500 inline-flex items-center gap-1"
                                title={`${d}d · ${d} token${d>1?"s":""} — Top 5, re-boost to climb`}
                              >
                                X1 · {d}d · {d} <TokenIcon size={10} />
                              </button>
                              <button
                                onClick={() => handleBoost(l, 2, d)}
                                disabled={toggling === l.id}
                                className="text-xs font-bold px-2.5 py-1.5 rounded-full border border-navy-900 bg-navy-900 text-white hover:bg-black inline-flex items-center gap-1"
                                title={`${d}d · ${d*2} tokens — Picks + Top 5`}
                              >
                                X2 · {d}d · {d*2} <TokenIcon size={10} />
                              </button>
                            </>
                          ); })()}
                        </div>
                      )}
                      {boosted && (
                        <div className="flex flex-wrap items-center gap-2 w-full">
                          <BoostTimer listing={l} />
                          <label className="text-xs text-gray-500 flex items-center gap-1">
                            Extend:
                            <select
                              value={boostDays[l.id] ?? 1}
                              onChange={(e) => setBoostDays((prev) => ({ ...prev, [l.id]: parseInt(e.target.value, 10) }))}
                              className="text-xs border border-gray-200 rounded-full px-2 py-1 bg-white"
                              disabled={toggling === l.id}
                            >
                              {[1,2,3,5,7,14,30].map((n) => (
                                <option key={n} value={n}>{n}d</option>
                              ))}
                            </select>
                          </label>
                          <button
                            onClick={() => handleBoost(l, l.boostTier||1, boostDays[l.id] ?? 1)}
                            disabled={toggling === l.id}
                            className="text-xs font-bold px-3 py-1.5 rounded-full border border-amber-300 bg-white text-amber-800 hover:bg-amber-50"
                            title="Re-boost to climb to top"
                          >
                            Re-boost
                          </button>
                        </div>
                      )}
                      <Link to={`/listings/${l.slug || l.id}/edit`} className="text-xs font-bold px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50">
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
            <p className="text-center text-sm text-gray-600 mt-6 px-4 break-words">
              Page {pagination.currentPage} of {pagination.totalPages} — {pagination.totalCount} total
            </p>
          )}
        </>
      )}
        </>
      )}
    </div>
  );
};

export default MyListingsPage;
