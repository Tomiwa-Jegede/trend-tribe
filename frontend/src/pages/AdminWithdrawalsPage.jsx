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
    if (!confirm("Approve this withdrawal? Flutterwave will pay the bank now and deduct from user's Gig wallet.")) return;
    setActing(id);
    try {
      const { data } = await api.post(`/admin/gig-withdrawals/${id}/approve`);
      toast.success(data.message || "Approved — transfer initiated");
      fetch();
    } catch (e) { toast.error(e.response?.data?.error || e.response?.data?.details?.message || "Approve failed"); }
    finally { setActing(null); }
  };
  const handleReject = async (id) => {
    const reason = prompt("Reason for rejection (optional):") || "";
    if (!confirm("Reject? No money will be deducted, request will close.")) return;
    setActing(id);
    try {
      const { data } = await api.post(`/admin/gig-withdrawals/${id}/reject`, { reason });
      toast.success(data.message);
      fetch();
    } catch (e) { toast.error(e.response?.data?.error || "Reject failed"); }
    finally { setActing(null); }
  };

  return (
    <AdminLayout>
      <Helmet><title>Gig Withdrawals — Admin</title></Helmet>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-navy-900">Gig Withdrawals</h1>
        <select value={filter} onChange={e=>setFilter(e.target.value)} className="border border-sage-100 rounded-lg px-3 py-2 text-sm">
          <option value="PENDING">Pending</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
          <option value="ALL">All</option>
        </select>
      </div>
      <p className="text-sm text-gray-500 mb-4">User requests withdraw Gig Naira to bank (PIN verified, 1% fee). You approve → Flutterwave `POST /v3/transfers` sends to `bankCode/accountNumber`. If Flutterwave has no cash (T+1), it stays Pending — retry after settlement. Reject closes with no deduction.</p>

      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div> : withdrawals.length===0 ? <div className="card p-8 text-center text-gray-500">No {filter.toLowerCase()} withdrawals.</div> : (
        <div className="space-y-3">
          {withdrawals.map(w=> (
            <div key={w.id} className="card p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-gray-900">{formatNaira(w.amount)} {w.fee ? <span className="text-xs text-gray-500">fee {formatNaira(w.fee)}</span> : null} · {w.status} · {w.bankName || w.bankCode} {w.bankAccountNumber} {w.accountName ? `· ${w.accountName}` : ""}</p>
                  <p className="text-xs text-gray-500">By @{w.user?.username} {w.user?.fullName} · {w.user?.gigAccountNumber} · {new Date(w.createdAt).toLocaleString()} · Ref {w.reference || "—"}</p>
                </div>
                {w.status==="PENDING" && (
                  <div className="flex gap-2">
                    <button disabled={acting===w.id} onClick={()=>handleApprove(w.id)} className="btn-primary px-4 py-2 text-xs disabled:opacity-60">{acting===w.id?"Approving...":"Approve → Pay"}</button>
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
