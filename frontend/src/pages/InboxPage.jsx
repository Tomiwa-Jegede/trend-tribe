// src/pages/InboxPage.jsx — User inbox for Trend Tribe messages
import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { FiMail, FiTrash2, FiCheckSquare, FiSquare, FiEye, FiMessageCircle } from "react-icons/fi";
import { getMyMessages, getConversations, markMessageRead, markAllMessagesRead, deleteMessage, deleteMessagesBulk, deleteAllMessages } from "../services/messageService";
import { getListingById } from "../services/listingService";
import useRealtime from "../hooks/useRealtime";
import { useAuth } from "../context/AuthContext";
import ChatThread from "../components/chat/ChatThread";

const PendingChatRow = ({ listingId, otherId, onOpen }) => {
  const [listing, setListing] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    getListingById(listingId).then((d) => { if (!cancelled) { setListing(d); setLoading(false); } }).catch((err) => {
      if (!cancelled) {
        if (err?.response?.status === 404) { setNotFound(true); setListing({ id: listingId, title: "Product no longer available", isAvailable: false, seller: { id: otherId } }); }
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [listingId, otherId]);
  if (loading) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="flex gap-3 items-center">
          <div className="w-10 h-10 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-1/3" />
            <div className="h-2 bg-gray-200 rounded w-1/2" />
          </div>
          <div className="h-3 bg-gray-100 rounded w-16" />
        </div>
      </div>
    );
  }
  const other = listing?.seller && listing.seller.id === otherId ? listing.seller : { id: otherId, fullName: listing?.seller?.fullName, username: listing?.seller?.username, avatar: listing?.seller?.avatar };
  const displayName = other?.fullName || other?.username || listing?.title || `Chat ${listingId}`;
  const avatar = other?.avatar || listing?.images?.[0];
  return (
    <div className="card p-4 cursor-pointer hover:border-primary-200 transition-colors" onClick={onOpen}>
      <div className="flex gap-3 items-center">
        {avatar && avatar.startsWith("http") ? <img src={avatar} alt={displayName} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700">{displayName?.[0] || "?"}</div>}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{displayName} · {listing?.title || `Listing #${listingId}`}</p>
          <p className="text-xs text-gray-500 truncate">No messages yet — tap to open chat</p>
        </div>
        <span className="text-xs text-primary-600 font-semibold">Open chat →</span>
      </div>
    </div>
  );
};

const InboxPage = () => {
  const { isAuthenticated, token, user } = useAuth();
  const location = useLocation();
  const isChat = location.pathname === "/chat";
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [savedChats, setSavedChats] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tt_saved_chats") || "[]"); } catch { return []; }
  });
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(() => new Set());
  const [selecting, setSelecting] = useState(false);
  const [expanded, setExpanded] = useState(null); // id or thread-...
  // delete race: tombstone ids that were just deleted so 5s poll doesn't resurrect them if replica lags / poll wins race
  const pendingDeletesRef = useRef(new Set());
  const pendingDeleteAllRef = useRef(false);

  const threadParam = searchParams.get("thread");
  // Bug 2 fix: keep callback stable but read latest thread via ref (searchParams object changes every navigation but /chat instance is reused)
  const searchParamsRef = useRef(searchParams);
  useEffect(() => { searchParamsRef.current = searchParams; }, [searchParams]);
  const fetchMessages = useCallback(async (showLoader = true) => {
    if (!isAuthenticated || !token) return;
    if (showLoader) setLoading(true);
    try {
      const [msgData, convos] = await Promise.all([getMyMessages({ limit: 20 }), getConversations().catch(() => [])]);
      let nextMessages = msgData.messages;
      // filter tombstones so optimistic delete isn't undone by stale replica
      if (pendingDeletesRef.current.size > 0) {
        nextMessages = nextMessages.filter((m) => !pendingDeletesRef.current.has(m.id));
      }
      if (pendingDeleteAllRef.current) nextMessages = [];
      setMessages(nextMessages);
      // conversations come from separate endpoint — if we just bulk-deleted chats, keep empty
      let nextConvos = convos || [];
      if (pendingDeleteAllRef.current && isChat) nextConvos = [];
      setConversations(nextConvos);
      setPagination(msgData.pagination);
      const tp = searchParamsRef.current.get("thread");
      if (tp) {
        const [lid, withId] = tp.split("-").map((v) => parseInt(v, 10));
        if (!isNaN(lid) && !isNaN(withId)) {
          // Bug 1 fix: per-listing — match otherUser AND listing (backend is per-listing: getThread(listingId,withId))
          const real = (convos || []).find((c) => c.otherUser?.id === withId && c.listing?.id === lid);
          const key = real ? real.key : `thread-${lid}-${withId}`;
          setExpanded((prev) => prev === key ? prev : key);
          // save chat so Close just collapses, not deletes — can come back via Chats list
          setSavedChats((prev) => {
            if (prev.some((c) => c.key === key) || convos?.some((c) => c.key === key)) return prev;
            const next = [...prev, { key, listing: { id: lid }, otherUser: { id: withId }, lastMessage: null, unreadCount: 0, isPending: true }];
            localStorage.setItem("tt_saved_chats", JSON.stringify(next));
            return next;
          });
        }
      } else if (msgData.messages?.some((m) => !m.read)) {
        markAllMessagesRead().catch(() => {});
        setMessages((prev) => prev.map((x) => ({ ...x, read: true })));
        if ("clearAppBadge" in navigator) navigator.clearAppBadge().catch(() => {});
      }
    } catch (err) { if (import.meta.env.DEV) console.warn("[InboxPage fetchMessages]", err?.response?.data || err.message); }
    finally { if (showLoader) setLoading(false); }
  }, [isAuthenticated, token, user?.id]);

  // Clear stale inbox on logout or account switch, then fetch for new account
  useEffect(() => {
    if (!isAuthenticated || !token || !user?.id) {
      setMessages([]);
      setPagination(null);
      setSelected(new Set());
      setSelecting(false);
      setExpanded(null);
      setLoading(false);
      return;
    }
    setMessages([]);
    setPagination(null);
    setSelected(new Set());
    setSelecting(false);
    setExpanded(null);
    fetchMessages(true);
  }, [isAuthenticated, token, user?.id]); // fetchMessages stable — don't retrigger on thread change

  // realtime inbox refresh — stable handler via ref, fetches immediately on push/socket
  const handleRealtimeMessage = useCallback((msg) => {
    // if payload looks like a full message, optimistically update inbox list to feel instant
    if (msg && msg.id && msg.body) {
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [msg, ...prev].slice(0, 20));
    }
    fetchMessages(false);
  }, [fetchMessages]);
  useRealtime("message", handleRealtimeMessage, { enabled: isAuthenticated && !!token });
  useRealtime("message:unread", handleRealtimeMessage, { enabled: isAuthenticated && !!token });
  // also refresh when app comes back from background (Pusher paused while hidden / PWA throttled)
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    const onVis = () => { if (document.visibilityState === "visible") fetchMessages(false); };
    const onFocus = () => fetchMessages(false);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onFocus);
    return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", onFocus); window.removeEventListener("pageshow", onFocus); };
  }, [isAuthenticated, token, fetchMessages]);
  // fallback polling keeps PWA fresh when websocket/throttle drops — 5s when visible
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    const id = setInterval(() => { if (document.visibilityState === "visible") fetchMessages(false); }, 5000);
    return () => clearInterval(id);
  }, [isAuthenticated, token, fetchMessages]);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === messages.length) setSelected(new Set());
    else setSelected(new Set(messages.map((m) => m.id)));
  };

  const handleOpen = async (m) => {
    if (selecting) { toggleSelect(m.id); return; }
    setExpanded(expanded === m.id ? null : m.id);
    if (!m.read) {
      try { await markMessageRead(m.id); } catch (err) { if (import.meta.env.DEV) console.warn("[InboxPage markRead]", err?.response?.data || err.message); }
      setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, read: true } : x));
    }
  };

  const handleDeleteOne = async (e, id) => {
    e.stopPropagation();
    pendingDeletesRef.current.add(id);
    try {
      await deleteMessage(id);
      setMessages((prev) => prev.filter((x) => x.id !== id));
      setSelected((p) => { const n = new Set(p); n.delete(id); return n; });
      // keep tombstone for 10s to survive replica lag / poll race
      setTimeout(() => pendingDeletesRef.current.delete(id), 10000);
    } catch (err) {
      pendingDeletesRef.current.delete(id);
      if (import.meta.env.DEV) console.warn("[InboxPage deleteOne]", err?.response?.data || err.message);
      alert(err?.response?.data?.error || "Delete failed — please try again");
    }
  };
  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} message${selected.size !== 1 ? "s" : ""}?`)) return;
    const ids = Array.from(selected);
    ids.forEach((id) => pendingDeletesRef.current.add(id));
    try {
      await deleteMessagesBulk(ids);
      setMessages((prev) => prev.filter((x) => !selected.has(x.id)));
      setSelected(new Set()); setSelecting(false);
      setTimeout(() => ids.forEach((id) => pendingDeletesRef.current.delete(id)), 10000);
    } catch (err) {
      ids.forEach((id) => pendingDeletesRef.current.delete(id));
      if (import.meta.env.DEV) console.warn("[InboxPage bulkDelete]", err?.response?.data || err.message);
      alert(err?.response?.data?.error || "Bulk delete failed — please try again");
    }
  };
  const handleDeleteAll = async () => {
    if (isChat) {
      if (!window.confirm(`Delete all ${conversations.length + savedChats.length} chats?`)) return;
      pendingDeleteAllRef.current = true;
      const prevConvos = conversations.length;
      try {
        await deleteAllMessages();
        setSavedChats([]);
        try { localStorage.removeItem("tt_saved_chats"); } catch {}
        setConversations([]);
        setMessages([]);
        setSelected(new Set()); setSelecting(false);
        setTimeout(() => { pendingDeleteAllRef.current = false; }, 10000);
      } catch (err) {
        pendingDeleteAllRef.current = false;
        if (import.meta.env.DEV) console.warn("[InboxPage deleteAll chats]", err?.response?.data || err.message);
        alert(err?.response?.data?.error || "Delete all failed");
        // refetch to restore if we cleared optimistically before await — re-fetch
        if (prevConvos) fetchMessages(false);
      }
      return;
    }
    if (!window.confirm(`Delete all ${messages.length} messages?`)) return;
    pendingDeleteAllRef.current = true;
    try {
      await deleteAllMessages();
      setMessages([]); setSelected(new Set()); setSelecting(false);
      setTimeout(() => { pendingDeleteAllRef.current = false; }, 10000);
    } catch (err) {
      pendingDeleteAllRef.current = false;
      if (import.meta.env.DEV) console.warn("[InboxPage deleteAll]", err?.response?.data || err.message);
      alert(err?.response?.data?.error || "Delete all failed");
    }
  };
  const handleMarkAllRead = async () => {
    try { await markAllMessagesRead(); setMessages((prev) => prev.map((x) => ({ ...x, read: true }))); } catch (err) { if (import.meta.env.DEV) console.warn("[InboxPage markAllRead]", err?.response?.data || err.message); }
  };

  const handleCloseChat = useCallback(() => {
    setExpanded(null);
    const params = new URLSearchParams(searchParams);
    if (params.has("thread")) {
      params.delete("thread");
      setSearchParams(params, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // persist pending new-chat (first Contact Seller) so Close just collapses, not deletes — can reopen from Chats list
  useEffect(() => {
    const tp = searchParams.get("thread");
    if (!tp || !isChat) return;
    const pendingKey = `thread-${tp}`;
    const [lid, withId] = tp.split("-").map((v) => parseInt(v, 10));
    if (isNaN(lid) || isNaN(withId)) return;
    // per-listing dedup: listing+seller (backend is per-listing)
    if (conversations.some((c) => c.otherUser?.id === withId && c.listing?.id === lid) || savedChats.some((c) => c.otherUser?.id === withId && c.listing?.id === lid)) return;
    const pending = { key: pendingKey, listing: { id: lid }, otherUser: { id: withId }, lastMessage: null, unreadCount: 0, isPending: true };
    setSavedChats((prev) => {
      if (prev.some((c) => c.otherUser?.id === withId && c.listing?.id === lid)) return prev;
      const next = [pending, ...prev];
      try { localStorage.setItem("tt_saved_chats", JSON.stringify(next)); } catch {}
      return next;
    });
  }, [searchParams, isChat, conversations, savedChats]);

  // cleanup saved pending once real conversation appears (avoid duplicate) — match by listing+otherUser
  useEffect(() => {
    if (!isChat || savedChats.length === 0 || conversations.length === 0) return;
    const filtered = savedChats.filter((s) => !conversations.some((c) => c.otherUser?.id === s.otherUser?.id && c.listing?.id === s.listing?.id));
    if (filtered.length !== savedChats.length) {
      setSavedChats(filtered);
      try { localStorage.setItem("tt_saved_chats", JSON.stringify(filtered)); } catch {}
    }
  }, [isChat, conversations, savedChats]);

  return (
    <div className="container-app py-6 sm:py-10">
      <Helmet><title>{isChat ? "Chats — Trend Tribe" : "Inbox — Trend Tribe"}</title></Helmet>
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">{isChat ? <FiMessageCircle className="w-6 h-6" /> : <FiMail className="w-6 h-6" />} {isChat ? "Chats" : "Inbox"} {isChat ? conversations.length > 0 && <span className="text-sm font-normal text-gray-500">({conversations.length} chats)</span> : pagination && <span className="text-sm font-normal text-gray-500">({pagination.totalCount})</span>}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {!selecting ? (
            <>
              {messages.length > 0 && <button onClick={() => setSelecting(true)} className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-full border border-gray-200">Select</button>}
              <button onClick={handleMarkAllRead} className="text-sm text-primary-600 font-semibold hover:underline">Mark all read</button>
            </>
          ) : (
            <>
              <button onClick={toggleSelectAll} className="text-sm font-semibold text-primary-600 hover:underline">{selected.size === messages.length ? "Deselect all" : "Select all"}</button>
              <button onClick={() => { setSelecting(false); setSelected(new Set()); }} className="text-sm text-gray-500">Cancel</button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : isChat ? (
        (() => {
          const tp2 = searchParams.get("thread");
          const pendingKey = tp2 ? `thread-${tp2}` : null;
          const [lid2, otherId2] = tp2 ? tp2.split("-").map((v) => parseInt(v, 10)) : [null, null];
          const hasPending = pendingKey && otherId2 && lid2 && !conversations.some((c) => c.otherUser?.id === otherId2 && c.listing?.id === lid2) && !savedChats.some((c) => c.otherUser?.id === otherId2 && c.listing?.id === lid2);
          const displayConvos = [...savedChats.filter((s) => !conversations.some((c) => c.otherUser?.id === s.otherUser?.id && c.listing?.id === s.listing?.id)), ...conversations];
          const finalConvos = hasPending ? [{ key: pendingKey, listing: { id: parseInt(tp2.split("-")[0], 10) }, otherUser: { id: otherId2 }, lastMessage: null, unreadCount: 0, isPending: true }, ...displayConvos] : displayConvos;
          if (finalConvos.length === 0) {
            return (
              <div className="card p-10 text-center">
                <FiMessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No chats yet</p>
                <p className="text-xs text-gray-400 mt-1">Tap Contact Seller on a listing to start a chat — each seller has their own room.</p>
              </div>
            );
          }
          // when a chat is open, show it full-page, not nested inside a card
          if (expanded && expanded.startsWith("thread-")) {
            const open = finalConvos.find((c) => c.key === expanded);
            if (open) {
              return (
                <>
                  <button onClick={handleCloseChat} className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800">
                    ← Back to chats
                  </button>
                  <ChatThread listingId={open.listing.id} withUser={open.otherUser} onClose={handleCloseChat} />
                </>
              );
            }
            // pending new thread not yet in finalConvos (first open)
            const threadParam = searchParams.get("thread");
            if (threadParam) {
              const [lid, withId] = threadParam.split("-").map((v) => parseInt(v, 10));
              if (!isNaN(lid) && !isNaN(withId)) {
                return <ChatThread listingId={lid} withUser={{ id: withId }} onClose={handleCloseChat} />;
              }
            }
          }
          return (
            <>
              <div className="flex flex-col gap-3">
                {finalConvos.map((c) => {
              const key = c.key;
              const isOpen = expanded === key;
              if (c.isPending) {
                return (
                  <div key={key} onClick={() => setExpanded(key)} className="cursor-pointer">
                    <PendingChatRow listingId={c.listing.id} otherId={c.otherUser.id} onOpen={() => setExpanded(key)} />
                  </div>
                );
              }
              return (
                <div key={key} className="card p-4">
                  <div className="flex gap-3 items-center cursor-pointer" onClick={() => setExpanded(key)}>
                    {c.otherUser?.avatar ? <img src={c.otherUser.avatar} alt={c.otherUser.username} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700">{c.otherUser?.fullName?.[0] || c.otherUser?.username?.[0] || "?"}</div>}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{c.otherUser?.fullName || c.otherUser?.username} · {c.listing?.title || "Chat"}</p>
                      <p className="text-xs text-gray-500 truncate">{c.lastMessage?.body?.slice(0, 60) || "No messages"} {c.unreadCount > 0 && <span className="ml-2 bg-primary-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{c.unreadCount} new</span>}</p>
                    </div>
                    <span className="text-xs text-primary-600 font-semibold">Open chat →</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex items-center justify-between gap-2 border-t border-gray-100 pt-4 flex-wrap">
            <span className="text-xs text-gray-400">{finalConvos.length} chats · {finalConvos.reduce((a, c) => a + (c.unreadCount || 0), 0)} unread</span>
            <button onClick={handleDeleteAll} className="text-sm font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"><FiTrash2 className="w-4 h-4" /> Delete all</button>
          </div>
        </>
      );
        })()
      ) : messages.length === 0 ? (
        <div className="card p-10 text-center">
          <FiMail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No inbox messages</p>
          <p className="text-xs text-gray-400 mt-1">System notifications and admin messages appear here.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {messages.filter((m) => !m.listingId).map((m) => {
              const isSelected = selected.has(m.id);
              const isExpanded = expanded === m.id;
              return (
                <div key={m.id} className={`card p-4 flex gap-3 ${!m.read ? "bg-primary-50/40 border-primary-100" : ""} ${isSelected ? "ring-2 ring-primary-200" : ""}`}>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleOpen(m)}>
                    <p className={`text-sm ${!m.read ? "font-medium text-gray-900" : "text-gray-700"} ${isExpanded ? "whitespace-pre-wrap break-words" : "truncate"}`}>{isExpanded ? m.body : `${m.body.slice(0, 80)}${m.body.length > 80 ? "…" : ""}`}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(m.createdAt).toLocaleString()} · from {m.sender?.role === "ADMIN" ? "Trend Tribe" : m.sender?.username || "System"}</p>
                  </div>
                  <button onClick={(e) => handleDeleteOne(e, m.id)} className="p-2 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-500 flex-shrink-0 self-start" aria-label="Delete"><FiTrash2 className="w-4 h-4" /></button>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex items-center justify-between gap-2 border-t border-gray-100 pt-4 flex-wrap">
            <span className="text-xs text-gray-400">{messages.filter((m) => !m.listingId).length} inbox messages</span>
            <button onClick={handleDeleteAll} className="text-sm font-semibold text-red-600 hover:text-red-700">Delete all</button>
          </div>
        </>
      )}
    </div>
  );
};

export default InboxPage;
