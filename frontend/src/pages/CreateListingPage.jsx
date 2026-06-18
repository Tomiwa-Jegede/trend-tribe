// src/pages/CreateListingPage.jsx — Live API Version

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ListingForm from "../components/listings/ListingForm";
import { createListing } from "../services/listingService";
import Alert from "../components/ui/Alert";

const CreateListingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

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
    const listing = await createListing(formData);
    navigate(`/listings/${listing.id}`);
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
      </div>
    </div>
  );
};

export default CreateListingPage;
