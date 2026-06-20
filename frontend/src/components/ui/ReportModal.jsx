// src/components/ui/ReportModal.jsx — Report reason picker (mirrors ConfirmDialog patterns)

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FiFlag, FiX } from "react-icons/fi";

const REASONS = [
  { value: "SCAM", label: "Scam" },
  { value: "FAKE_ITEM", label: "Fake Item" },
  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate Content" },
  { value: "OTHER", label: "Other" },
];

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

const ReportModal = ({ isOpen, onSubmit, onCancel, submitting }) => {
  const reduced = useReducedMotion();
  const mVars = reduced ? reducedModalVariants : modalVariants;
  const [selected, setSelected] = useState(null);

  const handleSubmit = () => {
    if (!selected) return;
    onSubmit(selected);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="report-backdrop"
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50
                     flex items-center justify-center p-4"
          variants={backdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={onCancel}
        >
          <motion.div
            key="report-modal"
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
            variants={mVars}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <FiFlag className="w-5 h-5 text-red-600" />
              </div>
              <button
                onClick={onCancel}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close dialog"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <h4 className="text-gray-900 mb-2">Report this listing</h4>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              Select a reason. Our team will review it shortly.
            </p>

            <div className="flex flex-col gap-2 mb-6">
              {REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setSelected(r.value)}
                  className={`text-left px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    selected === r.value
                      ? "border-primary-600 bg-primary-50 text-primary-700"
                      : "border-sage-100 text-gray-600 hover:border-primary-200"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={onCancel} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selected || submitting}
                className="btn-danger flex-1 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReportModal;
