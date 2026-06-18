// src/components/ui/Button.jsx

import { motion, useReducedMotion } from "framer-motion";
import { MiniSpinner } from "../ui/LoadingSpinner";

const VARIANTS = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  danger: "btn-danger",
  ghost:
    "text-primary-700 hover:text-primary-900 hover:bg-sage-50 px-3 py-2 rounded-lg transition-colors",
};

const Button = ({
  children,
  variant = "primary",
  loading = false,
  disabled = false,
  type = "button",
  onClick,
  className = "",
  fullWidth = false,
  icon,
  ...rest
}) => {
  const reduced = useReducedMotion();
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        ${VARIANTS[variant]}
        ${fullWidth ? "w-full" : ""}
        flex items-center justify-center gap-2
        disabled:opacity-60 disabled:cursor-not-allowed
        ${className}
      `}
      whileHover={reduced || isDisabled ? {} : { scale: 1.03, y: -1 }}
      whileTap={reduced || isDisabled ? {} : { scale: 0.97, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      {...rest}
    >
      {loading ? (
        <>
          <MiniSpinner
            size={16}
            color={variant === "primary" ? "#ffffff" : "#1340B8"}
          />
          <span>Loading…</span>
        </>
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </motion.button>
  );
};

export default Button;
