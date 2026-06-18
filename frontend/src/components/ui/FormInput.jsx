// src/components/ui/FormInput.jsx — Reusable form input with error display + password toggle

import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

const FormInput = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  required = false,
  textarea = false,
  rows = 4,
  ...rest
}) => {
  const Tag = textarea ? "textarea" : "input";
  const isPassword = type === "password";
  const [showPassword, setShowPassword] = useState(false);

  // If it's a password field and toggled visible, render as text instead
  const resolvedType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div>
      <label htmlFor={name} className="input-label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      <div className="relative">
        <Tag
          id={name}
          name={name}
          type={!textarea ? resolvedType : undefined}
          rows={textarea ? rows : undefined}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`input-field ${textarea ? "resize-none" : ""} ${
            isPassword ? "pr-11" : ""
          } ${error ? "border-red-400 focus:ring-red-400" : ""}`}
          {...rest}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                       hover:text-gray-600 transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <FiEyeOff className="w-4.5 h-4.5" />
            ) : (
              <FiEye className="w-4.5 h-4.5" />
            )}
          </button>
        )}
      </div>

      {error && <p className="input-error">{error}</p>}
    </div>
  );
};

export default FormInput;
