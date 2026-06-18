// src/pages/ProfilePage.jsx — Live API Version
import { ProfileSkeleton } from "../components/ui/LoadingSpinner";
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ListingCard from "../components/listings/ListingCard";
import ListingCardSkeleton from "../components/listings/ListingCardSkeleton";
import { getListingsByUser } from "../services/listingService";
import { FiUser, FiMapPin, FiCalendar, FiInbox, FiPlus } from "react-icons/fi";

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

const ProfilePage = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();

  const [seller, setSeller] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const isOwnProfile = currentUser?.id === parseInt(id, 10);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const data = await getListingsByUser(id);
        setSeller(data.seller);
        setListings(data.listings);
      } catch (err) {
        if (err.response?.status === 404) {
          setNotFound(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (notFound) {
    return (
      <div className="container-app py-24 text-center">
        <span className="text-5xl">👤</span>
        <h2 className="text-gray-900 mt-6 mb-2">Profile Not Found</h2>
        <p className="text-gray-500 mb-6">This user doesn't exist.</p>
        <Link to="/marketplace" className="btn-primary inline-flex">
          Browse Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="container-app py-10">
      {/* ── Profile Header ────────────────────────────── */}
      <div className="card p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div
            className="w-20 h-20 bg-primary-100 rounded-full flex
                          items-center justify-center flex-shrink-0"
          >
            <FiUser className="w-8 h-8 text-primary-600" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-gray-900">{seller.fullName}</h2>
              {isOwnProfile && (
                <span className="badge bg-primary-50 text-primary-700">
                  You
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm mb-3">@{seller.username}</p>

            {seller.bio && (
              <p className="text-gray-600 text-sm mb-3 max-w-xl">
                {seller.bio}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
              {seller.school && (
                <span className="flex items-center gap-1.5">
                  <FiMapPin className="w-3.5 h-3.5" />
                  {seller.school}
                </span>
              )}
            </div>
          </div>

          {isOwnProfile && (
            <Link
              to="/create-listing"
              className="btn-primary flex items-center
                                                    gap-2 whitespace-nowrap"
            >
              <FiPlus className="w-4 h-4" />
              New Listing
            </Link>
          )}
        </div>
      </div>

      {/* ── Listings Section ──────────────────────────── */}
      <div className="mb-6">
        <h3 className="text-gray-900">
          {isOwnProfile ? "Your Listings" : `${seller.fullName}'s Listings`}
          <span className="text-gray-400 font-normal text-base ml-2">
            ({listings.length})
          </span>
        </h3>
      </div>

      {listings.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={{ ...listing, seller }} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="w-14 h-14 bg-gray-100 rounded-full flex items-center
                          justify-center mb-4"
          >
            <FiInbox className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500">No listings posted yet.</p>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
