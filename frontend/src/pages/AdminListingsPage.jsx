// src/pages/AdminListingsPage.jsx — Listings moderation (Phase: view, search, filter, delete)

import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import { getAdminListings, deleteAdminListing } from "../services/adminService";
import { MiniSpinner } from "../components/ui/LoadingSpinner";

const CATEGORIES = [
  "BOOKS",
  "ELECTRONICS",
  "CLOTHING",
  "FURNITURE",
  "STATIONERY",
  "SPORTS",
  "FOOD",
  "SERVICES",
  "OTHER",
];

const AdminListingsPage = () => {
  const [listings, setListings] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
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
        page,
      });
      setListings(data.listings);
      setPagination(data.pagination);
    } catch {
      setError("Failed to load listings.");
    } finally {
      setLoading(false);
    }
  }, [search, category, page]);

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
          }}
          className="border border-sage-100 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
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
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-sage-50 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-navy-900">
                    {l.title}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {l.seller?.username}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{l.category}</td>
                  <td className="px-4 py-3 text-gray-600">
                    ₦{l.price.toLocaleString()}
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
              ))}
              {listings.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
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
                @{l.seller?.username} · {l.category}
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
