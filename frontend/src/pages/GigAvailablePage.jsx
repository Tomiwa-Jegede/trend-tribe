// src/pages/GigAvailablePage.jsx — Browse open gigs, claim only. No other actions.
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { getGigs, claimGig } from "../services/gigService";
import { useToast } from "../context/ToastContext";
import { FiClock } from "react-icons/fi";

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
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-6">Available Gigs</h1>

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
