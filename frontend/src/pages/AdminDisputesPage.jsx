// src/pages/AdminDisputesPage.jsx — Admin: view DISPUTED gigs + service bookings, resolve
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import api from "../api/axios";
import { useToast } from "../context/ToastContext";
import AdminLayout from "../components/admin/AdminLayout";

const formatNaira = (kobo) => `₦${(kobo/100).toLocaleString()}`;

export default function AdminDisputesPage() {
  const { toast } = useToast();
  const [data, setData] = useState({ gigs: [], bookings: [] });
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/disputes");
      setData(data);
    } catch (e) { toast.error(e.response?.data?.error || "Failed to load disputes"); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const resolve = async (type, id, decision) => {
    if (!confirm(`Resolve ${type} #${id} as ${decision}?`)) return;
    setActing(`${type}-${id}-${decision}`);
    try {
      const { data } = await api.post("/admin/disputes/resolve", { type, id, decision });
      toast.success(data.message);
      fetch();
    } catch (e) { toast.error(e.response?.data?.error || "Resolve failed"); }
    finally { setActing(null); }
  };

  return (
    <AdminLayout>
      <Helmet><title>Disputes — Admin</title></Helmet>
      <h1 className="text-xl font-bold text-navy-900 mb-2">Disputes</h1>
      <p className="text-sm text-gray-500 mb-6">Gigs and service bookings with status DISPUTED — escrow held. Choose to refund, release, or split.</p>

      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div> : (
        <>
          <h2 className="font-bold text-gray-900 mb-2">Gigs — DISPUTED ({data.gigs.length})</h2>
          {data.gigs.length===0 ? <p className="text-sm text-gray-400 card p-4 mb-6">No gig disputes.</p> : (
            <div className="space-y-3 mb-8">
              {data.gigs.map(g=> (
                <div key={g.id} className="card p-4">
                  <p className="font-bold text-gray-900">Gig #{g.id} · {g.description?.slice(0,80)} · {formatNaira(g.amount)} escrow · 20% fee {formatNaira(Math.floor(g.amount*0.2/100)*100)}</p>
                  <p className="text-xs text-gray-500">Poster @{g.poster?.username} · Claimer @{g.claimer?.username || "—"} · {new Date(g.updatedAt).toLocaleString()}</p>
                  <div className="flex gap-2 mt-3">
                    <button disabled={acting===`gig-${g.id}-refund`} onClick={()=>resolve("gig", g.id, "refund")} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-60">Refund poster</button>
                    <button disabled={acting===`gig-${g.id}-release`} onClick={()=>resolve("gig", g.id, "release")} className="btn-primary px-3 py-1.5 text-xs disabled:opacity-60">Release to claimer (80%)</button>
                    <button disabled={acting===`gig-${g.id}-split`} onClick={()=>resolve("gig", g.id, "split")} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-60">Split 50/50</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 className="font-bold text-gray-900 mb-2">Service bookings — DISPUTED ({data.bookings.length})</h2>
          {data.bookings.length===0 ? <p className="text-sm text-gray-400 card p-4">No service disputes.</p> : (
            <div className="space-y-3">
              {data.bookings.map(b=> (
                <div key={b.id} className="card p-4">
                  <p className="font-bold text-gray-900">Booking #{b.id} · {b.listing?.title} · {formatNaira(b.amount)} escrow</p>
                  <p className="text-xs text-gray-500">Booker @{b.booker?.username} · Provider @{b.provider?.username} · {new Date(b.updatedAt).toLocaleString()} {b.disputeReason ? `· Reason: ${b.disputeReason}` : ""}</p>
                  {b.disputeDescription && <p className="text-xs text-gray-600 mt-1">“{b.disputeDescription}”</p>}
                  <div className="flex gap-2 mt-3">
                    <button disabled={acting===`service-${b.id}-refund`} onClick={()=>resolve("service", b.id, "refund")} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-60">Refund booker</button>
                    <button disabled={acting===`service-${b.id}-release`} onClick={()=>resolve("service", b.id, "release")} className="btn-primary px-3 py-1.5 text-xs disabled:opacity-60">Release to provider</button>
                    <button disabled={acting===`service-${b.id}-split`} onClick={()=>resolve("service", b.id, "split")} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-60">Split 50/50</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
