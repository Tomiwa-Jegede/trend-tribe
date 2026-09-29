// src/components/ui/MatricGate.jsx
// Fallback for sellers with no matric number: add it inline instead of bouncing
// to the profile page. Freshers are the exception — they may sell without a
// matric until their 3-month window ends, then use this same gate.

import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import Alert from "./Alert";

const RUN_EMAIL = /@run\.edu\.ng$/i;

const MatricGate = ({ isFresher = false, onAdded }) => {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  // Legacy sellers with a RUN email are already email-verified — matric alone
  // is enough. Everyone else must confirm a school email with an OTP.
  const needsSchoolEmail = isFresher || !RUN_EMAIL.test(user?.email || "");
  const [form, setForm] = useState({ matricNumber: "", schoolEmail: "", otp: "" });
  const [step, setStep] = useState("form");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const save = async (withOtp) => {
    setError("");
    const matricNumber = form.matricNumber.trim();
    const schoolEmail = form.schoolEmail.trim().toLowerCase();
    const otp = form.otp.trim();
    if (!matricNumber) return setError("Matric number is required");
    if (needsSchoolEmail && !RUN_EMAIL.test(schoolEmail))
      return setError("Valid RUN school email (@run.edu.ng) is required");
    if (withOtp && !otp) return setError("Enter the 6-digit code");

    setLoading(true);
    try {
      const res = await api.patch("/users/me/matric", {
        matricNumber,
        ...(schoolEmail ? { schoolEmail } : {}),
        ...(withOtp ? { otp } : {}),
      });
      if (res.data.needOtp) {
        setStep("otp");
        return;
      }
      setUser(res.data.user);
      toast.success("Matric verified — you can sell now");
      onAdded?.(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Could not save your matric number");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`card p-6 text-left border ${
        isFresher ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"
      }`}
    >
      <Alert
        type={isFresher ? "info" : "error"}
        message={
          isFresher
            ? "Your fresher selling window has ended — add your matric number and school email to keep selling."
            : "Matric number required — add it now to post."
        }
      />

      {step === "form" ? (
        <div className="flex flex-col gap-3 max-w-md mt-4">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <input
            type="text"
            className="input-field"
            placeholder="Matric number e.g. RUN/CMP/24/17209"
            value={form.matricNumber}
            onChange={set("matricNumber")}
          />
          {needsSchoolEmail && (
            <input
              type="email"
              className="input-field"
              placeholder="you@run.edu.ng"
              value={form.schoolEmail}
              onChange={set("schoolEmail")}
            />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => save(false)} disabled={loading} className="btn-primary">
              {loading ? "Saving..." : needsSchoolEmail ? "Send Code" : "Save matric"}
            </button>
            <Link
              to={`/profile/${user?.slug || user?.id}`}
              className="text-sm font-semibold text-primary-600 hover:text-primary-700"
            >
              Add it in profile →
            </Link>
          </div>
          {!needsSchoolEmail && (
            <p className="text-[11px] text-gray-500">
              Your school email ({user?.email}) is already verified — matric only.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-w-md mt-4">
          <p className="text-xs text-gray-600">Code sent to {form.schoolEmail.trim().toLowerCase()}</p>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            className="input-field"
            placeholder="000000"
            value={form.otp}
            onChange={set("otp")}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => save(true)} disabled={loading} className="btn-primary">
              {loading ? "Verifying..." : "Verify & Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("form");
                setError("");
              }}
              className="text-sm font-semibold text-gray-600 hover:text-gray-800"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatricGate;
