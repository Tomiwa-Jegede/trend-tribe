// src/pages/CreateListingPage.jsx — Live API Version

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ListingForm from "../components/listings/ListingForm";
import { createListing } from "../services/listingService";
import Alert from "../components/ui/Alert";
import BuyTokens from "../components/ui/BuyTokens";
const CreateListingPage = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
const [pendingListing, setPendingListing] = useState(null); // { formData, tokenBalance } | null
  const [confirming, setConfirming] = useState(false);
  const [buyTokensOpen, setBuyTokensOpen] = useState(false);

  // ── Block buyer accounts ─────────────────────────────────────
  if (user && user.role === "BUYER") {
    return (
      <div className="container-app py-10 max-w-2xl">
        <div className="card p-8 text-center">
          <Alert
            type="error"
            message="Only seller accounts can create listings."
          />
          <Link
            to={`/profile/${user.slug || user.id}`}
            className="text-primary-600 font-semibold mt-4 inline-block"
          >
            Upgrade to Seller →
          </Link>
        </div>
      </div>
    );
  }

  // ── Block unverified users before they ever see the form ────
  if (user && !user.isVerified) {
    return (
      <div className="container-app py-10 max-w-2xl">
        <div className="card p-8 text-center">
          <Alert
            type="error"
            message="Please verify your email before creating a listing."
          />
          <Link
            to="/verify-email"
            className="text-primary-600 font-semibold mt-4 inline-block"
          >
            Verify now →
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (formData) => {
    const result = await createListing(formData);

    if (!result.ok) {
      if (result.needsTokenConfirm) {
        setPendingListing({ formData, tokenBalance: result.tokenBalance, totalCost: result.totalCost ?? 1, error: result.error });
      }
      throw { response: { data: { error: result.error } } };
    }

    refreshUser();
    navigate(`/listings/${result.listing.slug || result.listing.id}`);
  };

  const handleConfirmSpend = async () => {
    if (!pendingListing) return;
    setConfirming(true);
    try {
      const result = await createListing(pendingListing.formData, true);
      if (result.ok) {
        refreshUser();
        navigate(`/listings/${result.listing.slug || result.listing.id}`);
      }
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="container-app py-10 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-gray-900">Create a Listing</h1>
        <p className="text-gray-500 mt-2">
          Fill in the details below to list your item on the marketplace.
        </p>
      </div>

      <div className="card p-8">
        <ListingForm
          onSubmit={handleSubmit}
          submitLabel="Post Listing"
          loadingLabel="Posting..."
        />
        {pendingListing && (
          pendingListing.tokenBalance >= (pendingListing.totalCost ?? 1) ? (
            <button
              onClick={handleConfirmSpend}
              disabled={confirming}
              className="mt-3 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-full px-4 py-2 hover:bg-primary-100 disabled:opacity-50"
            >
              {confirming ? "Posting..." : pendingListing.error || `This will use ${pendingListing.totalCost ?? 1} token${(pendingListing.totalCost ?? 1) !== 1 ? "s" : ""} — confirm & post`}
            </button>
          ) : (
            <button
              onClick={() => setBuyTokensOpen(true)}
              className="mt-3 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-full px-4 py-2 hover:bg-primary-100"
            >
              Out of tokens — buy more ({pendingListing.error || `${pendingListing.totalCost ?? 1} needed`})
            </button>
          )
        )}
        <BuyTokens isOpen={buyTokensOpen} onClose={() => setBuyTokensOpen(false)} />
      </div>
    </div>
  );
};

export default CreateListingPage;
