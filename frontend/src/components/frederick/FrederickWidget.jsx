// src/components/frederick/FrederickWidget.jsx

import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiMessageCircle, FiX, FiSend, FiShoppingBag, FiPaperclip } from "react-icons/fi";
import { askFrederick } from "../../services/frederickService";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import BuyTokens from "../ui/BuyTokens";

const FrederickWidget = () => {
  const { refreshUser, isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState(null); // File object
  const [pendingImagePreview, setPendingImagePreview] = useState(null); // object URL
 const [sessionId, setSessionId] = useState(null); // regenerated each time the widget is opened
  const [buyTokensOpen, setBuyTokensOpen] = useState(false);
  const fileInputRef = useRef(null);
    const ADMIN_INITIAL = {
      role: "frederick",
      text: "I'm Jegede — your data strategist. Type 'update' and I'll read all live numbers and tell you where we are and what to do next, in simple English.",
      products: [],
    };
    const SHOPPER_INITIAL = {
      role: "frederick",
      text: "How far, I'm Jegede 👋 Tell me what you're looking for and I'll find it for you.",
      products: [],
    };
    const INITIAL_MESSAGES = [isAdmin ? ADMIN_INITIAL : SHOPPER_INITIAL];
  const [idle, setIdle] = useState(false);
  useEffect(() => { if (open) { setIdle(false); return; } const t = setTimeout(() => setIdle(true), 4000); return () => clearTimeout(t); }, [open]);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);
  // ─── Close + reset session (used by every close trigger) ──────
  const closeWidget = () => {
    setOpen(false);
    setMessages(INITIAL_MESSAGES);
    setSessionId(null);
    setInput("");
    clearPendingImage();
  };
  // ─── Reset chat when the user logs out / role changes ─────
  useEffect(() => {
    if (!isAuthenticated) {
      setOpen(false);
      setMessages(INITIAL_MESSAGES);
      setSessionId(null);
    } else {
      setMessages([isAdmin ? ADMIN_INITIAL : SHOPPER_INITIAL]);
    }
  }, [isAuthenticated, isAdmin]);

  const clearPendingImage = () => {
    if (pendingImagePreview) {
      URL.revokeObjectURL(pendingImagePreview);
    }
    setPendingImage(null);
    setPendingImagePreview(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      e.target.value = "";
      return;
    }

    if (pendingImagePreview) {
      URL.revokeObjectURL(pendingImagePreview);
    }

    setPendingImage(file);
    setPendingImagePreview(URL.createObjectURL(file));
    e.target.value = ""; // allow re-selecting the same file later
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    // ── Admin: Jegede is Data Strategist — "update" gives real briefing (30s timeout for cold-start) ──
    const isUpdateCmd = isAdmin && trimmed.toLowerCase().includes("update");
    if (isUpdateCmd) {
      setMessages((prev) => [...prev, { role: "user", text: trimmed, products: [] }]);
      setInput("");
      setPendingImage(null);
      if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview);
      setPendingImagePreview(null);
      setLoading(true);
      try {
        let data;
        try {
          const res = await api.post("/jegede/update", { message: trimmed }, { timeout: 30000 });
          data = res.data;
        } catch (firstErr) {
          // cold-start retry once after 2s
          if (firstErr.code === "ECONNABORTED" || firstErr.response?.status >= 500) {
            await new Promise((r) => setTimeout(r, 2000));
            const res2 = await api.post("/jegede/update", { message: trimmed }, { timeout: 30000 });
            data = res2.data;
          } else throw firstErr;
        }
        const b = data.briefing;
        setMessages((prev) => [
          ...prev,
          {
            role: "frederick",
            text: b.snapshot + "\n\n" + b.progress,
            jegedeBriefing: b,
            generatedAt: data.generatedAt,
            meta: data.meta,
            products: [],
          },
        ]);
      } catch (err) {
        const isTimeout = err.code === "ECONNABORTED" || err.message?.includes("timeout");
        setMessages((prev) => [
          ...prev,
          { role: "frederick", text: isTimeout ? "Jegede is waking up (cold start ~20s) — please try 'update' again in a moment." : err.response?.data?.error || "Jegede could not build update right now. Try again.", products: [] },
        ]);
      } finally {
        setLoading(false);
      }
      return;
    }

    const imageToSend = pendingImage;
    const imagePreviewToSend = pendingImagePreview;
    setMessages((prev) => [
      ...prev,
      { role: "user", text: trimmed, products: [], imagePreview: imagePreviewToSend },
    ]);
    setInput("");
    setPendingImage(null);
    setPendingImagePreview(null); // don't revoke — the message list now owns this URL
    setLoading(true);

    try {
      const result = await askFrederick(trimmed, false, imageToSend, sessionId);

      if (!result.ok && result.needsTokenConfirm) {
        setMessages((prev) => [
          ...prev,
          {
            role: "frederick",
            text: result.error,
            products: [],
                       tokenConfirm:
              result.tokenBalance >= 1
                ? {
                    pendingMessage: trimmed,
                    pendingImage: imageToSend,
                    cost: 1,
                  }
                : null,
            needsTokens: result.tokenBalance < 1,
          },
        ]);      } else {
        setMessages((prev) => [
          ...prev,
          { role: "frederick", text: result.reply, products: result.products },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "frederick",
          text: "Sorry, I'm having trouble right now. Please try again in a moment.",
          products: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSpend = async (pendingMessage, pendingImage) => {
    setLoading(true);
    try {
      const result = await askFrederick(pendingMessage, true, pendingImage, sessionId);
      refreshUser();
      setMessages((prev) => [
        ...prev,
        { role: "frederick", text: result.reply, products: result.products || [] },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "frederick",
          text: "Sorry, I'm having trouble right now. Please try again in a moment.",
          products: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const [pos, setPos] = useState(() => {
    try { const v = localStorage.getItem("jegede-bubble-pos"); return v ? JSON.parse(v) : { x: 0, y: 0 }; } catch { return { x: 0, y: 0 }; }
  });
  const savePos = (next) => {
    setPos(next);
    try { localStorage.setItem("jegede-bubble-pos", JSON.stringify(next)); } catch {}
  };

  return (
    <>
      <motion.div
        drag={!open}
        dragMomentum={false}
        dragElastic={0.15}
        onDragEnd={(_, info) => {
          const next = { x: (pos?.x || 0) + info.offset.x, y: (pos?.y || 0) + info.offset.y };
          // clamp so bubble never leaves viewport (approx 56px size + 24px margin)
          const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
          const vw = window.innerWidth, vh = window.innerHeight;
          const clamped = {
            x: clamp(next.x, -vw + 80, 0),
            y: clamp(next.y, -vh + 80, 0),
          };
          savePos(clamped);
        }}
        style={{ x: pos?.x || 0, y: pos?.y || 0, willChange: "transform, opacity", touchAction: "none" }}
        onMouseEnter={() => setIdle(false)}
        animate={{ opacity: idle && !open ? 0.62 : 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 ${open ? "hidden sm:flex" : ""} hover:!opacity-100 cursor-grab active:cursor-grabbing`}
      >
        <AnimatePresence>
          {!open && !idle && (
            <motion.span
              initial={{ opacity: 0, x: 12, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 12, scale: 0.96 }}
              transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-white text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full
                         shadow-md border border-sage-100"
            >
              Ask Jegede
            </motion.span>
          )}
        </AnimatePresence>
             <motion.button
          onClick={() => {
            if (open) {
              closeWidget();
            } else {
              setOpen(true);
              setSessionId(crypto.randomUUID());
            }
          }}
          className="relative w-14 h-14 rounded-full text-white flex items-center justify-center
                     overflow-hidden transition-colors"
          style={{
            background:
              "radial-gradient(circle at 32% 28%, #4ade80, #16a34a 45%, #15803d 80%, #14532d 100%)",
            boxShadow:
              "0 8px 16px rgba(0,0,0,0.32), 0 3px 6px rgba(0,0,0,0.22), inset 0 -3px 5px rgba(0,0,0,0.3), inset 0 2px 2px rgba(255,255,255,0.25)",
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          aria-label={open ? "Close Jegede" : "Open Jegede"}
        >
          {open ? (
            <FiX className="w-6 h-6 relative z-10" />
          ) : (
            <img
              src="/jegede.jpeg"
              alt="Jegede"
              className="w-full h-full rounded-full object-cover relative z-10"
            />
          )}
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                "linear-gradient(160deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 40%)",
            }}
          />
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeWidget}
            className="fixed inset-0 z-[55] bg-black/20 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-6 z-[56] w-full h-full
                       sm:w-[92vw] sm:max-w-sm sm:h-[70vh] sm:max-h-[560px]
                       bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-sage-100
                       flex flex-col overflow-hidden"
          >
            <div className="bg-primary-600 text-white px-4 py-3 flex items-center gap-2">
              <FiShoppingBag className="w-5 h-5" />
              <div className="flex-1">
                <p className="font-semibold text-sm leading-tight">Jegede</p>
                <p className="text-xs text-primary-100 leading-tight">{isAdmin ? "Data Strategist — type 'update'" : "Your personal shopper"}</p>
              </div>
              <button
                onClick={closeWidget}
                className="sm:hidden w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                aria-label="Close Jegede"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-primary-600 text-white rounded-br-sm"
                        : "bg-sage-50 text-gray-700 rounded-bl-sm"
                    }`}
                  >
                    {m.imagePreview && (
                      <img
                        src={m.imagePreview}
                        alt="Sent attachment"
                        className="mb-1 max-h-32 rounded-lg object-cover"
                      />
                    )}
                    <p className="whitespace-pre-line">{m.text}</p>
                    {m.jegedeBriefing && (
                      <div className="mt-2 bg-white rounded-xl p-3 text-gray-800 text-xs leading-relaxed space-y-2 border border-sage-100">
                        <div><p className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">Diagnosis</p><p className="font-semibold">{m.jegedeBriefing.diagnosis}</p></div>
                        <div><p className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">Next move</p><p className="font-semibold text-primary-700">{m.jegedeBriefing.nextMove}</p></div>
                        <div className="grid grid-cols-1 gap-1.5">
                          <div className="bg-gray-50 rounded-lg p-2"><span className="font-bold text-gray-500">Funnel:</span> {m.jegedeBriefing.funnelInsight}</div>
                          <div className="bg-gray-50 rounded-lg p-2"><span className="font-bold text-gray-500">Money:</span> {m.jegedeBriefing.moneyInsight}</div>
                          <div className="bg-gray-50 rounded-lg p-2"><span className="font-bold text-gray-500">Trust:</span> {m.jegedeBriefing.trustInsight}</div>
                        </div>
                        {m.jegedeBriefing.risks?.length>0 && <div><p className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">Risks</p><ul className="list-disc ml-4 mt-1">{m.jegedeBriefing.risks.map((r,i)=><li key={i}>{r}</li>)}</ul></div>}
                        <p className="text-[10px] text-gray-400">Generated {m.generatedAt ? new Date(m.generatedAt).toLocaleString() : ""} · {m.meta?.source || "live"}</p>
                      </div>
                    )}
                   {m.tokenConfirm && (
                      <button
                        onClick={() =>
                          handleConfirmSpend(m.tokenConfirm.pendingMessage, m.tokenConfirm.pendingImage)
                        }
                        disabled={loading}
                        className="mt-2 text-xs font-medium text-primary-700 bg-white border border-primary-200 rounded-full px-3 py-1.5 hover:bg-primary-50 disabled:opacity-50"
                      >
                        {`Use ${m.tokenConfirm.cost} tokens — continue`}
                      </button>
                    )}
                    {m.needsTokens && (
                      <button
                        onClick={() => setBuyTokensOpen(true)}
                        className="mt-2 text-xs font-medium text-primary-700 bg-white border border-primary-200 rounded-full px-3 py-1.5 hover:bg-primary-50"
                      >
                        Buy more tokens
                      </button>
                    )}
                    {m.products?.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {m.products.map((p) => (
                          <Link
                            key={p.id}
                            to={`/listings/${p.slug || p.id}`}
                            onClick={closeWidget}
                            className="flex items-center gap-2 bg-white rounded-lg p-2 hover:bg-sage-100 transition-colors"
                          >
                            <div className="w-10 h-10 rounded-md bg-sage-100 overflow-hidden flex-shrink-0">
                              {p.image && (
                                <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-800 truncate">{p.title}</p>
                              <p className="text-xs text-primary-600 font-semibold">
                                ₦{p.price.toLocaleString()}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
                        {loading && (
                <div className="flex justify-start">
                  <div className="bg-sage-50 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                    <motion.span
                      className="w-2 h-2 rounded-full bg-gray-400"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    />
                    <motion.span
                      className="w-2 h-2 rounded-full bg-gray-400"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                    />
                    <motion.span
                      className="w-2 h-2 rounded-full bg-gray-400"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                    />
                  </div>
                </div>
              )}
            </div>

            {pendingImagePreview && (
              <div className="px-3 pt-2 flex items-center gap-2">
                <div className="relative inline-block">
                  <img
                    src={pendingImagePreview}
                    alt="Attached preview"
                    className="h-14 w-14 rounded-lg object-cover border border-sage-200"
                  />
                  <button
                    type="button"
                    onClick={clearPendingImage}
                    aria-label="Remove image"
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-700 text-white text-xs flex items-center justify-center hover:bg-gray-900"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <div className="border-t border-sage-100 p-2 flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach image"
                className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-sage-100 transition-colors flex-shrink-0"
              >
                <FiPaperclip className="w-4 h-4" />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isAdmin ? "Type 'update' for briefing..." : "What are you looking for?"}
                className="flex-1 text-sm px-3 py-2 rounded-full border border-sage-200
                           focus:outline-none focus:border-primary-400"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="w-9 h-9 rounded-full bg-primary-600 text-white flex items-center
                           justify-center disabled:opacity-40 hover:bg-primary-700 transition-colors flex-shrink-0"
                aria-label="Send"
              >
                <FiSend className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BuyTokens isOpen={buyTokensOpen} onClose={() => setBuyTokensOpen(false)} />
    </>
  );
};

export default FrederickWidget;