// src/components/ui/Toast.jsx

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useToast } from "../../context/ToastContext";
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from "react-icons/fi";

// ── Per-type styles ─────────────────────────────────────────────
const TYPE_STYLES = {
  success: {
    container: "bg-white border border-green-200 shadow-lg shadow-green-100/50",
    icon: "text-green-500",
    bar: "bg-green-500",
    Icon: FiCheckCircle,
  },
  error: {
    container: "bg-white border border-red-200 shadow-lg shadow-red-100/50",
    icon: "text-red-500",
    bar: "bg-red-500",
    Icon: FiAlertCircle,
  },
  info: {
    container: "bg-white border border-blue-200 shadow-lg shadow-blue-100/50",
    icon: "text-blue-500",
    bar: "bg-blue-500",
    Icon: FiInfo,
  },
};

// ── Single toast item ───────────────────────────────────────────
const ToastItem = ({ toast, onRemove }) => {
  const reduced = useReducedMotion();
  const styles = TYPE_STYLES[toast.type] ?? TYPE_STYLES.info;
  const { Icon } = styles;

  return (
    <motion.li
      layout
      key={toast.id}
      initial={reduced ? { opacity: 0 } : { opacity: 0, x: 64, scale: 0.92 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, x: 64, scale: 0.9 }}
      transition={
        reduced
          ? { duration: 0.15 }
          : { type: "spring", stiffness: 360, damping: 28 }
      }
      className={`relative flex items-start gap-3 rounded-xl px-4 py-3
                  min-w-[260px] max-w-[360px] overflow-hidden
                  ${styles.container}`}
      role="status"
      aria-live="polite"
    >
      {/* ── Coloured left bar ─────────────────────────── */}
      <span
        className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl
                    ${styles.bar}`}
        aria-hidden="true"
      />

      {/* ── Icon ─────────────────────────────────────── */}
      <Icon
        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.icon}`}
        aria-hidden="true"
      />

      {/* ── Message ──────────────────────────────────── */}
      <p className="text-sm text-gray-700 flex-1 leading-relaxed pr-2">
        {toast.message}
      </p>

      {/* ── Dismiss button ───────────────────────────── */}
      <motion.button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600
                   transition-colors mt-0.5"
        aria-label="Dismiss notification"
        whileHover={reduced ? {} : { scale: 1.15 }}
        whileTap={reduced ? {} : { scale: 0.9 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <FiX className="w-4 h-4" />
      </motion.button>
    </motion.li>
  );
};

// ── Overlay container — bottom-right, stacks upward ────────────
const ToastOverlay = () => {
  const { toasts, removeToast } = useToast();

  return (
    <ul
      className="fixed bottom-6 right-4 z-[999] flex flex-col-reverse gap-3
                 items-end pointer-events-none list-none m-0 p-0"
      aria-label="Notifications"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={removeToast} />
          </div>
        ))}
      </AnimatePresence>
    </ul>
  );
};

export default ToastOverlay;
