// src/components/ui/ConfirmDialog.jsx

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FiAlertTriangle, FiX } from "react-icons/fi";

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

const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}) => {
  const reduced = useReducedMotion();
  const mVars = reduced ? reducedModalVariants : modalVariants;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="confirm-backdrop"
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50
                     flex items-center justify-center p-4"
          variants={backdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={onCancel}
        >
          <motion.div
            key="confirm-modal"
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
            variants={mVars}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ─────────────────────────────────── */}
            <div className="flex items-start justify-between mb-4">
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center
                            justify-center
                            ${danger ? "bg-red-100" : "bg-primary-100"}`}
                initial={reduced ? {} : { scale: 0.7, opacity: 0 }}
                animate={reduced ? {} : { scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 20,
                  delay: 0.1,
                }}
              >
                <FiAlertTriangle
                  className={`w-5 h-5
                    ${danger ? "text-red-600" : "text-primary-600"}`}
                />
              </motion.div>

              <motion.button
                onClick={onCancel}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg
                           hover:bg-gray-100 transition-colors"
                aria-label="Close dialog"
                whileHover={reduced ? {} : { scale: 1.1, rotate: 90 }}
                whileTap={reduced ? {} : { scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <FiX className="w-5 h-5" />
              </motion.button>
            </div>

            {/* ── Body ───────────────────────────────────── */}
            <h4 className="text-gray-900 mb-2">{title}</h4>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              {message}
            </p>

            {/* ── Actions ────────────────────────────────── */}
            <div className="flex gap-3">
              <motion.button
                onClick={onCancel}
                className="btn-secondary flex-1"
                whileHover={reduced ? {} : { scale: 1.02 }}
                whileTap={reduced ? {} : { scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                {cancelLabel}
              </motion.button>

              <motion.button
                onClick={onConfirm}
                className={`flex-1 ${danger ? "btn-danger" : "btn-primary"}`}
                whileHover={reduced ? {} : { scale: 1.02 }}
                whileTap={reduced ? {} : { scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                {confirmLabel}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDialog;
