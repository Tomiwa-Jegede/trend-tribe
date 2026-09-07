// src/pages/GigsPage.jsx — Gigs feed: post, claim free, confirm (80/20), cancel 5%, renew/refund, 72h auto-release
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import api from "../api/axios";
import { getGigs, createGig, claimGig, confirmGig, cancelGig, renewGig, refundExpiredGig, disputeGig, getMyGigs, withdrawGig, initGigPayment } from "../services/gigService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { FiClock, FiPhone, FiCheck, FiX, FiRefreshCw } from "react-icons/fi";

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

  const fetch = async () => {
    setLoading(true);
    try {
      const [feed, mine] = await Promise.all([getGigs({ limit: 24 }), getMyGigs().catch(()=>({posted:[],claimed:[],gigBalance:0}))]);
      setGigs(feed.gigs || []);
      setMy(mine);
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

      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1">
          <label className="text-xs font-semibold text-gray-500">Top up Gig wallet (Naira, buyable)</label>
          <input type="number" min="100" value={topupAmount} onChange={e=>setTopupAmount(e.target.value)} placeholder="500" className="input-field mt-1" />
        </div>
        <button onClick={handleTopup} className="btn-primary px-4 py-2 text-sm">Top up via Flutterwave</button>
        <form onSubmit={handleWithdraw} className="flex gap-2 items-end flex-wrap">
          <div><label className="text-xs font-semibold text-gray-500">Withdraw Naira</label><input type="number" min="1000" value={withdrawForm.amount} onChange={e=>setWithdrawForm(f=>({...f, amount:e.target.value}))} placeholder="1000" className="input-field mt-1 w-24" /></div>
          <div><label className="text-xs font-semibold text-gray-500">WhatsApp for payout</label><input value={withdrawForm.whatsapp} onChange={e=>setWithdrawForm(f=>({...f, whatsapp:e.target.value}))} placeholder="080..." className="input-field mt-1 w-32" /></div>
          <button type="submit" className="btn-secondary px-4 py-2 text-sm">Withdraw</button>
        </form>
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
