// src/pages/GigWalletPage.jsx — Gig Wallet: balance, transfer, withdraw, inline recent transactions
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getGigAccount, getMyGigs, getGigTransfers, withdrawGig, initGigPayment } from "../services/gigService";
import { useToast } from "../context/ToastContext";
import { FiCopy, FiSend, FiArrowDownCircle, FiChevronRight, FiPlusCircle } from "react-icons/fi";

const formatNaira = (kobo) => `₦${(kobo / 100).toLocaleString()}`;

export default function GigWalletPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [account, setAccount] = useState(null);
  const [my, setMy] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", whatsapp: "" });
  const [withdrawing, setWithdrawing] = useState(false);

  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [acc, mine, tr] = await Promise.all([
        getGigAccount().catch(() => null),
        getMyGigs().catch(() => ({ gigBalance: 0 })),
        getGigTransfers().catch(() => ({ sent: [], received: [] })),
      ]);
      setAccount(acc);
      setMy(mine);

      // Merge sent + received into one chronological list for the inline view
      const sent = (tr?.sent || []).map((t) => ({ ...t, direction: "sent" }));
      const received = (tr?.received || []).map((t) => ({ ...t, direction: "received" }));
      const merged = [...sent, ...received].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );
      setTransactions(merged);
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCopyAccount = async () => {
    if (!account?.accountNumber) return;
    await navigator.clipboard.writeText(account.accountNumber);
    toast.success("Account number copied");
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setWithdrawing(true);
    try {
      const r = await withdrawGig({
        amount: parseInt(withdrawForm.amount, 10),
        whatsapp: withdrawForm.whatsapp,
      });
      toast.success(r.message);
      setWithdrawForm({ amount: "", whatsapp: "" });
      setShowWithdraw(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || "Withdraw failed");
    } finally {
      setWithdrawing(false);
    }
  };

  const handleTopup = async () => {
    const amt = parseInt(topupAmount, 10);
    if (!amt || amt < 100) return toast.error("Min ₦100");
    try {
      const { authorizationUrl } = await initGigPayment(amt);
      window.location.href = authorizationUrl;
    } catch (e) {
      toast.error(e.response?.data?.error || "Top-up failed");
    }
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
    <div className="container-app py-6 sm:py-8 max-w-lg mx-auto">
      <Helmet>
        <title>Gig Wallet — Trend Tribe</title>
      </Helmet>

      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Gig Wallet</h1>

      {/* ── Balance card ── */}
      <div
        className="rounded-3xl p-6 sm:p-7 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0F1F3D 0%, #1340B8 60%, #2D5BFF 100%)" }}
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full blur-xl" />

        <p className="text-xs font-semibold tracking-widest uppercase opacity-70">Balance</p>
        <p className="text-4xl sm:text-5xl font-extrabold mt-2 tracking-tight">
          {formatNaira(balance)}
        </p>

        <div className="mt-5 flex items-center gap-2">
          <p className="text-xs opacity-70">Account</p>
          <p className="font-mono text-lg tracking-widest font-bold">
            {account?.accountNumber || "••••••••••"}
          </p>
          <button
            onClick={handleCopyAccount}
            className="ml-2 w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
            aria-label="Copy account number"
          >
            <FiCopy className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-6 flex gap-3">
          <Link
            to="/gigs/wallet/transfer"
            className="flex-1 bg-white text-navy-900 font-bold px-6 py-3 rounded-full text-sm shadow-lg hover:bg-gray-50 transition-colors inline-flex items-center justify-center gap-2"
          >
            <FiSend className="w-4 h-4" /> Transfer
          </Link>
          <button
            onClick={() => setShowWithdraw((v) => !v)}
            className="flex-1 bg-white/15 text-white font-bold px-6 py-3 rounded-full text-sm border border-white/20 hover:bg-white/25 transition-colors inline-flex items-center justify-center gap-2"
          >
            <FiArrowDownCircle className="w-4 h-4" /> Withdraw
          </button>
        </div>
      </div>

      {/* ── Withdraw form (inline, toggled) ── */}
      {showWithdraw && (
        <form onSubmit={handleWithdraw} className="card p-4 mt-4 flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500">Amount ₦</label>
            <input
              type="number"
              min="1000"
              value={withdrawForm.amount}
              onChange={(e) => setWithdrawForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="1000"
              className="input-field mt-1"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">WhatsApp number</label>
            <input
              value={withdrawForm.whatsapp}
              onChange={(e) => setWithdrawForm((f) => ({ ...f, whatsapp: e.target.value }))}
              placeholder="080..."
              className="input-field mt-1"
              required
            />
          </div>
          <button
            type="submit"
            disabled={withdrawing}
            className="btn-primary py-2.5 text-sm disabled:opacity-60"
          >
            {withdrawing ? "Processing..." : "Withdraw"}
          </button>
        </form>
      )}

      {/* ── Top up (secondary, collapsed) ── */}
      <div className="mt-4">
        <button
          onClick={() => setShowTopup((v) => !v)}
          className="text-xs font-semibold text-gray-500 hover:text-primary-600 inline-flex items-center gap-1"
        >
          <FiPlusCircle className="w-3.5 h-3.5" /> Top up wallet
        </button>
        {showTopup && (
          <div className="flex gap-2 mt-2">
            <input
              type="number"
              min="100"
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              placeholder="500"
              className="input-field flex-1 text-sm"
            />
            <button onClick={handleTopup} className="btn-primary px-4 py-2 text-xs">
              Top up
            </button>
          </div>
        )}
      </div>

      {/* ── Recent transactions — inline, scrollable, no click needed ── */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">Recent Transactions</h2>
          <Link
            to="/gigs/wallet/history"
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-0.5"
          >
            View all <FiChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <p className="text-sm text-gray-400 card p-4 text-center">No transactions yet.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto flex flex-col gap-2 pr-1">
            {recentTransactions.map((t) => (
              <div key={t.id} className="card p-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-900">
                    {t.direction === "sent"
                      ? `→ ${t.toUser?.username || "Unknown"}`
                      : `← ${t.fromUser?.username || "Unknown"}`}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <p
                  className={`font-bold ${
                    t.direction === "sent" ? "text-gray-900" : "text-green-600"
                  }`}
                >
                  {t.direction === "sent" ? "-" : "+"}
                  {formatNaira(t.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
