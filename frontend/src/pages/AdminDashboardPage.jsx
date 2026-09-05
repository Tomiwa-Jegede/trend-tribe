// src/pages/AdminDashboardPage.jsx — Marketplace health snapshot (no charts, per scope)

import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "../components/admin/AdminLayout";
import { getAdminStats, triggerWeeklyEmail, getWeeklyEmailStatus, triggerDailyEmail, getDailyEmailStatus, getCloudinaryUsage, getDbUsage, getBrevoUsage } from "../services/adminService";
import { getAiAnalytics } from "../services/analyticsService";
import { broadcastMessage } from "../services/messageService";
import api from "../api/axios";
import useRealtime from "../hooks/useRealtime";
import { MiniSpinner } from "../components/ui/LoadingSpinner";
import { useToast } from "../context/ToastContext";
import ConfirmDialog from "../components/ui/ConfirmDialog";


const STAT_CONFIG = [
  { key: "totalUsers", label: "Total Users", to: "/admin/users" },
  { key: "totalSellers", label: "Sellers", to: "/admin/users?role=SELLER" },
  { key: "totalBuyers", label: "Buyers", to: "/admin/users?role=BUYER" },
  { key: "totalListings", label: "Total Listings", to: "/admin/listings" },
  { key: "activeListings", label: "Active Listings", to: "/admin/listings" },
  { key: "newUsers", label: "New Users (Last 7 Days)", to: "/admin/users" },
  { key: "newListings", label: "New Listings (Last 7 Days)", to: "/admin/listings" },
  { key: "totalFavorites", label: "Total Favorites", to: "/admin/favorites" },
  { key: "newFavorites", label: "New Favorites (Last 7 Days)", to: "/admin/favorites" },
  { key: "coldListings", label: "Cold Listings (0 fav, active)", to: "/admin/listings" },
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
  const [dailySubject, setDailySubject] = useState("");
  const [dailyMessage, setDailyMessage] = useState("");
  const [dailySending, setDailySending] = useState(false);
  const [dailyRun, setDailyRun] = useState(null);
  const [showDailyConfirm, setShowDailyConfirm] = useState(false);
  const [cloudinaryUsage, setCloudinaryUsage] = useState(null);
  const [cloudinaryError, setCloudinaryError] = useState("");
  const [dbUsage, setDbUsage] = useState(null);
  const [dbError, setDbError] = useState("");
  const [brevoUsage, setBrevoUsage] = useState(null);
  const [brevoError, setBrevoError] = useState("");
  const [aiUsage, setAiUsage] = useState(null);
  const [aiError, setAiError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState(null);
  const [showNotifyPopup, setShowNotifyPopup] = useState(false);
  const [lastBroadcast, setLastBroadcast] = useState(null);
  const [notifying, setNotifying] = useState(false);
  const [pwaStats, setPwaStats] = useState(null);
  const [pwaError, setPwaError] = useState("");
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

  const pollDailyEmailStatus = () => {
    const interval = setInterval(async () => {
      try {
        const data = await getDailyEmailStatus();
        setDailyRun(data);
        if (data.status === "done" || data.status === "error") {
          clearInterval(interval);
          if (data.status === "done") toast.success(`Daily email done: ${data.result.sent} sent, ${data.result.failed} failed.`);
          else toast.error("Daily email run failed.");
        }
      } catch { clearInterval(interval); }
    }, 3000);
  };
  const handleSendDailyEmail = async () => {
    if (!dailyMessage.trim()) { toast.error("Message is required"); return; }
    setShowDailyConfirm(false);
    setDailySending(true);
    try {
      await triggerDailyEmail({ subject: dailySubject, message: dailyMessage });
      toast.success("Daily email send started in background.");
      setDailyRun({ status: "running" });
      pollDailyEmailStatus();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to start daily email.");
    } finally { setDailySending(false); }
  };

  const handleBroadcast = async () => {
    if (!broadcastBody.trim()) { toast.error("Message body is required"); return; }
    setBroadcasting(true);
    setBroadcastResult(null);
    try {
      const res = await broadcastMessage({ subject: broadcastSubject, body: broadcastBody });
      setBroadcastResult(res);
      setLastBroadcast({ subject: broadcastSubject, body: broadcastBody, sent: res.sent });
      setShowNotifyPopup(true);
      toast.success(`Message sent to ${res.sent} inboxes`);
      setBroadcastBody("");
      setBroadcastSubject("");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send message");
    } finally {
      setBroadcasting(false);
    }
  };

  const handleNotifyEmail = async () => {
    if (!lastBroadcast) return;
    setNotifying(true);
    try {
      const { notifyInboxEmail } = await import("../services/adminService");
      await notifyInboxEmail({ subject: lastBroadcast.subject, body: lastBroadcast.body });
      toast.success(`Email notify started for ${lastBroadcast.sent} users`);
      setShowNotifyPopup(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to start email notify");
    } finally {
      setNotifying(false);
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

  useEffect(() => {
    getCloudinaryUsage()
      .then((d) => setCloudinaryUsage(d.usage))
      .catch((e) => setCloudinaryError(e.response?.data?.error || "Could not load Cloudinary usage"));
  }, []);
  useEffect(() => {
    getDbUsage()
      .then((d) => setDbUsage(d))
      .catch((e) => setDbError(e.response?.data?.error || "Could not load DB usage"));
  }, []);
  useEffect(() => {
    getBrevoUsage()
      .then((d) => setBrevoUsage(d))
      .catch((e) => setBrevoError(e.response?.data?.error || "Could not load Brevo usage"));
  }, []);
  useEffect(() => {
    getAiAnalytics()
      .then((d) => setAiUsage(d))
      .catch((e) => setAiError(e.response?.data?.error || "Could not load AI usage"));
  }, []);
  useEffect(() => {
    api.get("/pwa/stats")
      .then((r) => setPwaStats(r.data))
      .catch((e) => setPwaError(e.response?.data?.error || "Could not load PWA stats"));
  }, []);
  // Real-time: admin dashboard refreshes instantly (only admin)
  const refreshStats = useCallback(async () => {
    try { const d = await getAdminStats(); setStats(d); } catch {}
    try { const r = await api.get("/pwa/stats"); setPwaStats(r.data); } catch {}
  }, []);
  useRealtime("admin:listing", refreshStats, { enabled: true });
  useRealtime("admin:favorite", refreshStats, { enabled: true });
  useRealtime("listing", refreshStats, { enabled: true });

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "system", label: "System" },
    { id: "messages", label: "Messages" },
    { id: "emails", label: "Emails" },
  ];

  return (
    <AdminLayout>
      <h1 className="text-xl font-bold text-navy-900 mb-2">Dashboard</h1>
      <p className="text-sm text-gray-500 mb-4">Manage your marketplace — stats, system health, and messaging.</p>

      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap transition-colors ${activeTab === t.id ? "bg-navy-900 text-white border-navy-900" : "bg-white text-gray-600 border-sage-100 hover:bg-gray-50"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {!stats && !error && (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-8">
          <MiniSpinner size={16} />
          Loading stats...
        </div>
      )}

      {stats && activeTab === "overview" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {STAT_CONFIG.map(({ key, label, to }) => {
              const Card = (
                <div className={`bg-white border border-sage-100 rounded-xl p-5 ${to ? "hover:border-primary-200 hover:shadow-sm cursor-pointer transition-all" : ""}`}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2 flex items-center justify-between">
                    {label}
                    {to && <span className="text-[10px] font-bold text-primary-600">View →</span>}
                  </p>
                  <p className="text-2xl font-bold text-navy-900">
                    {stats[key] ?? 0}
                  </p>
                </div>
              );
              return to ? (
                <Link key={key} to={to} className="block">
                  {Card}
                </Link>
              ) : (
                <div key={key}>{Card}</div>
              );
            })}
          </div>
          {stats.topFavorited?.length > 0 && (
            <div className="mt-6 bg-white border border-sage-100 rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Top Favorited (click to view)</p>
              <div className="flex flex-col gap-2">
                {stats.topFavorited.map((l) => (
                  <a key={l.id} href={`/listings/${l.slug || l.id}`} className="text-sm text-navy-900 hover:text-primary-600 flex justify-between gap-2 min-w-0">
                    <span className="truncate pr-2 min-w-0 flex-1">{l.title}</span>
                    <span className="font-bold whitespace-nowrap flex-shrink-0">♥ {l.favoriteCount}</span>
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
                  <a key={l.id} href={`/listings/${l.slug || l.id}`} className="text-sm text-navy-900 hover:text-primary-600 flex justify-between gap-2 min-w-0">
                    <span className="truncate pr-2 min-w-0 flex-1">{l.title}</span>
                    <span className="font-bold whitespace-nowrap flex-shrink-0">👁 {l.contactViews}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {stats && activeTab === "system" && (
        <div className="space-y-6">

          {/* Brevo Free Emails Left — Admin Only */}
          <div className="mt-6 bg-white border border-sage-100 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Brevo Free Emails — {brevoUsage ? brevoUsage.plan : "Loading..."}</p>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${brevoUsage && brevoUsage.remainingToday <= 30 ? "bg-red-50 text-red-600" : brevoUsage && brevoUsage.remainingToday <= 80 ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"}`}>
                {brevoUsage ? `${brevoUsage.remainingToday} left today` : brevoError ? "Error" : "Loading..."}
              </span>
            </div>
            {brevoUsage ? (
              <>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div className={`h-full transition-all ${brevoUsage.remainingToday <= 30 ? "bg-red-500" : brevoUsage.remainingToday <= 80 ? "bg-amber-400" : "bg-primary-600"}`} style={{ width: `${Math.min(100, (brevoUsage.sentToday / brevoUsage.dailyLimit) * 100)}%` }} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div><p className="text-xs text-gray-400">Sent today</p><p className="font-semibold text-navy-900">{brevoUsage.sentToday} / {brevoUsage.dailyLimit}</p></div>
                  <div><p className="text-xs text-gray-400">Left today</p><p className="font-semibold text-navy-900">{brevoUsage.remainingToday}</p></div>
                  <div><p className="text-xs text-gray-400">Plan</p><p className="font-semibold text-navy-900">{brevoUsage.plan}</p></div>
                  <div><p className="text-xs text-gray-400">Month left ~</p><p className="font-semibold text-navy-900">{brevoUsage.remainingMonth}</p></div>
                </div>
                <p className="text-xs text-gray-500 mt-3">Free plan: 300/day · Resets midnight UTC · <a href="https://app.brevo.com/statistics" target="_blank" rel="noreferrer" className="underline">Brevo Dashboard →</a></p>
                {brevoUsage.remainingToday <= 30 && <p className="text-xs text-red-600 mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">⚠️ Low on free emails — batch sends will throttle/skip.</p>}
              </>
            ) : brevoError ? (
              <p className="text-sm text-red-500">{brevoError} — check Brevo API key or try again.</p>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-500"><MiniSpinner size={14} /> Loading Brevo usage…</div>
            )}
          </div>

          {/* Gemini AI Free Credits — Admin Only */}
          <div className="mt-6 bg-white border border-sage-100 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Gemini AI — free tier (per API key)</p>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${aiUsage && aiUsage.gemini.remaining <= 150 ? "bg-red-50 text-red-600" : aiUsage && aiUsage.gemini.remaining <= 400 ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"}`}>
                {aiUsage ? `${aiUsage.gemini.remaining} left today` : aiError ? "Error" : "Loading..."}
              </span>
            </div>
            {aiUsage ? (
              <>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div className={`h-full transition-all ${aiUsage.gemini.percentUsed > 90 ? "bg-red-500" : aiUsage.gemini.percentUsed > 70 ? "bg-amber-400" : "bg-primary-600"}`} style={{ width: `${Math.min(100, aiUsage.gemini.percentUsed)}%` }} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div><p className="text-xs text-gray-400">Gemini today</p><p className="font-semibold text-navy-900">{aiUsage.gemini.usedToday} / {aiUsage.gemini.dailyLimit}</p></div>
                  <div><p className="text-xs text-gray-400">Left today</p><p className="font-semibold text-navy-900">{aiUsage.gemini.remaining}</p></div>
                  <div><p className="text-xs text-gray-400">Free help (total)</p><p className="font-semibold text-navy-900">{aiUsage.free.usedToday} today · {aiUsage.free.totalFree} total</p></div>
                  <div><p className="text-xs text-gray-400">Paid shopping</p><p className="font-semibold text-navy-900">{aiUsage.paid.sessions} sessions</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 mt-3">
                  <div>Per-user free: <span className="font-semibold text-navy-900">{aiUsage.free.limitUser}/day</span> · Guest: <span className="font-semibold text-navy-900">{aiUsage.free.limitGuest}/day</span> — each user has own limit, not shared.</div>
                  <div>Gemini key: <span className={`font-semibold ${aiUsage.gemini.keySet ? "text-green-600" : "text-red-600"}`}>{aiUsage.gemini.keySet ? "Set ✅" : "Missing ❌"}</span></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">{aiUsage.gemini.note}</p>
                {aiUsage.gemini.remaining <= 150 && <p className="text-xs text-red-600 mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">⚠️ Low Gemini free quota — after 1500/day, calls will fail until midnight Pacific.</p>}
              </>
            ) : aiError ? (
              <p className="text-sm text-red-500">{aiError} — check API or try again.</p>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-500"><MiniSpinner size={14} /> Loading AI usage…</div>
            )}
          </div>

          {/* PWA Installs — TT Marketplace */}
          <div className="mt-6 bg-white border border-sage-100 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">PWA Installs — TT Marketplace</p>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${pwaStats?.total > 0 ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                {pwaStats ? `${pwaStats.total} total` : pwaError ? "Error" : "Loading..."}
              </span>
            </div>
            {pwaStats ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div><p className="text-xs text-gray-400">Total installs</p><p className="font-semibold text-navy-900">{pwaStats.total}</p></div>
                  <div><p className="text-xs text-gray-400">Last 7 days</p><p className="font-semibold text-navy-900">{pwaStats.last7Days}</p></div>
                  <div><p className="text-xs text-gray-400">Unique users</p><p className="font-semibold text-navy-900">{pwaStats.uniqueLoggedInUsers}</p></div>
                  <div><p className="text-xs text-gray-400">Android / iOS</p><p className="font-semibold text-navy-900">{pwaStats.byPlatform?.android || 0} / {pwaStats.byPlatform?.ios || 0}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 mt-3">
                  <div>By source: {Object.entries(pwaStats.bySource || {}).map(([k, v]) => `${k} ${v}`).join(" · ") || "—"}</div>
                  <div>By platform: {Object.entries(pwaStats.byPlatform || {}).map(([k, v]) => `${k} ${v}`).join(" · ") || "—"}</div>
                </div>
                {pwaStats.byDay?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Last 14 days</p>
                    <div className="flex flex-wrap gap-2">
                      {pwaStats.byDay.map((d) => (
                        <span key={d.day} className="text-xs bg-gray-50 border border-gray-100 rounded-full px-2 py-1">{d.day}: <b>{d.count}</b></span>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-3">Fires on <b>appinstalled</b> (Android/desktop) + <b>standalone launch</b> (iOS) — once/day per device. Also tracked in GA4 as <code>pwa_installed</code> / <code>pwa_launch</code>.</p>
              </>
            ) : pwaError ? (
              <p className="text-sm text-red-500">{pwaError} — check <code>GET /api/pwa/stats</code> with admin JWT.</p>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-500"><MiniSpinner size={14} /> Loading PWA stats…</div>
            )}
          </div>

          {/* Cloudinary Free Quota Usage — Admin Only */}
          <div className="mt-6 bg-white border border-sage-100 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Cloudinary Free Quota (25 credits)</p>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${cloudinaryUsage?.credits?.used_percent > 80 ? "bg-red-50 text-red-600" : cloudinaryUsage?.credits?.used_percent > 60 ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"}`}>
                {cloudinaryUsage ? `${cloudinaryUsage.credits?.used_percent ?? 0}% used` : cloudinaryError ? "Error" : "Loading..."}
              </span>
            </div>
            {cloudinaryUsage ? (
              <>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div className={`h-full transition-all ${cloudinaryUsage.credits?.used_percent > 80 ? "bg-red-500" : cloudinaryUsage.credits?.used_percent > 60 ? "bg-amber-400" : "bg-primary-600"}`} style={{ width: `${Math.min(100, cloudinaryUsage.credits?.used_percent || 0)}%` }} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div><p className="text-xs text-gray-400">Credits</p><p className="font-semibold text-navy-900">{cloudinaryUsage.credits?.usage ?? 0} / {cloudinaryUsage.credits?.limit ?? 25}</p></div>
                  <div><p className="text-xs text-gray-400">Storage</p><p className="font-semibold text-navy-900">{((cloudinaryUsage.storage?.usage || 0) / (1024*1024*1024)).toFixed(2)} GB</p></div>
                  <div><p className="text-xs text-gray-400">Transformations</p><p className="font-semibold text-navy-900">{cloudinaryUsage.transformations?.usage ?? 0}</p></div>
                  <div><p className="text-xs text-gray-400">Bandwidth</p><p className="font-semibold text-navy-900">{((cloudinaryUsage.bandwidth?.usage || 0) / (1024*1024*1024)).toFixed(2)} GB</p></div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-gray-500 mt-3">
                  <div>Resources: {cloudinaryUsage.resources ?? 0} / {cloudinaryUsage.resources_limit ?? "—"}</div>
                  <div>Derived: {cloudinaryUsage.derived_resources ?? 0}</div>
                  <div>Plan: {cloudinaryUsage.plan ?? "Free"}</div>
                </div>
                {cloudinaryUsage.credits?.used_percent > 80 && (
                  <p className="text-xs text-red-600 mt-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">⚠️ Over 80% — new image uploads may fail if you hit 100%. Old listings already trimmed to 3 images (was 5) to save credits.</p>
                )}
              </>
            ) : cloudinaryError ? (
              <p className="text-sm text-red-500">{cloudinaryError} — check <a href="https://console.cloudinary.com" target="_blank" rel="noreferrer" className="underline">Cloudinary Console → Usage</a></p>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-500"><MiniSpinner size={14} /> Loading Cloudinary usage…</div>
            )}
          </div>
          {/* DB Free Space Left — Neon Postgres */}
          {dbUsage ? (
            <div className="mt-6 bg-white border border-sage-100 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Database — Free Space Left (Neon)</p>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${dbUsage.percent > 80 ? "bg-red-50 text-red-600" : dbUsage.percent > 60 ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"}`}>{dbUsage.percent}% used</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div className={`h-full transition-all ${dbUsage.percent > 80 ? "bg-red-500" : dbUsage.percent > 60 ? "bg-amber-400" : "bg-primary-600"}`} style={{ width: `${Math.min(100, dbUsage.percent)}%` }} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div><p className="text-xs text-gray-400">Used</p><p className="font-semibold text-navy-900">{dbUsage.pretty} / {dbUsage.limitPretty}</p></div>
                <div><p className="text-xs text-gray-400">Left</p><p className="font-semibold text-navy-900">{((dbUsage.limitBytes - dbUsage.size) / (1024 * 1024 * 1024)).toFixed(2)} GB</p></div>
                <div><p className="text-xs text-gray-400">Listings</p><p className="font-semibold text-navy-900">{dbUsage.counts?.listings}</p></div>
                <div><p className="text-xs text-gray-400">Users</p><p className="font-semibold text-navy-900">{dbUsage.counts?.users}</p></div>
              </div>
              {dbUsage.tables?.length > 0 && <p className="text-xs text-gray-500 mt-3">Largest tables: {dbUsage.tables.slice(0, 3).map((t) => `${t.table} ${t.size}`).join(" · ")}</p>}
              {dbUsage.percent > 80 && <p className="text-xs text-red-600 mt-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">⚠️ Over 80% — consider archiving old listings/messages.</p>}
            </div>
          ) : dbError ? (
            <p className="text-sm text-red-500 mt-6">{dbError}</p>
          ) : (
            <div className="mt-6 bg-white border border-sage-100 rounded-xl p-5 flex items-center gap-2 text-sm text-gray-500"><MiniSpinner size={14} /> Loading DB usage…</div>
          )}

        </div>
      )}

      {activeTab === "messages" && (
        <div className="mt-2 bg-white border border-sage-100 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-navy-900 mb-1">Send message to all users</h2>
        <p className="text-sm text-gray-500 mb-3">Type what you want to send. They will get <span className="font-semibold">"You have a message on Trend Tribe"</span> email + notification with preview. Tap the notification to open inbox. Full message lives in their inbox.</p>
        <input
          type="text"
          placeholder="Subject (optional)"
          value={broadcastSubject}
          onChange={(e) => setBroadcastSubject(e.target.value)}
          className="w-full border border-sage-100 rounded-lg px-3 py-2 text-sm mb-2"
        />
        <textarea
          placeholder="Type your message here..."
          value={broadcastBody}
          onChange={(e) => setBroadcastBody(e.target.value)}
          rows={4}
          className="w-full border border-sage-100 rounded-lg px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            onClick={handleBroadcast}
            disabled={broadcasting || !broadcastBody.trim()}
            className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {broadcasting ? "Sending..." : "Send to inbox + notify all"}
          </button>
          {broadcastResult && <span className="text-sm text-green-600 font-medium">Sent to {broadcastResult.sent} users</span>}
        </div>
      </div>
      )}

      {/* Subtle popup: notify to mail or ignore */}
      {showNotifyPopup && lastBroadcast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowNotifyPopup(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-sage-100" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900">Notify also via email?</h3>
            <p className="text-sm text-gray-500 mt-1">Inbox + notification sent. Also send <span className="font-semibold">“You have a message on Trend Tribe”</span> to their real email?</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowNotifyPopup(false)} className="flex-1 btn-secondary text-sm">Ignore</button>
              <button onClick={handleNotifyEmail} disabled={notifying} className="flex-1 btn-primary text-sm">{notifying ? "Sending..." : "Notify to mail"}</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "emails" && (
        <div className="space-y-6">
          <div className="bg-white border border-sage-100 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-navy-900 mb-1">Daily Email — Design Card</h2>
            <p className="text-sm text-gray-500 mb-3">Write a custom message. It will be sent as a branded card (not plain text) to all verified, opted-in users.</p>
            <input
              type="text"
              placeholder="Subject (optional) — e.g. Your daily TrendTribe update"
              value={dailySubject}
              onChange={(e) => setDailySubject(e.target.value)}
              className="w-full border border-sage-100 rounded-lg px-3 py-2 text-sm mb-3"
            />
            <textarea
              placeholder="Write your custom daily message here..."
              value={dailyMessage}
              onChange={(e) => setDailyMessage(e.target.value)}
              rows={5}
              className="w-full border border-sage-100 rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">{dailyMessage.length}/2000</p>

            {dailyMessage.trim() && (
              <div className="mt-4 border border-sage-100 rounded-xl overflow-hidden">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 p-3 pb-0">Preview — card design</p>
                <div style={{ background: "#EEF4FF", padding: "16px" }}>
                  <div style={{ maxWidth: 520, margin: "0 auto", background: "#ffffff", borderRadius: 16, overflow: "hidden", border: "1px solid #E5E7EB" }}>
                    <div style={{ background: "linear-gradient(135deg, #0F1F3D 0%, #1340B8 100%)", padding: "16px 20px", textAlign: "center" }}>
                      <span style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>Trend<span style={{ color: "#F5C518" }}>Tribe</span></span>
                    </div>
                    <div style={{ padding: 20 }}>
                      <p style={{ margin: 0, fontSize: 14, color: "#111827" }}>Good morning, Full Name! 👋🏽</p>
                      <div style={{ marginTop: 12, background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 12, padding: 12, fontSize: 14, color: "#374151", whiteSpace: "pre-wrap" }}>
                        {dailyMessage || "Your message will appear here..."}
                      </div>
                      <div style={{ textAlign: "center", marginTop: 16 }}>
                        <span style={{ display: "inline-block", background: "#1340B8", color: "#fff", padding: "10px 20px", borderRadius: 10, fontWeight: 700, fontSize: 13 }}>Browse Marketplace →</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowDailyConfirm(true)}
              disabled={dailySending || dailyRun?.status === "running" || !dailyMessage.trim()}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed mt-4"
            >
              {dailySending || dailyRun?.status === "running" ? "Sending..." : "Send Daily Email Now"}
            </button>

            <ConfirmDialog
              isOpen={showDailyConfirm}
              warning
              title="Send Daily Email?"
              message={`This will send "${dailySubject || "Your daily TrendTribe update"}" as a design card to all opted-in, verified users now.`}
              confirmLabel="Send Now"
              cancelLabel="Cancel"
              onConfirm={handleSendDailyEmail}
              onCancel={() => setShowDailyConfirm(false)}
            />

            {dailyRun?.status === "running" && (
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-4">
                <MiniSpinner size={16} />
                Sending in progress — this can take a few minutes...
              </div>
            )}
            {dailyRun?.status === "done" && (
              <div className="mt-4 bg-white border border-sage-100 rounded-xl p-4">
                <p className="text-sm text-navy-900 mb-3">
                  <span className="font-semibold text-green-600">{dailyRun.result.sent} sent</span>
                  {" · "}
                  <span className="font-semibold text-red-500">{dailyRun.result.failed} failed</span>
                  {" · "}
                  {dailyRun.result.total} total
                </p>
                {dailyRun.result.failures?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Failed Recipients</p>
                    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                      {dailyRun.result.failures.map((f, i) => (
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
            {dailyRun?.status === "error" && (
              <p className="text-sm text-red-500 mt-4">The send run failed: {dailyRun.error}</p>
            )}
          </div>

        </div>
      )}
    </AdminLayout>
  );
};
export default AdminDashboardPage;
