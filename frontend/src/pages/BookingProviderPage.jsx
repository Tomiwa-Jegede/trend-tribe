// src/pages/BookingProviderPage.jsx — Provider view: confirm/cancel bookings made on your services
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { getServiceBookings, confirmServiceBooking, cancelServiceBooking } from "../services/serviceBookingService";
import { useToast } from "../context/ToastContext";
import { FiClock, FiCheck, FiX } from "react-icons/fi";

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
      <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Bookings on Your Services</h1>
      <p className="text-sm text-gray-600 mb-6">Confirm within 1h to release, or cancel for a full refund to the booker.</p>

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
                    <FiCheck className="inline w-3 h-3" /> Confirm (pay 20%)
                  </button>
                  <button onClick={() => handleCancel(b.id)} className="btn-secondary px-3 py-1.5 text-xs">
                    <FiX className="inline w-3 h-3" /> Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
