// src/components/chat/ChatThread.jsx — WhatsApp-like thread per listing
import { useState, useEffect, useRef, useCallback } from "react";
import { FiSend, FiCheck, FiCheckCircle } from "react-icons/fi";
import { getThread, sendMessage, markMessageRead } from "../../services/messageService";
import { getListingById } from "../../services/listingService";
import { getSocket, connectSocket } from "../../services/socket";
import useRealtime from "../../hooks/useRealtime";
import { useAuth } from "../../context/AuthContext";

export default function ChatThread({ listingId, withUser, onClose }) {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState([]);
  const [product, setProduct] = useState(null);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [presence, setPresence] = useState({ online: false, lastSeen: null });
  const listRef = useRef(null);
  const typingTimeout = useRef(null);
  const lastTypingSent = useRef(0);

  useEffect(() => {
    if (!listingId) return;
    getListingById(listingId).then((d) => setProduct(d)).catch(() => {});
  }, [listingId]);

  const fetchThread = useCallback(async () => {
    if (!listingId || !withUser?.id) return;
    const data = await getThread(listingId, withUser.id);
    setMsgs(data);
    // mark read for incoming
    data.filter((m) => m.recipientId === user?.id && !m.read).forEach((m) => markMessageRead(m.id).catch(() => {}));
    // also socket read for listing
    const s = getSocket();
    if (s?.connected) s.emit("message:read", { listingId });
  }, [listingId, withUser?.id, user?.id]);

  useEffect(() => { fetchThread(); }, [fetchThread]);

  // realtime: new message in thread
  useRealtime("message", useCallback((msg) => {
    if (!msg?.listingId || msg.listingId !== listingId) return;
    const isRelevant = (msg.senderId === withUser?.id && msg.recipientId === user?.id) || (msg.senderId === user?.id && msg.recipientId === withUser?.id);
    if (!isRelevant) return;
    setMsgs((p) => p.some((m) => m.id === msg.id) ? p : [...p, msg]);
    if (msg.recipientId === user?.id) {
      const s = getSocket(); if (s?.connected) s.emit("message:delivered", { messageId: msg.id });
    }
  }, [listingId, withUser?.id, user?.id]));

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
    // initial presence fetch via REST could be here, but socket presence will push
  }, []);

  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [msgs, typing]);

  const sendTyping = (isTyping) => {
    const now = Date.now();
    if (isTyping && now - lastTypingSent.current < 800) return;
    lastTypingSent.current = now;
    const s = getSocket();
    if (s?.connected) s.emit(isTyping ? "typing:start" : "typing:stop", { to: withUser.id, listingId });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    sendTyping(false);
    try {
      const msg = await sendMessage({ listingId, body });
      setMsgs((p) => [...p, msg]);
    } catch {}
  };

  const ticks = (m) => {
    if (m.senderId !== user?.id) return null;
    if (m.read) return <span className="text-sky-500 flex"><FiCheck className="w-3 h-3" /><FiCheck className="w-3 h-3 -ml-1" /></span>;
    if (m.deliveredAt) return <span className="text-gray-400 flex"><FiCheck className="w-3 h-3" /><FiCheck className="w-3 h-3 -ml-1" /></span>;
    return <FiCheck className="w-3 h-3 text-gray-400" />;
  };

  return (
    <div className="flex flex-col h-[70vh] max-h-[600px] border border-gray-200 rounded-2xl overflow-hidden bg-white">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700">{withUser?.fullName?.[0] || withUser?.username?.[0] || "?"}</div>
          <div>
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              {withUser?.fullName || withUser?.username}
              <span className={`w-2 h-2 rounded-full ${presence.online ? "bg-green-500" : "bg-gray-300"}`} />
            </p>
            <p className="text-xs text-gray-500">{presence.online ? "Online" : presence.lastSeen ? `Last seen ${new Date(presence.lastSeen).toLocaleTimeString()}` : "Offline"} {typing && "· typing..."}</p>
          </div>
        </div>
        {onClose && <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Close</button>}
      </div>
      {product && (
        <div className="mx-4 mt-3 p-3 bg-white border border-gray-200 rounded-xl flex gap-3 items-center">
          {product.images?.[0] ? <img src={product.images[0]} alt={product.title} className="w-14 h-14 rounded-lg object-cover" /> : <div className="w-14 h-14 bg-gray-100 rounded-lg" />}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{product.title}</p>
            <p className="text-xs text-primary-600">₦{Number(product.price).toLocaleString()} · WhatsApp chat room</p>
          </div>
        </div>
      )}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#ECE5DD]/30">
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
      <form onSubmit={handleSend} className="p-3 border-t border-gray-100 flex gap-2 bg-white">
        <input
          value={text}
          onChange={(e) => { setText(e.target.value); e.target.value ? sendTyping(true) : sendTyping(false); }}
          onBlur={() => sendTyping(false)}
          placeholder="Type a message"
          className="flex-1 input-field !py-2.5"
        />
        <button type="submit" className="btn-primary px-4 flex items-center gap-1"><FiSend className="w-4 h-4" /> Send</button>
      </form>
    </div>
  );
}
