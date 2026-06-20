// src/pages/AdminReportsPage.jsx — Report review (Phase: ignore or delete listing)

import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import {
  getAdminReports,
  ignoreAdminReport,
  deleteAdminListing,
} from "../services/adminService";
import { MiniSpinner } from "../components/ui/LoadingSpinner";

const REASON_LABELS = {
  SCAM: "Scam",
  FAKE_ITEM: "Fake Item",
  INAPPROPRIATE_CONTENT: "Inappropriate Content",
  OTHER: "Other",
};

const AdminReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminReports();
      setReports(data.reports);
    } catch {
      setError("Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleIgnore = async (id) => {
    try {
      await ignoreAdminReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert("Failed to ignore report.");
    }
  };

  const handleDeleteListing = async (report) => {
    if (
      !window.confirm(
        `Delete "${report.listing.title}"? This cannot be undone.`,
      )
    )
      return;
    try {
      await deleteAdminListing(report.listing.id);
      setReports((prev) =>
        prev.filter((r) => r.listing.id !== report.listing.id),
      );
    } catch {
      alert("Failed to delete listing.");
    }
  };

  return (
    <AdminLayout>
      <h1 className="text-xl font-bold text-navy-900 mb-6">Reports</h1>

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
                <th className="px-4 py-3">Reporter</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-sage-50 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-navy-900">
                    {r.listing.title}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    @{r.reporter.username}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {REASON_LABELS[r.reason]}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleIgnore(r.id)}
                        className="text-gray-500 hover:text-gray-700 text-xs font-medium"
                      >
                        Ignore
                      </button>
                      <button
                        onClick={() => handleDeleteListing(r)}
                        className="text-red-500 hover:text-red-600 text-xs font-medium"
                      >
                        Delete Listing
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-gray-400"
                  >
                    No pending reports.
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
          {reports.map((r) => (
            <div
              key={r.id}
              className="bg-white border border-sage-100 rounded-xl p-4"
            >
              <p className="font-medium text-navy-900 mb-1">
                {r.listing.title}
              </p>
              <p className="text-sm text-gray-600">
                Reported by @{r.reporter.username}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {REASON_LABELS[r.reason]}
              </p>
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-gray-400">
                  {new Date(r.createdAt).toLocaleDateString()}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleIgnore(r.id)}
                    className="text-gray-500 hover:text-gray-700 text-xs font-medium"
                  >
                    Ignore
                  </button>
                  <button
                    onClick={() => handleDeleteListing(r)}
                    className="text-red-500 hover:text-red-600 text-xs font-medium"
                  >
                    Delete Listing
                  </button>
                </div>
              </div>
            </div>
          ))}
          {reports.length === 0 && (
            <p className="text-center text-gray-400 py-6 text-sm">
              No pending reports.
            </p>
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminReportsPage;
