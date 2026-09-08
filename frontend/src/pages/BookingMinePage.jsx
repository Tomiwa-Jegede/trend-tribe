// src/pages/BookingMinePage.jsx — Booker view: your bookings, confirmed or not
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { getServiceBookings, cancelServiceBooking, completeServiceBooking, disputeServiceBooking } from "../services/serviceBookingService";
import { useToast } from "../context/ToastContext";
import InfoModal from "../components/ui/InfoModal";

export default function BookingMinePage() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    try {
      const d = await getServiceBookings();
      setBookings(d?.asBooker || []);
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleCancel = async (id) => {
    if (!confirm("Cancel this booking?")) return;
    try {
      const r = await cancelServiceBooking(id);
      toast.success(r.message);
      fetch();
    } catch (e) {
      toast.error(e.response?.data?.error || "Cancel failed");
    }
  };

  const handleComplete = async (id) => {
    if (!confirm("Mark service as completed? Both you and provider must confirm to release escrow.")) return;
    try {
      const r = await completeServiceBooking(id);
      toast.success(r.message);
      fetch();
    } catch (e) {
      toast.error(e.response?.data?.error || "Complete failed");
    }
  };

  const [disputeId, setDisputeId] = useState(null);
  const [disputeReason, setDisputeReason] = useState("NOT_DONE");
  const [disputeDesc, setDisputeDesc] = useState("");
  const [disputing, setDisputing] = useState(false);

  const openDispute = (id) => { setDisputeId(id); setDisputeReason("NOT_DONE"); setDisputeDesc(""); };
  const handleDispute = async () => {
    if (!disputeId) return;
    setDisputing(true);
    try {
      const r = await disputeServiceBooking(disputeId, { reason: disputeReason, description: disputeDesc });
      toast.success(r.message);
      setDisputeId(null);
      fetch();
    } catch (e) {
      toast.error(e.response?.data?.error || "Dispute failed");
    } finally { setDisputing(false); }
  };

  if (loading) {
    return (
      <div className="container-app py-16 flex justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="container-app py-6 sm:py-8 max-w-lg mx-auto">
      <Helmet><title>My Bookings — Trend Tribe</title></Helmet>
      <div className="flex items-center gap-2 mb-2">
        <h1 className="text-2xl font-extrabold text-gray-900">My Bookings</h1>
        <InfoModal title="How your bookings work">
          <p>You booked a service — here’s what happens.</p>
          <ul className="list-disc ml-5">
            <li>Your payment is held safely until the provider responds.</li>
            <li><b>Provider confirms</b> within 1 hour → you get their WhatsApp to arrange the service. Escrow stays held.</li>
            <li><b>After service</b> — both you and provider must tap <b>Mark as completed</b> to release escrow to provider.</li>
            <li><b>Provider cancels</b> or <b>timer hits 1 hour</b> → you get a full refund automatically.</li>
            <li>If something goes wrong, tap <b>Log dispute</b> — admin will review, escrow held.</li>
          </ul>
        </InfoModal>
      </div>
      <p className="text-sm text-gray-600 mb-6">Bookings you've made, and whether the provider has confirmed.</p>
      {disputeId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={()=>setDisputeId(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl" onClick={e=>e.stopPropagation()}>
            <h3 className="font-bold text-gray-900">Log dispute</h3>
            <p className="text-xs text-gray-500 mt-1">Escrow will be held for admin review. Choose reason.</p>
            <label className="text-xs font-semibold text-gray-700 mt-3 block">Reason</label>
            <select value={disputeReason} onChange={e=>setDisputeReason(e.target.value)} className="input-field mt-1">
              <option value="NOT_DONE">Not done / no-show</option>
              <option value="POOR_QUALITY">Poor quality</option>
              <option value="NO_SHOW">Provider didn't show</option>
              <option value="OTHER">Other</option>
            </select>
            <label className="text-xs font-semibold text-gray-700 mt-3 block">Details (optional)</label>
            <textarea value={disputeDesc} onChange={e=>setDisputeDesc(e.target.value)} rows={3} placeholder="Describe the issue..." className="input-field mt-1" />
            <div className="flex gap-2 mt-4">
              <button onClick={()=>setDisputeId(null)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
              <button disabled={disputing} onClick={handleDispute} className="flex-1 btn-primary py-2.5 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-60">{disputing?"Submitting...":"Submit dispute"}</button>
            </div>
          </div>
        </div>
      )}

      {bookings.length === 0 ? (
        <p className="text-sm text-gray-500 card p-4 text-center">No bookings yet.</p>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="card p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">{b.listing?.title} · ₦{b.listing?.price}</p>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    b.status === "CONFIRMED"
                      ? "bg-green-50 text-green-700"
                      : b.status === "PENDING"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {b.status === "CONFIRMED" ? "Confirmed" : b.status === "PENDING" ? "Not confirmed" : b.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Provider @{b.provider?.username}
                {b.provider?.whatsapp && ` · ${b.provider.whatsapp}`} · {new Date(b.createdAt).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">₦{(b.amount / 100).toLocaleString()} escrow · 1h response window</p>
              {b.status === "PENDING" && (
                <button onClick={() => handleCancel(b.id)} className="btn-secondary px-3 py-1.5 text-xs mt-2">
                  Cancel booking
                </button>
              )}
              {b.status === "CONFIRMED" && (
                <div className="flex flex-col gap-2 mt-2">
                  {b.provider?.whatsapp && (
                    <a
                      href={`https://wa.me/${b.provider.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary px-4 py-1.5 text-xs inline-block text-center"
                    >
                      Chat Provider
                    </a>
                  )}
                  {b.bookerCompletedAt ? (
                    <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-lg">You marked as completed — waiting for provider to confirm to release escrow</p>
                  ) : (
                    <button onClick={() => handleComplete(b.id)} className="btn-secondary px-4 py-1.5 text-xs border-green-200 text-green-700 hover:bg-green-50">
                      Mark as completed
                    </button>
                  )}
                  {b.providerCompletedAt && !b.bookerCompletedAt && (
                    <p className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg">Provider marked as completed — tap above to release escrow</p>
                  )}
                  <button onClick={() => openDispute(b.id)} className="text-xs text-red-500 hover:text-red-600 underline text-left">Log dispute</button>
                  <p className="text-[11px] text-gray-400">Both must mark completed to release escrow</p>
                </div>
              )}
              {b.status === "DISPUTED" && (
                <p className="text-xs bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mt-2">Disputed — admin will review, escrow held</p>
              )}
              {b.status === "COMPLETED" && (
                <p className="text-xs bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg mt-2">Completed — escrow released to provider</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}