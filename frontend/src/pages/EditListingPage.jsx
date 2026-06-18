// src/pages/EditListingPage.jsx

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ListingForm from "../components/listings/ListingForm";
import { updateListing } from "../services/listingService";
import { FiAlertCircle } from "react-icons/fi";
import axios from "axios";

const EditListingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notOwner, setNotOwner] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const res = await axios.get(`http://localhost:5050/api/listings/${id}`);
      const found = res.data.listing;

      if (!found) {
        setNotFound(true);
      } else if (found.seller.id !== user?.id) {
        setNotOwner(true);
      } else {
        setListing(found);
      }

      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [id, user]);

  // Mock submit handler — real API wiring in Step 18
const handleSubmit = async (formData) => {
  await updateListing(id, formData);
  navigate(`/listings/${id}`);
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
      </div>
    </div>
  );
};

export default EditListingPage;
