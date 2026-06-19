// src/pages/VerifyOtpPage.jsx

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { verifyEmail, resendOtp } from "../services/authService";
import api from "../api/axios";
import FormInput from "../components/ui/FormInput";
import Alert from "../components/ui/Alert";
import { FiShoppingBag, FiArrowRight } from "react-icons/fi";

const RESEND_COOLDOWN = 60; // seconds

const VerifyOtpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  // pre-login mode: arrived from /register with email in state
  const preLoginEmail = location.state?.email || null;
  const isPreLogin = Boolean(preLoginEmail);

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (!isPreLogin && user?.isVerified) navigate("/", { replace: true });
  }, [user, navigate, isPreLogin]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(value);
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      setError("Enter the 6-digit code sent to your email");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isPreLogin) {
        await api.post("/auth/verify-registration", { email: preLoginEmail, otp });
        navigate("/login", { replace: true, state: { emailVerified: true } });
      } else {
        await verifyEmail(otp);
        await refreshUser();
        toast.success("Email verified ✅ Welcome to Trend Tribe!");
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(
        err.response?.data?.error || "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      if (isPreLogin) {
        await api.post("/auth/register/resend", { email: preLoginEmail });
      } else {
        await resendOtp();
      }
      toast.success("A new code has been sent to your email");
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Couldn't resend the code. Try again shortly.",
      );
    } finally {
      setResending(false);
    }
  };

  const displayEmail = isPreLogin ? preLoginEmail : user?.email;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center mb-6">
            <FiShoppingBag className="text-white w-5 h-5" />
          </div>
          <h2 className="text-gray-900">Verify your email</h2>
          <p className="text-gray-500 mt-1 text-sm text-center">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-gray-700">{displayEmail}</span>
          </p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <Alert
                type="error"
                message={error}
                onDismiss={() => setError("")}
              />
            )}

            <FormInput
              label="Verification Code"
              name="otp"
              value={otp}
              onChange={handleChange}
              placeholder="123456"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center justify-center gap-2 py-3 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify Email
                  <FiArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Didn't get a code?{" "}
          <button
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="text-primary-600 font-semibold hover:text-primary-700 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default VerifyOtpPage;
