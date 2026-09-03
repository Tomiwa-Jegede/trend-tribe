// src/pages/InboxPage.jsx — User inbox for Trend Tribe messages
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { FiMail, FiTrash2, FiCheckSquare, FiSquare, FiEye } from "react-icons/fi";
import { getMyMessages, markMessageRead, markAllMessagesRead, deleteMessage, deleteMessagesBulk, deleteAllMessages } from "../services/messageService";

const InboxPage = () => {
  const [messages, setMessages] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(() => new Set());
  const [selecting, setSelecting] = useState(false);
  const [expanded, setExpanded] = useState(null); // id

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyMessages({ limit: 20 });
      setMessages(data.messages);
      setPagination(data.pagination);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

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
      try { await markMessageRead(m.id); } catch {}
      setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, read: true } : x));
    }
  };

  const handleDeleteOne = async (e, id) => {
    e.stopPropagation();
    try { await deleteMessage(id); setMessages((prev) => prev.filter((x) => x.id !== id)); setSelected((p) => { const n = new Set(p); n.delete(id); return n; }); } catch {}
  };
  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} message${selected.size !== 1 ? "s" : ""}?`)) return;
    try { await deleteMessagesBulk(Array.from(selected)); setMessages((prev) => prev.filter((x) => !selected.has(x.id))); setSelected(new Set()); setSelecting(false); } catch {}
  };
  const handleDeleteAll = async () => {
    if (!window.confirm(`Delete all ${messages.length} messages?`)) return;
    try { await deleteAllMessages(); setMessages([]); setSelected(new Set()); setSelecting(false); } catch {}
  };
  const handleMarkAllRead = async () => {
    try { await markAllMessagesRead(); setMessages((prev) => prev.map((x) => ({ ...x, read: true }))); } catch {}
  };

  return (
    <div className="container-app py-6 sm:py-10">
      <Helmet><title>Inbox — Trend Tribe</title></Helmet>
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><FiMail className="w-6 h-6" /> Inbox {pagination && <span className="text-sm font-normal text-gray-500">({pagination.totalCount})</span>}</h1>
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
      ) : messages.length === 0 ? (
        <div className="card p-10 text-center">
          <FiMail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No messages yet</p>
          <p className="text-xs text-gray-400 mt-1">When admin sends a message or shares a product, it will appear here.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {messages.map((m) => {
              const isSelected = selected.has(m.id);
              const isExpanded = expanded === m.id;
              return (
                <div key={m.id} className={`card p-4 flex gap-3 ${!m.read ? "bg-primary-50/40 border-primary-100" : ""} ${isSelected ? "ring-2 ring-primary-200" : ""}`}>
                  {selecting && (
                    <button onClick={() => toggleSelect(m.id)} className="mt-1 flex-shrink-0" aria-label={isSelected ? "Deselect" : "Select"}>
                      {isSelected ? <FiCheckSquare className="w-5 h-5 text-primary-600" /> : <FiSquare className="w-5 h-5 text-gray-300" />}
                    </button>
                  )}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleOpen(m)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {m.subject && <p className="font-semibold text-sm text-gray-900 truncate">{m.subject}</p>}
                        <p className={`text-sm ${!m.read ? "font-medium text-gray-900" : "text-gray-700"} ${isExpanded ? "whitespace-pre-wrap break-words" : "truncate"}`}>
                          {isExpanded ? m.body : `${m.body.slice(0, 80)}${m.body.length > 80 ? "…" : ""}`}
                        </p>
                        {!isExpanded && m.body.length > 80 && <span className="text-xs text-primary-600">View →</span>}
                        <p className="text-xs text-gray-400 mt-1">{new Date(m.createdAt).toLocaleString()} · from {m.sender?.username || "Admin"}</p>
                      </div>
                      <span className="flex-shrink-0 mt-1">
                        {!m.read && <span className="w-2 h-2 bg-primary-600 rounded-full inline-block" />}
                      </span>
                    </div>
                    {m.listing && (
                      <Link to={`/listings/${m.listing.id}`} onClick={(e) => e.stopPropagation()} className="mt-3 flex items-center gap-3 bg-white border border-sage-100 rounded-xl p-3 hover:border-primary-200 transition-colors">
                        {m.listing.images?.[0] ? <img src={m.listing.images[0]} alt={m.listing.title} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" /> : <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">🛍️</div>}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{m.listing.title}</p>
                          <p className="text-xs text-primary-600">₦{Number(m.listing.price).toLocaleString()} · View listing →</p>
                        </div>
                      </Link>
                    )}
                    {isExpanded && (
                      <div className="mt-3 flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setExpanded(null); }} className="text-xs text-gray-500 hover:text-gray-700">Collapse</button>
                        {m.listing && <Link to={`/listings/${m.listing.id}`} className="text-xs text-primary-600 font-semibold inline-flex items-center gap-1"><FiEye className="w-3 h-3" /> View product</Link>}
                      </div>
                    )}
                  </div>
                  <button onClick={(e) => handleDeleteOne(e, m.id)} className="p-2 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-500 flex-shrink-0 self-start" aria-label="Delete">
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex items-center justify-between gap-2 border-t border-gray-100 pt-4 flex-wrap">
            {selecting ? (
              <>
                <button onClick={handleDeleteSelected} disabled={selected.size === 0} className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-40 flex items-center gap-1"><FiTrash2 className="w-4 h-4" /> Delete selected {selected.size ? `(${selected.size})` : ""}</button>
                <button onClick={handleDeleteAll} className="text-sm font-semibold text-red-600 hover:text-red-700">Delete all</button>
              </>
            ) : (
              <>
                <span className="text-xs text-gray-400">{messages.length} messages · {messages.filter((m) => !m.read).length} unread</span>
                <button onClick={handleDeleteAll} className="text-sm font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"><FiTrash2 className="w-4 h-4" /> Delete all</button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default InboxPage;
