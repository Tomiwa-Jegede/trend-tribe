// src/pages/InboxPage.jsx — User inbox for Trend Tribe messages
import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { FiMail, FiTrash2, FiCheckSquare, FiSquare, FiEye, FiMessageCircle } from "react-icons/fi";
import { getMyMessages, getConversations, markMessageRead, markAllMessagesRead, deleteMessage, deleteMessagesBulk, deleteAllMessages } from "../services/messageService";
import useRealtime from "../hooks/useRealtime";
import { useAuth } from "../context/AuthContext";
import ChatThread from "../components/chat/ChatThread";

const InboxPage = () => {
  const { isAuthenticated, token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(() => new Set());
  const [selecting, setSelecting] = useState(false);
  const [expanded, setExpanded] = useState(null); // id or thread-...

  const fetchMessages = useCallback(async (showLoader = true) => {
    if (!isAuthenticated || !token) return;
    if (showLoader) setLoading(true);
    try {
      const [msgData, convos] = await Promise.all([getMyMessages({ limit: 20 }), getConversations().catch(() => [])]);
      setMessages(msgData.messages);
      setConversations(convos || []);
      setPagination(msgData.pagination);
      const threadParam = searchParams.get("thread");
      if (threadParam) {
        const [lid, withId] = threadParam.split("-").map((v) => parseInt(v, 10));
        if (!isNaN(lid) && !isNaN(withId)) setExpanded(`thread-${lid}-${withId}`);
      } else if (msgData.messages?.some((m) => !m.read)) {
        markAllMessagesRead().catch(() => {});
        setMessages((prev) => prev.map((x) => ({ ...x, read: true })));
        if ("clearAppBadge" in navigator) navigator.clearAppBadge().catch(() => {});
      }
    } catch (err) { if (import.meta.env.DEV) console.warn("[InboxPage fetchMessages]", err?.response?.data || err.message); }
    finally { if (showLoader) setLoading(false); }
  }, [isAuthenticated, token, searchParams, user?.id]);

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
  }, [isAuthenticated, token, user?.id, fetchMessages]);

  const pollInbox = useCallback(() => fetchMessages(false), [fetchMessages]);
  useRealtime("message", pollInbox, { enabled: isAuthenticated && !!token });
  useRealtime("message:unread", pollInbox, { enabled: isAuthenticated && !!token });
  // also refresh when app comes back from background (Pusher paused while hidden)
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    const onVis = () => { if (document.visibilityState === "visible") fetchMessages(false); };
    const onFocus = () => fetchMessages(false);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", onFocus); };
  }, [isAuthenticated, token, fetchMessages]);
  // stay fresh while inbox is open and message lands (no need to re-enter)
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    const id = setInterval(() => { if (document.visibilityState === "visible") fetchMessages(false); }, 10000);
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
    try { await deleteMessage(id); setMessages((prev) => prev.filter((x) => x.id !== id)); setSelected((p) => { const n = new Set(p); n.delete(id); return n; }); } catch (err) { if (import.meta.env.DEV) console.warn("[InboxPage deleteOne]", err?.response?.data || err.message); }
  };
  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} message${selected.size !== 1 ? "s" : ""}?`)) return;
    try { await deleteMessagesBulk(Array.from(selected)); setMessages((prev) => prev.filter((x) => !selected.has(x.id))); setSelected(new Set()); setSelecting(false); } catch (err) { if (import.meta.env.DEV) console.warn("[InboxPage bulkDelete]", err?.response?.data || err.message); }
  };
  const handleDeleteAll = async () => {
    if (!window.confirm(`Delete all ${messages.length} messages?`)) return;
    try { await deleteAllMessages(); setMessages([]); setSelected(new Set()); setSelecting(false); } catch (err) { if (import.meta.env.DEV) console.warn("[InboxPage deleteAll]", err?.response?.data || err.message); }
  };
  const handleMarkAllRead = async () => {
    try { await markAllMessagesRead(); setMessages((prev) => prev.map((x) => ({ ...x, read: true }))); } catch (err) { if (import.meta.env.DEV) console.warn("[InboxPage markAllRead]", err?.response?.data || err.message); }
  };

  return (
    <div className="container-app py-6 sm:py-10">
      <Helmet><title>Chats — Trend Tribe</title></Helmet>
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><FiMessageCircle className="w-6 h-6" /> Chats {conversations.length > 0 && <span className="text-sm font-normal text-gray-500">({conversations.length} chats)</span>}</h1>
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
      ) : conversations.length === 0 ? (
        <div className="card p-10 text-center">
          <FiMessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No chats yet</p>
          <p className="text-xs text-gray-400 mt-1">Tap Contact Seller on a listing to start a chat — each seller has their own room.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {conversations.map((c) => {
              // reuse conversations as chat rooms — flat messages list removed for split inbox
              const key = c.key;
              const isOpen = expanded === key;
              const isSelected = false;
              // dummy to keep linter happy
              void messages; void isSelected;
              return (
                <div key={key} className="card p-4">
                  <div className="flex gap-3 items-center cursor-pointer" onClick={() => setExpanded(isOpen ? null : key)}>
                    {c.otherUser?.avatar ? <img src={c.otherUser.avatar} alt={c.otherUser.username} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700">{c.otherUser?.fullName?.[0] || c.otherUser?.username?.[0] || "?"}</div>}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{c.otherUser?.fullName || c.otherUser?.username} · {c.listing?.title || "Chat"}</p>
                      <p className="text-xs text-gray-500 truncate">{c.lastMessage?.body?.slice(0, 60) || "No messages"} {c.unreadCount > 0 && <span className="ml-2 bg-primary-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{c.unreadCount} new</span>}</p>
                    </div>
                    <span className="text-xs text-primary-600 font-semibold">{isOpen ? "Close" : "Open chat →"}</span>
                  </div>
                  {isOpen && c.listing?.id && c.otherUser?.id && (
                    <div className="mt-4">
                      <ChatThread listingId={c.listing.id} withUser={c.otherUser} onClose={() => setExpanded(null)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex items-center justify-between gap-2 border-t border-gray-100 pt-4 flex-wrap">
            <span className="text-xs text-gray-400">{conversations.length} chats · {conversations.reduce((a, c) => a + (c.unreadCount || 0), 0)} unread</span>
            <button onClick={handleDeleteAll} className="text-sm font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"><FiTrash2 className="w-4 h-4" /> Delete all</button>
          </div>
        </>
      )}
    </div>
  );
};

export default InboxPage;
