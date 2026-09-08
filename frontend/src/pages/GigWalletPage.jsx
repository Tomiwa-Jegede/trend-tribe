// src/pages/GigWalletPage.jsx — Full Gig Wallet: balance, transfer (3-step + receipt), history, top-up, withdraw (bank), PIN OTP
import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getGigAccount, getMyGigs, getGigTransfers, withdrawGig, initGigPayment, resolveGigAccount, transferGig } from "../services/gigService";
import { useToast } from "../context/ToastContext";
import { FiCopy, FiSend, FiArrowDownCircle, FiChevronRight, FiPlusCircle, FiCheck, FiX, FiClock } from "react-icons/fi";
import InfoModal from "../components/ui/InfoModal";
import api from "../api/axios";

const formatNaira = (kobo) => `₦${(kobo / 100).toLocaleString()}`;

export default function GigWalletPage() {
  const { toast } = useToast();
  const [account, setAccount] = useState(null);
  const [my, setMy] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const withdrawRef = useRef(null);
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", bankCode: "044", accountNumber: "", pin: "" });
  const [withdrawing, setWithdrawing] = useState(false);
  const [banks, setBanks] = useState([]);
  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
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
      const [acc, mine, tr, pinCheck] = await Promise.all([
        getGigAccount().catch(() => null),
        getMyGigs().catch(() => ({ gigBalance: 0 })),
        getGigTransfers().catch(() => ({ sent: [], received: [] })),
        api.get("/gigs/pin").then(r=>r.data).catch(()=>({hasPin:false})),
      ]);
      setAccount(acc);
      setMy(mine);
      const sent = (tr?.sent || []).map((t) => ({ ...t, direction: "sent" }));
      const received = (tr?.received || []).map((t) => ({ ...t, direction: "received" }));
      const merged = [...sent, ...received].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTransactions(merged);
      // keep raw for history view
      setTransfers(tr);
      setHasPin(pinCheck.hasPin);
    } catch (e) { toast.error(e.response?.data?.error || "Failed to load wallet"); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { api.get("/gigs/banks").then(r=>{ if(r.data?.banks) setBanks(r.data.banks); }).catch(()=>{ setBanks([{code:"044", name:"Access Bank"}, {code:"058", name:"GTBank"}, {code:"011", name:"First Bank"}, {code:"033", name:"UBA"}, {code:"057", name:"Zenith Bank"}, {code:"999992", name:"OPay"}, {code:"50211", name:"Kuda Bank"}, {code:"50515", name:"Moniepoint"}, {code:"999991", name:"PalmPay"}]); }); }, []);
  useEffect(() => { if (showWithdraw && withdrawRef.current) withdrawRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); }, [showWithdraw]);

  const handleCopyAccount = async () => {
    if (!account?.accountNumber) return;
    await navigator.clipboard.writeText(account.accountNumber);
    toast.success("Account number copied");
  };
  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(withdrawForm.pin)) return toast.error("Enter 4-digit PIN");
    setWithdrawing(true);
    try {
      const r = await withdrawGig({ amount: parseInt(withdrawForm.amount, 10), bankCode: withdrawForm.bankCode, accountNumber: withdrawForm.accountNumber, pin: withdrawForm.pin });
      toast.success(r.message);
      setWithdrawForm({ amount: "", bankCode: "044", accountNumber: "", pin: "" });
      setShowWithdraw(false);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.error || "Withdraw failed"); }
    finally { setWithdrawing(false); }
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
          <p>Your Gig Wallet is separate from your marketplace tokens. You see your balance in Naira, not tokens.</p>
          <ul className="list-disc ml-5">
            <li><b>Top up</b> adds Naira to your Gig balance (buyable via Flutterwave).</li>
            <li><b>Transfer</b> to another 10-digit Gig account is instant — enter account, see name, enter amount, enter PIN.</li>
            <li><b>Withdraw</b> to your bank needs your PIN and admin approval — money is sent via Flutterwave to your saved bank.</li>
            <li>All moves are in Naira, shown as ₦. No conversion to marketplace tokens.</li>
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
            <button onClick={async()=>{ if(!/^\d{4}$/.test(newPin)) return toast.error("PIN must be 4 digits"); try{ await api.post("/gigs/pin", {pin:newPin}); toast.success("PIN set"); setHasPin(true); }catch(e){ toast.error(e.response?.data?.error||"Could not set PIN"); } }} className="btn-primary px-4 py-2 text-sm">Set PIN</button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="flex-1"><label className="text-xs text-gray-500">Change PIN (4-digit)</label><input type="password" maxLength={4} inputMode="numeric" value={newPin || ""} onChange={e=>setNewPin(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="••••" className="input-field mt-1" /></div>
            <button onClick={async()=>{ if(!/^\d{4}$/.test(newPin)) return toast.error("Enter new 4-digit PIN"); try{ await api.post("/gigs/pin/request-otp"); toast.success("OTP sent to your registered email"); }catch(e){ toast.error(e.response?.data?.error||"Could not send OTP"); } }} className="btn-secondary px-3 py-2 text-sm">Change PIN</button>
          </div>
        )}
      </div>

      {/* ── Withdraw form (inline, toggled) — navigates to card ── */}
      {showWithdraw && (
        <form ref={withdrawRef} onSubmit={handleWithdraw} className="card p-4 mt-4 flex flex-col gap-3 border-2 border-primary-100 shadow-sm">
          <div>
            <label className="text-xs font-semibold text-gray-500">Amount ₦</label>
            <input type="number" min="1000" value={withdrawForm.amount} onChange={(e) => setWithdrawForm((f) => ({ ...f, amount: e.target.value }))} placeholder="1000" className="input-field mt-1" required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-gray-500">Bank</label><select value={withdrawForm.bankCode} onChange={e=>setWithdrawForm(f=>({...f, bankCode:e.target.value}))} className="input-field mt-1"><option value="">Select bank</option>{banks.map((b,i)=> <option key={`${b.code}-${i}`} value={b.code}>{b.name}</option>)}</select></div>
            <div><label className="text-xs font-semibold text-gray-500">Account number</label><input value={withdrawForm.accountNumber} onChange={e=>setWithdrawForm(f=>({...f, accountNumber:e.target.value.replace(/\D/g,"").slice(0,10)}))} placeholder="809..." maxLength={10} className="input-field mt-1 font-mono" required /></div>
          </div>
          <div><label className="text-xs font-semibold text-gray-500">PIN</label><input type="password" maxLength={4} inputMode="numeric" value={withdrawForm.pin || ""} onChange={e=>setWithdrawForm(f=>({...f, pin:e.target.value.replace(/\D/g,"").slice(0,4)}))} placeholder="••••" className="input-field mt-1 w-24" required /></div>
          <button type="submit" disabled={withdrawing} className="btn-primary py-2.5 text-sm disabled:opacity-60">{withdrawing ? "Processing..." : "Withdraw — 1% fee"}</button>
          <p className="text-[10px] text-gray-400">Min ₦1000 · 1% fee · admin approves → auto transfer to bank</p>
        </form>
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
                  <p className="font-medium text-gray-900">{t.direction === "sent" ? `→ ${t.toUser?.username || "Unknown"}` : `← ${t.fromUser?.username || "Unknown"}`}</p>
                  <p className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</p>
                </div>
                <p className={`font-bold ${t.direction === "sent" ? "text-gray-900" : "text-green-600"}`}>{t.direction === "sent" ? "-" : "+"}{formatNaira(t.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
