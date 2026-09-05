// src/components/notifications/NotificationBell.jsx — Bell-only (in-app pull) with select/delete
import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiBell, FiTrash2, FiCheckSquare, FiSquare } from "react-icons/fi";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import useRealtime from "../../hooks/useRealtime";
import useRealtimePolling from "../../hooks/useRealtimePolling";

const NotificationBell = () => {
  const { isAuthenticated, user, token } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const ref = useRef(null);

  const closeDropdown = () => {
    setOpen(false);
    setSelecting(false);
    setSelected(new Set());
  };

  const fetchUnread = useCallback(async () => {
    if (!isAuthenticated || !token) return;
    try {
      const { data } = await api.get("/notifications/unread-count");
      setUnread(data.unreadCount);
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[NotificationBell fetchUnread]", err?.response?.data || err.message);
    }
  }, [isAuthenticated, token]);

  const fetchList = useCallback(async () => {
    if (!isAuthenticated || !token) return;
    try {
      const { data } = await api.get("/notifications", { params: { limit: 20 } });
      setItems(data.notifications);
      setUnread(data.unreadCount);
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[NotificationBell fetchList]", err?.response?.data || err.message);
    }
  }, [isAuthenticated, token]);

  // Clear stale data on logout or account switch, then fetch fresh
  useEffect(() => {
    if (!isAuthenticated || !token || !user?.id) {
      setItems([]);
      setUnread(0);
      closeDropdown();
      return;
    }
    // user switched — wipe previous account's notifications immediately before fetching
    setItems([]);
    setUnread(0);
    closeDropdown();
    fetchUnread();
  }, [isAuthenticated, token, user?.id, fetchUnread]);

  // Real-time: socket instant + 15s polling fallback
  useRealtime("notification", fetchUnread, { enabled: isAuthenticated && !!token });
  useRealtime("notification:unread", fetchUnread, { enabled: isAuthenticated && !!token });
  useRealtime("notification", fetchList, { enabled: isAuthenticated && !!token && open });
  useRealtimePolling(fetchUnread, 15000, isAuthenticated && !!token);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Close on any route change (fixes "stays open after navigating from notification")
  useEffect(() => {
    closeDropdown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      await fetchList();
      // requirement: opening notification marks all as read (both bell and inbox)
      try { await api.post("/notifications/read-all"); setUnread(0); setItems((prev) => prev.map((n) => ({ ...n, read: true }))); } catch (err) { if (import.meta.env.DEV) console.warn("[read-all notif]", err?.response?.data || err.message); }
      try { await api.post("/messages/read-all"); } catch (err) { if (import.meta.env.DEV) console.warn("[read-all messages]", err?.response?.data || err.message); }
    }
    if (!next) {
      setSelecting(false);
      setSelected(new Set());
    }
  };

  const handleMarkAll = async () => {
    try {
      await api.post("/notifications/read-all");
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) { if (import.meta.env.DEV) console.warn("[handleMarkAll]", err?.response?.data || err.message); }
  };

  const handleItemClick = async (n) => {
    if (selecting) {
      toggleSelect(n.id);
      return;
    }
    try {
      if (!n.read) await api.patch(`/notifications/${n.slug || n.id}/read`);
      setUnread((c) => Math.max(0, c - (n.read ? 0 : 1)));
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    } catch (err) { if (import.meta.env.DEV) console.warn("[NotificationBell mark read]", err?.response?.data || err.message); }
    // Close dropdown immediately — navigation happens via <Link to=...>
    closeDropdown();
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  };

  const handleDeleteOne = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setItems((prev) => prev.filter((x) => x.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      // adjust unread if deleted was unread
      const wasUnread = items.find((x) => x.id === id)?.read === false;
      if (wasUnread) setUnread((c) => Math.max(0, c - 1));
    } catch (err) { if (import.meta.env.DEV) console.warn("[NotificationBell deleteOne]", err?.response?.data || err.message); }
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} notification${selected.size !== 1 ? "s" : ""}?`)) return;
    try {
      await api.post("/notifications/bulk-delete", { ids: Array.from(selected) });
      const toRemove = new Set(selected);
      const removedUnread = items.filter((x) => toRemove.has(x.id) && !x.read).length;
      setItems((prev) => prev.filter((x) => !toRemove.has(x.id)));
      setSelected(new Set());
      setSelecting(false);
      if (removedUnread) setUnread((c) => Math.max(0, c - removedUnread));
    } catch (err) { if (import.meta.env.DEV) console.warn("[NotificationBell bulk-delete]", err?.response?.data || err.message); }
  };

  const handleDeleteAll = async () => {
    if (items.length === 0) return;
    if (!window.confirm(`Delete all ${items.length} notifications? This cannot be undone.`)) return;
    try {
      await api.delete("/notifications");
      setItems([]);
      setSelected(new Set());
      setSelecting(false);
      setUnread(0);
    } catch (err) { if (import.meta.env.DEV) console.warn("[NotificationBell deleteAll]", err?.response?.data || err.message); }
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
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 gap-2">
            <h4 className="font-bold text-sm flex items-center gap-2">
              Notifications
              {selecting && <span className="text-xs font-normal text-gray-500">({selected.size} selected)</span>}
            </h4>
            <div className="flex items-center gap-2">
              {!selecting ? (
                <>
                  {items.length > 0 && (
                    <button onClick={() => setSelecting(true)} className="text-xs font-semibold text-gray-600 hover:text-gray-800 px-2 py-1 rounded-lg hover:bg-gray-50">
                      Select
                    </button>
                  )}
                  {unread > 0 && (
                    <button onClick={handleMarkAll} className="text-xs text-primary-600 font-semibold hover:underline">
                      Mark all read
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button onClick={toggleSelectAll} className="text-xs font-semibold text-primary-600 hover:underline">
                    {selected.size === items.length ? "Deselect all" : "Select all"}
                  </button>
                  <button onClick={() => { setSelecting(false); setSelected(new Set()); }} className="text-xs text-gray-500 hover:text-gray-700">
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-auto">
            {items.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No notification yet</p>
            ) : (
              items.map((n) => {
                const isMessage = n.type === "MESSAGE";
                const to = isMessage ? "/inbox" : n.type === "NEW_USER" ? "/admin/users" : n.listing ? `/listings/${n.listing.slug || n.listing.id}` : "/my-listings";
                const isSelected = selected.has(n.id);
                return (
                  <div key={n.id} className={`flex items-start gap-2 px-2 py-1 hover:bg-gray-50 border-b border-gray-50 last:border-0 ${!n.read ? "bg-primary-50/50" : ""}`}>
                    {selecting && (
                      <button onClick={() => toggleSelect(n.id)} className="mt-3 p-1 flex-shrink-0" aria-label={isSelected ? "Deselect" : "Select"}>
                        {isSelected ? <FiCheckSquare className="w-4 h-4 text-primary-600" /> : <FiSquare className="w-4 h-4 text-gray-300" />}
                      </button>
                    )}
                    <Link
                      to={selecting ? "#" : to}
                      onClick={(e) => {
                        if (selecting) {
                          e.preventDefault();
                          toggleSelect(n.id);
                        } else {
                          handleItemClick(n);
                        }
                      }}
                      className="flex-1 block px-2 py-2 min-w-0"
                    >
                      <p className="text-sm text-gray-800 break-words">
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
                        {n.type === "MESSAGE" && (
                          <>
                            <span className="font-semibold">You have a message on Trend Tribe</span>
                            <span className="block text-xs text-gray-500 mt-1 truncate">{n.listing?.title ? `📦 ${n.listing.title}` : "Tap to open inbox"}</span>
                          </>
                        )}
                        {!["FAVORITE", "NEW_USER", "NEW_LISTING", "MESSAGE"].includes(n.type) && <>{n.type}</>}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                    </Link>
                    <button
                      onClick={(e) => handleDeleteOne(e, n.id)}
                      className="mt-2 p-1.5 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                      aria-label="Delete notification"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {items.length > 0 && (
            <div className="border-t border-gray-100 px-3 py-2 flex items-center justify-between gap-2 bg-gray-50/50">
              {selecting ? (
                <>
                  <button
                    onClick={handleDeleteSelected}
                    disabled={selected.size === 0}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <FiTrash2 className="w-3 h-3" /> Delete selected {selected.size > 0 ? `(${selected.size})` : ""}
                  </button>
                  <button onClick={handleDeleteAll} className="text-xs font-semibold text-red-600 hover:text-red-700">
                    Delete all
                  </button>
                </>
              ) : (
                <>
                  <span className="text-xs text-gray-400">{items.length} total · {unread} unread</span>
                  <button onClick={handleDeleteAll} className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1">
                    <FiTrash2 className="w-3 h-3" /> Delete all
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
