// src/pages/ForgotPasswordPage.jsx

import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../services/authService";
import FormInput from "../components/ui/FormInput";
import Alert from "../components/ui/Alert";
import { FiShoppingBag, FiArrowRight } from "react-icons/fi";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError("Enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(
        err.response?.data?.error || "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <FiShoppingBag className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl text-gray-900">
              Trend<span className="text-primary-600">Tribe</span>
            </span>
          </Link>
          <h2 className="text-gray-900">Reset your password</h2>
          <p className="text-gray-500 mt-1 text-sm text-center">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <div className="card p-8">
          {sent ? (
            <Alert
              type="success"
              message="If an account with that email exists, a reset link is on its way. Check your inbox."
            />
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {error && (
                <Alert
                  type="error"
                  message={error}
                  onDismiss={() => setError("")}
                />
              )}

              <FormInput
                label="Email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                placeholder="you@university.edu"
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
                    Sending...
                  </>
                ) : (
                  <>
                    Send Reset Link
                    <FiArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Remember your password?{" "}
          <Link
            to="/login"
            className="text-primary-600 font-semibold hover:text-primary-700"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
