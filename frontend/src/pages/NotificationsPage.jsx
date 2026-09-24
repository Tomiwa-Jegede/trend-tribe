// src/pages/NotificationsPage.jsx — real notifications page (was ComingSoon stub)
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { FiBell, FiTrash2 } from "react-icons/fi";
import api from "../api/axios";
import useRealtime from "../hooks/useRealtime";
import { useAuth } from "../context/AuthContext";

const NotificationsPage = () => {
  const { isAuthenticated, token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchList = useCallback(async () => {
    if (!isAuthenticated || !token) { setLoading(false); return; }
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/notifications", { params: { limit: 50 } });
      setItems(data.notifications || []);
    } catch (e) {
      setError(e.response?.data?.error || "Could not load notifications");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => { fetchList(); }, [fetchList]);
  useRealtime("notification", fetchList, { enabled: !!isAuthenticated && !!token });
  useRealtime("notification:unread", fetchList, { enabled: !!isAuthenticated && !!token });

  const handleRead = async (n) => {
    if (n.read) return;
    try {
      await api.patch(`/notifications/${n.id}/read`);
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
    } catch {}
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch {}
  };

  const handleMarkAll = async () => {
    try {
      await api.post("/notifications/read-all");
      setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    } catch {}
  };

  const getLink = (n) => {
    if (n.type === "NEW_TASK") {
      const gid = n.meta?.gigId || n.gigId;
      return gid ? `/gigs?view=feed&gigId=${gid}` : "/gigs?view=feed";
    }
    if (n.type === "MESSAGE") {
      if (n.listing?.id && n.actor?.id) return `/chat?thread=${n.listing.id}-${n.actor.id}`;
      if (n.listing?.id) return "/chat";
      return `/inbox?highlight=${n.id}`;
    }
    if (n.type === "FAVORITE" && n.listing) return `/listings/${n.listing.slug || n.listing.id}`;
    if (n.type === "NEW_USER") return "/admin/users";
    if (n.listing) return `/listings/${n.listing.slug || n.listing.id}`;
    if (n.type?.startsWith("GIG_") || n.type?.startsWith("SERVICE_") || n.type?.includes("WALLET")) return "/gigs/wallet";
    return "/notifications";
  };

  if (loading) {
    return (
      <div className="container-app py-16 flex justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="container-app py-6 sm:py-8 max-w-2xl mx-auto">
      <Helmet><title>Notifications — Trend Tribe</title></Helmet>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><FiBell className="w-6 h-6" /> Notifications {items.length > 0 && <span className="text-sm font-normal text-gray-500">({items.filter(x=>!x.read).length} unread)</span>}</h1>
        {items.some(x=>!x.read) && <button onClick={handleMarkAll} className="text-sm text-primary-600 font-semibold hover:underline">Mark all read</button>}
      </div>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {items.length === 0 ? (
        <div className="card p-10 text-center">
          <FiBell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No notifications yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((n) => (
            <div key={n.id} className={`card p-4 flex gap-3 ${!n.read ? "bg-primary-50/50 border-primary-100" : ""}`}>
              <Link to={getLink(n)} onClick={() => handleRead(n)} className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{n.type.replaceAll("_"," ")} {n.actor?.username ? `· ${n.actor.username}` : ""} {n.listing?.title ? `· ${n.listing.title}` : ""}</p>
                <p className="text-xs text-gray-500 truncate">{n.actor?.username ? `${n.actor.username} ` : ""}{n.listing?.title || ""}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </Link>
              <button onClick={() => handleDelete(n.id)} className="p-2 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-500 self-start" aria-label="Delete"><FiTrash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
