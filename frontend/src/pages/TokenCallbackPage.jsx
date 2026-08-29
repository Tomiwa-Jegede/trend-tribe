import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { verifyTokenPurchase } from "../services/tokenService";
import { FiCheckCircle, FiXCircle, FiLoader } from "react-icons/fi";

const TokenCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("tx_ref");
  const transactionId = searchParams.get("transaction_id");
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState("checking"); // checking | success | failed | pending | error

  useEffect(() => {
    if (!reference || !transactionId) {
      setStatus("error");
      return;
    }
    let cancelled = false;
    const poll = async (attempt = 0) => {
      try {
        const result = await verifyTokenPurchase(reference, transactionId);
        if (cancelled) return;

        if (result.status === "SUCCESS") {
          setStatus("success");
          refreshUser();
        } else if (result.status === "FAILED") {
          setStatus("failed");
        } else if (attempt < 5) {
          setTimeout(() => poll(attempt + 1), 2000);
        } else {
          setStatus("pending");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [reference, transactionId]);

  return (
    <div className="container-app py-24 text-center max-w-md mx-auto">
      {status === "checking" && (
        <>
          <FiLoader className="w-10 h-10 text-primary-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-gray-900 mb-2">Confirming your payment…</h2>
          <p className="text-gray-500">This should only take a moment.</p>
        </>
      )}
      {status === "success" && (
        <>
          <FiCheckCircle className="w-10 h-10 text-green-600 mx-auto mb-4" />
          <h2 className="text-gray-900 mb-2">Tokens added ✅</h2>
          <p className="text-gray-500 mb-6">Your balance has been updated.</p>
          <Link to="/" className="btn-primary inline-flex">Continue</Link>
        </>
      )}
      {status === "failed" && (
        <>
          <FiXCircle className="w-10 h-10 text-red-600 mx-auto mb-4" />
          <h2 className="text-gray-900 mb-2">Payment failed</h2>
          <p className="text-gray-500 mb-6">You were not charged. Please try again.</p>
          <Link to="/" className="btn-secondary inline-flex">Back home</Link>
        </>
      )}
      {status === "pending" && (
        <>
          <FiLoader className="w-10 h-10 text-gray-400 mx-auto mb-4" />
          <h2 className="text-gray-900 mb-2">Still processing</h2>
          <p className="text-gray-500 mb-6">
            Your payment is taking longer than expected to confirm. Your tokens will be credited automatically once it clears — no need to pay again.
          </p>
          <Link to="/" className="btn-secondary inline-flex">Back home</Link>
        </>
      )}
      {status === "error" && (
        <>
          <FiXCircle className="w-10 h-10 text-red-600 mx-auto mb-4" />
          <h2 className="text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500 mb-6">
            We couldn't confirm your payment. If you were charged, your tokens will still be credited automatically.
          </p>
          <Link to="/" className="btn-secondary inline-flex">Back home</Link>
        </>
      )}
    </div>
  );
};

export default TokenCallbackPage;