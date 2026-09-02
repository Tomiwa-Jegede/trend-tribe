// src/pages/AdminDashboardPage.jsx — Marketplace health snapshot (no charts, per scope)

import { useState, useEffect } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import { getAdminStats, triggerWeeklyEmail, getWeeklyEmailStatus } from "../services/adminService";
import { MiniSpinner } from "../components/ui/LoadingSpinner";
import { useToast } from "../context/ToastContext";
import ConfirmDialog from "../components/ui/ConfirmDialog";

const STAT_CONFIG = [
  { key: "totalUsers", label: "Total Users" },
  { key: "totalListings", label: "Total Listings" },
  { key: "activeListings", label: "Active Listings" },
  { key: "newUsers", label: "New Users (Last 7 Days)" },
  { key: "newListings", label: "New Listings (Last 7 Days)" },
  { key: "totalFavorites", label: "Total Favorites" },
  { key: "newFavorites", label: "New Favorites (Last 7 Days)" },
  { key: "coldListings", label: "Cold Listings (0 fav, active)" },
  { key: "totalNotifications", label: "Bell Notifications" },
  { key: "totalContactViews", label: "Total Contact Clicks" },
  { key: "newContactViews", label: "Contact Clicks (Last 7 Days)" },
];

const AdminDashboardPage = () => {
  
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailRun, setEmailRun] = useState(null);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const { toast } = useToast();

  const pollWeeklyEmailStatus = () => {
    const interval = setInterval(async () => {
      try {
        const data = await getWeeklyEmailStatus();
        setEmailRun(data);
        if (data.status === "done" || data.status === "error") {
          clearInterval(interval);
          if (data.status === "done") {
            toast.success(`Weekly email done: ${data.result.sent} sent, ${data.result.failed} failed.`);
          } else {
            toast.error("Weekly email run failed to complete.");
          }
        }
      } catch {
        clearInterval(interval);
      }
    }, 3000);
  };

  const handleSendWeeklyEmail = async () => {
    setShowSendConfirm(false);
    setSendingEmail(true);
    try {
      await triggerWeeklyEmail();
      toast.success("Weekly email send started in background.");
      setEmailRun({ status: "running" });
      pollWeeklyEmailStatus();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to start weekly email send.");
    } finally {
      setSendingEmail(false);
    }
  };

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
        <>
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
                  {stats[key] ?? 0}
                </p>
              </div>
            ))}
          </div>
          {stats.topFavorited?.length > 0 && (
            <div className="mt-6 bg-white border border-sage-100 rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Top Favorited (click to view)</p>
              <div className="flex flex-col gap-2">
                {stats.topFavorited.map((l) => (
                  <a key={l.id} href={`/listings/${l.id}`} className="text-sm text-navy-900 hover:text-primary-600 flex justify-between">
                    <span className="truncate pr-4">{l.title}</span>
                    <span className="font-bold">♥ {l.favoriteCount}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          {stats.topContacted?.length > 0 && (
            <div className="mt-6 bg-white border border-sage-100 rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Top Contact Clicks (admin only)</p>
              <div className="flex flex-col gap-2">
                {stats.topContacted.map((l) => (
                  <a key={l.id} href={`/listings/${l.id}`} className="text-sm text-navy-900 hover:text-primary-600 flex justify-between">
                    <span className="truncate pr-4">{l.title}</span>
                    <span className="font-bold">👁 {l.contactViews}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      <div className="mt-8 pt-6 border-t border-sage-100">
        <h2 className="text-sm font-semibold text-navy-900 mb-1">Weekly Email</h2>
        <p className="text-sm text-gray-500 mb-3">
          Manually send the weekly marketing email to all opted-in, verified users.
        </p>
        <button
          type="button"
          onClick={() => setShowSendConfirm(true)}
          disabled={sendingEmail || emailRun?.status === "running"}
          className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {sendingEmail || emailRun?.status === "running" ? "Sending..." : "Send Weekly Email Now"}
        </button>

        <ConfirmDialog
          isOpen={showSendConfirm}
          warning
          title="Send Weekly Email?"
          message="This will send the weekly marketing email to all opted-in, verified users right now."
          confirmLabel="Send Now"
          cancelLabel="Cancel"
          onConfirm={handleSendWeeklyEmail}
          onCancel={() => setShowSendConfirm(false)}
        />

        {emailRun?.status === "running" && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-4">
            <MiniSpinner size={16} />
            Sending in progress — this can take a few minutes...
          </div>
        )}

        {emailRun?.status === "done" && (
          <div className="mt-4 bg-white border border-sage-100 rounded-xl p-4">
            <p className="text-sm text-navy-900 mb-3">
              <span className="font-semibold text-green-600">{emailRun.result.sent} sent</span>
              {" · "}
              <span className="font-semibold text-red-500">{emailRun.result.failed} failed</span>
              {" · "}
              {emailRun.result.total} total
            </p>
            {emailRun.result.failures.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                  Failed Recipients
                </p>
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                  {emailRun.result.failures.map((f, i) => (
                    <div key={i} className="text-sm border-b border-sage-50 pb-2 last:border-0">
                      <p className="font-medium text-navy-900">{f.fullName} · {f.email}</p>
                      <p className="text-xs text-red-500">{f.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {emailRun?.status === "error" && (
          <p className="text-sm text-red-500 mt-4">
            The send run failed to complete: {emailRun.error}
          </p>
        )}
      </div>
    </AdminLayout>
  );
};
export default AdminDashboardPage;
