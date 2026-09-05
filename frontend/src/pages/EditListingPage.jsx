// src/pages/EditListingPage.jsx

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ListingForm from "../components/listings/ListingForm";
import { updateListing, getListingById } from "../services/listingService";
import { FiAlertCircle } from "react-icons/fi";
import BuyTokens from "../components/ui/BuyTokens";

const EditListingPage = () => {
  const { slug } = useParams();
  const id = slug;
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [pendingEdit, setPendingEdit] = useState(null); // { formData, tokenBalance, totalCost, error }
  const [confirming, setConfirming] = useState(false);
  const [buyTokensOpen, setBuyTokensOpen] = useState(false);

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notOwner, setNotOwner] = useState(false);

    useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const found = await getListingById(id);
        if (!found) {
          setNotFound(true);
        } else if (user && found.seller.id !== user.id) {
          setNotOwner(true);
        } else if (!user) {
          // auth still loading — retry once auth resolves rather than marking notOwner
          setListing(found);
        } else {
          setListing(found);
        }
      } catch (err) {
        setNotFound(true);
      }
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [id, user]);

  const handleSubmit = async (formData) => {
    try {
      const updated = await updateListing(id, formData);
      refreshUser?.();
      navigate(`/listings/${updated?.slug || listing?.slug || id}`);
    } catch (err) {
      const data = err.response?.data;
      if (data?.needsTokenConfirm) {
        setPendingEdit({ formData, tokenBalance: data.tokenBalance, totalCost: data.totalCost ?? 1, error: data.error });
      }
      throw err;
    }
  };

  const handleConfirmSpend = async () => {
    if (!pendingEdit) return;
    setConfirming(true);
    try {
      const updated = await updateListing(id, { ...pendingEdit.formData, confirmSpend: true });
      refreshUser?.();
      navigate(`/listings/${updated?.slug || listing?.slug || id}`);
    } catch (err) {
      // keep pending for retry
      throw err;
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="container-app py-10 max-w-2xl">
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container-app py-24 text-center">
        <span className="text-5xl">🔍</span>
        <h2 className="text-gray-900 mt-6 mb-2">Listing Not Found</h2>
        <Link to="/marketplace" className="btn-primary inline-flex mt-4">
          Browse Marketplace
        </Link>
      </div>
    );
  }

  if (notOwner) {
    return (
      <div className="container-app py-24 text-center">
        <div
          className="w-16 h-16 bg-red-100 rounded-full flex items-center
                        justify-center mx-auto mb-6"
        >
          <FiAlertCircle className="w-7 h-7 text-red-500" />
        </div>
        <h2 className="text-gray-900 mb-2">Not Authorized</h2>
        <p className="text-gray-500 mb-6">
          You can only edit listings that you own.
        </p>
        <Link to="/marketplace" className="btn-primary inline-flex">
          Browse Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="container-app py-10 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-gray-900">Edit Listing</h1>
        <p className="text-gray-500 mt-2">Update your listing details below.</p>
      </div>

      <div className="card p-8">
        <ListingForm
          initialData={listing}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
          loadingLabel="Saving..."
        />
        {pendingEdit && (
          pendingEdit.tokenBalance >= (pendingEdit.totalCost ?? 1) ? (
            <button
              onClick={handleConfirmSpend}
              disabled={confirming}
              className="mt-3 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-full px-4 py-2 hover:bg-primary-100 disabled:opacity-50"
            >
              {confirming ? "Saving..." : pendingEdit.error || `This will use ${pendingEdit.totalCost ?? 1} token${(pendingEdit.totalCost ?? 1) !== 1 ? "s" : ""} — confirm & save`}
            </button>
          ) : (
            <button
              onClick={() => setBuyTokensOpen(true)}
              className="mt-3 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-full px-4 py-2 hover:bg-primary-100"
            >
              Out of tokens — buy more ({pendingEdit.error || `${pendingEdit.totalCost ?? 1} needed`})
            </button>
          )
        )}
        <BuyTokens isOpen={buyTokensOpen} onClose={() => setBuyTokensOpen(false)} />
      </div>
    </div>
  );
};

export default EditListingPage;
