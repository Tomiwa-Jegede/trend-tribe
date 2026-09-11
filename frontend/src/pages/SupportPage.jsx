// SupportPage — user Contact Us thread (per-user, listingId=null)
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getSupportThread, contactSupport } from "../services/supportService";
import useRealtime from "../hooks/useRealtime";
import { FiSend } from "react-icons/fi";
import { Helmet } from "react-helmet-async";

export default function SupportPage() {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const listRef = useRef(null);

  const fetchThread = useCallback(async () => {
    setLoading(true);
    try { const data = await getSupportThread(); setMsgs(data || []); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchThread(); }, [fetchThread]);

  useRealtime("message", useCallback((msg) => {
    if (msg?.listingId !== null) return;
    const isRelevant = msg.senderId === user?.id || msg.recipientId === user?.id;
    if (!isRelevant) return;
    setMsgs(p => p.some(m=>m.id===msg.id) ? p : [...p, msg]);
  }, [user?.id]));
  useRealtime("support:claimed", fetchThread);

  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [msgs]);

  const handleSend = async (e) => {
    e.preventDefault();
    const body = text.trim(); if (!body) return;
    setText("");
    try {
      const msg = await contactSupport(body);
      setMsgs(p=>[...p, msg]);
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to send");
      setText(body);
    }
  };

  return (
    <div className="container-app py-6">
      <Helmet><title>Contact Support — Trend Tribe</title></Helmet>
      <h1 className="text-xl font-bold mb-4">Contact Us</h1>
      <p className="text-sm text-gray-500 mb-4">Type what you need — an admin will confirm and reply. Limit 3 per day.</p>
      <div className="border rounded-2xl overflow-hidden bg-white flex flex-col h-[60vh]">
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#ECE5DD]/30">
          {loading ? <p className="text-center text-gray-400 py-8">Loading...</p> : msgs.length===0 ? <p className="text-center text-gray-400 py-8">No messages yet — send your first.</p> : msgs.map(m=>{
            const mine = m.senderId === user?.id;
            return (
              <div key={m.id} className={`flex ${mine?"justify-end":"justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine?"bg-primary-600 text-white":"bg-white border"}`}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className="text-[10px] opacity-60 mt-1">{new Date(m.createdAt).toLocaleTimeString()}</p>
                </div>
              </div>
            );
          })}
        </div>
        <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
          <input value={text} onChange={e=>setText(e.target.value)} placeholder="Describe what you need..." className="flex-1 input-field !py-2.5" />
          <button type="submit" className="btn-primary px-4 flex items-center gap-1"><FiSend /> Send</button>
        </form>
      </div>
    </div>
  );
}
