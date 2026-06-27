// src/pages/ProfilePage.jsx — Live API Version
import { ProfileSkeleton } from "../components/ui/LoadingSpinner";
import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ListingCard from "../components/listings/ListingCard";
import { getListingsByUser } from "../services/listingService";
import { updateProfile } from "../services/authService";
import { FiUser, FiMapPin, FiInbox, FiPlus, FiCamera, FiEdit2, FiPhone, FiArrowRight } from "react-icons/fi";
import api from "../api/axios";

const ProfilePage = () => {
  const { id } = useParams();
  const { user: currentUser, setUser } = useAuth();

  const [seller, setSeller] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [upgradeStep, setUpgradeStep] = useState("idle"); // idle | form | verify
  const [upgradeData, setUpgradeData] = useState({ runEmail: "", matricNumber: "", otp: "" });
  const [upgradeError, setUpgradeError] = useState("");
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const fileInputRef = useRef(null);

  const handleRequestUpgrade = async () => {
    setUpgradeError("");
    if (!upgradeData.runEmail.endsWith("@run.edu.ng")) {
      setUpgradeError("Must be a valid RUN school email (@run.edu.ng)");
      return;
    }
    setUpgradeLoading(true);
    try {
      await api.post("/auth/upgrade-to-seller", { runEmail: upgradeData.runEmail });
      setUpgradeStep("verify");
    } catch (err) {
      setUpgradeError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleVerifyUpgrade = async () => {
    setUpgradeError("");
    setUpgradeLoading(true);
    try {
      const res = await api.post("/auth/upgrade-to-seller/verify", {
        runEmail: upgradeData.runEmail,
        otp: upgradeData.otp,
        matricNumber: upgradeData.matricNumber,
      });
      if (setUser) setUser(res.data.user);
      setSeller((prev) => ({ ...prev, role: "SELLER" }));
      setUpgradeStep("idle");
    } catch (err) {
      setUpgradeError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setUpgradeLoading(false);
    }
  };

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
        if (err.response?.status === 404) setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    try {
      const updated = await updateProfile({ avatar: file });
      setSeller((prev) => ({ ...prev, avatar: updated.avatar }));
      // Keep auth context in sync
      if (setUser) setUser((prev) => ({ ...prev, avatar: updated.avatar }));
    } catch (err) {
      console.error("Avatar upload failed", err);
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };



  if (loading) return <ProfileSkeleton />;

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
      {/* ── Profile Header ── */}
      <div className="card p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div
              className="w-20 h-20 bg-primary-100 rounded-full overflow-hidden
                            flex items-center justify-center"
            >
              {seller.avatar ? (
                <img
                  src={seller.avatar}
                  alt={seller.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <FiUser className="w-8 h-8 text-primary-600" />
              )}
            </div>

            {/* Camera button — only visible on own profile */}
            {isOwnProfile && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  aria-label="Change profile photo"
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full
                             bg-primary-600 text-white flex items-center justify-center
                             border-2 border-white shadow-sm
                             hover:bg-primary-700 transition-colors
                             disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {avatarUploading ? (
                    <span
                      className="w-3 h-3 border-2 border-white/40
                                     border-t-white rounded-full animate-spin"
                    />
                  ) : (
                    <FiCamera className="w-3.5 h-3.5" />
                  )}
                </button>
              </>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-gray-900">{seller.fullName}</h2>
              {isOwnProfile && (
                <span className="badge bg-primary-50 text-primary-700">
                  You
                </span>
              )}
              {seller.role === "BUYER" && (
                <span className="badge bg-blue-50 text-blue-600 border border-blue-200">
                  🛍️ Buyer
                </span>
              )}
              {seller.role === "SELLER" && (
                <span className="badge bg-green-50 text-green-700 border border-green-200">
                  🏪 Seller
                </span>
              )}
              {seller.role === "ADMIN" && (
                <span className="badge border"
                  style={{ background: "#fffbeb", color: "#92400e", borderColor: "#D4AF37" }}>
                  👑 Admin
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
              {seller.whatsapp && (
                <span className="flex items-center gap-1.5">
                  <FiPhone className="w-3.5 h-3.5" />
                  {seller.whatsapp}
                </span>
              )}
            </div>
          </div>

          {isOwnProfile && (
            <div className="flex items-center gap-2">
              <Link to={`/profile/${id}/edit`} aria-label="Edit profile" className="btn-secondary flex items-center justify-center"><FiEdit2 className="w-4 h-4" /></Link>
              <Link
                to="/create-listing"
                className="btn-primary flex items-center gap-2 whitespace-nowrap"
              >
                <FiPlus className="w-4 h-4" />
                New Listing
              </Link>
            </div>
          )}
        </div>

        {/* Become a Seller — buyers only, own profile */}
        {isOwnProfile && seller.role === "BUYER" && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            {upgradeStep === "idle" && (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Want to sell on TrendTribe?</p>
                  <p className="text-xs text-gray-400 mt-0.5">Verify your RUN student email to become a seller.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setUpgradeStep("form")}
                  className="btn-primary flex items-center gap-2 whitespace-nowrap"
                >
                  Become a Seller
                  <FiArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {upgradeStep === "form" && (
              <div className="flex flex-col gap-3 max-w-md">
                <p className="text-sm font-semibold text-gray-800">Enter your RUN school email</p>
                {upgradeError && <p className="text-xs text-red-500">{upgradeError}</p>}
                <input
                  type="email"
                  placeholder="you@run.edu.ng"
                  value={upgradeData.runEmail}
                  onChange={(e) => setUpgradeData((p) => ({ ...p, runEmail: e.target.value }))}
                  className="input"
                />
                <input
                  type="text"
                  placeholder="Matric number (optional)"
                  value={upgradeData.matricNumber}
                  onChange={(e) => setUpgradeData((p) => ({ ...p, matricNumber: e.target.value }))}
                  className="input"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setUpgradeStep("idle"); setUpgradeError(""); }} className="btn-secondary flex-1">Cancel</button>
                  <button type="button" onClick={handleRequestUpgrade} disabled={upgradeLoading} className="btn-primary flex-1">
                    {upgradeLoading ? "Sending..." : "Send Code"}
                  </button>
                </div>
              </div>
            )}

            {upgradeStep === "verify" && (
              <div className="flex flex-col gap-3 max-w-md">
                <p className="text-sm font-semibold text-gray-800">Enter the 6-digit code sent to {upgradeData.runEmail}</p>
                {upgradeError && <p className="text-xs text-red-500">{upgradeError}</p>}
                <input
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={upgradeData.otp}
                  onChange={(e) => setUpgradeData((p) => ({ ...p, otp: e.target.value }))}
                  className="input"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setUpgradeStep("form"); setUpgradeError(""); }} className="btn-secondary flex-1">Back</button>
                  <button type="button" onClick={handleVerifyUpgrade} disabled={upgradeLoading} className="btn-primary flex-1">
                    {upgradeLoading ? "Verifying..." : "Verify & Upgrade"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        </div>

      {/* ── Listings ── */}
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
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FiInbox className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500">No listings posted yet.</p>
        </div>
      )}    </div>
  );
};

export default ProfilePage;
