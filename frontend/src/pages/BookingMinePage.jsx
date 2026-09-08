// src/pages/BookingMinePage.jsx — Booker view: your bookings, confirmed or not
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { getServiceBookings, cancelServiceBooking } from "../services/serviceBookingService";
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
            <li>Your Naira is held safely until the provider decides.</li>
            <li><b>Provider confirms</b> in 1h → you get their WhatsApp, 20% fee is on them.</li>
            <li><b>Provider cancels</b> or <b>timer hits 1h</b> → you get a full refund, no fee.</li>
            <li>After confirm, chat on WhatsApp to arrange — no more steps in-app.</li>
          </ul>
        </InfoModal>
      </div>
      <p className="text-sm text-gray-600 mb-6">Bookings you've made, and whether the provider has confirmed.</p>
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
              {b.status === "CONFIRMED" && b.provider?.whatsapp && (
                <a
                  href={`https://wa.me/${b.provider.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary px-4 py-1.5 text-xs mt-2 inline-block"
                >
                  Chat Provider
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}