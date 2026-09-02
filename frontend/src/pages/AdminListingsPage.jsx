// src/pages/AdminListingsPage.jsx — Listings moderation (Phase: view, search, filter, delete)

import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import { getAdminListings, deleteAdminListing } from "../services/adminService";
import { MiniSpinner } from "../components/ui/LoadingSpinner";
import { CATEGORIES, SUBCATEGORIES_BY_CATEGORY } from "../services/listingService";

const GHOST_DAYS = 30;
const isBoosted = (l) => l.boostedUntil && new Date(l.boostedUntil) > new Date();
const daysLeft = (l) => Math.max(0, Math.ceil((new Date(l.createdAt).getTime() + GHOST_DAYS*86400000 - Date.now())/86400000));

const AdminListingsPage = () => {
  const [listings, setListings] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminListings({
        search: search || undefined,
        category: category || undefined,
        subcategory: subcategory || undefined,
        page,
      });
      setListings(data.listings);
      setPagination(data.pagination);
    } catch {
      setError("Failed to load listings.");
    } finally {
      setLoading(false);
    }
  }, [search, category, subcategory, page]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    try {
      await deleteAdminListing(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch {
      alert("Failed to delete listing.");
    }
  };

  return (
    <AdminLayout>
      <h1 className="text-xl font-bold text-navy-900 mb-6">Listings</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by title..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="flex-1 border border-sage-100 rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={category}
          onChange={(e) => {
            setPage(1);
            setCategory(e.target.value);
            setSubcategory("");
          }}
          className="border border-sage-100 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        {SUBCATEGORIES_BY_CATEGORY[category] && (
          <select
            value={subcategory}
            onChange={(e) => {
              setPage(1);
              setSubcategory(e.target.value);
            }}
            className="border border-sage-100 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Subcategories</option>
            {SUBCATEGORIES_BY_CATEGORY[category].map((sc) => (
              <option key={sc} value={sc}>
                {sc.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-8">
          <MiniSpinner size={16} />
          Loading...
        </div>
      )}

      {!loading && !error && (
        <div className="hidden md:block bg-white border border-sage-100 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sage-100 text-left text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">♥ Fav</th>
                <th className="px-4 py-3">👁 Contact</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => {
                const boosted = isBoosted(l);
                const left = daysLeft(l);
                const pct = Math.max(0, Math.min(100, ((30 - left) / 30) * 100));
                return (
                  <tr
                    key={l.id}
                    className="border-b border-sage-50 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-navy-900">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-2">
                          {l.title}
                          {boosted && <span className="text-[10px] bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full font-bold">★ Featured</span>}
                        </span>
                        {l.isAvailable && (
                          <div className="w-full h-1 bg-black/10 rounded-full mt-1 overflow-hidden max-w-[120px]">
                            <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                          </div>
                        )}
                        {l.isAvailable && <span className="text-[10px] text-gray-400 mt-0.5">{left}d left · {boosted ? "featured " + Math.ceil((new Date(l.boostedUntil).getTime() - Date.now())/3600000) + "h left" : ""}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {l.seller?.username}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{l.category}</td>
                    <td className="px-4 py-3 text-gray-600">
                      ₦{l.price.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-navy-900">
                      {l.favoriteCount ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-navy-900">
                      {l.contactViews ?? 0}
                    </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        l.isAvailable
                          ? "bg-green-50 text-green-600"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {l.isAvailable ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(l.createdAt).toLocaleDateString()}
                  </td>
                    <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(l.id)}
                      className="text-red-500 hover:text-red-600 text-xs font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
                );
              })}
              {listings.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-6 text-center text-gray-400"
                  >
                    No listings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Mobile card list ─────────────────────────────── */}
      {!loading && !error && (
        <div className="block md:hidden flex flex-col gap-3">
          {listings.map((l) => (
            <div
              key={l.id}
              className="bg-white border border-sage-100 rounded-xl p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <p className="font-medium text-navy-900">{l.title}</p>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ml-2 ${
                    l.isAvailable
                      ? "bg-green-50 text-green-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {l.isAvailable ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                @{l.seller?.username} · {l.category} · ♥ {l.favoriteCount ?? 0} · 👁 {l.contactViews ?? 0}
              </p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm font-semibold text-navy-900">
                  ₦{l.price.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(l.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDelete(l.id)}
                className="text-red-500 hover:text-red-600 text-xs font-medium mt-3"
              >
                Delete
              </button>
            </div>
          ))}
          {listings.length === 0 && (
            <p className="text-center text-gray-400 py-6 text-sm">
              No listings found.
            </p>
          )}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <button
            disabled={!pagination.hasPrevPage}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-lg border border-sage-100 disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            disabled={!pagination.hasNextPage}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-sage-100 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminListingsPage;
