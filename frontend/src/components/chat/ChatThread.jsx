// src/components/chat/ChatThread.jsx — WhatsApp-like thread per listing
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { FiSend, FiCheck, FiCheckCircle, FiArrowLeft } from "react-icons/fi";
import { getThread, sendMessage } from "../../services/messageService";
import { getListingById } from "../../services/listingService";
import { getSocket, connectSocket } from "../../services/socket";
import useRealtime from "../../hooks/useRealtime";
import { useAuth } from "../../context/AuthContext";

export default function ChatThread({ listingId, withUser, onClose }) {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState([]);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [presence, setPresence] = useState({ online: false, lastSeen: null });
  const listRef = useRef(null);
  const typingTimeout = useRef(null);
  const lastTypingSent = useRef(0);

  useEffect(() => {
    if (!listingId) return;
    setLoading(true);
    Promise.all([
      getListingById(listingId).then((d) => setProduct(d)).catch(() => {}),
      (async () => {
        if (!withUser?.id) return;
        const data = await getThread(listingId, withUser.id).catch(() => []);
        setMsgs(data || []);
        // bulk read via socket (server does updateMany) — avoids N PATCH storm
        const s = getSocket();
        if (s?.connected) s.emit("message:read", { listingId });
        else {
          // fallback when socket not connected: mark via single bulk endpoint is covered by Inbox read-all
        }
      })(),
    ]).finally(() => setLoading(false));
  }, [listingId, withUser?.id, user?.id]);

  const fetchThread = useCallback(async () => {
    if (!listingId || !withUser?.id) return;
    const data = await getThread(listingId, withUser.id);
    setMsgs(data);
    const s = getSocket();
    if (s?.connected) s.emit("message:read", { listingId });
  }, [listingId, withUser?.id, user?.id]);

  // realtime: new message in thread — handles both full socket/pusher payload and SW push fallback
  const handleRealtimeMsg = useCallback((msg) => {
    // SW push fallback sends {title, body, url} not full message — trigger refetch only if URL matches this thread
    if (!msg || (!msg.listingId && !msg.senderId)) {
      try {
        if (msg?.url) {
          const u = new URL(msg.url, window.location.origin);
          if (u.searchParams.get("thread") !== `${listingId}-${withUser?.id}`) return;
        } else return;
      } catch { return; }
      // eslint-disable-next-line react-hooks/preserve-manual-memoization -- fetchThread stable via ref
      fetchThread();
      return;
    }
    if (msg.listingId !== listingId) return;
    const isRelevant = (msg.senderId === withUser?.id && msg.recipientId === user?.id) || (msg.senderId === user?.id && msg.recipientId === withUser?.id);
    if (!isRelevant) return;
    setMsgs((p) => p.some((m) => m.id === msg.id) ? p : [...p, msg]);
    if (msg.recipientId === user?.id) {
      const s = getSocket(); if (s?.connected) s.emit("message:delivered", { messageId: msg.id });
    }
  }, [listingId, withUser?.id, user?.id]);
  useRealtime("message", handleRealtimeMsg);
  useRealtime("message:unread", handleRealtimeMsg);

  useRealtime("typing", useCallback(({ from, listingId: lid, typing: t }) => {
    if (from !== withUser?.id || lid !== listingId) return;
    setTyping(t);
    if (t) {
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => setTyping(false), 2000);
    }
  }, [withUser?.id, listingId]));

  useRealtime("presence", useCallback(({ userId, online, lastSeen }) => {
    if (userId !== withUser?.id) return;
    setPresence({ online, lastSeen });
  }, [withUser?.id]));

  useRealtime("message:delivered", useCallback(({ messageId }) => {
    setMsgs((p) => p.map((m) => m.id === messageId ? { ...m, deliveredAt: new Date().toISOString() } : m));
  }, []));
  useRealtime("message:read", useCallback(({ messageId, listingId: lid }) => {
    if (lid && lid !== listingId) return;
    if (messageId) setMsgs((p) => p.map((m) => m.id === messageId ? { ...m, read: true } : m));
    else setMsgs((p) => p.map((m) => m.senderId === user?.id ? { ...m, read: true } : m));
  }, [listingId, user?.id]));

  useEffect(() => {
    connectSocket();
    // keep presence alive while chat is open (visible + 2min window)
    const s = getSocket();
    const ping = () => { try { const sock = getSocket(); if (sock?.connected) sock.emit("presence:ping"); } catch {} };
    ping();
    const onVis = () => { if (document.visibilityState === "visible") ping(); };
    document.addEventListener("visibilitychange", onVis);
    const id = setInterval(ping, 60 * 1000);
    return () => { document.removeEventListener("visibilitychange", onVis); clearInterval(id); };
  }, []);

  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [msgs, typing]);

  const sendTyping = (isTyping) => {
    const now = Date.now();
    if (isTyping && now - lastTypingSent.current < 800) return;
    lastTypingSent.current = now;
    const s = getSocket();
    if (s?.connected) s.emit(isTyping ? "typing:start" : "typing:stop", { to: withUser.id, listingId });
  };

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const handleSend = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError("");
    sendTyping(false);
    try {
      const msg = await sendMessage({ listingId, body, recipientId: withUser.id });
      setMsgs((p) => [...p, msg]);
      setText("");
    } catch (err) {
      setSendError(err.response?.data?.error || "Failed to send — tap to retry");
    } finally {
      setSending(false);
    }
  };

  const ticks = (m) => {
    if (m.senderId !== user?.id) return null;
    if (m.read) return <span className="text-sky-500 flex" title="Read — chat open by recipient"><FiCheck className="w-3 h-3" /><FiCheck className="w-3 h-3 -ml-1" /></span>;
    // double grey when delivered OR recipient is online (WhatsApp: delivered to device)
    if (m.deliveredAt || presence.online) return <span className="text-gray-400 flex" title={presence.online ? "Delivered — recipient online" : "Delivered"}><FiCheck className="w-3 h-3" /><FiCheck className="w-3 h-3 -ml-1" /></span>;
    return <FiCheck className="w-3 h-3 text-gray-400" title="Sent — recipient offline" />;
  };

  const inputRef = useRef(null);
  const [kbOffset, setKbOffset] = useState(0);
  // VisualViewport-anchored input — tracks keyboard offset directly, decoupled from page scroll
  // Header stays pinned via shrink-0 sticky top-0 inside fixed overlay; input is fixed to visual viewport
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKbOffset(offset);
      if (document.activeElement === inputRef.current) {
        requestAnimationFrame(() => {
          if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
        });
      }
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  const displayUser = withUser?.fullName || withUser?.username ? withUser : product?.seller || withUser;
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-hidden animate-pulse h-[100dvh]">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-gray-50 shrink-0 sticky top-0 z-10">
          {onClose && (
            <button onClick={onClose} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-700 shrink-0" aria-label="Back to chats">
              <FiArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
          <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="h-3 bg-gray-200 rounded w-1/3" />
            <div className="h-2 bg-gray-200 rounded w-1/4" />
          </div>
        </div>
        <div className="mx-4 mt-3 p-3 bg-gray-50 border border-gray-100 rounded-xl flex gap-3 items-center">
          <div className="w-14 h-14 bg-gray-200 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-2 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-3 bg-[#ECE5DD]/30">
          <div className="h-10 bg-white rounded-2xl w-3/4 ml-auto" />
          <div className="h-8 bg-white rounded-2xl w-1/2" />
          <div className="h-10 bg-white rounded-2xl w-2/3 ml-auto" />
        </div>
        <div className="p-3 border-t border-gray-100 flex gap-2">
          <div className="flex-1 h-10 bg-gray-100 rounded-lg" />
          <div className="w-16 h-10 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-hidden h-[100dvh]">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-gray-50 shrink-0 sticky top-0 z-10">
        {onClose && (
          <button onClick={onClose} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-700 shrink-0" aria-label="Back to chats">
            <FiArrowLeft className="w-4 h-4" /> Back
          </button>
        )}
        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700 overflow-hidden shrink-0">
          {displayUser?.avatar ? <img src={displayUser.avatar} alt={displayUser.username} className="w-full h-full object-cover" /> : <span>{displayUser?.fullName?.[0] || displayUser?.username?.[0] || "?"}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 flex items-center gap-2 truncate">
            {displayUser?.fullName || displayUser?.username || "Chat"}
            <span className={`w-2 h-2 rounded-full ${presence.online ? "bg-green-500" : "bg-gray-300"} shrink-0`} />
          </p>
          <p className="text-xs text-gray-500 truncate">{presence.online ? "Online" : presence.lastSeen ? `Last seen ${new Date(presence.lastSeen).toLocaleTimeString()}` : "Offline"} {typing && "· typing..."}</p>
        </div>
      </div>
      {product && (
        <Link to={`/listings/${product.slug || product.id}`} className="mx-4 mt-3 p-3 bg-white border border-gray-200 rounded-xl flex gap-3 items-center hover:border-primary-200 transition-colors shrink-0">
          {product.images?.[0] ? <img src={product.images[0]} alt={product.title} className="w-14 h-14 rounded-lg object-cover" /> : <div className="w-14 h-14 bg-gray-100 rounded-lg" />}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{product.title}</p>
            <p className="text-xs text-primary-600">₦{Number(product.price).toLocaleString()} · Tap to view product →</p>
          </div>
        </Link>
      )}
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-[#ECE5DD]/30 overscroll-contain scroll-smooth" style={{ paddingBottom: `calc(1rem + ${kbOffset ? kbOffset + 72 : 72}px)` }}>
        {msgs.map((m) => {
          const mine = m.senderId === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary-600 text-white rounded-br-sm" : "bg-white border border-gray-200 rounded-bl-sm"}`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <div className={`flex items-center gap-1 justify-end mt-1 text-[10px] ${mine ? "text-white/70" : "text-gray-400"}`}>
                  <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  {mine && ticks(m)}
                </div>
              </div>
            </div>
          );
        })}
        {typing && <div className="text-xs text-gray-500 italic">typing...</div>}
      </div>
      {sendError && <p className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100 shrink-0" style={{ marginBottom: kbOffset ? `${kbOffset + 56}px` : undefined }}>{sendError}</p>}
      <form onSubmit={handleSend} className="p-3 border-t border-gray-100 flex gap-2 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] fixed left-0 right-0 z-10" style={{ bottom: kbOffset ? `${kbOffset}px` : "0px" }}>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => { setText(e.target.value); e.target.value ? sendTyping(true) : sendTyping(false); }}
          onFocus={() => requestAnimationFrame(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; })}
          onBlur={() => sendTyping(false)}
          placeholder="Type a message"
          className="flex-1 input-field !py-2.5"
          disabled={sending}
          enterKeyHint="send"
        />
        <button type="submit" disabled={sending} className="btn-primary px-4 flex items-center gap-1 disabled:opacity-50 shrink-0"><FiSend className="w-4 h-4" /> {sending ? "..." : "Send"}</button>
      </form>
    </div>
  );
}
