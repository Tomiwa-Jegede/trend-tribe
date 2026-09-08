// src/pages/GigAvailablePage.jsx — Browse open gigs, claim only. No other actions.
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { getGigs, claimGig } from "../services/gigService";
import { useToast } from "../context/ToastContext";
import { FiClock } from "react-icons/fi";
import InfoModal from "../components/ui/InfoModal";

const formatNaira = (kobo) => `\u20a6${(kobo / 100).toLocaleString()}`;

export default function GigAvailablePage() {
  const { toast } = useToast();
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const data = await getGigs({ limit: 50 });
      setGigs((data.gigs || []).filter((g) => g.status === "OPEN"));
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to load gigs");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetch(); }, []);

  const handleClaim = async (id) => {
    setClaimingId(id);
    try {
      const res = await claimGig(id);
      toast.success("Claimed — WhatsApp: " + res.whatsapp);
      if (res.whatsapp) window.open(`https://wa.me/${res.whatsapp.replace(/\\D/g, "")}`, "_blank");
      fetch();
    } catch (e) {
      toast.error(e.response?.data?.error || "Claim failed");
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="container-app py-6 sm:py-8">
      <Helmet><title>Available Gigs — Trend Tribe</title></Helmet>
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Available Gigs</h1>
        <InfoModal title="How Available Gigs work">
          <p>These are tasks posted by other students that no one has claimed yet.</p>
          <ul className="list-disc ml-5">
            <li><b>Claim</b> any gig for free — you’ll get the poster’s WhatsApp to chat.</li>
            <li>Your claim is instant, the gig disappears from this list.</li>
            <li>Do the work off-app, then the poster taps <b>Confirm</b> to release 80% of the Naira to you.</li>
            <li>If the poster never confirms in 72h, it auto-pays you.</li>
          </ul>
        </InfoModal>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : gigs.length === 0 ? (
        <div className="text-center py-16 card text-gray-500">No open gigs right now.</div>
      ) : (
        <div className="grid gap-4">
          {gigs.map((g) => (
            <div key={g.id} className="card p-4">
              <p className="font-semibold text-gray-900 break-words">{g.description}</p>
              <p className="text-sm text-primary-600 font-extrabold mt-1">
                {formatNaira(g.amount)} · <FiClock className="inline w-3 h-3" />{" "}
                {new Date(g.expiresAt).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                By @{g.poster?.username} · WhatsApp hidden until claimed
              </p>
              <button
                onClick={() => handleClaim(g.id)}
                disabled={claimingId === g.id}
                className="btn-primary px-4 py-1.5 text-xs mt-3 disabled:opacity-60"
              >
                {claimingId === g.id ? "Claiming..." : "Claim — get WhatsApp"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
