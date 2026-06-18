// src/context/ToastContext.jsx — Lightweight global toast system

import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

let idCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // type: 'success' | 'error' | 'info'
  const showToast = useCallback(
    (message, type = "success", duration = 3500) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type }]);

      // Auto-dismiss
      setTimeout(() => removeToast(id), duration);

      return id;
    },
    [removeToast],
  );

  // Convenience shorthands — used throughout the app instead of showToast(...)
  const toast = {
    success: (msg, duration) => showToast(msg, "success", duration),
    error: (msg, duration) => showToast(msg, "error", duration),
    info: (msg, duration) => showToast(msg, "info", duration),
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, toast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export default ToastContext;
