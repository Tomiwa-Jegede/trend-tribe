// src/pages/GigWalletPage.jsx — Full Gig Wallet: balance, transfer (3-step + receipt), history, top-up, withdraw (bank), PIN OTP
import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getGigAccount, getMyGigs, getGigTransfers, withdrawGig, initGigPayment, resolveGigAccount, transferGig } from "../services/gigService";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { FiCopy, FiSend, FiArrowDownCircle, FiChevronRight, FiPlusCircle, FiCheck, FiX, FiClock } from "react-icons/fi";
import InfoModal from "../components/ui/InfoModal";
import api from "../api/axios";

const formatNaira = (kobo) => `₦${(kobo / 100).toLocaleString()}`;

export default function GigWalletPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [account, setAccount] = useState(null);
  const [my, setMy] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const withdrawRef = useRef(null);
  const [withdrawForm, setWithdrawForm] = useState(() => {
    try {
      const raw = localStorage.getItem("tt_gig_withdraw_form_v1");
      if (raw) { const p = JSON.parse(raw); return { amount: p.amount||"", bankCode: p.bankCode||"", accountNumber: p.accountNumber||"", pin: "", bankName: p.bankName||"" }; }
    } catch {}
    return { amount: "", bankCode: "", accountNumber: "", pin: "", bankName: "" };
  });
  const [withdrawing, setWithdrawing] = useState(false);
  const [banks, setBanks] = useState([]);
  const [withdrawAccountName, setWithdrawAccountName] = useState("");
  const [withdrawResolving, setWithdrawResolving] = useState(false);
  const [bankQuery, setBankQuery] = useState(() => {
    try { return localStorage.getItem("tt_gig_withdraw_bankQuery_v1") || ""; } catch { return ""; }
  });
  const [showBankList, setShowBankList] = useState(false);
  const [rawWithdrawals, setRawWithdrawals] = useState([]);
  const [cancellingId, setCancellingId] = useState(null);
  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [tokenQty, setTokenQty] = useState("");
  const [buyingTokens, setBuyingTokens] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferStep, setTransferStep] = useState(1);
  const [transferForm, setTransferForm] = useState({ toAccount: "", amount: "", pin: "" });
  const [resolved, setResolved] = useState(null);
  const [transferring, setTransferring] = useState(false);
  const [transferResult, setTransferResult] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [transfers, setTransfers] = useState(null);
  const [hasPin, setHasPin] = useState(null);
  const [newPin, setNewPin] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinOtp, setPinOtp] = useState("");
  const [pinOtpSent, setPinOtpSent] = useState(false);
  const [pinOtpSending, setPinOtpSending] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [pendingNewPin, setPendingNewPin] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [acc, mine, tr, pinCheck, topups, withdrawals, walletHist] = await Promise.all([
        getGigAccount().catch(() => null),
        getMyGigs().catch(() => ({ gigBalance: 0 })),
        getGigTransfers().catch(() => ({ sent: [], received: [] })),
        api.get("/gigs/pin").then(r=>r.data).catch(()=>({hasPin:false})),
        api.get("/gigs/payments/history").then(r=>r.data).catch(()=>({purchases:[]})),
        api.get("/gigs/withdrawals").then(r=>r.data).catch(()=>({withdrawals:[]})),
        api.get("/gigs/wallet/history", { params: { limit: 50 } }).then(r=>r.data).catch(()=>({transactions:[]})),
      ]);
      setAccount(acc);
      setMy(mine);
      setRawWithdrawals(withdrawals.withdrawals || []);
      const sent = (tr?.sent || []).map((t) => ({ ...t, direction: "sent", type: "transfer", amount: t.amount }));
      const received = (tr?.received || []).map((t) => ({ ...t, direction: "received", type: "transfer", amount: t.amount }));
      const tops = (topups.purchases || []).filter(p=>p.status==="SUCCESS").map(p=> ({ id: `topup-${p.id}`, direction: "received", type: "topup", amount: p.amount, createdAt: p.createdAt, description: "Top up" }));
      const wds = (withdrawals.withdrawals || []).flatMap(w=> {
        const total = w.amount + (w.fee || 0);
        if (w.status === "REJECTED" || w.status === "CANCELLED") {
          return [{ id: `wd-refund-${w.id}`, direction: "received", type: "refund", amount: total, fee: w.fee, total, createdAt: w.updatedAt || w.createdAt, status: w.status === "CANCELLED" ? "Cancelled" : "Refunded", reference: w.reference, bankName: w.bankName }];
        }
        return [{ id: `wd-${w.id}`, direction: "sent", type: "withdrawal", amount: w.amount, fee: w.fee, total, createdAt: w.createdAt, status: w.status, reference: w.reference, bankName: w.bankName }];
      });
      // ledger entries from unified wallet history — map to same shape, credit = received (green), debit = sent (red)
      const ledger = (walletHist.transactions || []).map(tx => {
        const isCredit = tx.direction === "CREDIT";
        const labelMap = {
          GIG_CREATE: "Gig escrow held",
          GIG_PAYOUT: "Gig payout",
          GIG_CANCEL_REFUND: "Gig cancel refund",
          GIG_EXPIRED_REFUND: "Expired gig refund",
          GIG_AUTO_RELEASE: "Gig auto-release",
          GIG_DISPUTE_REFUND: "Dispute refund",
          GIG_DISPUTE_RELEASE: "Dispute release",
          GIG_DISPUTE_SPLIT: "Dispute split",
          SERVICE_BOOK: "Service escrow held",
          SERVICE_FEE: "Service fee (20%)",
          SERVICE_PAYOUT: "Service payout",
          SERVICE_REFUND: "Service refund",
          SERVICE_EXPIRED_REFUND: "Expired booking refund",
          SERVICE_DISPUTE_REFUND: "Service dispute refund",
          SERVICE_DISPUTE_RELEASE: "Service dispute release",
          SERVICE_DISPUTE_SPLIT: "Service dispute split",
          TOPUP: "Top up",
          TRANSFER: isCredit ? "Transfer received" : "Transfer sent",
          WITHDRAW: "Withdrawal",
          WITHDRAW_REFUND: "Withdrawal refund",
          TOKEN_BUY: "Buy tokens",
        };
        const label = labelMap[tx.type] || tx.type.replaceAll("_"," ");
        return {
          id: `ledger-${tx.id}`,
          direction: isCredit ? "received" : "sent",
          type: "ledger",
          amount: tx.amount,
          fee: tx.fee,
          total: tx.total,
          createdAt: tx.createdAt,
          label,
          ledgerType: tx.type,
          directionRaw: tx.direction,
          meta: tx.meta,
          reference: tx.reference,
        };
      });
      // dedupe: if ledger already covers a legacy entry with same reference, skip legacy to avoid double
      const ledgerRefs = new Set(ledger.map(l=> l.reference).filter(Boolean));
      const sentFiltered = sent.filter(s => !s.reference || !ledgerRefs.has(s.reference));
      const receivedFiltered = received.filter(r => !r.reference || !ledgerRefs.has(r.reference));
      const topsFiltered = tops.filter(t => !t.reference || !ledgerRefs.has(t.reference));
      const wdsFiltered = wds.filter(w => !w.reference || !ledgerRefs.has(w.reference));
      const merged = [...ledger, ...sentFiltered, ...receivedFiltered, ...topsFiltered, ...wdsFiltered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTransactions(merged);
      // keep raw for history view
      setTransfers(tr);
      setHasPin(pinCheck.hasPin);
    } catch (e) { toast.error(e.response?.data?.error || "Failed to load wallet"); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchAll(); }, []);
  // persist withdraw form so refresh continues where stopped (do not persist pin)
  useEffect(() => { try { const { pin, ...safe } = withdrawForm; localStorage.setItem("tt_gig_withdraw_form_v1", JSON.stringify(safe)); } catch {} }, [withdrawForm]);
  useEffect(() => { try { localStorage.setItem("tt_gig_withdraw_bankQuery_v1", bankQuery); } catch {} }, [bankQuery]);
  useEffect(() => { try { const v = localStorage.getItem("tt_gig_withdraw_open_v1"); if (v === "1") setShowWithdraw(true); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem("tt_gig_withdraw_open_v1", showWithdraw ? "1" : "0"); } catch {} }, [showWithdraw]);
  useEffect(() => { api.get("/gigs/banks").then(r=>{ if(r.data?.banks) setBanks(r.data.banks); }).catch(()=>{ setBanks([{code:"044", name:"Access Bank"}, {code:"058", name:"GTBank"}, {code:"011", name:"First Bank"}, {code:"033", name:"UBA"}, {code:"057", name:"Zenith Bank"}, {code:"999992", name:"OPay"}, {code:"50211", name:"Kuda Bank"}, {code:"50515", name:"Moniepoint"}, {code:"999991", name:"PalmPay"}]); }); }, []);
  useEffect(() => {
    const { bankCode, accountNumber } = withdrawForm;
    if (!(bankCode && /^\d{10}$/.test(accountNumber))) { setWithdrawAccountName(""); return; }
    const controller = new AbortController();
    const id = setTimeout(() => {
      setWithdrawResolving(true);
      api.post("/gigs/bank/resolve", { accountNumber, bankCode }, { signal: controller.signal }).then(r=> setWithdrawAccountName(r.data.accountName || r.data.bankName || "")).catch(()=> { if (!controller.signal.aborted) setWithdrawAccountName(""); }).finally(()=> { if (!controller.signal.aborted) setWithdrawResolving(false); });
    }, 500);
    return () => { clearTimeout(id); controller.abort(); };
  }, [withdrawForm.bankCode, withdrawForm.accountNumber]);
  useEffect(() => { if (showWithdraw && withdrawRef.current) withdrawRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); }, [showWithdraw]);

  const handleCopyAccount = async () => {
    if (!account?.accountNumber) return;
    await navigator.clipboard.writeText(account.accountNumber);
    toast.success("Account number copied");
  };
  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(withdrawForm.pin)) return toast.error("Enter 4-digit PIN");
    const amt = parseInt(withdrawForm.amount, 10);
    if (!amt || amt < 1000) return toast.error("Minimum withdraw ₦1000");
    const cleanAcc = (withdrawForm.accountNumber || "").replace(/\D/g,"").slice(0,10);
    if (!/^\d{10}$/.test(cleanAcc)) return toast.error("Enter 10-digit account number");
    let bankCode = (withdrawForm.bankCode || "").trim();
    let bankName = withdrawForm.bankName || "";
    // fallback: if user typed name without selecting dropdown, resolve code from bankQuery
    if (!bankCode && bankQuery) {
      const hit = banks.find(b=> b.name.toLowerCase() === bankQuery.toLowerCase().trim() || b.name.toLowerCase().includes(bankQuery.toLowerCase().trim()));
      if (hit) { bankCode = hit.code; bankName = hit.name; }
      else if (/^\d+$/.test(bankQuery.trim())) bankCode = bankQuery.trim(); // typed code directly
    }
    if (!bankCode) return toast.error("Select a bank — search and tap from list");
    const feePreview = isAdmin ? 0 : Math.max(1, Math.round(amt*100*0.01));
    const totalPreview = amt*100 + feePreview;
    if (!confirm(`Withdraw ₦${amt.toLocaleString()} to ${bankName || bankCode} • ${cleanAcc}?\n\nAmount: ₦${amt.toLocaleString()}\nFee (1%): ₦${(feePreview/100).toFixed(2)}${isAdmin ? " (admin free)" : ""}\nTotal debited: ₦${(totalPreview/100).toLocaleString()}\n\nContinue?`)) return;
    setWithdrawing(true);
    try {
      const r = await withdrawGig({ amount: amt, bankCode, accountNumber: cleanAcc, pin: withdrawForm.pin });
      toast.success(r.message);
      setWithdrawForm({ amount: "", bankCode: "", accountNumber: "", pin: "", bankName: "" });
      setBankQuery("");
      try { localStorage.removeItem("tt_gig_withdraw_form_v1"); localStorage.removeItem("tt_gig_withdraw_bankQuery_v1"); localStorage.setItem("tt_gig_withdraw_open_v1","0"); } catch {}
      setShowWithdraw(false);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.error || "Withdraw failed"); }
    finally { setWithdrawing(false); }
  };
  const handleCancelWithdrawal = async (id) => {
    if (!confirm("Cancel this withdrawal? ₦ amount will be refunded instantly (fee ₦ retained).")) return;
    setCancellingId(id);
    try {
      const { data } = await api.post(`/gigs/withdrawals/${id}/cancel`);
      toast.success(data.message || "Cancelled — refunded");
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.error || "Cancel failed"); }
    finally { setCancellingId(null); }
  };
  const handleTopup = async () => {
    const amt = parseInt(topupAmount, 10);
    if (!amt || amt < 100) return toast.error("Min ₦100");
    try { const { authorizationUrl } = await initGigPayment(amt); window.location.href = authorizationUrl; } catch (e) { toast.error(e.response?.data?.error || "Top-up failed"); }
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
      fetchAll();
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

  const balance = account?.gigBalance ?? my?.gigBalance ?? 0;
  const recentTransactions = transactions.slice(0, 5);

  if (loading) {
    return (
      <div className="container-app py-16 flex justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="container-app py-6 sm:py-8 max-w-lg lg:max-w-2xl mx-auto">
      <Helmet><title>Gig Wallet — Trend Tribe</title></Helmet>

      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Gig Wallet</h1>
        <InfoModal title="How Gig Wallet works">
          <p>Your Gig Wallet is Naira (kobo), separate but you can convert directly to tokens.</p>
          <ul className="list-disc ml-5">
            <li><b>Top up</b> adds Naira to your Gig balance (buyable via Flutterwave).</li>
            <li><b>Transfer</b> to another 10-digit Gig account is instant — enter account, see name, enter amount, enter PIN.</li>
            <li><b>Withdraw</b> to your bank needs your PIN and admin approval — money is sent via Flutterwave to your saved bank.</li>
            <li><b>Buy tokens</b> with Gig Naira instantly — ₦200/token, no card needed (uses Gig balance directly).</li>
          </ul>
        </InfoModal>
      </div>

      {/* ── Balance card ── */}
      <div className="rounded-3xl p-6 sm:p-7 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0F1F3D 0%, #1340B8 60%, #2D5BFF 100%)" }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full blur-xl" />
        <p className="text-xs font-semibold tracking-widest uppercase opacity-70">Balance</p>
        <p className="text-4xl sm:text-5xl font-extrabold mt-2 tracking-tight">{formatNaira(balance)}</p>
        <div className="mt-5 flex items-center gap-2">
          <p className="text-xs opacity-70">Account</p>
          <p className="font-mono text-lg tracking-widest font-bold">{account?.accountNumber || "••••••••••"}</p>
          <button onClick={handleCopyAccount} className="ml-2 w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors" aria-label="Copy account number"><FiCopy className="w-4 h-4" /></button>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link to="/gigs/wallet/transfer" className="flex-1 bg-white text-navy-900 font-bold px-6 py-3 rounded-full text-sm shadow-lg hover:bg-gray-50 transition-colors inline-flex items-center justify-center gap-2"><FiSend className="w-4 h-4"/> Transfer</Link>
          <button onClick={() => setShowWithdraw((v) => !v)} className="flex-1 bg-white/15 text-white font-bold px-6 py-3 rounded-full text-sm border border-white/20 hover:bg-white/25 transition-colors inline-flex items-center justify-center gap-2"><FiArrowDownCircle className={`w-4 h-4 transition-transform ${showWithdraw ? "rotate-180" : ""}`} /> {showWithdraw ? "Close Withdraw" : "Withdraw"}</button>
        </div>
      </div>

      {/* ── PIN — inside wallet, OTP gated ── */}
      <div className="mt-4">
        {!hasPin ? (
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex-1"><label className="text-xs font-semibold text-amber-800">Set 4-digit transfer PIN first</label><input type="password" maxLength={4} inputMode="numeric" value={newPin || ""} onChange={e=>setNewPin(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="1234" className="input-field mt-1" /></div>
            <button onClick={async()=>{ if(!/^\d{4}$/.test(newPin)) return toast.error("PIN must be 4 digits"); try{ await api.post("/gigs/pin", {pin:newPin}); toast.success("PIN set"); setHasPin(true); setNewPin(""); }catch(e){ toast.error(e.response?.data?.error||"Could not set PIN"); } }} className="btn-primary px-4 py-2 text-sm">Set PIN</button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="flex-1"><label className="text-xs text-gray-500">Change PIN (4-digit new PIN)</label><input type="password" maxLength={4} inputMode="numeric" value={newPin || ""} onChange={e=>setNewPin(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="••••" className="input-field mt-1" /></div>
            <button disabled={pinOtpSending} onClick={async()=>{
              if(!/^\d{4}$/.test(newPin)) return toast.error("Enter new 4-digit PIN first");
              setPinOtpSending(true);
              try{
                const { data } = await api.post("/gigs/pin/request-otp");
                setPendingNewPin(newPin);
                setShowOtpModal(true);
                toast.success(data.message || "OTP sent to your registered email");
                if (data.devOtp) toast.success(`Dev OTP: ${data.devOtp}`);
              }catch(e){ toast.error(e.response?.data?.error||"Could not send OTP"); }
              finally { setPinOtpSending(false); }
            }} className="btn-secondary px-3 py-2 text-sm disabled:opacity-60">{pinOtpSending ? "Sending..." : "Get OTP"}</button>
          </div>
        )}
      </div>
      {/* OTP modal for PIN change */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-900">Enter OTP to confirm PIN change</h3>
            <p className="text-xs text-gray-500 mt-1">OTP sent to your registered email. New PIN: <span className="font-mono font-bold">{pendingNewPin ? "••••" : ""}</span> — expires in 10 min.</p>
            <input type="text" maxLength={6} inputMode="numeric" value={pinOtp} onChange={e=>setPinOtp(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="6-digit OTP" className="input-field mt-4 text-center text-lg tracking-widest font-mono" autoFocus />
            <div className="flex gap-2 mt-4">
              <button onClick={()=>{ setShowOtpModal(false); setPinOtp(""); }} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
              <button disabled={pinSaving || pinOtp.length!==6} onClick={async()=>{
                if(!/^\d{6}$/.test(pinOtp)) return toast.error("Enter 6-digit OTP");
                setPinSaving(true);
                try{
                  await api.post("/gigs/pin", { pin: pendingNewPin, otp: pinOtp });
                  toast.success("PIN updated");
                  setShowOtpModal(false); setPinOtp(""); setPendingNewPin(""); setNewPin("");
                }catch(e){ toast.error(e.response?.data?.error||"Could not update PIN"); }
                finally { setPinSaving(false); }
              }} className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-60">{pinSaving ? "Saving..." : "Confirm"}</button>
            </div>
            <button onClick={async()=>{ try{ const {data}=await api.post("/gigs/pin/request-otp"); toast.success("OTP resent"); if(data.devOtp) toast.success(`Dev OTP: ${data.devOtp}`);}catch(e){ toast.error("Resend failed"); } }} className="text-xs text-primary-600 mt-3 underline">Resend OTP</button>
          </div>
        </div>
      )}

      {/* ── Withdraw form (inline, toggled) — navigates to card ── */}
      {showWithdraw && (
        <form ref={withdrawRef} onSubmit={handleWithdraw} className="card p-4 mt-4 flex flex-col gap-3 border-2 border-primary-100 shadow-sm">
          <div>
            <label className="text-xs font-semibold text-gray-500">Amount ₦</label>
            <input type="number" min="1000" value={withdrawForm.amount} onChange={(e) => setWithdrawForm((f) => ({ ...f, amount: e.target.value }))} placeholder="1000" className="input-field mt-1" required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative"><label className="text-xs font-semibold text-gray-500">Bank — search</label><input value={withdrawForm.bankCode ? (banks.find(b=>b.code===withdrawForm.bankCode)?.name || bankQuery) : bankQuery} onChange={e=>{ const q=e.target.value; setBankQuery(q); setShowBankList(true); if(!q) setWithdrawForm(f=>({...f, bankCode:"", bankName:""})); }} onFocus={()=>setShowBankList(true)} onBlur={()=>setTimeout(()=>setShowBankList(false),150)} placeholder="Search OPay, Kuda..." className="input-field mt-1" />{showBankList && <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">{banks.filter(b=> !bankQuery || b.name.toLowerCase().includes(bankQuery.toLowerCase()) || b.code.includes(bankQuery)).slice(0,20).map(b=> <button key={`${b.code}-${b.name}`} type="button" onClick={()=>{ setWithdrawForm(f=>({...f, bankCode:b.code, bankName:b.name})); setBankQuery(b.name); setShowBankList(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between"><span>{b.name}</span><span className="text-xs text-gray-400">{b.code}</span></button>)} </div>}</div>
            <div><label className="text-xs font-semibold text-gray-500">Account number</label><input value={withdrawForm.accountNumber} onChange={e=>setWithdrawForm(f=>({...f, accountNumber:e.target.value.replace(/\D/g,"").slice(0,10)}))} placeholder="809..." maxLength={10} className="input-field mt-1 font-mono" required /></div>
          </div>
          {withdrawAccountName ? <p className="text-sm text-green-600 font-medium bg-green-50 border border-green-200 rounded-lg px-3 py-2">→ {withdrawAccountName}</p> : withdrawResolving ? <p className="text-xs text-gray-400">Resolving...</p> : withdrawForm.accountNumber.length===10 && withdrawForm.bankCode ? <p className="text-xs text-red-500">Could not resolve account</p> : null}
          <div><label className="text-xs font-semibold text-gray-500">PIN</label><input type="password" maxLength={4} inputMode="numeric" value={withdrawForm.pin || ""} onChange={e=>setWithdrawForm(f=>({...f, pin:e.target.value.replace(/\D/g,"").slice(0,4)}))} placeholder="••••" className="input-field mt-1 w-24" required /></div>
          {(() => {
            const amt = parseInt(withdrawForm.amount, 10);
            if (!amt || amt < 1000) return null;
            const fee = isAdmin ? 0 : Math.max(1, Math.round(amt * 100 * 0.01));
            const total = amt * 100 + fee;
            const enough = balance >= total;
            return (
              <div className={`rounded-xl px-3 py-2.5 text-[13px] border ${enough ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-red-50 border-red-200 text-red-700"}`}>
                <p className="font-bold">Total to be deducted: {formatNaira(total)} <span className="font-normal text-xs">({formatNaira(amt*100)} + fee {formatNaira(fee)}{isAdmin ? " — admin free" : ""} = {formatNaira(total)})</span></p>
                <p className="text-xs mt-1">Gig balance: {formatNaira(balance)} → after: <span className={enough ? "font-bold" : "font-bold text-red-700"}>{formatNaira(balance - total)}</span> {enough ? "" : "· Insufficient"}</p>
              </div>
            );
          })()}
          <div className="flex gap-2">
            <button type="submit" disabled={withdrawing} className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-60">{withdrawing ? "Processing..." : isAdmin ? "Withdraw — free for admin" : "Withdraw — 1% fee"}</button>
            <button type="button" onClick={()=>{
              setWithdrawForm({ amount: "", bankCode: "", accountNumber: "", pin: "", bankName: "" });
              setBankQuery("");
              setWithdrawAccountName("");
              try{ localStorage.removeItem("tt_gig_withdraw_form_v1"); localStorage.removeItem("tt_gig_withdraw_bankQuery_v1"); }catch{}
            }} className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1"><FiX className="w-4 h-4"/> Cancel</button>
          </div>
          <p className="text-[10px] text-gray-400">Min ₦1000 · 1% fee{isAdmin ? " — free for admin" : ""} · admin approves → auto transfer to bank · Total shows before you confirm</p>
        </form>
      )}

      {/* ── Pending withdrawals — In review (no cancel after submit) */}
      {rawWithdrawals.filter(w=>w.status==="PENDING").length > 0 && (
        <div className="mt-4 card p-4 border border-amber-200 bg-amber-50/50">
          <p className="text-xs font-bold text-amber-800 mb-2">Pending withdrawal — In review</p>
          <div className="flex flex-col gap-2">
            {rawWithdrawals.filter(w=>w.status==="PENDING").map(w=> (
              <div key={w.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-amber-100">
                <div className="text-sm">
                  <p className="font-bold text-gray-900">{formatNaira(w.amount)} <span className="text-xs font-normal text-gray-500">+ fee {formatNaira(w.fee)} = {formatNaira(w.amount+(w.fee||0))}</span> <span className="text-xs text-amber-600">· In review</span></p>
                  <p className="text-xs text-gray-500">{w.bankName || w.bankCode} • {w.bankAccountNumber} · {new Date(w.createdAt).toLocaleString()} · Ref {w.reference}</p>
                </div>
                <span className="ml-3 text-xs text-amber-700 font-semibold">In review</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-amber-700 mt-2">Awaiting admin approval — cannot cancel after submit.</p>
        </div>
      )}

      {/* ── Top up (secondary, collapsed) ── */}
      <div className="mt-4">
        <button onClick={() => setShowTopup((v) => !v)} className="text-xs font-semibold text-gray-500 hover:text-primary-600 inline-flex items-center gap-1"><FiPlusCircle className="w-3.5 h-3.5" /> Top up wallet</button>
        {showTopup && (
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <input type="number" min="100" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} placeholder="500" className="input-field flex-1 text-sm" />
            <button onClick={async()=>{ const amt=parseInt(topupAmount,10); if(!amt||amt<100) return toast.error("Min ₦100"); try{ const {authorizationUrl}=await initGigPayment(amt); window.location.href=authorizationUrl; }catch(e){ toast.error(e.response?.data?.error||"Top-up failed"); } }} className="btn-primary px-4 py-2 text-xs">Top up</button>
          </div>
        )}
      </div>

      {/* ── Buy tokens directly with Gig balance — instant, no card ── */}
      <div className="mt-4 card p-4 border border-indigo-100 bg-indigo-50/50">
        <p className="text-sm font-bold text-indigo-900">Buy tokens with Gig balance</p>
        <p className="text-xs text-gray-500 mt-1">1 token = ₦200 · Instant from Gig Naira, no Flutterwave. Balance: <span className="font-bold text-indigo-700">{formatNaira(balance)}</span></p>
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <input type="number" min="1" value={tokenQty} onChange={e=>setTokenQty(e.target.value.replace(/\D/g,""))} placeholder="Qty (e.g. 5)" className="input-field flex-1 text-sm" />
          <button disabled={buyingTokens || !tokenQty} onClick={async()=>{
            const qty = parseInt(tokenQty,10);
            if (!qty || qty<1) return toast.error("Enter quantity ≥1");
            const cost = qty*200;
            if (qty*200*100 > balance) return toast.error(`Need ₦${cost.toLocaleString()} in Gig wallet — you have ${formatNaira(balance)}`);
            if (!confirm(`Buy ${qty} token${qty!==1?"s":""} for ₦${cost.toLocaleString()}?\n\n₦${cost.toLocaleString()} will be debited from your Gig wallet and ${qty} token${qty!==1?"s":""} credited instantly.\n\nContinue?`)) return;
            setBuyingTokens(true);
            try { const { data } = await api.post("/payments/buy-with-gig", { quantity: qty }); toast.success(data.message || `${qty} token(s) credited`); setTokenQty(""); fetchAll(); } catch(e){ toast.error(e.response?.data?.error || "Could not buy tokens"); } finally { setBuyingTokens(false); }
          }} className="btn-primary px-5 py-2 text-sm disabled:opacity-60 whitespace-nowrap">
            {buyingTokens ? "Buying..." : tokenQty ? `Buy ${tokenQty} for ₦${(parseInt(tokenQty||0)*200).toLocaleString()}` : "Buy tokens"}
          </button>
        </div>
        {tokenQty && parseInt(tokenQty,10)>=1 && <p className="text-[11px] text-gray-500 mt-1">Cost: ₦{(parseInt(tokenQty,10)*200).toLocaleString()} will be debited from Gig wallet, tokens added instantly.</p>}
      </div>

      {/* ── Recent transactions — inline, scrollable ── */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">Recent Transactions</h2>
          <Link to="/gigs/wallet/history" className="text-xs font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-0.5">View all <FiChevronRight className="w-3.5 h-3.5" /></Link>
        </div>
        {recentTransactions.length === 0 ? (
          <p className="text-sm text-gray-400 card p-4 text-center">No transactions yet.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto flex flex-col gap-2 pr-1">
            {recentTransactions.map((t) => (
              <div key={t.id} className="card p-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-900">
                    {t.type === "ledger" ? `${t.directionRaw === "CREDIT" ? "↑" : "↓"} ${t.label}` : t.type === "topup" ? "↑ Top up" : t.type === "refund" ? "↩ Withdrawal refunded" : t.type === "withdrawal" ? "↓ Withdrawal" : t.direction === "sent" ? `→ ${t.toUser?.username || "Unknown"}` : `← ${t.fromUser?.username || "Unknown"}`}
                    {t.type === "ledger" ? ` · ${t.directionRaw === "CREDIT" ? "Credit" : "Debit"}` : t.status && t.status !== "SUCCESS" && t.status !== "COMPLETED" ? ` · ${t.status === "PENDING" ? "In review" : t.status}` : t.type === "refund" ? ` · Refunded — ${formatNaira(t.amount)} back` : ""}
                  </p>
                  <p className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString()} · {t.type === "ledger" ? `${t.label} — ${t.directionRaw === "CREDIT" ? "Credit" : "Debit"}${t.fee ? ` (fee ${formatNaira(t.fee)})` : ""}` : t.type === "topup" ? "Top up" : t.type === "refund" ? `Refund — ${formatNaira(t.amount)} fully refunded (was ${formatNaira(t.total)} debited)` : t.type === "withdrawal" ? `Withdrawal — ${formatNaira(t.amount)} + fee ${formatNaira(t.fee)} = ${formatNaira(t.total)}` : t.direction === "sent" ? "Debit" : "Credit"}{t.status === "PENDING" ? " · In review" : ""}</p>
                </div>
                <p className={`font-bold ${t.direction === "sent" || t.type === "withdrawal" || t.directionRaw === "DEBIT" ? "text-red-600" : "text-green-600"}`}>{t.direction === "sent" || t.type === "withdrawal" || t.directionRaw === "DEBIT" ? "-" : "+"}{formatNaira(t.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
