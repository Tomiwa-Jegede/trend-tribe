// src/pages/AdminUsersPage.jsx — User management (Phase: view, search, delete)

import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import { useAuth } from "../context/AuthContext";
import { getAdminUsers, deleteAdminUser } from "../services/adminService";
import { MiniSpinner } from "../components/ui/LoadingSpinner";

const AdminUsersPage = () => {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminUsers({ search: search || undefined, page });
      setUsers(data.users);
      setPagination(data.pagination);
    } catch {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (id) => {
    if (id === currentAdmin?.id) return; // safety net, backend also blocks this
    if (
      !window.confirm(
        "Delete this user? Their listings will also be deleted. This cannot be undone.",
      )
    )
      return;
    try {
      await deleteAdminUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to delete user.");
    }
  };

  return (
    <AdminLayout>
      <h1 className="text-xl font-bold text-navy-900 mb-6">Users</h1>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by username or email..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="w-full sm:w-80 border border-sage-100 rounded-lg px-3 py-2 text-sm"
        />
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
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Matric No.</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-sage-50 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-navy-900">
                    {u.username}
                    {u.role === "ADMIN" && (
                      <span className="ml-2 text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                        Admin
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.fullName}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3 text-gray-600">{u.school}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {u.matricNumber || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {u.id !== currentAdmin?.id && (
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="text-red-500 hover:text-red-600 text-xs font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-gray-400"
                  >
                    No users found.
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
          {users.map((u) => (
            <div
              key={u.id}
              className="bg-white border border-sage-100 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-navy-900">
                  {u.username}
                  {u.role === "ADMIN" && (
                    <span className="ml-2 text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                      Admin
                    </span>
                  )}
                </p>
              </div>
              <p className="text-sm text-gray-600">{u.fullName}</p>
              <p className="text-sm text-gray-500">{u.email}</p>
              <p className="text-xs text-gray-400 mt-1">
                {u.school} {u.matricNumber ? `· ${u.matricNumber}` : ""}
              </p>
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-gray-400">
                  Joined {new Date(u.createdAt).toLocaleDateString()}
                </p>
                {u.id !== currentAdmin?.id && (
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="text-red-500 hover:text-red-600 text-xs font-medium"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-center text-gray-400 py-6 text-sm">
              No users found.
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

export default AdminUsersPage;
