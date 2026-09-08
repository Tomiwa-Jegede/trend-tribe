// src/pages/GigsPage.jsx — Gigs feed: post, claim free, confirm (80/20), cancel 5%, renew/refund, 72h auto-release
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import api from "../api/axios";
import { getGigs, createGig, claimGig, confirmGig, cancelGig, renewGig, refundExpiredGig, disputeGig, getMyGigs, withdrawGig, initGigPayment, getGigAccount, resolveGigAccount, transferGig, getGigTransfers } from "../services/gigService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { FiClock, FiPhone, FiCheck, FiX, FiRefreshCw, FiCopy, FiSend } from "react-icons/fi";

const formatNaira = (kobo) => `₦${(kobo/100).toLocaleString()}`;

export default function GigsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [my, setMy] = useState(null);
  const [showPost, setShowPost] = useState(false);
  const [form, setForm] = useState({ description: "", whatsapp: user?.whatsapp || "", amount: "", timerHours: 24 });
  const [submitting, setSubmitting] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", whatsapp: "" });
  const [topupAmount, setTopupAmount] = useState("");
  const [account, setAccount] = useState(null);
  const [transfers, setTransfers] = useState(null);
  const [transferForm, setTransferForm] = useState({ toAccount: "", amount: "", pin: "" });
  const [resolved, setResolved] = useState(null);
  const [transferring, setTransferring] = useState(false);
  const [hasPin, setHasPin] = useState(null);
  const [newPin, setNewPin] = useState("");
  const [pinSaving, setPinSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const [feed, mine, acc, tr, pinCheck] = await Promise.all([
        getGigs({ limit: 24 }),
        getMyGigs().catch(()=>({posted:[],claimed:[],gigBalance:0})),
        getGigAccount().catch(()=>null),
        getGigTransfers().catch(()=>({sent:[],received:[]})),
        api.get("/gigs/pin").then(r=>r.data).catch(()=>({hasPin: false})),
      ]);
      setGigs(feed.gigs || []);
      setMy(mine);
      if (acc) setAccount(acc);
      if (tr) setTransfers(tr);
      setHasPin(pinCheck.hasPin);
    } catch (e) { toast.error(e.response?.data?.error || "Failed to load gigs"); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);
  useEffect(() => { if (user?.whatsapp) setForm(f=>({...f, whatsapp: user.whatsapp})); }, [user]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.description.trim() || form.description.trim().length < 10) return toast.error("Description at least 10 chars");
    setSubmitting(true);
    try {
      await createGig({ description: form.description, whatsapp: form.whatsapp, amount: parseInt(form.amount,10), timerHours: parseInt(form.timerHours,10)||24 });
      toast.success("Gig posted — escrow locked. Show Naira value.");
      setForm({ description: "", whatsapp: user?.whatsapp||"", amount: "", timerHours: 24 });
      setShowPost(false);
      fetch();
    } catch (err) { toast.error(err.response?.data?.error || "Could not post gig"); }
    finally { setSubmitting(false); }
  };

  const handleClaim = async (id) => {
    try { const res = await claimGig(id); toast.success("Claimed — WhatsApp: " + res.whatsapp); if (res.whatsapp) window.open(`https://wa.me/${res.whatsapp.replace(/\D/g,"")}`, "_blank"); fetch(); } catch (e) { toast.error(e.response?.data?.error || "Claim failed"); }
  };
  const handleConfirm = async (id) => { try { const r=await confirmGig(id); toast.success(r.message); fetch(); } catch(e){ toast.error(e.response?.data?.error||"Confirm failed"); } };
  const handleCancel = async (id) => { if(!confirm("Cancel gig? 5% fee, 95% refund to Gig wallet.")) return; try{ const r=await cancelGig(id); toast.success(r.message); fetch(); }catch(e){ toast.error(e.response?.data?.error||"Cancel failed"); } };
  const handleRenew = async (id) => { try{ await renewGig(id); toast.success("Renewed"); fetch(); }catch(e){ toast.error(e.response?.data?.error||"Renew failed"); } };
  const handleRefund = async (id) => { try{ const r=await refundExpiredGig(id); toast.success(r.message); fetch(); }catch(e){ toast.error(e.response?.data?.error||"Refund failed"); } };
  const handleDispute = async (id) => { try{ await disputeGig(id); toast.success("Disputed — admin will review"); fetch(); }catch(e){ toast.error(e.response?.data?.error||"Dispute failed"); } };
  const handleTopup = async () => {
    const amt = parseInt(topupAmount,10);
    if(!amt || amt <100) return toast.error("Min ₦100");
    try{ const { authorizationUrl } = await initGigPayment(amt); window.location.href = authorizationUrl; }catch(e){ toast.error(e.response?.data?.error||"Top-up failed"); }
  };
  const handleWithdraw = async (e) => {
    e.preventDefault();
    try{ const r=await withdrawGig({ amount: parseInt(withdrawForm.amount,10), whatsapp: withdrawForm.whatsapp }); toast.success(r.message); setWithdrawForm({amount:"",whatsapp:""}); fetch(); }catch(err){ toast.error(err.response?.data?.error||"Withdraw failed"); }
  };

  const handleResolve = async () => {
    if (!/^\d{10}$/.test(transferForm.toAccount.trim())) return toast.error("Enter 10-digit account");
    try { const r = await resolveGigAccount(transferForm.toAccount.trim()); setResolved(r.user); } catch (e) { setResolved(null); toast.error(e.response?.data?.error || "Account not found"); }
  };
  const handleTransfer = async () => {
    if (!resolved) return toast.error("Resolve account first");
    const amt = parseInt(transferForm.amount,10);
    if (!amt || amt < 1) return toast.error("Enter amount");
    if (!/^\d{4}$/.test(transferForm.pin)) return toast.error("Enter 4-digit PIN");
    if (!confirm(`Confirm transfer of ₦${amt.toLocaleString()} to ${resolved.fullName} @${resolved.username}? Fee: ₦${(amt*0.0001).toFixed(2)} (0.01%)`)) return;
    setTransferring(true);
    try {
      const r = await transferGig({ toAccountNumber: transferForm.toAccount.trim(), amount: amt, pin: transferForm.pin });
      toast.success(r.message);
      setTransferForm({ toAccount: "", amount: "", pin: "" });
      setResolved(null);
      fetch();
    } catch (e) { toast.error(e.response?.data?.error || "Transfer failed"); }
    finally { setTransferring(false); }
  };
  const handleSetPin = async () => {
    if (!/^\d{4}$/.test(newPin)) return toast.error("PIN must be 4 digits");
    setPinSaving(true);
    try { await api.post("/gigs/pin", { pin: newPin }); toast.success("PIN set — you will need it to confirm transfers"); setHasPin(true); setNewPin(""); } catch(e){ toast.error(e.response?.data?.error || "Could not set PIN"); }
    finally { setPinSaving(false); }
  };

  return (
    <div className="container-app py-6 sm:py-8">
      <Helmet><title>Gigs — Trend Tribe</title></Helmet>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Gigs</h1>
          <p className="text-sm text-gray-600 mt-1">Post a task, escrow Naira, claim free, confirm releases 80% to claimer (20% fee), 5% cancel fee, 72h auto-release. Gig wallet separate from marketplace tokens — no conversion.</p>
          {my && <p className="text-xs text-gray-500 mt-1">Gig wallet: <b>{formatNaira(my.gigBalance)}</b> · Posted {my.posted?.length||0} · Claimed {my.claimed?.length||0}</p>}
        </div>
        <button onClick={()=>setShowPost(v=>!v)} className="btn-primary px-6 py-3 rounded-2xl text-sm font-bold">Post Gig</button>
      </div>

      {/* ── OPay-style Wallet Home ── */}
      <div className="mb-6">
        <div className="rounded-3xl p-6 sm:p-7 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0F1F3D 0%, #1340B8 60%, #2D5BFF 100%)" }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full blur-xl" />
          <p className="text-xs font-semibold tracking-widest uppercase opacity-70">Gig Wallet Balance</p>
          <p className="text-4xl sm:text-5xl font-extrabold mt-2 tracking-tight">{account ? formatNaira(account.gigBalance ?? my?.gigBalance ?? 0) : "—"}</p>
          <div className="mt-5 flex items-center gap-2">
            <p className="text-xs opacity-70">Account</p>
            <p className="font-mono text-lg tracking-widest font-bold">{account?.accountNumber || "••••••••••"}</p>
            <button onClick={async()=>{ if(!account?.accountNumber) return; await navigator.clipboard.writeText(account.accountNumber); toast.success("Account number copied"); }} className="ml-2 w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"><FiCopy className="w-4 h-4" /></button>
          </div>
          <button onClick={()=>document.getElementById("transfer-screen")?.scrollIntoView({behavior:"smooth"})} className="mt-6 bg-white text-navy-900 font-bold px-8 py-3 rounded-full text-sm shadow-lg hover:bg-gray-50 transition-colors inline-flex items-center gap-2"><FiSend className="w-4 h-4"/> Transfer</button>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:flex gap-3">
          <div className="flex-1 card p-3 flex items-center gap-3">
            <div className="flex-1"><label className="text-xs font-semibold text-gray-500">Top up</label><div className="flex gap-2 mt-1"><input type="number" min="100" value={topupAmount} onChange={e=>setTopupAmount(e.target.value)} placeholder="500" className="input-field flex-1 text-sm" /><button onClick={handleTopup} className="btn-primary px-3 py-2 text-xs">Top up</button></div></div>
          </div>
          <form onSubmit={handleWithdraw} className="flex-1 card p-3 flex gap-2 items-end">
            <div className="flex-1"><label className="text-xs font-semibold text-gray-500">Withdraw</label><div className="flex gap-2 mt-1"><input type="number" min="1000" value={withdrawForm.amount} onChange={e=>setWithdrawForm(f=>({...f, amount:e.target.value}))} placeholder="1000" className="input-field flex-1 text-sm" /><input value={withdrawForm.whatsapp} onChange={e=>setWithdrawForm(f=>({...f, whatsapp:e.target.value}))} placeholder="080..." className="input-field flex-1 text-sm" /><button type="submit" className="btn-secondary px-3 py-2 text-xs">Withdraw</button></div></div>
          </form>
        </div>
        {(hasPin===false || hasPin===true) && (
          <div className="mt-3">
            {hasPin===false ? (
              <div className="flex gap-2 items-end p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex-1"><label className="text-xs font-semibold text-amber-800">Set 4-digit transfer PIN first</label><input type="password" maxLength={4} inputMode="numeric" value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="1234" className="input-field mt-1" /></div>
                <button onClick={handleSetPin} disabled={pinSaving} className="btn-primary px-4 py-2 text-sm disabled:opacity-60">{pinSaving?"Saving...":"Set PIN"}</button>
              </div>
            ) : (
              <div className="flex gap-2 items-end">
                <div><label className="text-xs font-semibold text-gray-500">Change PIN</label><div className="flex gap-2 mt-1"><input type="password" maxLength={4} inputMode="numeric" value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="New 4-digit" className="input-field w-28 text-sm" /><button onClick={handleSetPin} disabled={pinSaving} className="btn-secondary px-3 py-2 text-sm disabled:opacity-60">Update</button></div></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Transfer Screen — OPay style: account on top, auto name, amount, single confirm ── */}
      <div id="transfer-screen" className="card p-5 sm:p-6 mb-6">
        <h3 className="font-bold text-gray-900 mb-1">Transfer</h3>
        <p className="text-xs text-gray-500 mb-4">Enter 10-digit account, recipient shows automatically, then amount and PIN to send — 0.01% fee.</p>
        <div className="max-w-md mx-auto space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-700">Account number</label>
            <input
              value={transferForm.toAccount}
              onChange={async (e)=>{
                const v = e.target.value.replace(/\D/g,"").slice(0,10);
                setTransferForm(f=>({...f, toAccount: v}));
                if (/^\d{10}$/.test(v)) {
                  try { const r = await resolveGigAccount(v); setResolved(r.user); } catch { setResolved(null); }
                } else setResolved(null);
              }}
              placeholder="8091234567"
              maxLength={10}
              inputMode="numeric"
              className="input-field mt-1 text-lg tracking-widest font-mono"
            />
            {resolved ? <p className="text-sm text-green-600 mt-2 font-medium">→ {resolved.fullName} <span className="text-gray-500">@{resolved.username}</span></p> : transferForm.toAccount.length===10 ? <p className="text-xs text-red-500 mt-1">Account not found</p> : <p className="text-xs text-gray-400 mt-1">Enter 10 digits to see name</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Amount ₦</label>
            <input type="number" min="1" value={transferForm.amount} onChange={e=>setTransferForm(f=>({...f, amount:e.target.value}))} placeholder="500" className="input-field mt-1 text-lg" />
            <p className="text-xs text-gray-500 mt-1">Fee 0.01% · {transferForm.amount ? `₦${(parseInt(transferForm.amount,10)*0.0001).toFixed(2)}` : "—"} · Total ₦{transferForm.amount ? (parseInt(transferForm.amount,10) + parseInt(transferForm.amount,10)*0.0001).toFixed(2) : "—"}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">PIN</label>
            <input type="password" maxLength={4} inputMode="numeric" value={transferForm.pin} onChange={e=>setTransferForm(f=>({...f, pin:e.target.value.replace(/\D/g,"").slice(0,4)}))} placeholder="••••" className="input-field mt-1 tracking-widest text-lg" />
          </div>
          <button disabled={transferring || !resolved || !transferForm.amount} onClick={handleTransfer} className="w-full btn-primary py-3 text-base font-bold rounded-full flex items-center justify-center gap-2 disabled:opacity-60"><FiSend className="w-5 h-5"/> {transferring?"Sending...":"Confirm & Send"}</button>
          {transfers && (transfers.sent?.length>0 || transfers.received?.length>0) && (
            <div className="pt-4 border-t border-gray-100 grid sm:grid-cols-2 gap-4 text-xs">
              <div><p className="font-semibold text-gray-700 mb-1">Sent</p>{transfers.sent?.length===0?<p className="text-gray-400">No sent yet</p>:transfers.sent.slice(0,5).map(t=> <div key={t.id} className="flex justify-between border-b border-gray-50 py-1.5"><span>→ {t.toUser?.username} ₦{(t.amount/100).toLocaleString()}<span className="text-gray-400"> fee ₦{(t.fee/100).toFixed(2)}</span></span><span className="text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</span></div>)}</div>
              <div><p className="font-semibold text-gray-700 mb-1">Received</p>{transfers.received?.length===0?<p className="text-gray-400">No received yet</p>:transfers.received.slice(0,5).map(t=> <div key={t.id} className="flex justify-between border-b border-gray-50 py-1.5"><span>← {t.fromUser?.username} ₦{(t.amount/100).toLocaleString()}</span><span className="text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</span></div>)}</div>
            </div>
          )}
        </div>
      </div>

      {showPost && (
        <form onSubmit={handleCreate} className="card p-5 mb-6 space-y-3">
          <textarea value={form.description} onChange={e=>setForm(f=>({...f, description:e.target.value}))} placeholder="Task description (e.g. Help me carry load from market — 2 hours)" rows={3} className="input-field" />
          <div className="grid sm:grid-cols-3 gap-3">
            <div><label className="text-xs font-semibold text-gray-500">Per-gig WhatsApp</label><input value={form.whatsapp} onChange={e=>setForm(f=>({...f, whatsapp:e.target.value}))} placeholder="080..." className="input-field mt-1" /></div>
            <div><label className="text-xs font-semibold text-gray-500">Amount ₦ (Naira)</label><input type="number" min="100" value={form.amount} onChange={e=>setForm(f=>({...f, amount:e.target.value}))} placeholder="1000" className="input-field mt-1" /></div>
            <div><label className="text-xs font-semibold text-gray-500">Timer hours</label><input type="number" min="1" max="168" value={form.timerHours} onChange={e=>setForm(f=>({...f, timerHours:e.target.value}))} className="input-field mt-1" /></div>
          </div>
          <p className="text-xs text-gray-500">On post, full amount deducted to escrow. Show Naira value. Claim is free. Confirm releases 80% to claimer. Cancel before claim costs 5%.</p>
          <button type="submit" disabled={submitting} className="btn-primary px-6 py-2 text-sm disabled:opacity-60">{submitting?"Posting...":"Post Gig — lock escrow"}</button>
        </form>
      )}

      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div> : gigs.length===0 ? <div className="text-center py-16 card text-gray-500">No open gigs — post one.</div> : (
        <div className="grid gap-4">
          {gigs.map(g=> (
            <div key={g.id} className="card p-4">
              <p className="font-semibold text-gray-900 break-words">{g.description}</p>
              <p className="text-sm text-primary-600 font-extrabold mt-1">{formatNaira(g.amount)} · {g.status} · <FiClock className="inline w-3 h-3"/> {new Date(g.expiresAt).toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">By @{g.poster?.username} · {new Date(g.createdAt).toLocaleDateString()} · Claim free, WhatsApp hidden until claimed</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                {g.status==="OPEN" && <button onClick={()=>handleClaim(g.id)} className="btn-primary px-4 py-1.5 text-xs">Claim — get WhatsApp</button>}
                {g.posterId===user?.id && g.status==="OPEN" && <button onClick={()=>handleCancel(g.id)} className="btn-secondary px-3 py-1.5 text-xs"><FiX className="inline w-3 h-3"/> Cancel (5% fee)</button>}
                {g.posterId===user?.id && g.status==="CLAIMED" && <><button onClick={()=>handleConfirm(g.id)} className="btn-primary px-3 py-1.5 text-xs"><FiCheck className="inline w-3 h-3"/> Confirm (send 80%)</button><button onClick={()=>handleDispute(g.id)} className="btn-secondary px-3 py-1.5 text-xs">Dispute</button></>}
                {g.posterId===user?.id && g.status==="EXPIRED" && <><button onClick={()=>handleRenew(g.id)} className="btn-secondary px-3 py-1.5 text-xs"><FiRefreshCw className="inline w-3 h-3"/> Renew</button><button onClick={()=>handleRefund(g.id)} className="btn-primary px-3 py-1.5 text-xs">Refund in full</button></>}
              </div>
            </div>
          ))}
        </div>
      )}

      {my?.posted?.length>0 && (
        <div className="mt-8">
          <h2 className="font-bold text-gray-900 mb-3">My Posted</h2>
          <div className="grid gap-3">
            {my.posted.map(g=> <div key={`p-${g.id}`} className="card p-3 text-sm"><p className="font-medium">{g.description.slice(0,80)}</p><p className="text-xs text-gray-500">{formatNaira(g.amount)} · {g.status} · {g.status==="CLAIMED"?"72h auto-release if not confirmed": new Date(g.expiresAt).toLocaleString()}</p></div>)}
          </div>
        </div>
      )}
    </div>
  );
}
