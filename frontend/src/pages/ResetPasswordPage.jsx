// src/pages/ResetPasswordPage.jsx

import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { resetPassword } from "../services/authService";
import FormInput from "../components/ui/FormInput";
import Alert from "../components/ui/Alert";
import { FiShoppingBag, FiArrowRight } from "react-icons/fi";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = "Password must be at least 6 characters";
    }
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!token) {
      setServerError("This reset link is invalid. Please request a new one.");
      return;
    }
    if (!validate()) return;

    setLoading(true);
    try {
      await resetPassword(token, formData.newPassword);
      toast.success("Password reset successfully — please log in");
      navigate("/login", { replace: true });
    } catch (err) {
      setServerError(
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
          <h2 className="text-gray-900">Choose a new password</h2>
        </div>

        <div className="card p-8">
          {!token ? (
            <Alert
              type="error"
              message="This reset link is invalid or has expired. Please request a new one."
            />
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {serverError && (
                <Alert
                  type="error"
                  message={serverError}
                  onDismiss={() => setServerError("")}
                />
              )}

              <FormInput
                label="New Password"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleChange}
                error={errors.newPassword}
                placeholder="At least 6 characters"
                required
              />

              <FormInput
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                placeholder="Re-enter your new password"
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
                    Resetting...
                  </>
                ) : (
                  <>
                    Reset Password
                    <FiArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link
            to="/login"
            className="text-primary-600 font-semibold hover:text-primary-700"
          >
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
