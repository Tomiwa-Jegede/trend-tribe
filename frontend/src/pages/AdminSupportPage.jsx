// AdminSupportPage — admin queue for Contact Us (per-user listingId=null)
import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { listSupportThreads, confirmSupport, replySupport, getSupportThread } from "../services/supportService";
import useRealtime from "../hooks/useRealtime";
import { FiSend, FiCheck } from "react-icons/fi";
import api from "../api/axios";

export default function AdminSupportPage() {
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");

  const fetchThreads = useCallback(async () => {
    try { const t = await listSupportThreads(); setThreads(t || []); } catch {}
  }, []);
  useEffect(() => { fetchThreads(); }, [fetchThreads]);
  useRealtime("support:new", fetchThreads);
  useRealtime("support:claimed", fetchThreads);
  useRealtime("message", fetchThreads);

  const openThread = async (userId) => {
    setSelected(userId);
    try {
      const { data } = await api.get(`/admin/support/${userId}/thread`);
      setMsgs(data.messages || []);
    } catch {
      try {
        const { data } = await api.get(`/messages/thread`, { params: { with: userId } });
        setMsgs((data.messages||[]).filter(m=>m.listingId===null));
      } catch { setMsgs([]); }
    }
  };

  const handleConfirm = async (userId) => {
    try { await confirmSupport(userId); fetchThreads(); } catch (e) { alert(e?.response?.data?.error || "Confirm failed"); }
  };
  const handleReply = async (e) => {
    e.preventDefault();
    const body = text.trim(); if (!body || !selected) return;
    setText("");
    try { const msg = await replySupport(selected, body); setMsgs(p=>[...p, msg]); } catch (err) { alert(err?.response?.data?.error || "Reply failed"); setText(body); }
  };

  return (
    <div className="container-app py-6">
      <Helmet><title>Support — Admin</title></Helmet>
      <h1 className="text-xl font-bold mb-4">Support Inbox</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="border rounded-xl overflow-hidden bg-white">
          <div className="p-3 font-semibold border-b">Users ({threads.length})</div>
          <div className="divide-y max-h-[60vh] overflow-y-auto">
            {threads.map(t=>(
              <div key={t.userId} onClick={()=>openThread(t.userId)} className={`p-3 cursor-pointer hover:bg-gray-50 ${selected===t.userId?"bg-primary-50":""}`}>
                <p className="font-semibold text-sm">{t.user?.fullName || t.user?.username} <span className="text-xs text-gray-400">@{t.user?.username}</span></p>
                <p className="text-xs text-gray-500 truncate">{t.lastMessage?.body?.slice(0,60)}</p>
                <p className="text-[11px] text-gray-400">{t.claimedBy ? `Claimed by ${t.claimer?.username}` : "Unclaimed"} · {new Date(t.lastMessage.createdAt).toLocaleString()}</p>
                {!t.claimedBy && <button onClick={(e)=>{e.stopPropagation(); handleConfirm(t.userId);}} className="mt-1 text-xs bg-primary-600 text-white px-2 py-1 rounded-full flex items-center gap-1"><FiCheck /> Confirm</button>}
              </div>
            ))}
            {threads.length===0 && <p className="p-4 text-sm text-gray-400">No support threads</p>}
          </div>
        </div>
        <div className="md:col-span-2 border rounded-xl overflow-hidden bg-white flex flex-col h-[60vh]">
          {!selected ? <p className="p-8 text-center text-gray-400">Select a user to view thread</p> : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#ECE5DD]/30">
                {msgs.map(m=>(
                  <div key={m.id} className={`flex ${m.senderId===selected?"justify-start":"justify-end"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.senderId===selected?"bg-white border":"bg-primary-600 text-white"}`}>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleReply} className="p-3 border-t flex gap-2">
                <input value={text} onChange={e=>setText(e.target.value)} placeholder="Reply..." className="flex-1 input-field !py-2.5" />
                <button type="submit" className="btn-primary px-4"><FiSend /> Send</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
