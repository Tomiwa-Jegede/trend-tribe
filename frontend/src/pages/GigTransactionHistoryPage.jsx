// src/pages/GigTransactionHistoryPage.jsx — Full Gig Wallet transaction history (transfers + top-ups + withdrawals, debit red / credit green)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getGigTransfers } from "../services/gigService";
import { useToast } from "../context/ToastContext";
import { FiArrowLeft } from "react-icons/fi";
import api from "../api/axios";

const formatNaira = (kobo) => `₦${(kobo / 100).toLocaleString()}`;

export default function GigTransactionHistoryPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [tr, topups, withdrawals] = await Promise.all([
          getGigTransfers().catch(()=>({sent:[],received:[]})),
          api.get("/gigs/payments/history").then(r=>r.data).catch(()=>({purchases:[]})),
          api.get("/gigs/withdrawals").then(r=>r.data).catch(()=>({withdrawals:[]})),
        ]);
        const sent = (tr?.sent || []).map((t) => ({ ...t, direction: "sent", type: "transfer" }));
        const received = (tr?.received || []).map((t) => ({ ...t, direction: "received", type: "transfer" }));
        const tops = (topups.purchases || []).filter(p=>p.status==="SUCCESS").map(p=> ({ id: `topup-${p.id}`, direction: "received", type: "topup", amount: p.amount, createdAt: p.createdAt }));
        const wds = (withdrawals.withdrawals || []).flatMap(w=> {
          const total = w.amount + (w.fee || 0);
          if (w.status === "REJECTED" || w.status === "CANCELLED") {
            return [{ id: `wd-refund-${w.id}`, direction: "received", type: "refund", amount: total, fee: w.fee, total, createdAt: w.updatedAt || w.createdAt, status: w.status === "CANCELLED" ? "Cancelled" : "Refunded", reference: w.reference }];
          }
          return [{ id: `wd-${w.id}`, direction: "sent", type: "withdrawal", amount: w.amount, fee: w.fee, total, createdAt: w.createdAt, status: w.status, reference: w.reference }];
        });
        const merged = [...sent, ...received, ...tops, ...wds].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
        setTransactions(merged);
      } catch (e) {
        toast.error(e.response?.data?.error || "Failed to load transaction history");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="container-app py-6 sm:py-8 max-w-lg mx-auto">
      <Helmet>
        <title>Transaction History — Gig Wallet — Trend Tribe</title>
      </Helmet>

      <button
        onClick={() => navigate("/gigs/wallet")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <FiArrowLeft className="w-4 h-4" /> Back to wallet
      </button>

      <h1 className="text-xl font-extrabold text-gray-900 mb-6">Transaction History</h1>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-gray-400 card p-6 text-center">No transactions yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {transactions.map((t) => (
            <div key={t.id} className="card p-4 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-gray-900">
                  {t.type === "topup" ? "↑ Top up" : t.type === "refund" ? "↩ Withdrawal refunded" : t.type === "withdrawal" ? "↓ Withdrawal" : t.direction === "sent"
                    ? `→ ${t.toUser?.fullName || t.toUser?.username || "Unknown"}`
                    : `← ${t.fromUser?.fullName || t.fromUser?.username || "Unknown"}`}
                  {t.status && t.status !== "SUCCESS" && t.status !== "COMPLETED" ? ` · ${t.status === "PENDING" ? "In review" : t.status}` : t.type === "refund" ? ` · Refunded — ${formatNaira(t.amount)} back` : ""}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t.type === "topup" ? "Top up" : t.type === "refund" ? `Refund — ${formatNaira(t.amount)} fully refunded (was ${formatNaira(t.total)} debited)` : t.type === "withdrawal" ? `Withdrawal — ${formatNaira(t.amount)} + fee ${formatNaira(t.fee)} = ${formatNaira(t.total)}` : t.direction === "sent" ? `@${t.toUser?.username || "unknown"} — Debit` : `@${t.fromUser?.username || "unknown"} — Credit`}{" "}
                  · {new Date(t.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${t.direction === "sent" || t.type === "withdrawal" ? "text-red-600" : "text-green-600"}`}>
                  {t.direction === "sent" || t.type === "withdrawal" ? "-" : "+"}
                  {formatNaira(t.amount)}
                </p>
                {t.direction === "sent" && t.fee ? (
                  <p className="text-xs text-gray-400">fee ₦{(t.fee / 100).toFixed(2)}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
