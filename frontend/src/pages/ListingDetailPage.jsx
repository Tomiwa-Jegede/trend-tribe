// src/pages/ListingDetailPage.jsx — Live API Version
import { DetailSkeleton } from "../components/ui/LoadingSpinner";
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Alert from "../components/ui/Alert";
import { getListingById, deleteListing } from "../services/listingService";
import {
  FiMapPin,
  FiUser,
  FiArrowLeft,
  FiEdit2,
  FiTrash2,
  FiMessageCircle,
  FiClock,
  FiChevronRight,
} from "react-icons/fi";

const CONDITION_STYLES = {
  NEW: "bg-green-100 text-green-700",
  LIKE_NEW: "bg-blue-100 text-blue-700",
  GOOD: "bg-yellow-100 text-yellow-700",
  FAIR: "bg-orange-100 text-orange-700",
  POOR: "bg-red-100 text-red-700",
};
const CONDITION_LABELS = {
  NEW: "New",
  LIKE_NEW: "Like New",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
};

const formatPrice = (price) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(price);

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const ListingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  // ── Fetch real listing ───────────────────────────────────
  useEffect(() => {
    const fetchListing = async () => {
      setLoading(true);
      setNotFound(false);
      setError("");
      setActiveImage(0);

      try {
        const data = await getListingById(id);
        setListing(data);
      } catch (err) {
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          setError("Failed to load listing. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id]);

  const isOwner = isAuthenticated && listing && user?.id === listing.seller.id;

  // ── Real delete ───────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteListing(listing.id);
      navigate("/marketplace");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete listing.");
      setShowDeleteDialog(false);
    } finally {
      setDeleting(false);
    }
  };

  // ── Loading state ────────────────────────────────────────
  if (loading) {
    return (
      <DetailSkeleton />
    );
  }

  // ── Not found state ──────────────────────────────────────
  if (notFound) {
    return (
      <div className="container-app py-24 text-center">
        <span className="text-5xl">🔍</span>
        <h2 className="text-gray-900 mt-6 mb-2">Listing Not Found</h2>
        <p className="text-gray-500 mb-8">
          This listing may have been removed or sold.
        </p>
        <Link to="/marketplace" className="btn-primary inline-flex">
          Browse Marketplace
        </Link>
      </div>
    );
  }

  // ── Generic error state ──────────────────────────────────
  if (error && !listing) {
    return (
      <div className="container-app py-24 text-center">
        <Alert type="error" message={error} />
      </div>
    );
  }

  const images = listing.images?.length > 0 ? listing.images : [null];

  return (
    <div className="container-app py-8">
      {/* ── Breadcrumb ────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link
          to="/marketplace"
          className="hover:text-primary-600 transition-colors"
        >
          Marketplace
        </Link>
        <FiChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-600 truncate max-w-[200px]">
          {listing.title}
        </span>
      </div>

      <button
        onClick={() => navigate(-1)}
        className="md:hidden flex items-center gap-2 text-sm text-gray-500
                   hover:text-primary-600 mb-4 transition-colors"
      >
        <FiArrowLeft className="w-4 h-4" />
        Back
      </button>

      {error && (
        <div className="mb-6">
          <Alert type="error" message={error} onDismiss={() => setError("")} />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-10">
        {/* ── Image Gallery ──────────────────────────── */}
        <div>
          <div
            className="aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-3
                          relative"
          >
            {images[activeImage] ? (
              <img
                src={images[activeImage]}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center
                              bg-gradient-to-br from-primary-50 to-purple-50"
              >
                <span className="text-6xl opacity-40">🛍️</span>
              </div>
            )}

            {!listing.isAvailable && (
              <div
                className="absolute inset-0 bg-black/60 flex items-center
                              justify-center"
              >
                <span
                  className="bg-white text-gray-900 font-bold px-6 py-2
                                 rounded-xl text-lg"
                >
                  SOLD
                </span>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2
                             transition-colors flex-shrink-0 ${
                               activeImage === i
                                 ? "border-primary-600"
                                 : "border-transparent"
                             }`}
                >
                  {img ? (
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Details ────────────────────────────────── */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-xs font-semibold text-primary-600 uppercase
                             tracking-wide"
            >
              {listing.category.replace("_", " ")}
            </span>
            <span className="text-gray-300">•</span>
            <span className={`badge ${CONDITION_STYLES[listing.condition]}`}>
              {CONDITION_LABELS[listing.condition]}
            </span>
          </div>

          <h1 className="text-gray-900 mb-3">{listing.title}</h1>

          <p className="text-3xl font-extrabold text-primary-600 mb-4">
            {formatPrice(listing.price)}
          </p>

          <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
            {listing.location && (
              <div className="flex items-center gap-1.5">
                <FiMapPin className="w-4 h-4" />
                {listing.location}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <FiClock className="w-4 h-4" />
              Posted {formatDate(listing.createdAt)}
            </div>
          </div>

          <div className="card p-5 mb-6">
            <h4 className="text-gray-900 mb-2">Description</h4>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">
              {listing.description}
            </p>
          </div>

          <Link
            to={`/profile/${listing.seller.id}`}
            className="card p-4 flex items-center gap-3 mb-6 hover:border-primary-200
                       transition-colors group"
          >
            <div
              className="w-12 h-12 bg-primary-100 rounded-full flex
                            items-center justify-center flex-shrink-0"
            >
              <FiUser className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <p
                className="font-semibold text-gray-900 group-hover:text-primary-600
                            transition-colors"
              >
                {listing.seller.fullName}
              </p>
              <p className="text-sm text-gray-400">
                @{listing.seller.username}
              </p>
            </div>
            <FiChevronRight className="w-4 h-4 text-gray-300" />
          </Link>

          {isOwner ? (
            <div className="flex gap-3">
              <Link
                to={`/listings/${listing.id}/edit`}
                className="btn-secondary flex-1 flex items-center justify-center gap-2"
              >
                <FiEdit2 className="w-4 h-4" />
                Edit Listing
              </Link>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="btn-danger flex-1 flex items-center justify-center gap-2"
              >
                <FiTrash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  navigate("/login");
                } else {
                  alert(
                    `Contact ${listing.seller.fullName} — messaging coming soon!`,
                  );
                }
              }}
              disabled={!listing.isAvailable}
              className="btn-primary flex items-center justify-center gap-2 py-3.5"
            >
              <FiMessageCircle className="w-5 h-5" />
              {listing.isAvailable ? "Contact Seller" : "No Longer Available"}
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete this listing?"
        message="This action cannot be undone. The listing will be permanently removed from the marketplace."
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        danger
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
};

export default ListingDetailPage;
