// src/pages/ServiceBookingsPage.jsx — 1h timer, 20% provider fee on Confirm, escrow from booker, auto-cancel
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { getServiceBookings, confirmServiceBooking, completeServiceBooking, disputeServiceBooking, cancelServiceBooking } from "../services/serviceBookingService";
import { useToast } from "../context/ToastContext";
import { FiClock, FiCheck, FiX } from "react-icons/fi";

export default function ServiceBookingsPage() {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    try { const d = await getServiceBookings(); setData(d); } catch (e) { toast.error(e.response?.data?.error || "Failed"); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const handleConfirm = async (id) => { try { const r=await confirmServiceBooking(id); toast.success(r.message); fetch(); } catch(e){ toast.error(e.response?.data?.error||"Confirm failed"); } };
  const handleCancel = async (id) => { if(!confirm("Cancel booking? Full refund to booker.")) return; try { const r=await cancelServiceBooking(id); toast.success(r.message); fetch(); } catch(e){ toast.error(e.response?.data?.error||"Cancel failed"); } };

  if (loading) return <div className="container-app py-16 flex justify-center"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="container-app py-6 sm:py-8">
      <Helmet><title>Service Bookings — Trend Tribe</title></Helmet>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Service Bookings</h1>
      <p className="text-sm text-gray-600 mb-6">Payments held in Gig wallet — refunded if not confirmed within 1 hour.</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-bold text-gray-900 mb-3">As Provider — Confirm/Cancel within 1h</h2>
          {(data?.asProvider||[]).length===0 ? <p className="text-sm text-gray-500 card p-4">No bookings as provider.</p> : (
            <div className="space-y-3">
              {data.asProvider.map(b=> (
                <div key={b.id} className="card p-4">
                  <p className="font-medium text-gray-900">{b.listing?.title} · ₦{b.listing?.price} · {b.status}</p>
                  <p className="text-xs text-gray-500">Booker @{b.booker?.username} · <FiClock className="inline w-3 h-3"/> expires {new Date(b.expiresAt).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">₦{(b.amount/100).toLocaleString()} held · 20% fee from Gig wallet on Confirm</p>
                  {b.status==="PENDING" && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={()=>handleConfirm(b.id)} className="btn-primary px-4 py-1.5 text-xs"><FiCheck className="inline w-3 h-3"/> Confirm</button>
                      <button onClick={()=>handleCancel(b.id)} className="btn-secondary px-3 py-1.5 text-xs"><FiX className="inline w-3 h-3"/> Cancel</button>
                    </div>
                  )}
                  {b.status==="CONFIRMED" && (
                    <button onClick={()=>{ if(confirm("Mark completed? Escrow will be released to you.")) completeServiceBooking(b.id).then(r=>{ toast.success(r.message); fetch(); }).catch(e=> toast.error(e.response?.data?.error||"Complete failed")); }} className="btn-primary px-4 py-1.5 text-xs mt-3 bg-green-600 hover:bg-green-700">Mark as completed</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="font-bold text-gray-900 mb-3">As Booker — you booked</h2>
          {(data?.asBooker||[]).length===0 ? <p className="text-sm text-gray-500 card p-4">No bookings as booker.</p> : (
            <div className="space-y-3">
              {data.asBooker.map(b=> (
                <div key={b.id} className="card p-4">
                  <p className="font-medium text-gray-900">{b.listing?.title} · ₦{b.listing?.price} · {b.status}</p>
                  <p className="text-xs text-gray-500">Provider @{b.provider?.username} {b.provider?.whatsapp && `· ${b.provider.whatsapp}`} · {new Date(b.createdAt).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">₦{(b.amount/100).toLocaleString()} held · awaiting provider (1 hour)</p>
                  {b.status==="PENDING" && <button onClick={()=>handleCancel(b.id)} className="btn-secondary px-3 py-1.5 text-xs mt-2">Cancel booking</button>}
                  {b.status==="CONFIRMED" && (
                    <div className="flex flex-col gap-2 mt-2">
                      <button onClick={()=>{ if(confirm("Mark service as completed? Escrow will be released to provider.")) completeServiceBooking(b.id).then(r=>{ toast.success(r.message); fetch(); }).catch(e=> toast.error(e.response?.data?.error||"Complete failed")); }} className="btn-secondary px-4 py-1.5 text-xs border-green-200 text-green-700 hover:bg-green-50">Mark as completed — release escrow</button>
                      <p className="text-[11px] text-gray-400">Tap when service is done — funds go to provider</p>
                    </div>
                  )}
                  {b.status==="CONFIRMED" && b.provider?.whatsapp && <a href={`https://wa.me/${b.provider.whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noreferrer" className="btn-primary px-4 py-1.5 text-xs mt-2 inline-block">Chat Provider</a>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
