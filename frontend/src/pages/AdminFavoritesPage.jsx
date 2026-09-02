// src/pages/AdminFavoritesPage.jsx — Who favorited what (bell source)
import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import { getAdminFavorites } from "../services/adminService";
import { MiniSpinner } from "../components/ui/LoadingSpinner";

const AdminFavoritesPage = () => {
  const [favorites, setFavorites] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminFavorites({ page });
      setFavorites(data.favorites);
      setPagination(data.pagination);
    } catch {
      setError("Failed to load favorites.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return (
    <AdminLayout>
      <h1 className="text-xl font-bold text-navy-900 mb-2">Favorites</h1>
      <p className="text-sm text-gray-500 mb-6">Who saved what — same data that powers the seller bell. No email, just in-app.</p>

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
                <th className="px-4 py-3">Listing</th>
                <th className="px-4 py-3">Favorited By</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {favorites.map((f) => (
                <tr key={f.id} className="border-b border-sage-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-navy-900">
                    <a href={`/listings/${f.listing.id}`} className="hover:text-primary-600">
                      {f.listing.title}
                    </a>
                    <span className="text-gray-400 ml-2">{f.listing.isAvailable ? "Active" : "Hidden"}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    @{f.user.username} <span className="text-gray-400">· {f.user.fullName}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{f.user.school || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{f.listing.category}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(f.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {favorites.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                    No favorites yet — sellers’ bells are empty.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile */}
      {!loading && !error && (
        <div className="block md:hidden flex flex-col gap-3">
          {favorites.map((f) => (
            <div key={f.id} className="bg-white border border-sage-100 rounded-xl p-4">
              <p className="font-medium text-navy-900">{f.listing.title}</p>
              <p className="text-sm text-gray-600 mt-1">by @{f.user.username} · {f.user.fullName}</p>
              <p className="text-xs text-gray-400 mt-1">
                {f.listing.category} · {new Date(f.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
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

export default AdminFavoritesPage;
