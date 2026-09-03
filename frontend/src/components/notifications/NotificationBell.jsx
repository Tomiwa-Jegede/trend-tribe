// src/components/notifications/NotificationBell.jsx — Bell-only (in-app pull)
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FiBell } from "react-icons/fi";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

const NotificationBell = () => {
  const { isAuthenticated } = useAuth();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const ref = useRef(null);

  const fetchUnread = async () => {
    try {
      const { data } = await api.get("/notifications/unread-count");
      setUnread(data.unreadCount);
    } catch {}
  };

  const fetchList = async () => {
    try {
      const { data } = await api.get("/notifications", { params: { limit: 10 } });
      setItems(data.notifications);
      setUnread(data.unreadCount);
    } catch {}
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnread();
    const id = setInterval(fetchUnread, 30000); // poll 30s, no push
    return () => clearInterval(id);
  }, [isAuthenticated]);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) await fetchList();
  };

  const handleMarkAll = async () => {
    try {
      await api.post("/notifications/read-all");
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  const handleItemClick = async (n) => {
    try {
      if (!n.read) await api.patch(`/notifications/${n.id}/read`);
      setUnread((c) => Math.max(0, c - (n.read ? 0 : 1)));
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    } catch {}
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <FiBell className="w-5 h-5 text-gray-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h4 className="font-bold text-sm">Notifications</h4>
            {unread > 0 && (
              <button onClick={handleMarkAll} className="text-xs text-primary-600 font-semibold hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-auto">
            {items.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No notifications yet — when someone saves your listing, it will appear here.</p>
            ) : (
              items.map((n) => {
                const isAdminType = n.type === "NEW_USER" || n.type === "NEW_LISTING";
                const to = n.type === "NEW_USER" ? "/admin/users" : n.listing ? `/listings/${n.listing.id}` : "/my-listings";
                return (
                  <Link
                    key={n.id}
                    to={to}
                    onClick={() => handleItemClick(n)}
                    className={`block px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 ${!n.read ? "bg-primary-50/50" : ""}`}
                  >
                    <p className="text-sm text-gray-800">
                      {n.type === "FAVORITE" && (
                        <>
                          <span className="font-semibold">{n.actor?.username || "Someone"}</span> saved your listing{" "}
                          <span className="font-semibold">{n.listing?.title || ""}</span>
                        </>
                      )}
                      {n.type === "NEW_USER" && (
                        <>
                          New user: <span className="font-semibold">{n.actor?.username || n.actor?.fullName || "Someone"}</span> signed up
                        </>
                      )}
                      {n.type === "NEW_LISTING" && (
                        <>
                          New listing: <span className="font-semibold">{n.listing?.title || "Item"}</span> by{" "}
                          <span className="font-semibold">{n.actor?.username || "someone"}</span>
                        </>
                      )}
                      {!["FAVORITE", "NEW_USER", "NEW_LISTING"].includes(n.type) && (
                        <>{n.type}</>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
