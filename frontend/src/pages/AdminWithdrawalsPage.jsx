// src/pages/AdminWithdrawalsPage.jsx — Admin: approve/reject Gig withdrawals → Flutterwave transfer
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import api from "../api/axios";
import { useToast } from "../context/ToastContext";
import AdminLayout from "../components/admin/AdminLayout";

const formatNaira = (kobo) => `₦${(kobo/100).toLocaleString()}`;

export default function AdminWithdrawalsPage() {
  const { toast } = useToast();
  const [withdrawals, setWithdrawals] = useState([]);
  const [filter, setFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/gig-withdrawals", { params: { status: filter } });
      setWithdrawals(data.withdrawals || []);
    } catch (e) { toast.error(e.response?.data?.error || "Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, [filter]);

  const handleApprove = async (id) => {
    if (!confirm("Confirm pay? This will mark as COMPLETED and notify user (pay via bank app).")) return;
    setActing(id);
    try {
      const { data } = await api.post(`/admin/gig-withdrawals/${id}/approve`);
      toast.success(data.message || "Confirmed — payout completed");
      fetch();
    } catch (e) { toast.error(e.response?.data?.error || e.response?.data?.details?.message || "Confirm failed"); }
    finally { setActing(null); }
  };
  const handleReject = async (id) => {
    if (!confirm("Reject this withdrawal? The full amount (₦ + fee) will be refunded to the user's Gig wallet.")) return;
    setActing(id);
    try {
      const { data } = await api.post(`/admin/gig-withdrawals/${id}/reject`, {});
      toast.success(data.message || "Rejected — fully refunded");
      fetch();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || e.message || "Reject failed");
    } finally { setActing(null); }
  };

  return (
    <AdminLayout>
      <Helmet><title>Gig Withdrawals — Admin</title></Helmet>
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-xl font-bold text-navy-900">Gig Withdrawals</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={async()=>{
              try{
                const res = await api.get("/admin/gig-withdrawals/export", { params: { status: filter }, responseType: "blob" });
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const a = document.createElement("a");
                a.href = url;
                a.download = `trend-tribe-payouts-${new Date().toISOString().slice(0,10)}.csv`;
                document.body.appendChild(a); a.click(); a.remove();
                window.URL.revokeObjectURL(url);
                toast.success(`CSV downloaded — ${withdrawals.length} rows — Account number,Bank,Amount,Description`);
              }catch(e){ toast.error(e.response?.data?.error || "Download failed"); }
            }}
            disabled={withdrawals.length===0}
            className="border border-indigo-200 bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Download CSV
          </button>
          <select value={filter} onChange={e=>setFilter(e.target.value)} className="border border-sage-100 rounded-lg px-3 py-2 text-sm">
            <option value="PENDING">In review</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
            <option value="ALL">All</option>
          </select>
        </div>
      </div>
      {/* Total pending — addition of all pending (only amount to be sent, fee is removed from user account) */}
      {filter === "PENDING" && !loading && withdrawals.length > 0 && (() => {
        const totalKobo = withdrawals.reduce((s,w)=> s + (w.amount||0), 0);
        return (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-800">Total pending</p>
              <p className="text-lg font-extrabold text-navy-900">{formatNaira(totalKobo)} <span className="text-xs font-bold text-amber-700">· {withdrawals.length} {withdrawals.length===1?"withdrawal":"withdrawals"}</span></p>
              <p className="text-xs text-gray-500">Addition of all pending — amount to be sent to users (1% fee already removed from user balance)</p>
            </div>
            <span className="text-xs bg-white border border-amber-200 text-amber-800 px-3 py-1 rounded-full font-bold">In review</span>
          </div>
        );
      })()}

      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div> : withdrawals.length===0 ? <div className="card p-8 text-center text-gray-500">No {filter.toLowerCase()} withdrawals.</div> : (
        <div className="space-y-3">
          {withdrawals.map(w=> (
            <div key={w.id} className="card p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-gray-900">{formatNaira(w.amount)} · {w.status === "PENDING" ? "In review" : w.status} · {w.bankName || w.bankCode} {w.bankAccountNumber} {w.accountName ? `· ${w.accountName}` : ""}</p>
                  <p className="text-xs text-gray-500">By @{w.user?.username} {w.user?.fullName} · {w.user?.gigAccountNumber} · {new Date(w.createdAt).toLocaleString()} · Ref {w.reference || "—"}</p>
                </div>
                {w.status==="PENDING" && (
                  <div className="flex gap-2">
                    <button disabled={acting===w.id} onClick={()=>handleApprove(w.id)} className="btn-primary px-4 py-2 text-xs disabled:opacity-60">{acting===w.id?"Confirming...":"Confirm Pay"}</button>
                    <button disabled={acting===w.id} onClick={()=>handleReject(w.id)} className="btn-secondary px-4 py-2 text-xs disabled:opacity-60">Reject</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
