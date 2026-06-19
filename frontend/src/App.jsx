// src/App.jsx — Now wrapped with PageTransition
import AboutPage from "./pages/AboutPage";
import FAQPage from "./pages/FAQPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import PageTransition from "./components/layout/PageTransition";
import HomePage from "./pages/HomePage";
import MarketplacePage from "./pages/MarketplacePage";
import ListingDetailPage from "./pages/ListingDetailPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CreateListingPage from "./pages/CreateListingPage";
import EditListingPage from "./pages/EditListingPage";
import ProfilePage from "./pages/ProfilePage";
import VerifyOtpPage from "./pages/VerifyOtpPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ComingSoonPage from "./pages/ComingSoonPage";
import FeaturesPage from "./pages/FeaturesPage";
import EditProfilePage from "./pages/EditProfilePage";

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

// ─── App ──────────────────────────────────────────────────────
const App = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <PageTransition>
          <Routes>
            {/* Public */}
            <Route path="/" element={<HomePage />} />
            <Route path="/marketplace" element={<ComingSoonPage />} />
            <Route path="/listings/:id" element={<ComingSoonPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-registration" element={<VerifyOtpPage />} />
            <Route path="/profile/:id" element={<ComingSoonPage />} />
            <Route path="/profile/:id/edit" element={<ComingSoonPage />} />

            {/* Protected */}
            <Route path="/create-listing" element={<ComingSoonPage />} />
            <Route path="/listings/:id/edit" element={<ComingSoonPage />} />

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
            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/features" element={<ComingSoonPage />} />
            <Route path="/coming-soon" element={<ComingSoonPage />} />
            <Route path="/messages" element={<ComingSoonPage />} />
            <Route path="/saved" element={<ComingSoonPage />} />
            <Route path="/notifications" element={<ComingSoonPage />} />
            <Route path="/my-listings" element={<ComingSoonPage />} />
          </Routes>
        </PageTransition>
      </main>

      <Footer />
    </div>
  );
};

export default App;
