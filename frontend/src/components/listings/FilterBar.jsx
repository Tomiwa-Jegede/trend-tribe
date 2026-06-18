// src/components/listings/FilterBar.jsx

import { useState } from "react";
import { FiSearch, FiX, FiSliders } from "react-icons/fi";
import { CATEGORIES, CONDITIONS } from "../../services/listingService";

const FilterBar = ({ filters, onFilterChange, onReset }) => {
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters =
    filters.category ||
    filters.condition ||
    filters.minPrice ||
    filters.maxPrice;

  return (
    <div className="card p-4 mb-6">
      {/* ── Search Row ────────────────────────────────── */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <FiSearch
            className="absolute left-3 top-1/2 -translate-y-1/2
                               text-gray-400 w-4 h-4"
          />
          <input
            type="text"
            placeholder="Search for textbooks, laptops, furniture..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="input-field pl-10"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary flex items-center gap-2 px-4 ${
            hasActiveFilters ? "border-primary-500 text-primary-600" : ""
          }`}
        >
          <FiSliders className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-primary-600 rounded-full" />
          )}
        </button>
      </div>

      {/* ── Expanded Filters ──────────────────────────── */}
      {showFilters && (
        <div
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4
                        border-t border-gray-100"
        >
          {/* Category */}
          <div>
            <label className="input-label">Category</label>
            <select
              value={filters.category}
              onChange={(e) => onFilterChange({ category: e.target.value })}
              className="input-field"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Condition */}
          <div>
            <label className="input-label">Condition</label>
            <select
              value={filters.condition}
              onChange={(e) => onFilterChange({ condition: e.target.value })}
              className="input-field"
            >
              <option value="">Any Condition</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Min Price */}
          <div>
            <label className="input-label">Min Price (₦)</label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={filters.minPrice}
              onChange={(e) => onFilterChange({ minPrice: e.target.value })}
              className="input-field"
            />
          </div>

          {/* Max Price */}
          <div>
            <label className="input-label">Max Price (₦)</label>
            <input
              type="number"
              min="0"
              placeholder="Any"
              value={filters.maxPrice}
              onChange={(e) => onFilterChange({ maxPrice: e.target.value })}
              className="input-field"
            />
          </div>
        </div>
      )}

      {/* ── Active Filter Chips ───────────────────────── */}
      {hasActiveFilters && (
        <div
          className="flex items-center gap-2 mt-4 pt-4 border-t
                        border-gray-100 flex-wrap"
        >
          <span className="text-xs text-gray-400">Active filters:</span>

          {filters.category && (
            <Chip
              label={filters.category.replace("_", " ")}
              onRemove={() => onFilterChange({ category: "" })}
            />
          )}
          {filters.condition && (
            <Chip
              label={filters.condition.replace("_", " ")}
              onRemove={() => onFilterChange({ condition: "" })}
            />
          )}
          {filters.minPrice && (
            <Chip
              label={`Min ₦${filters.minPrice}`}
              onRemove={() => onFilterChange({ minPrice: "" })}
            />
          )}
          {filters.maxPrice && (
            <Chip
              label={`Max ₦${filters.maxPrice}`}
              onRemove={() => onFilterChange({ maxPrice: "" })}
            />
          )}

          <button
            onClick={onReset}
            className="text-xs text-red-500 hover:text-red-600 font-medium ml-1"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Small reusable filter chip ───────────────────────────────
const Chip = ({ label, onRemove }) => (
  <span className="badge bg-primary-50 text-primary-700 gap-1.5 pr-1.5">
    {label}
    <button
      onClick={onRemove}
      className="hover:bg-primary-200 rounded-full p-0.5 transition-colors"
    >
      <FiX className="w-3 h-3" />
    </button>
  </span>
);

export default FilterBar;
