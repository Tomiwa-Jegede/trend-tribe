import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FiX, FiZap } from "react-icons/fi";
import { initTokenPurchase } from "../../services/tokenService";

const TOKEN_PRICE_NAIRA = 200; // mirrors backend payment.controller.js TOKEN_PRICE_NAIRA

const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const modalVariants = {
  initial: { opacity: 0, scale: 0.92, y: 12 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 340, damping: 26 },
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    y: 8,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

const reducedModalVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

const BuyTokens = ({ isOpen, onClose }) => {
  const reduced = useReducedMotion();
  const mVars = reduced ? reducedModalVariants : modalVariants;
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const total = (quantity || 0) * TOKEN_PRICE_NAIRA;

  const handleBuy = async () => {
    setError("");
    if (!quantity || quantity < 1) {
      setError("Enter at least 1 token");
      return;
    }
    setLoading(true);
    try {
      const { authorizationUrl } = await initTokenPurchase(quantity);
      window.location.href = authorizationUrl;
    } catch (err) {
      setError(err.response?.data?.error || "Could not start payment. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="buytokens-backdrop"
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70]
                     flex items-center justify-center p-4"
          variants={backdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={onClose}
        >
          <motion.div
            key="buytokens-modal"
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
            variants={mVars}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <FiZap className="w-5 h-5 text-primary-600" />
              </div>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close dialog"
                disabled={loading}
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <h4 className="text-gray-900 mb-2">Buy Tokens</h4>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              Tokens are used to post extra listings, chat with Jegede, and view seller contact info.
            </p>

            {error && <p className="text-accent-600 text-sm mb-3">{error}</p>}

            <label className="input-label">Quantity</label>
            <input
              type="number"
              min={1}
              className="input mb-2"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || "")}
              disabled={loading}
            />

            <p className="text-sm text-gray-600 mb-6">
              Total: <span className="font-semibold text-gray-900">₦{total.toLocaleString()}</span>
            </p>

            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
                Cancel
              </button>
              <button onClick={handleBuy} className="btn-primary flex-1" disabled={loading}>
                {loading ? "Starting..." : "Proceed to Pay"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BuyTokens;