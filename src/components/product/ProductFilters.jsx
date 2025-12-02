import React, { useState } from 'react';
import { Filter, X } from 'lucide-react';
import Button from '../common/Button';

const ProductFilters = ({ filters, onFiltersChange, categories, brands, isOpen, onToggle }) => {
  // Initialize with default structure if filters don't have expected properties
  const defaultFilters = {
    category: [],
    brand: [],
    priceRange: [0, 10000000],
    rating: 0,
    inStock: false,
    ...filters, // Merge with provided filters
  };

  // Ensure category and brand are arrays
  if (!Array.isArray(defaultFilters.category)) {
    defaultFilters.category = [];
  }
  if (!Array.isArray(defaultFilters.brand)) {
    defaultFilters.brand = [];
  }
  if (!Array.isArray(defaultFilters.priceRange)) {
    defaultFilters.priceRange = [0, 10000000];
  }

  const [localFilters, setLocalFilters] = useState(defaultFilters);

  const handleFilterChange = (key, value) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleArrayFilterToggle = (key, value) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((item) => item !== value)
        : [...prev[key], value],
    }));
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    onToggle();
  };

  const clearFilters = () => {
    const resetFilters = {
      category: [],
      brand: [],
      priceRange: [0, 10000000],
      rating: 0,
      inStock: false,
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const activeFilterCount =
    localFilters.category.length +
    localFilters.brand.length +
    (localFilters.rating > 0 ? 1 : 0) +
    (localFilters.inStock ? 1 : 0);

  return (
    <>
      {/* Mobile Filter Button */}
      <div className="lg:hidden mb-4">
        <Button onClick={onToggle} variant="outline" className="flex items-center space-x-2">
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filter Panel */}
      <div
        className={`
        ${isOpen ? 'block' : 'hidden'} lg:block
        fixed lg:static inset-0 lg:inset-auto z-50 lg:z-auto
        bg-surface lg:bg-transparent
        p-4 lg:p-0
        overflow-y-auto lg:overflow-visible
        lg:w-64
      `}
      >
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Filters</h2>
          <button onClick={onToggle} className="p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold text-textMain mb-3">Category</h3>
            <div className="space-y-2">
              {categories.map((category) => (
                <label key={category} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={localFilters.category.includes(category)}
                    onChange={() => handleArrayFilterToggle('category', category)}
                    className="rounded border-muted text-primary focus:ring-primary bg-surface"
                  />
                  <span className="ml-2 text-sm text-textMain">{category}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Brands */}
          <div>
            <h3 className="text-sm font-semibold text-textMain mb-3">Brand</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {brands.map((brand) => (
                <label key={brand} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={localFilters.brand.includes(brand)}
                    onChange={() => handleArrayFilterToggle('brand', brand)}
                    className="rounded border-muted text-primary focus:ring-primary bg-surface"
                  />
                  <span className="ml-2 text-sm text-textMain">{brand}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="text-sm font-semibold text-textMain mb-3">Price Range</h3>
            <div className="space-y-3">
              <div>
                <input
                  type="range"
                  min="0"
                  max="10000000"
                  step="10000"
                  value={localFilters.priceRange[1]}
                  onChange={(e) => handleFilterChange('priceRange', [0, parseInt(e.target.value)])}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-textSecondary mt-1">
                  <span>$0</span>
                  <span>${localFilters.priceRange[1].toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rating */}
          <div>
            <h3 className="text-sm font-semibold text-textMain mb-3">Minimum Rating</h3>
            <div className="space-y-2">
              {[4, 3, 2, 1].map((rating) => (
                <label key={rating} className="flex items-center">
                  <input
                    type="radio"
                    name="rating"
                    checked={localFilters.rating === rating}
                    onChange={() => handleFilterChange('rating', rating)}
                    className="text-primary focus:ring-luxury-gold"
                  />
                  <span className="ml-2 text-sm text-textMain">{rating}+ Stars</span>
                </label>
              ))}
            </div>
          </div>

          {/* In Stock */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localFilters.inStock}
                onChange={(e) => handleFilterChange('inStock', e.target.checked)}
                className="rounded border-muted text-primary focus:ring-primary bg-surface"
              />
              <span className="ml-2 text-sm text-textMain">In Stock Only</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="lg:hidden space-y-3 pt-6 border-t">
            <Button onClick={applyFilters} fullWidth>
              Apply Filters
            </Button>
            <Button onClick={clearFilters} variant="outline" fullWidth>
              Clear All
            </Button>
          </div>

          <div className="hidden lg:block space-y-3">
            <Button onClick={clearFilters} variant="outline" size="sm" fullWidth>
              Clear All
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onToggle} />
      )}
    </>
  );
};

export default ProductFilters;
