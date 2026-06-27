// src/pages/AdminDashboardPage.jsx — Marketplace health snapshot (no charts, per scope)

import { useState, useEffect } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import { getAdminStats } from "../services/adminService";
import { MiniSpinner } from "../components/ui/LoadingSpinner";

const STAT_CONFIG = [
  { key: "totalUsers", label: "Total Users" },
  { key: "totalListings", label: "Total Listings" },
  { key: "activeListings", label: "Active Listings" },
  { key: "newUsers", label: "New Users (Last 7 Days)" },
  { key: "newListings", label: "New Listings (Last 7 Days)" },
];

const AdminDashboardPage = () => {
  
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    const MAX_ATTEMPTS = 20;
    const RETRY_DELAY = 3000;

    const fetchWithRetry = async () => {
      while (!cancelled && attempt < MAX_ATTEMPTS) {
        try {
          const data = await getAdminStats();
          if (!cancelled) setStats(data);
          return;
        } catch (err) {
          attempt += 1;
          const isNetworkError = !err.response;
          const isServerError = err.response?.status >= 500;
          if ((!isNetworkError && !isServerError) || attempt >= MAX_ATTEMPTS) {
            if (!cancelled) setError("Failed to load dashboard stats.");
            return;
          }
          await new Promise((res) => setTimeout(res, RETRY_DELAY));
        }
      }
    };

    fetchWithRetry();
    return () => { cancelled = true; };
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-xl font-bold text-navy-900 mb-6">Dashboard</h1>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {!stats && !error && (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-8">
          <MiniSpinner size={16} />
          Loading stats...
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {STAT_CONFIG.map(({ key, label }) => (
            <div
              key={key}
              className="bg-white border border-sage-100 rounded-xl p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                {label}
              </p>
              <p className="text-2xl font-bold text-navy-900">
                {stats[key]}
              </p>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboardPage;
