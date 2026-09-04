// src/components/ui/TokenIcon.jsx — Trend Tribe token: circle with star
import { FaStar } from "react-icons/fa";

const TokenIcon = ({ size = 16, className = "" }) => {
  const starSize = Math.round(size * 0.6);
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: "#F5C518", // accent gold — Trend Tribe
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.15)",
        border: "1px solid #E6B800",
      }}
      aria-hidden="true"
    >
      <FaStar style={{ width: starSize, height: starSize }} className="text-navy-900" color="#0F1F3D" />
    </span>
  );
};

export default TokenIcon;
