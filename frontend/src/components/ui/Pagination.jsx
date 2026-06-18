// src/components/ui/Pagination.jsx

import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  // Build a simple page number list (max 5 visible)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-10">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2.5 rounded-xl border border-gray-200 text-gray-500
                   hover:bg-gray-50 disabled:opacity-40
                   disabled:cursor-not-allowed transition-colors"
      >
        <FiChevronLeft className="w-4 h-4" />
      </button>

      {getPageNumbers().map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`w-10 h-10 rounded-xl font-medium text-sm transition-colors ${
            page === currentPage
              ? "bg-primary-600 text-white"
              : "text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2.5 rounded-xl border border-gray-200 text-gray-500
                   hover:bg-gray-50 disabled:opacity-40
                   disabled:cursor-not-allowed transition-colors"
      >
        <FiChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Pagination;
