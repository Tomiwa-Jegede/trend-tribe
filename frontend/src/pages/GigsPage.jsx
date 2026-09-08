// src/pages/GigsPage.jsx — Post gig + feed only. Wallet (money) lives at /gigs/wallet
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { getGigs, createGig, claimGig, confirmGig, cancelGig, renewGig, refundExpiredGig, disputeGig, getMyGigs, getGigAccount } from "../services/gigService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { FiClock, FiCheck, FiX, FiRefreshCw, FiCopy, FiPlus } from "react-icons/fi";
import InfoModal from "../components/ui/InfoModal";

const formatNaira = (kobo) => `₦${(kobo / 100).toLocaleString()}`;

export default function GigsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get("view");
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [my, setMy] = useState(null);
  const [showPost, setShowPost] = useState(false);
  const [form, setForm] = useState({ description: "", whatsapp: user?.whatsapp || "", amount: "", timerHours: 24 });
  const [submitting, setSubmitting] = useState(false);


  const fetch = async () => {
    setLoading(true);
    try {
      const [feed, mine, acc] = await Promise.all([
        getGigs({ limit: 24 }),
        getMyGigs().catch(() => ({ posted: [], claimed: [] })),
        getGigAccount().catch(() => null),
      ]);
      setGigs(feed.gigs || []);
      setMy(mine);
    } catch (e) { toast.error(e.response?.data?.error || "Failed to load gigs"); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);
  useEffect(() => { if (user?.whatsapp) setForm(f=>({...f, whatsapp: user.whatsapp})); }, [user]);
  useEffect(() => { if (viewParam === "post") setShowPost(true); if (viewParam === "feed") setTimeout(()=>document.querySelector("[data-gigs-feed]")?.scrollIntoView({behavior:"smooth"}), 300); }, [viewParam]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.description.trim() || form.description.trim().length < 10) return toast.error("Description at least 10 chars");
    setSubmitting(true);
    try {
      await createGig({ description: form.description, whatsapp: form.whatsapp, amount: parseInt(form.amount,10), timerHours: parseInt(form.timerHours,10)||24 });
      toast.success("Gig posted — escrow locked.");
      setForm({ description: "", whatsapp: user?.whatsapp||"", amount: "", timerHours: 24 });
      setShowPost(false);
      fetch();
    } catch (err) { toast.error(err.response?.data?.error || "Could not post gig"); }
    finally { setSubmitting(false); }
  };

  const handleClaim = async (id) => {
    try { const res = await claimGig(id); toast.success("Claimed — WhatsApp: " + res.whatsapp); if (res.whatsapp) window.open(`https://wa.me/${res.whatsapp.replace(/\D/g,"")}`, "_blank"); fetch(); } catch (e) { toast.error(e.response?.data?.error || "Claim failed"); }
  };
  const handleConfirm = async (id) => {
    const g = gigs.find(x=>x.id===id) || my?.posted?.find(x=>x.id===id);
    const fee = g ? Math.floor(g.amount*0.2) : 0;
    const pay = g ? g.amount - fee : 0;
    if (!confirm(`Confirm gig "${g?.description?.slice(0,40)||id}"?\n\n80% ₦${(pay/100).toLocaleString()} will be sent to claimer\n20% fee ₦${(fee/100).toLocaleString()} retained by platform\n\nContinue?`)) return;
    try { const r=await confirmGig(id); toast.success(r.message); fetch(); } catch(e){ toast.error(e.response?.data?.error||"Confirm failed"); }
  };
  const handleCancel = async (id) => {
    const g = gigs.find(x=>x.id===id) || my?.posted?.find(x=>x.id===id);
    const fee = g ? Math.floor(g.amount*0.05) : 0;
    const refund = g ? g.amount - fee : 0;
    if(!confirm(`Cancel gig "${g?.description?.slice(0,40)||id}"?\n\n5% fee ₦${(fee/100).toLocaleString()} will be kept\n95% refund ₦${(refund/100).toLocaleString()} to your Gig wallet\n\nContinue?`)) return;
    try{ const r=await cancelGig(id); toast.success(r.message); fetch(); }catch(e){ toast.error(e.response?.data?.error||"Cancel failed"); }
  };
  const [disputeId, setDisputeId] = useState(null);
  const [disputeReason, setDisputeReason] = useState("NOT_DONE");
  const [disputeDesc, setDisputeDesc] = useState("");
  const [disputing, setDisputing] = useState(false);
  const openDispute = (id) => { setDisputeId(id); setDisputeReason("NOT_DONE"); setDisputeDesc(""); };
  const handleDispute = async () => {
    if (!disputeId) return;
    setDisputing(true);
    try { await disputeGig(disputeId, { reason: disputeReason, description: disputeDesc }); toast.success("Disputed — admin will review, auto-release paused"); setDisputeId(null); fetch(); } catch(e){ toast.error(e.response?.data?.error||"Dispute failed"); } finally { setDisputing(false); }
  };
  const handleRenew = async (id) => { try{ await renewGig(id); toast.success("Renewed"); fetch(); }catch(e){ toast.error(e.response?.data?.error||"Renew failed"); } };
  const handleRefund = async (id) => { try{ const r=await refundExpiredGig(id); toast.success(r.message); fetch(); }catch(e){ toast.error(e.response?.data?.error||"Refund failed"); } };

  return (
    <div className="container-app py-6 sm:py-8">
      <Helmet><title>Gigs — Trend Tribe</title></Helmet>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Gigs</h1>
            <InfoModal title="How Gigs work">
              <p>Post a task, someone claims it, you confirm when done.</p>
              <ul className="list-disc ml-5">
                <li><b>Post:</b> Your Naira is held safely (escrow) — not sent yet.</li>
                <li><b>Claim:</b> Anyone can claim for free and gets your WhatsApp to chat.</li>
                <li><b>Confirm:</b> When work is done, you tap Confirm — 80% goes to claimer, 20% is the platform fee.</li>
                <li><b>Cancel:</b> Before anyone claims, cancelling costs 5%, rest is refunded.</li>
                <li><b>Timer:</b> If no one claims before the timer ends, it expires — you can renew or get a full refund.</li>
                <li><b>Auto-release:</b> If claimed but you don't confirm in 72h, it auto-pays the claimer.</li>
              </ul>
              <p>Your Gig wallet is separate from marketplace tokens — no mixing.</p>
            </InfoModal>
          </div>
          {my && <p className="text-xs text-gray-500 mt-1">Posted {my.posted?.length||0} · Claimed {my.claimed?.length||0}</p>}
        </div>
        <button onClick={()=>setShowPost(v=>!v)} className="btn-primary px-6 py-3 rounded-2xl text-sm font-bold">Post Gig</button>
      </div>



      {showPost && (
        <form onSubmit={handleCreate} className="card p-5 sm:p-6 mb-6 space-y-4">
          <div className="flex items-center gap-2 pb-1">
            <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center">
              <FiPlus className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Post a Gig</h3>
              <p className="text-xs text-gray-500">Describe the task, set the price, and escrow locks it instantly.</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Task description</label>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f, description:e.target.value}))} placeholder="e.g. Help me carry load from market — 2 hours" rows={3} className="input-field mt-1.5" />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700">WhatsApp for this gig</label>
              <input value={form.whatsapp} onChange={e=>setForm(f=>({...f, whatsapp:e.target.value}))} placeholder="080..." className="input-field mt-1.5" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700">Amount ₦</label>
              <input type="number" min="100" value={form.amount} onChange={e=>setForm(f=>({...f, amount:e.target.value}))} placeholder="1000" className="input-field mt-1.5" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700">Timer (hours)</label>
              <input type="number" min="1" max="168" value={form.timerHours} onChange={e=>setForm(f=>({...f, timerHours:e.target.value}))} className="input-field mt-1.5" />
            </div>
          </div>
          <button type="submit" disabled={submitting} className="w-full btn-primary py-3 rounded-full text-sm font-bold disabled:opacity-60">
            {submitting?"Posting...":"Post Gig — lock escrow"}
          </button>
        </form>
      )}

      <div data-gigs-feed />
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
                {(g.posterId===user?.id || g.claimerId===user?.id) && g.status==="CLAIMED" && <><button onClick={()=>handleConfirm(g.id)} className="btn-primary px-3 py-1.5 text-xs"><FiCheck className="inline w-3 h-3"/> Confirm (send 80%)</button><button onClick={()=>openDispute(g.id)} className="btn-secondary px-3 py-1.5 text-xs">Dispute</button></>}
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

      {disputeId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={()=>setDisputeId(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl" onClick={e=>e.stopPropagation()}>
            <h3 className="font-bold text-gray-900">Log dispute</h3>
            <p className="text-xs text-gray-500 mt-1">Escrow held, admin will review. Auto-release paused.</p>
            <label className="text-xs font-semibold text-gray-700 mt-3 block">Reason</label>
            <select value={disputeReason} onChange={e=>setDisputeReason(e.target.value)} className="input-field mt-1">
              <option value="NOT_DONE">Not done / no-show</option>
              <option value="POOR_QUALITY">Poor quality</option>
              <option value="OTHER">Other</option>
            </select>
            <label className="text-xs font-semibold text-gray-700 mt-3 block">Details (optional)</label>
            <textarea value={disputeDesc} onChange={e=>setDisputeDesc(e.target.value)} rows={3} placeholder="Describe..." className="input-field mt-1" />
            <div className="flex gap-2 mt-4">
              <button onClick={()=>setDisputeId(null)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
              <button disabled={disputing} onClick={handleDispute} className="flex-1 btn-primary py-2.5 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-60">{disputing?"Submitting...":"Submit dispute"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
