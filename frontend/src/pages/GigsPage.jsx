// src/pages/GigsPage.jsx — Wallet (OPay card) + Transfer (3-step + receipt) + Feed
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { getGigs, createGig, claimGig, confirmGig, cancelGig, renewGig, refundExpiredGig, disputeGig, getMyGigs, withdrawGig, initGigPayment, getGigAccount, resolveGigAccount, transferGig, getGigTransfers } from "../services/gigService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { FiClock, FiCheck, FiX, FiRefreshCw, FiCopy, FiSend, FiPlus } from "react-icons/fi";
import InfoModal from "../components/ui/InfoModal";
import api from "../api/axios";

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
  const [topupAmount, setTopupAmount] = useState("");
  const [account, setAccount] = useState(null);
  const [transfers, setTransfers] = useState(null);
  const [hasPin, setHasPin] = useState(null);
  const [newPin, setNewPin] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinOtp, setPinOtp] = useState("");
  const [pinOtpSent, setPinOtpSent] = useState(false);
  const [pinOtpSending, setPinOtpSending] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [pendingNewPin, setPendingNewPin] = useState("");
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferStep, setTransferStep] = useState(1);
  const [transferResult, setTransferResult] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [transferForm, setTransferForm] = useState({ toAccount: "", amount: "", pin: "" });
  const [resolved, setResolved] = useState(null);
  const [transferring, setTransferring] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", bankCode: "044", accountNumber: "", pin: "" });
  const [banks, setBanks] = useState([]);

  const fetch = async () => {
    setLoading(true);
    try {
      const [feed, mine, acc, tr, pinCheck] = await Promise.all([
        getGigs({ limit: 24 }),
        getMyGigs().catch(() => ({ posted: [], claimed: [] })),
        getGigAccount().catch(() => null),
        getGigTransfers().catch(() => ({ sent: [], received: [] })),
        api.get("/gigs/pin").then(r=>r.data).catch(()=>({hasPin:false})),
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
  useEffect(() => { if (viewParam === "post") setShowPost(true); if (viewParam === "feed") setTimeout(()=>document.querySelector("[data-gigs-feed]")?.scrollIntoView({behavior:"smooth"}), 300); }, [viewParam]);
  // Handle Flutterwave callback for gig wallet top-up: ?reference=gt_...&transaction_id=... or ?status=successful
  useEffect(() => {
    const ref = searchParams.get("reference") || searchParams.get("tx_ref");
    const txId = searchParams.get("transaction_id") || searchParams.get("transactionId");
    if (ref && ref.startsWith("gt_")) {
      (async () => {
        try {
          const r = await verifyGigPayment(ref, txId || ref);
          if (r.status === "SUCCESS") { toast.success(`Top-up successful — ₦${(r.amount/100).toLocaleString()} added to Gig wallet`); fetch(); }
          else if (r.status === "PENDING") toast.info("Top-up pending — will reflect after Flutterwave confirms");
          else toast.error("Top-up not completed");
        } catch (e) { toast.error(e.response?.data?.error || "Could not verify top-up"); }
        // clean URL
        window.history.replaceState({}, "", "/gigs");
      })();
    }
  }, [searchParams]);
  useEffect(() => {
    // fetch banks via backend so all banks including OPay, Kuda, Moniepoint show
    api.get("/gigs/banks").then(r=>{ if(r.data?.banks) setBanks(r.data.banks); }).catch(()=>{
      setBanks([{code:"044", name:"Access Bank"}, {code:"058", name:"GTBank"}, {code:"011", name:"First Bank"}, {code:"033", name:"UBA"}, {code:"057", name:"Zenith Bank"}, {code:"999992", name:"OPay"}, {code:"50211", name:"Kuda Bank"}, {code:"50515", name:"Moniepoint"}, {code:"999991", name:"PalmPay"}]);
    });
  }, []);

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
    if (!/^\d{4}$/.test(withdrawForm.pin)) return toast.error("Enter 4-digit PIN");
    try{ const r=await withdrawGig({ amount: parseInt(withdrawForm.amount,10), bankCode: withdrawForm.bankCode, accountNumber: withdrawForm.accountNumber, pin: withdrawForm.pin }); toast.success(r.message); setWithdrawForm({amount:"", bankCode:"044", accountNumber:"", pin:""}); fetch(); }catch(err){ toast.error(err.response?.data?.error||"Withdraw failed"); }
  };
  const handleSetPin = async () => {
    if (!/^\d{4}$/.test(newPin)) return toast.error("PIN must be 4 digits");
    setPinSaving(true);
    try { await api.post("/gigs/pin", { pin: newPin }); toast.success("PIN set — you will need it to confirm transfers & withdrawals"); setHasPin(true); setNewPin(""); } catch(e){ toast.error(e.response?.data?.error || "Could not set PIN"); }
    finally { setPinSaving(false); }
  };
  const handleTransfer = async () => {
    if (!resolved) return toast.error("Resolve account first");
    const amt = parseInt(transferForm.amount,10);
    if (!amt || amt < 1) return toast.error("Enter amount");
    if (!/^\d{4}$/.test(transferForm.pin)) return toast.error("Enter 4-digit PIN");
    setTransferring(true);
    try {
      const r = await transferGig({ toAccountNumber: transferForm.toAccount.trim(), amount: amt, pin: transferForm.pin });
      setTransferResult({ success: true, amount: amt, fee: r.fee, reference: r.transfer?.reference || r.transfer?.id, recipient: resolved, message: r.message });
      setTransferStep(4);
      toast.success(r.message);
      fetch();
    } catch (e) {
      const errMsg = e.response?.data?.error || "Transfer failed";
      setTransferResult({ success: false, amount: amt, error: errMsg, recipient: resolved });
      setTransferStep(4);
      toast.error(errMsg);
    } finally { setTransferring(false); }
  };
  const handleDownloadReceipt = async () => {
    if (!transferResult?.success) return;
    const canvas = document.createElement("canvas");
    canvas.width = 800; canvas.height = 500;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0F1F3D"; ctx.fillRect(0,0,800,500);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 32px sans-serif"; ctx.fillText("Trend Tribe — Gig Transfer Receipt", 40, 60);
    ctx.font = "20px sans-serif"; ctx.fillText(`Amount: ₦${transferResult.amount.toLocaleString()}`, 40, 140);
    ctx.fillText(`Fee (1%): ₦${(transferResult.fee/100).toFixed(2)}`, 40, 180);
    ctx.fillText(`To: ${transferResult.recipient.fullName} @${transferResult.recipient.username}`, 40, 220);
    ctx.fillText(`Account: ${transferForm.toAccount}`, 40, 260);
    ctx.fillText(`Ref: ${transferResult.reference || "—"}`, 40, 300);
    ctx.fillText(`Date: ${new Date().toLocaleString()}`, 40, 340);
    ctx.fillStyle = "#2D5BFF"; ctx.fillRect(40, 380, 720, 60);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 18px sans-serif"; ctx.fillText("Thank you for using Trend Tribe", 260, 415);
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a"); a.href = url; a.download = `receipt-${transferResult.reference || Date.now()}.png`; a.click();
  };

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

      {/* ── Wallet Home — OPay card ── */}
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
          <div className="mt-6 flex gap-3">
            <button onClick={()=>{ setShowTransfer(true); setTransferStep(1); setTransferResult(null); setShowHistory(false); }} className="flex-1 bg-white text-navy-900 font-bold px-6 py-3 rounded-full text-sm shadow-lg hover:bg-gray-50 transition-colors inline-flex items-center justify-center gap-2"><FiSend className="w-4 h-4"/> Transfer</button>
            <button onClick={()=>{ setShowHistory(v=>!v); setShowTransfer(false); }} className="flex-1 bg-white/15 text-white font-bold px-6 py-3 rounded-full text-sm border border-white/20 hover:bg-white/25 transition-colors">{showHistory?"Hide History":"Transfer History"}</button>
          </div>
          {showHistory && (
            <div className="mt-6 pt-5 border-t border-white/15">
              <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-white text-sm">Transfer History</h3><button onClick={()=>setShowHistory(false)} className="text-xs text-white/70 hover:text-white">Close</button></div>
              {transfers ? (
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div><p className="font-semibold text-white/90 mb-2 text-xs">Sent</p>{transfers.sent?.length===0?<p className="text-white/50 text-xs">No sent yet</p>:transfers.sent.slice(0,5).map(t=> <div key={t.id} className="flex justify-between border-b border-white/10 py-2 text-white/90"><span>→ {t.toUser?.username} <b>₦{(t.amount/100).toLocaleString()}</b><span className="text-white/50"> fee ₦{(t.fee/100).toFixed(2)}</span></span><span className="text-white/50 text-xs">{new Date(t.createdAt).toLocaleDateString()}</span></div>)}</div>
                  <div><p className="font-semibold text-white/90 mb-2 text-xs">Received</p>{transfers.received?.length===0?<p className="text-white/50 text-xs">No received yet</p>:transfers.received.map(t=> <div key={t.id} className="flex justify-between border-b border-white/10 py-2 text-white/90"><span>← {t.fromUser?.username} <b>₦{(t.amount/100).toLocaleString()}</b></span><span className="text-white/50 text-xs">{new Date(t.createdAt).toLocaleDateString()}</span></div>)}</div>
                </div>
              ) : <p className="text-sm text-white/70">Loading...</p>}
            </div>
          )}
        </div>
        <div className="mt-4 grid grid-cols-1 sm:flex gap-3">
          <div className="flex-1 card p-3"><label className="text-xs font-semibold text-gray-500">Top up</label><div className="flex gap-2 mt-1"><input type="number" min="100" value={topupAmount} onChange={e=>setTopupAmount(e.target.value)} placeholder="500" className="input-field flex-1 text-sm" /><button onClick={handleTopup} className="btn-primary px-3 py-2 text-xs">Top up</button></div></div>
          <form onSubmit={handleWithdraw} className="flex-1 card p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-700">Withdraw to bank</p>
            <div className="flex gap-2">
              <input type="number" min="1000" value={withdrawForm.amount} onChange={e=>setWithdrawForm(f=>({...f, amount:e.target.value}))} placeholder="1000" className="input-field flex-1 text-sm" />
              <input value={withdrawForm.accountNumber} onChange={e=>setWithdrawForm(f=>({...f, accountNumber:e.target.value.replace(/\D/g,"").slice(0,10)}))} placeholder="Account 809..." maxLength={10} className="input-field flex-1 text-sm font-mono" />
            </div>
            <div className="flex gap-2">
              <select value={withdrawForm.bankCode} onChange={e=>setWithdrawForm(f=>({...f, bankCode:e.target.value}))} className="input-field flex-1 text-sm"><option value="">Bank</option>{banks.map(b=> <option key={b.code} value={b.code}>{b.name}</option>)}</select>
              <input type="password" maxLength={4} inputMode="numeric" value={withdrawForm.pin} onChange={e=>setWithdrawForm(f=>({...f, pin:e.target.value.replace(/\D/g,"").slice(0,4)}))} placeholder="PIN" className="input-field w-20 text-sm" />
              <button type="submit" className="btn-secondary px-3 py-2 text-xs">Withdraw</button>
            </div>
            <p className="text-[10px] text-gray-400">Min ₦1000 · 1% fee</p>
          </form>
        </div>
        {(hasPin===false || hasPin===true) && (
          <div className="mt-3">
            {hasPin===false ? (
              <div className="flex gap-2 items-end p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex-1"><label className="text-xs font-semibold text-amber-800">Set 4-digit transfer PIN first</label><input type="password" maxLength={4} inputMode="numeric" value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="1234" className="input-field mt-1" /></div>
                <button onClick={async()=>{ if(!/^\d{4}$/.test(newPin)) return toast.error("PIN must be 4 digits"); setPinSaving(true); try{ await api.post("/gigs/pin", {pin:newPin}); toast.success("PIN set — you will need it to confirm transfers"); setHasPin(true); setNewPin(""); }catch(e){ toast.error(e.response?.data?.error||"Could not set PIN"); } finally{ setPinSaving(false); } }} disabled={pinSaving} className="btn-primary px-4 py-2 text-sm disabled:opacity-60">{pinSaving?"Saving...":"Set PIN"}</button>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-xs font-semibold text-gray-700 mb-2">Change PIN — OTP required</p>
                <div className="flex gap-2 items-end">
                  <div className="flex-1"><label className="text-xs text-gray-500">New PIN (4-digit)</label><input type="password" maxLength={4} inputMode="numeric" value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="••••" className="input-field mt-1 w-28 text-sm" disabled={pinOtpSent} /></div>
                  <button
                    onClick={async()=>{
                      if(!/^\d{4}$/.test(newPin)) return toast.error("Enter new 4-digit PIN first");
                      setPinOtpSending(true);
                      try{ await api.post("/gigs/pin/request-otp"); toast.success("OTP sent to your registered email"); setPendingNewPin(newPin); setShowOtpModal(true); }catch(e){ toast.error(e.response?.data?.error||"Could not send OTP"); } finally{ setPinOtpSending(false); }
                    }}
                    disabled={pinOtpSending || pinOtpSent}
                    className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
                  >{pinOtpSending?"Sending...": pinOtpSent?"OTP Sent":"Change PIN"}</button>
                </div>
                <p className="text-xs text-gray-400 mt-1">You must confirm OTP before PIN can be updated. PIN input is locked until OTP is verified.</p>
              </div>
            )}
          </div>
        )}
        {/* Transfer — in-place inside wallet, not another card */}
        {showTransfer && (
          <div className="mt-5 pt-5 border-t border-white/15">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white text-sm">Transfer</h3>
              <button onClick={()=>{ setShowTransfer(false); setTransferStep(1); setTransferResult(null); setResolved(null); }} className="text-xs text-white/70 hover:text-white">Close</button>
            </div>
            <div className="flex items-center gap-2 mb-4">
              {[1,2,3].map(s=> <div key={s} className={`flex-1 h-1.5 rounded-full ${transferStep>=s ? "bg-white" : "bg-white/20"}`} />)}
              <span className="text-xs text-white/70 ml-2">Step {transferStep>3?3:transferStep}/3</span>
            </div>
            {transferStep !== 4 ? (
              <div className="max-w-md mx-auto space-y-4 bg-white rounded-2xl p-5">
                {transferStep===1 && (
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Step 1 — Recipient account number</label>
                    <input value={transferForm.toAccount} onChange={async (e)=>{ const v=e.target.value.replace(/\D/g,"").slice(0,10); setTransferForm(f=>({...f, toAccount:v})); if(/^\d{10}$/.test(v)){ try{ const r=await resolveGigAccount(v); setResolved(r.user);}catch{setResolved(null);} } else setResolved(null); }} placeholder="8091234567" maxLength={10} inputMode="numeric" className="input-field mt-2 text-lg tracking-widest font-mono" />
                    {resolved ? <p className="text-sm text-green-600 mt-2 font-medium bg-green-50 border border-green-200 rounded-lg px-3 py-2">→ {resolved.fullName} <span className="text-gray-500">@{resolved.username}</span></p> : transferForm.toAccount.length===10 ? <p className="text-xs text-red-500 mt-2">Account not found</p> : <p className="text-xs text-gray-400 mt-2">Enter 10 digits — name shows automatically</p>}
                    <button disabled={!resolved} onClick={()=>setTransferStep(2)} className="w-full mt-4 btn-primary py-3 rounded-full font-bold disabled:opacity-60">Next — Amount</button>
                  </div>
                )}
                {transferStep===2 && (
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Step 2 — Amount ₦</label>
                    <input type="number" min="1" value={transferForm.amount} onChange={e=>setTransferForm(f=>({...f, amount:e.target.value}))} placeholder="500" className="input-field mt-2 text-lg" />
                    <p className="text-xs text-gray-500 mt-2">Fee 1% · {transferForm.amount ? `₦${(parseInt(transferForm.amount,10)*0.01).toFixed(2)}` : "—"} · Total ₦{transferForm.amount ? (parseInt(transferForm.amount,10) *1.01).toFixed(2) : "—"}</p>
                    <div className="flex gap-2 mt-4"><button onClick={()=>setTransferStep(1)} className="flex-1 btn-secondary py-3 rounded-full">Back</button><button disabled={!transferForm.amount || parseInt(transferForm.amount,10)<1} onClick={()=>setTransferStep(3)} className="flex-1 btn-primary py-3 rounded-full font-bold disabled:opacity-60">Next — PIN</button></div>
                  </div>
                )}
                {transferStep===3 && (
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Step 3 — Enter PIN to authorize</label>
                    <input type="password" maxLength={4} inputMode="numeric" value={transferForm.pin} onChange={e=>setTransferForm(f=>({...f, pin:e.target.value.replace(/\D/g,"").slice(0,4)}))} placeholder="••••" className="input-field mt-2 tracking-widest text-lg text-center" autoFocus />
                    <p className="text-xs text-gray-500 mt-2 text-center">Transfer ₦{transferForm.amount ? parseInt(transferForm.amount,10).toLocaleString() : "—"} to {resolved?.fullName} — fee ₦{transferForm.amount ? (parseInt(transferForm.amount,10)*0.01).toFixed(2) : "—"}</p>
                    <div className="flex gap-2 mt-4"><button onClick={()=>setTransferStep(2)} className="flex-1 btn-secondary py-3 rounded-full">Back</button><button disabled={transferring || !/^\d{4}$/.test(transferForm.pin)} onClick={handleTransfer} className="flex-1 btn-primary py-3 rounded-full font-bold disabled:opacity-60 flex items-center justify-center gap-2"><FiSend className="w-4 h-4"/> {transferring?"Sending...":"Confirm & Send"}</button></div>
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-md mx-auto text-center py-4 bg-white rounded-2xl p-5">
                {transferResult?.success ? (
                  <>
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3"><FiCheck className="w-8 h-8 text-green-600" /></div>
                    <h4 className="font-extrabold text-gray-900 text-lg">Transfer Successful</h4>
                    <p className="text-2xl font-extrabold text-primary-600 mt-2">₦{transferResult.amount.toLocaleString()}</p>
                    <p className="text-sm text-gray-600 mt-1">to {transferResult.recipient.fullName} @{transferResult.recipient.username} · Fee ₦{(transferResult.fee/100).toFixed(2)}</p>
                    <p className="text-xs text-gray-400 mt-1">Ref: {transferResult.reference || "—"} · {new Date().toLocaleString()}</p>
                    <button onClick={handleDownloadReceipt} className="mt-4 btn-primary px-6 py-2.5 rounded-full text-sm font-bold">Download Receipt</button>
                    <button onClick={()=>{ setTransferResult(null); setTransferForm({toAccount:"",amount:"",pin:""}); setResolved(null); setTransferStep(1); }} className="mt-2 block mx-auto text-sm text-gray-500">Done</button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3"><FiX className="w-8 h-8 text-red-600" /></div>
                    <h4 className="font-extrabold text-gray-900 text-lg">Transfer Failed</h4>
                    <p className="text-sm text-red-600 mt-2">{transferResult?.error || "Transaction did not go through."}</p>
                    <button onClick={()=>setTransferStep(3)} className="mt-4 btn-secondary px-6 py-2.5 rounded-full text-sm">Try again</button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
        {/* OTP Modal for PIN update */}
        {showOtpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={()=>setShowOtpModal(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl border border-gray-100" onClick={e=>e.stopPropagation()}>
              <h3 className="font-bold text-gray-900 mb-1">Confirm OTP</h3>
              <p className="text-sm text-gray-500 mb-3">Enter the 6-digit code sent to your registered email to confirm PIN change.</p>
              <input value={pinOtp} onChange={e=>setPinOtp(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="123456" maxLength={6} className="input-field text-center tracking-widest text-lg" autoFocus />
              <div className="flex gap-2 mt-4">
                <button onClick={()=>setShowOtpModal(false)} className="flex-1 btn-secondary py-2 text-sm">Cancel</button>
                <button
                  onClick={async()=>{
                    if(!/^\d{6}$/.test(pinOtp)) return toast.error("Enter 6-digit OTP");
                    if(!/^\d{4}$/.test(pendingNewPin)) return toast.error("Invalid PIN");
                    setPinSaving(true);
                    try{ await api.post("/gigs/pin", {pin:pendingNewPin, otp:pinOtp}); toast.success("PIN updated"); setNewPin(""); setPinOtp(""); setPendingNewPin(""); setPinOtpSent(false); setShowOtpModal(false); }catch(e){ toast.error(e.response?.data?.error||"Could not update PIN"); } finally{ setPinSaving(false); }
                  }}
                  disabled={pinSaving}
                  className="flex-1 btn-primary py-2 text-sm disabled:opacity-60"
                >{pinSaving?"Verifying...":"Confirm Update"}</button>
              </div>
              <button onClick={async()=>{ setPinOtpSending(true); try{ await api.post("/gigs/pin/request-otp"); toast.success("OTP resent"); }catch(e){ toast.error(e.response?.data?.error||"Could not resend"); } finally{ setPinOtpSending(false); } }} disabled={pinOtpSending} className="mt-3 text-xs text-primary-600 hover:underline w-full text-center">{pinOtpSending?"Resending...":"Resend OTP"}</button>
            </div>
          </div>
        )}
      </div>





      {/* ── Transfer Screen — 3 steps + result ── */}
      {showTransfer && (
        <div className="card p-5 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Transfer</h3>
            <button onClick={()=>{ setShowTransfer(false); setTransferStep(1); setTransferResult(null); setResolved(null); }} className="text-sm text-gray-500">Close</button>
          </div>
          <div className="flex items-center gap-2 mb-4">
            {[1,2,3].map(s=> <div key={s} className={`flex-1 h-1.5 rounded-full ${transferStep>=s ? "bg-primary-600" : "bg-gray-100"}`} />)}
            <span className="text-xs text-gray-500 ml-2">Step {transferStep>3?3:transferStep}/3</span>
          </div>
          {transferStep !== 4 ? (
            <div className="max-w-md mx-auto space-y-5">
              {transferStep===1 && (
                <div>
                  <label className="text-xs font-semibold text-gray-700">Step 1 — Recipient account number</label>
                  <input value={transferForm.toAccount} onChange={async (e)=>{ const v=e.target.value.replace(/\D/g,"").slice(0,10); setTransferForm(f=>({...f, toAccount:v})); if(/^\d{10}$/.test(v)){ try{ const r=await resolveGigAccount(v); setResolved(r.user);}catch{setResolved(null);} } else setResolved(null); }} placeholder="8091234567" maxLength={10} inputMode="numeric" className="input-field mt-2 text-lg tracking-widest font-mono" />
                  {resolved ? <p className="text-sm text-green-600 mt-2 font-medium bg-green-50 border border-green-200 rounded-lg px-3 py-2">→ {resolved.fullName} <span className="text-gray-500">@{resolved.username}</span></p> : transferForm.toAccount.length===10 ? <p className="text-xs text-red-500 mt-2">Account not found</p> : <p className="text-xs text-gray-400 mt-2">Enter 10 digits — name shows automatically</p>}
                  <button disabled={!resolved} onClick={()=>setTransferStep(2)} className="w-full mt-4 btn-primary py-3 rounded-full font-bold disabled:opacity-60">Next — Amount</button>
                </div>
              )}
              {transferStep===2 && (
          <div>
            <label className="text-xs font-semibold text-gray-700">Amount ₦</label>
            <input type="number" min="1" value={transferForm.amount} onChange={e=>setTransferForm(f=>({...f, amount:e.target.value}))} placeholder="500" className="input-field mt-1 text-lg" />
            <p className="text-xs text-gray-500 mt-1">Fee 1% · {transferForm.amount ? `₦${(parseInt(transferForm.amount,10)*0.01).toFixed(2)}` : "—"} · Total ₦{transferForm.amount ? (parseInt(transferForm.amount,10) *1.01).toFixed(2) : "—"}</p>
          </div>
              )}
              {transferStep===3 && (
                <div>
                  <label className="text-xs font-semibold text-gray-700">Step 3 — Enter PIN to authorize</label>
                  <input type="password" maxLength={4} inputMode="numeric" value={transferForm.pin} onChange={e=>setTransferForm(f=>({...f, pin:e.target.value.replace(/\D/g,"").slice(0,4)}))} placeholder="••••" className="input-field mt-2 tracking-widest text-lg text-center" autoFocus />
                  <p className="text-xs text-gray-500 mt-2 text-center">Transfer ₦{transferForm.amount ? parseInt(transferForm.amount,10).toLocaleString() : "—"} to {resolved?.fullName} — fee ₦{transferForm.amount ? (parseInt(transferForm.amount,10)*0.01).toFixed(2) : "—"}</p>
                  <div className="flex gap-2 mt-4"><button onClick={()=>setTransferStep(2)} className="flex-1 btn-secondary py-3 rounded-full">Back</button><button disabled={transferring || !/^\d{4}$/.test(transferForm.pin)} onClick={handleTransfer} className="flex-1 btn-primary py-3 rounded-full font-bold disabled:opacity-60 flex items-center justify-center gap-2"><FiSend className="w-4 h-4"/> {transferring?"Sending...":"Confirm & Send"}</button></div>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-md mx-auto text-center py-4">
              {transferResult?.success ? (
                <>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3"><FiCheck className="w-8 h-8 text-green-600" /></div>
                  <h4 className="font-extrabold text-gray-900 text-lg">Transfer Successful</h4>
                  <p className="text-2xl font-extrabold text-primary-600 mt-2">₦{transferResult.amount.toLocaleString()}</p>
                  <p className="text-sm text-gray-600 mt-1">to {transferResult.recipient.fullName} @{transferResult.recipient.username} · Fee ₦{(transferResult.fee/100).toFixed(2)}</p>
                  <p className="text-xs text-gray-400 mt-1">Ref: {transferResult.reference || "—"} · {new Date().toLocaleString()}</p>
                  <button onClick={handleDownloadReceipt} className="mt-4 btn-primary px-6 py-2.5 rounded-full text-sm font-bold">Download Receipt</button>
                  <button onClick={()=>{ setTransferResult(null); setTransferForm({toAccount:"",amount:"",pin:""}); setResolved(null); setTransferStep(1); }} className="mt-2 block mx-auto text-sm text-gray-500">Done</button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3"><FiX className="w-8 h-8 text-red-600" /></div>
                  <h4 className="font-extrabold text-gray-900 text-lg">Transfer Failed</h4>
                  <p className="text-sm text-red-600 mt-2">{transferResult?.error || "Transaction did not go through."}</p>
                  <button onClick={()=>setTransferStep(3)} className="mt-4 btn-secondary px-6 py-2.5 rounded-full text-sm">Try again</button>
                </>
              )}
            </div>
          )}
        </div>
      )}

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
