// src/App.jsx — Now wrapped with PageTransition
import AboutPage from "./pages/AboutPage";
import FAQPage from "./pages/FAQPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import FrederickWidget from "./components/frederick/FrederickWidget";
import PageTransition from "./components/layout/PageTransition";
import HomePage from "./pages/HomePage";
import MarketplacePage from "./pages/MarketplacePage";
import ListingDetailPage from "./pages/ListingDetailPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import VerifyOtpPage from "./pages/VerifyOtpPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ComingSoonPage from "./pages/ComingSoonPage";
import FeaturesPage from "./pages/FeaturesPage";
import TokenCallbackPage from "./pages/TokenCallbackPage";
import FavoritesPage from "./pages/FavoritesPage";

// ─── Lazy-loaded (heavier / less-frequently-visited pages) ────
const CreateListingPage = lazy(() => import("./pages/CreateListingPage"));
const EditListingPage = lazy(() => import("./pages/EditListingPage"));
const EditProfilePage = lazy(() => import("./pages/EditProfilePage"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const AdminListingsPage = lazy(() => import("./pages/AdminListingsPage"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const AdminReportsPage = lazy(() => import("./pages/AdminReportsPage"));
const AdminFavoritesPage = lazy(() => import("./pages/AdminFavoritesPage"));
const MyListingsPage = lazy(() => import("./pages/MyListingsPage"));

const NotFoundPage = () => (
  <div className="container-app py-20 text-center">
    <h2 className="text-gray-400">404 — Page Not Found</h2>
  </div>
);

// ─── Protected Route Wrapper ──────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="w-8 h-8 border-4 border-primary-600
                        border-t-transparent rounded-full animate-spin"
        />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// ─── Admin Route Wrapper ──────────────────────────────────────
const AdminRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="w-8 h-8 border-4 border-primary-600
                        border-t-transparent rounded-full animate-spin"
        />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== "ADMIN") return <Navigate to="/" replace />;

  return children;
};

// ─── Analytics: track pageviews on route change (SPA navigation
// doesn't trigger a full reload, so GA4's base snippet only fires
// once on first load without this) ──────────────────────────────
const usePageviewTracking = () => {
  const location = useLocation();
  useEffect(() => {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", "page_view", {
      page_path: location.pathname + location.search,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [location]);
};

// ─── App ──────────────────────────────────────────────────────
const App = () => {
  usePageviewTracking();
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <PageTransition>
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-screen">
                <div
                  className="w-8 h-8 border-4 border-primary-600
                                border-t-transparent rounded-full animate-spin"
                />
              </div>
            }
          >
          <Routes>
            {/* Public */}
            <Route path="/" element={<HomePage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/listings/:id" element={<ListingDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-registration" element={<VerifyOtpPage />} />
            <Route path="/profile/:id" element={<ProfilePage />} />
            <Route path="/profile/:id/edit" element={<EditProfilePage />} />

            {/* Protected */}
            <Route
              path="/create-listing"
              element={
                <ProtectedRoute>
                  <CreateListingPage />
                </ProtectedRoute>
              }
            />
           <Route
              path="/listings/:id/edit"
              element={
                <ProtectedRoute>
                  <EditListingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tokens/callback"
              element={
                <ProtectedRoute>
                  <TokenCallbackPage />
                </ProtectedRoute>
              }
            />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/verify-email"
              element={
                <ProtectedRoute>
                  <VerifyOtpPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboardPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/listings"
              element={
                <AdminRoute>
                  <AdminListingsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <AdminUsersPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <AdminRoute>
                  <AdminReportsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/favorites"
              element={
                <AdminRoute>
                  <AdminFavoritesPage />
                </AdminRoute>
              }
            />
            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/features" element={<FeaturesPage />} />
              <Route path="/coming-soon" element={<ComingSoonPage />} />
              <Route path="/messages" element={<ComingSoonPage />} />
              <Route
                path="/saved"
                element={
                  <ProtectedRoute>
                    <FavoritesPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/notifications" element={<ComingSoonPage />} />
              <Route
                path="/my-listings"
                element={
                  <ProtectedRoute>
                    <MyListingsPage />
                  </ProtectedRoute>
                }
              />
          </Routes>
          </Suspense>
        </PageTransition>
      </main>

      <Footer />
      <FrederickWidget />
    </div>
  );
};

export default App;
