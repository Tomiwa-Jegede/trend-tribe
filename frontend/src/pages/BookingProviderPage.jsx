// src/pages/BookingProviderPage.jsx — Provider view: confirm/cancel bookings made on your services
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { getServiceBookings, confirmServiceBooking, completeServiceBooking, disputeServiceBooking, cancelServiceBooking } from "../services/serviceBookingService";
import { useToast } from "../context/ToastContext";
import { FiClock, FiCheck, FiX } from "react-icons/fi";
import InfoModal from "../components/ui/InfoModal";

export default function BookingProviderPage() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    try {
      const d = await getServiceBookings();
      setBookings(d?.asProvider || []);
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetch(); }, []);

  const handleConfirm = async (id) => {
    const b = bookings.find(x=>x.id===id);
    const fee = b ? Math.floor(b.amount*0.2) : 0;
    if (!confirm(`Confirm booking "${b?.listing?.title||id}"?\n\n20% fee ₦${(fee/100).toLocaleString()} will be charged from your Gig wallet\nBooker gets your WhatsApp\n\nContinue?`)) return;
    try {
      const r = await confirmServiceBooking(id);
      toast.success(r.message);
      fetch();
    } catch (e) {
      toast.error(e.response?.data?.error || "Confirm failed");
    }
  };
  const handleCancel = async (id) => {
    if (!confirm("Cancel booking? Full refund to booker.")) return;
    try {
      const r = await cancelServiceBooking(id);
      toast.success(r.message);
      fetch();
    } catch (e) {
      toast.error(e.response?.data?.error || "Cancel failed");
    }
  };

  const handleComplete = async (id) => {
    if (!confirm("Mark service as completed? Both you and booker must confirm to release escrow.")) return;
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
      <Helmet><title>Bookings — Provider — Trend Tribe</title></Helmet>
      <div className="flex items-center gap-2 mb-2">
        <h1 className="text-2xl font-extrabold text-gray-900">Bookings on Your Services</h1>
        <InfoModal title="How service bookings work">
          <p>Someone booked your service — you have 1 hour to act.</p>
          <ul className="list-disc ml-5">
            <li><b>Confirm:</b> You pay a 20% fee from your Gig wallet, escrow stays held, and booker gets your WhatsApp.</li>
            <li><b>Cancel:</b> Full refund to the booker’s Gig wallet, no fee.</li>
            <li><b>Timer:</b> If you don’t act in 1h, it auto-cancels to avoid keeping them waiting.</li>
            <li>After Confirm, both must mark as completed to release escrow — or log dispute for admin.</li>
          </ul>
        </InfoModal>
      </div>
      <p className="text-sm text-gray-600 mb-6">Confirm within 1h to release, or cancel for a full refund to the booker.</p>

      {disputeId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={()=>setDisputeId(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl" onClick={e=>e.stopPropagation()}>
            <h3 className="font-bold text-gray-900">Log dispute</h3>
            <p className="text-xs text-gray-500 mt-1">Escrow will be held for admin review.</p>
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
              <p className="font-medium text-gray-900">{b.listing?.title} · ₦{b.listing?.price} · {b.status}</p>
              <p className="text-xs text-gray-500">
                Booker @{b.booker?.username} · <FiClock className="inline w-3 h-3" /> expires{" "}
                {new Date(b.expiresAt).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">₦{(b.amount / 100).toLocaleString()} escrow · 20% fee on Confirm</p>
              {b.status === "PENDING" && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleConfirm(b.id)} className="btn-primary px-4 py-1.5 text-xs">
                    <FiCheck className="inline w-3 h-3" /> Confirm
                  </button>
                  <button onClick={() => handleCancel(b.id)} className="btn-secondary px-3 py-1.5 text-xs">
                    <FiX className="inline w-3 h-3" /> Cancel
                  </button>
                </div>
              )}
              {b.status === "CONFIRMED" && (
                <div className="flex flex-col gap-2 mt-3">
                  {b.providerCompletedAt ? (
                    <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-lg">You marked as completed — waiting for booker to confirm</p>
                  ) : (
                    <button onClick={() => handleComplete(b.id)} className="btn-primary px-4 py-1.5 text-xs bg-green-600 hover:bg-green-700">
                      <FiCheck className="inline w-3 h-3" /> Mark as completed
                    </button>
                  )}
                  {b.bookerCompletedAt && !b.providerCompletedAt && (
                    <p className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg">Booker marked as completed — tap above to release escrow</p>
                  )}
                  <button onClick={() => openDispute(b.id)} className="text-xs text-red-500 hover:text-red-600 underline text-left">Log dispute</button>
                  <p className="text-[11px] text-gray-400">Both must mark completed to release escrow</p>
                </div>
              )}
              {b.status === "DISPUTED" && (
                <p className="text-xs bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mt-3">Disputed — admin will review, escrow held</p>
              )}
              {b.status === "COMPLETED" && (
                <p className="text-xs bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg mt-3">Completed — escrow released to you</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
