// src/pages/GigTransferPage.jsx — 3-step Gig Wallet transfer flow, own page
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { resolveGigAccount, transferGig } from "../services/gigService";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { FiArrowLeft, FiSend, FiCheck, FiX } from "react-icons/fi";

export default function GigTransferPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [step, setStep] = useState(1); // 1 recipient, 2 amount, 3 pin, 4 result
  const [form, setForm] = useState({ toAccount: "", amount: "", pin: "" });
  const [resolved, setResolved] = useState(null);
  const [transferring, setTransferring] = useState(false);
  const [result, setResult] = useState(null); // { success, amount, fee, recipient, reference, error }

  const handleAccountChange = async (e) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 10);
    setForm((f) => ({ ...f, toAccount: v }));
    if (/^\d{10}$/.test(v)) {
      try {
        const r = await resolveGigAccount(v);
        setResolved(r.user);
      } catch {
        setResolved(null);
      }
    } else {
      setResolved(null);
    }
  };

  const handleTransfer = async () => {
    if (!resolved) return toast.error("Resolve account first");
    const amt = parseInt(form.amount, 10);
    if (!amt || amt < 1) return toast.error("Enter amount");
    if (!/^\d{4}$/.test(form.pin)) return toast.error("Enter 4-digit PIN");
    const fee = isAdmin ? 0 : Math.max(1, Math.round(amt*100*0.01))/100;
    const total = amt + fee;
    if (!confirm(`Transfer ₦${amt.toLocaleString()} to ${resolved.fullName} @${resolved.username}?\n\nAmount: ₦${amt.toLocaleString()}\nFee (1%): ₦${fee.toFixed(2)}${isAdmin ? " (admin free)" : ""}\nTotal debited: ₦${total.toFixed(2)}\n\nContinue?`)) return;

    setTransferring(true);
    try {
      const r = await transferGig({ toAccountNumber: form.toAccount, amount: amt, pin: form.pin });
      setResult({
        success: true,
        amount: amt,
        fee: r.fee,
        reference: r.transfer?.reference || r.transfer?.id,
        recipient: resolved,
        message: r.message,
      });
      setStep(4);
      toast.success(r.message);
    } catch (e) {
      const errMsg = e.response?.data?.error || "Transfer failed";
      setResult({ success: false, amount: amt, error: errMsg, recipient: resolved });
      setStep(4);
      toast.error(errMsg);
    } finally {
      setTransferring(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (!result?.success) return;
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0F1F3D";
    ctx.fillRect(0, 0, 800, 500);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText("Trend Tribe — Gig Transfer Receipt", 40, 60);
    ctx.font = "20px sans-serif";
    ctx.fillText(`Amount: ₦${result.amount.toLocaleString()}`, 40, 140);
    ctx.fillText(`Fee (1%): ₦${(result.fee / 100).toFixed(2)}`, 40, 180);
    ctx.fillText(`To: ${result.recipient.fullName} @${result.recipient.username}`, 40, 220);
    ctx.fillText(`Account: ${form.toAccount}`, 40, 260);
    ctx.fillText(`Ref: ${result.reference || "—"}`, 40, 300);
    ctx.fillText(`Date: ${new Date().toLocaleString()}`, 40, 340);
    ctx.fillStyle = "#2D5BFF";
    ctx.fillRect(40, 380, 720, 60);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("Thank you for using Trend Tribe", 260, 415);
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${result.reference || Date.now()}.png`;
    a.click();
  };

  const resetFlow = () => {
    setResult(null);
    setForm({ toAccount: "", amount: "", pin: "" });
    setResolved(null);
    setStep(1);
  };

  return (
    <div className="container-app py-6 sm:py-8 max-w-md mx-auto">
      <Helmet>
        <title>Transfer — Gig Wallet — Trend Tribe</title>
      </Helmet>

      <button
        onClick={() => navigate("/gigs/wallet")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <FiArrowLeft className="w-4 h-4" /> Back to wallet
      </button>

      <h1 className="text-xl font-extrabold text-gray-900 mb-6">Transfer</h1>

      {step !== 4 && (
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full ${step >= s ? "bg-primary-600" : "bg-gray-100"}`}
            />
          ))}
          <span className="text-xs text-gray-500 ml-2">Step {step}/3</span>
        </div>
      )}

      {step !== 4 ? (
        <div className="space-y-5">
          {step === 1 && (
            <div>
              <label className="text-xs font-semibold text-gray-700">
                Recipient account number
              </label>
              <input
                value={form.toAccount}
                onChange={handleAccountChange}
                placeholder="8091234567"
                maxLength={10}
                inputMode="numeric"
                className="input-field mt-2 text-lg tracking-widest font-mono"
                autoFocus
              />
              {resolved ? (
                <p className="text-sm text-green-600 mt-2 font-medium bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  → {resolved.fullName} <span className="text-gray-500">@{resolved.username}</span>
                </p>
              ) : form.toAccount.length === 10 ? (
                <p className="text-xs text-red-500 mt-2">Account not found</p>
              ) : (
                <p className="text-xs text-gray-400 mt-2">Enter 10 digits — name shows automatically</p>
              )}
              <button
                disabled={!resolved}
                onClick={() => setStep(2)}
                className="w-full mt-4 btn-primary py-3 rounded-full font-bold disabled:opacity-60"
              >
                Next — Amount
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <label className="text-xs font-semibold text-gray-700">Amount ₦</label>
              <input
                type="number"
                min="1"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="500"
                className="input-field mt-2 text-lg"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                Fee 1%{isAdmin ? " — free for admin" : ""} ·{" "}
                {form.amount ? `₦${isAdmin ? "0.00" : (parseInt(form.amount, 10) * 0.01).toFixed(2)}` : "—"} · Total ₦
                {form.amount
                  ? isAdmin ? parseInt(form.amount, 10).toFixed(2) : (parseInt(form.amount, 10) * 1.01).toFixed(2)
                  : "—"}
              </p>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setStep(1)} className="flex-1 btn-secondary py-3 rounded-full">
                  Back
                </button>
                <button
                  disabled={!form.amount || parseInt(form.amount, 10) < 1}
                  onClick={() => setStep(3)}
                  className="flex-1 btn-primary py-3 rounded-full font-bold disabled:opacity-60"
                >
                  Next — PIN
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <label className="text-xs font-semibold text-gray-700">
                Enter PIN to authorize
              </label>
              <input
                type="password"
                maxLength={4}
                inputMode="numeric"
                value={form.pin}
                onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                placeholder="••••"
                className="input-field mt-2 tracking-widest text-lg text-center"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Transfer ₦{form.amount ? parseInt(form.amount, 10).toLocaleString() : "—"} to{" "}
                {resolved?.fullName} — fee ₦
                {form.amount ? (isAdmin ? "0.00" : (parseInt(form.amount, 10) * 0.01).toFixed(2)) : "—"}{isAdmin ? " (admin free)" : ""}
              </p>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setStep(2)} className="flex-1 btn-secondary py-3 rounded-full">
                  Back
                </button>
                <button
                  disabled={transferring || !/^\d{4}$/.test(form.pin)}
                  onClick={handleTransfer}
                  className="flex-1 btn-primary py-3 rounded-full font-bold disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <FiSend className="w-4 h-4" /> {transferring ? "Sending..." : "Confirm & Send"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          {result?.success ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FiCheck className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="font-extrabold text-gray-900 text-lg">Transfer Successful</h4>
              <p className="text-2xl font-extrabold text-primary-600 mt-2">
                ₦{result.amount.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                to {result.recipient.fullName} @{result.recipient.username} · Fee ₦
                {(result.fee / 100).toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Ref: {result.reference || "—"} · {new Date().toLocaleString()}
              </p>
              <button
                onClick={handleDownloadReceipt}
                className="mt-4 btn-primary px-6 py-2.5 rounded-full text-sm font-bold"
              >
                Download Receipt
              </button>
              <button
                onClick={() => navigate("/gigs/wallet")}
                className="mt-2 block mx-auto text-sm text-gray-500"
              >
                Done
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FiX className="w-8 h-8 text-red-600" />
              </div>
              <h4 className="font-extrabold text-gray-900 text-lg">Transfer Failed</h4>
              <p className="text-sm text-red-600 mt-2">{result?.error || "Transaction did not go through."}</p>
              <button onClick={resetFlow} className="mt-4 btn-secondary px-6 py-2.5 rounded-full text-sm">
                Try again
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}