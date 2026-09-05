// src/pages/ListingDetailPage.jsx — Live API Version

import { useState, useEffect, useRef, useCallback } from "react";
import { revealContact } from "../services/contactService";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import ReportModal from "../components/ui/ReportModal";
import { Helmet } from "react-helmet-async";
import Alert from "../components/ui/Alert";
import { getListingById, deleteListing, reportListing } from "../services/listingService";
import { useToast } from "../context/ToastContext";
import {
  FiMapPin,
  FiUser,
  FiArrowLeft,
  FiEdit2,
  FiTrash2,
  FiMessageCircle,
  FiPhone,
  FiClock,
  FiChevronRight,
  FiFlag,
  FiLink2,
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
  const { slug } = useParams();
  const id = slug; // slug with fallback to numeric id
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { toast } = useToast();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const galleryRef = useRef(null);
  const startXRef = useRef(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [contactConfirm, setContactConfirm] = useState(null); // { tokenBalance } | null
  const [contactLoading, setContactLoading] = useState(false);

  const fetchListing = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setNotFound(false);
    setError("");
    try {
      const data = await getListingById(id);
      setListing((prev) => {
        // keep activeImage if same listing
        if (prev?.id !== data.id) setActiveImage(0);
        return data;
      });
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        setError("Failed to load listing. Please try again.");
      }
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [id]);

  // ── Fetch real listing ───────────────────────────────────
  useEffect(() => {
    fetchListing(true);
  }, [fetchListing]);




  const onGalleryStart = (clientX) => {
    startXRef.current = clientX;
    setIsDragging(true);
  };
  const onGalleryMove = (clientX) => {
    if (!isDragging) return;
    const diff = clientX - startXRef.current;
    const maxIdx = Math.max(0, (listing?.images?.length || 1) - 1);
    let clamped = diff;
    if ((activeImage === 0 && diff > 0) || (activeImage === maxIdx && diff < 0)) clamped = diff * 0.35;
    setDragOffset(clamped);
  };
  const onGalleryEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const threshold = Math.min(80, (galleryRef.current?.offsetWidth || 320) * 0.22);
    const maxIdx = Math.max(0, (listing?.images?.length || 1) - 1);
    if (dragOffset < -threshold && activeImage < maxIdx) setActiveImage((p) => p + 1);
    else if (dragOffset > threshold && activeImage > 0) setActiveImage((p) => p - 1);
    setDragOffset(0);
  };

  const isOwner = isAuthenticated && listing && user?.id === listing.seller.id;
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link.");
    }
  };
  const handleReport = async (reason) => {
    setReporting(true);
    try {
      await reportListing(listing.slug || listing.id, reason);
      toast.success("Listing reported. Thank you for helping keep the marketplace safe.");
      setShowReportModal(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to report listing.");
    } finally {
      setReporting(false);
    }
  };

  // ── Real delete ───────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteListing(listing.slug || listing.id);
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
      <div className="container-app py-10">
        <div className="grid lg:grid-cols-2 gap-10 animate-pulse">
          <div className="aspect-square bg-gray-200 rounded-2xl" />
          <div className="flex flex-col gap-4">
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-10 bg-gray-200 rounded w-1/3" />
            <div className="h-24 bg-gray-200 rounded w-full" />
          </div>
        </div>
      </div>
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
      <Helmet>
        <title>{listing.title} — Trend Tribe</title>
        <meta
          name="description"
          content={listing.description?.slice(0, 155) || "View this listing on Trend Tribe, the student marketplace."}
        />
        <link
          rel="canonical"
          href={`https://trendtribe.app/listings/${listing.slug || listing.id}`}
        />
        <meta property="og:title" content={`${listing.title} — Trend Tribe`} />
        <meta
          property="og:description"
          content={listing.description?.slice(0, 155) || "View this listing on Trend Tribe."}
        />
        {images[0] && <meta property="og:image" content={images[0]} />}
        <meta
          property="og:url"
          content={`https://trendtribe.app/listings/${listing.slug || listing.id}`}
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${listing.title} — Trend Tribe`} />
        <meta
          name="twitter:description"
          content={listing.description?.slice(0, 155) || "View this listing on Trend Tribe."}
        />
        {images[0] && <meta name="twitter:image" content={images[0]} />}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: listing.title,
            description: listing.description,
            image: images[0] || undefined,
            offers: {
              "@type": "Offer",
              price: listing.price,
              priceCurrency: "NGN",
              availability: listing.isAvailable
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
              url: `https://trendtribe.app/listings/${listing.slug || listing.id}`,
            },
          })}
        </script>
      </Helmet>
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
        {/* ── Image Gallery — swipe follows finger (mobile) ── */}
        <div>
          <div
            ref={galleryRef}
            className="aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-3 relative select-none touch-pan-y"
            onTouchStart={(e) => onGalleryStart(e.touches[0].clientX)}
            onTouchMove={(e) => onGalleryMove(e.touches[0].clientX)}
            onTouchEnd={onGalleryEnd}
            onMouseDown={(e) => {
              e.preventDefault();
              onGalleryStart(e.clientX);
              const move = (ev) => onGalleryMove(ev.clientX);
              const up = () => {
                onGalleryEnd();
                window.removeEventListener("mousemove", move);
                window.removeEventListener("mouseup", up);
              };
              window.addEventListener("mousemove", move);
              window.addEventListener("mouseup", up);
            }}
            style={{ cursor: images.length > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
          >
            <div
              className="flex h-full"
              style={{
                width: `${images.length * 100}%`,
                transform: `translateX(calc(-${activeImage * (100 / images.length)}% + ${dragOffset}px))`,
                transition: isDragging ? "none" : "transform 0.32s cubic-bezier(0.32,0.72,0,1)",
              }}
            >
              {images.map((img, i) => (
                <div key={i} className="h-full flex-shrink-0" style={{ width: `${100 / images.length}%` }}>
                  {img ? (
                    <img
                      src={img}
                      alt={`${listing.title} ${i + 1}`}
                      className="w-full h-full object-cover pointer-events-none"
                      style={{
                        objectPosition: i === 0 ? `${listing.coverPosition?.x ?? 50}% ${listing.coverPosition?.y ?? 50}%` : "center",
                      }}
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 to-purple-50">
                      <span className="text-6xl opacity-40">🛍️</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!listing.isAvailable && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                <span className="bg-white text-gray-900 font-bold px-6 py-2 rounded-xl text-lg">SOLD</span>
              </div>
            )}

            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-none">
                {images.map((_, i) => (
                  <span key={i} className={`rounded-full transition-all duration-200 ${i === activeImage ? "w-5 h-1.5 bg-white shadow" : "w-1.5 h-1.5 bg-white/60"}`} />
                ))}
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors flex-shrink-0 ${
                    activeImage === i ? "border-primary-600" : "border-transparent"
                  }`}
                >
                  {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100" />}
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

          <div className="flex items-center gap-2 mb-3">
            <h1 className="text-gray-900 flex-1">{listing.title}</h1>
            <button
              type="button"
              onClick={handleCopyLink}
              aria-label="Copy link to this listing"
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center
                         justify-center text-gray-400 hover:text-primary-600
                         hover:border-primary-200 transition-colors flex-shrink-0"
            >
              <FiLink2 className="w-4 h-4" />
            </button>
          </div>

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
            to={`/profile/${listing.seller.slug || listing.seller.id}`}
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
                to={`/listings/${listing.slug || listing.id}/edit`}
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
            <div className="flex flex-col gap-2">
                        <button
                onClick={async () => {
                  if (!isAuthenticated) {
                    navigate("/login");
                    return;
                  }
                  setContactLoading(true);
                  const result = await revealContact(listing.slug || listing.id);
                  setContactLoading(false);
                  if (result.whatsapp) {
                    const message = encodeURIComponent(`Hi ${listing.seller.fullName}, I'm interested in your listing:
📦 Item: ${listing.title}
💰 Price: ₦${listing.price}
🔗 Listing: ${window.location.origin}/listings/${listing.slug || listing.id}
Is this still available?`);
                    window.open(`https://wa.me/${result.whatsapp.replace(/\D/g, "")}?text=${message}`, "_blank");
                  } else {
                    toast.info(`${listing.seller.fullName} has not added a WhatsApp number.`);
                  }
                }}
                disabled={!listing.isAvailable || contactLoading}
                className="btn-primary flex items-center justify-center gap-2 py-3.5"
              >
                <FiMessageCircle className="w-5 h-5" />
                {listing.isAvailable ? "Contact Seller" : "No Longer Available"}
              </button>
            </div>
          )}

          {!isOwner && isAuthenticated && (
            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center justify-center gap-1.5 text-sm text-gray-400
                         hover:text-red-500 transition-colors mt-3"
            >
              <FiFlag className="w-3.5 h-3.5" />
              Report this listing
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

      <ReportModal
        isOpen={showReportModal}
        submitting={reporting}
        onSubmit={handleReport}
        onCancel={() => setShowReportModal(false)}
      />
    </div>
  );
};

export default ListingDetailPage;
