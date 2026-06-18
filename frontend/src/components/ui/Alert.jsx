// src/components/ui/Alert.jsx

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from "react-icons/fi";

const STYLES = {
  error: "bg-red-50   border-red-200   text-red-700",
  success: "bg-green-50 border-green-200 text-green-700",
  info: "bg-blue-50  border-blue-200  text-blue-700",
};

const ICONS = {
  error: FiAlertCircle,
  success: FiCheckCircle,
  info: FiInfo,
};

// Slide-down + fade for full-motion users; fade-only for reduced-motion users
const fullVariants = {
  initial: { opacity: 0, y: -10, height: 0, marginBottom: 0 },
  animate: {
    opacity: 1,
    y: 0,
    height: "auto",
    marginBottom: 0,
    transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: {
    opacity: 0,
    y: -6,
    height: 0,
    transition: { duration: 0.18, ease: "easeIn" },
  },
};

const reducedVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

// ── Alert (controlled show/hide via `show` prop or parent unmount) ──────────
const Alert = ({ type = "error", message, onDismiss, show = true }) => {
  const reduced = useReducedMotion();
  const Icon = ICONS[type] ?? FiAlertCircle;
  const variants = reduced ? reducedVariants : fullVariants;

  return (
    <AnimatePresence>
      {show && message && (
        <motion.div
          key="alert"
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={`flex items-start gap-3 border rounded-xl p-4 overflow-hidden
                      ${STYLES[type]}`}
          role="alert"
          aria-live="assertive"
        >
          <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm flex-1 leading-relaxed">{message}</p>
          {onDismiss && (
            <motion.button
              onClick={onDismiss}
              className="flex-shrink-0 hover:opacity-70 transition-opacity"
              whileHover={reduced ? {} : { scale: 1.15 }}
              whileTap={reduced ? {} : { scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              aria-label="Dismiss alert"
            >
              <FiX className="w-4 h-4" />
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Alert;
