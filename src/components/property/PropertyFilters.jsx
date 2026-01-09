import React, { useState } from 'react';
import { Filter, X } from 'lucide-react';
import Button from '../common/Button';

/**
 * PropertyFilters Component
 * Filter component specifically designed for properties (not products)
 * Supports: type, city, price range (PKR), bedrooms, bathrooms, furnished, parking
 * @param {Object} props
 * @param {Object} props.filters - Current filter values
 * @param {Function} props.onFiltersChange - Callback when filters change
 * @param {boolean} props.isOpen - Whether filter panel is open (mobile)
 * @param {Function} props.onToggle - Toggle filter panel visibility
 * @param {boolean} [props.hideTypeFilter=false] - Hide type filter (useful for rental-only pages)
 */
const PropertyFilters = ({ filters, onFiltersChange, isOpen, onToggle, hideTypeFilter = false }) => {
  // Initialize with property-specific defaults
  const defaultFilters = {
    type: filters?.type || '',
    city: filters?.city || '',
    minPrice: filters?.minPrice ?? null,
    maxPrice: filters?.maxPrice ?? null,
    bedrooms: filters?.bedrooms ?? null,
    bathrooms: filters?.bathrooms ?? null,
    furnished: filters?.furnished ?? null,
    parking: filters?.parking ?? null,
  };

  const [localFilters, setLocalFilters] = useState(defaultFilters);

  const handleFilterChange = (key, value) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    onToggle();
  };

  const clearFilters = () => {
    const resetFilters = {
      type: '',
      city: '',
      minPrice: null,
      maxPrice: null,
      bedrooms: null,
      bathrooms: null,
      furnished: null,
      parking: null,
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const activeFilterCount = [
    localFilters.type,
    localFilters.city,
    localFilters.minPrice,
    localFilters.maxPrice,
    localFilters.bedrooms,
    localFilters.bathrooms,
    localFilters.furnished !== null ? 1 : 0,
    localFilters.parking !== null ? 1 : 0,
  ].filter(Boolean).length;

  // Format PKR price
  const formatPKR = (price) => {
    if (!price) return '0';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
    }).format(price);
  };

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
          <button onClick={onToggle} className="p-2" aria-label="Close filters">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Property Type - Hidden if hideTypeFilter is true */}
          {!hideTypeFilter && (
            <div>
              <h3 className="text-sm font-semibold text-textMain mb-3">Property Type</h3>
              <div className="space-y-2">
                {['sale', 'rent'].map((type) => (
                  <label key={type} className="flex items-center">
                    <input
                      type="radio"
                      name="type"
                      checked={localFilters.type === type}
                      onChange={() => handleFilterChange('type', type)}
                      className="rounded border-muted text-primary focus:ring-primary bg-surface"
                    />
                    <span className="ml-2 text-sm text-textMain capitalize">{type}</span>
                  </label>
                ))}
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="type"
                    checked={localFilters.type === ''}
                    onChange={() => handleFilterChange('type', '')}
                    className="rounded border-muted text-primary focus:ring-primary bg-surface"
                  />
                  <span className="ml-2 text-sm text-textMain">All Types</span>
                </label>
              </div>
            </div>
          )}

          {/* City */}
          <div>
            <h3 className="text-sm font-semibold text-textMain mb-3">City</h3>
            <input
              type="text"
              value={localFilters.city || ''}
              onChange={(e) => handleFilterChange('city', e.target.value)}
              placeholder="Enter city name"
              className="w-full px-3 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary bg-surface text-textMain text-sm"
            />
          </div>

          {/* Price Range (PKR) */}
          <div>
            <h3 className="text-sm font-semibold text-textMain mb-3">Price Range (PKR)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-textSecondary mb-1">Min Price</label>
                <input
                  type="number"
                  value={localFilters.minPrice || ''}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value ? Number(e.target.value) : null)}
                  placeholder="0"
                  min="0"
                  className="w-full px-3 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary bg-surface text-textMain text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-textSecondary mb-1">Max Price</label>
                <input
                  type="number"
                  value={localFilters.maxPrice || ''}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value ? Number(e.target.value) : null)}
                  placeholder="Any"
                  min="0"
                  className="w-full px-3 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary bg-surface text-textMain text-sm"
                />
              </div>
            </div>
          </div>

          {/* Bedrooms */}
          <div>
            <h3 className="text-sm font-semibold text-textMain mb-3">Bedrooms</h3>
            <select
              value={localFilters.bedrooms || ''}
              onChange={(e) => handleFilterChange('bedrooms', e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary bg-surface text-textMain text-sm"
            >
              <option value="">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">5+</option>
            </select>
          </div>

          {/* Bathrooms */}
          <div>
            <h3 className="text-sm font-semibold text-textMain mb-3">Bathrooms</h3>
            <select
              value={localFilters.bathrooms || ''}
              onChange={(e) => handleFilterChange('bathrooms', e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary bg-surface text-textMain text-sm"
            >
              <option value="">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
            </select>
          </div>

          {/* Furnished */}
          <div>
            <h3 className="text-sm font-semibold text-textMain mb-3">Furnished</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="furnished"
                  checked={localFilters.furnished === null}
                  onChange={() => handleFilterChange('furnished', null)}
                  className="rounded border-muted text-primary focus:ring-primary bg-surface"
                />
                <span className="ml-2 text-sm text-textMain">Any</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="furnished"
                  checked={localFilters.furnished === true}
                  onChange={() => handleFilterChange('furnished', true)}
                  className="rounded border-muted text-primary focus:ring-primary bg-surface"
                />
                <span className="ml-2 text-sm text-textMain">Furnished</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="furnished"
                  checked={localFilters.furnished === false}
                  onChange={() => handleFilterChange('furnished', false)}
                  className="rounded border-muted text-primary focus:ring-primary bg-surface"
                />
                <span className="ml-2 text-sm text-textMain">Unfurnished</span>
              </label>
            </div>
          </div>

          {/* Parking */}
          <div>
            <h3 className="text-sm font-semibold text-textMain mb-3">Parking</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="parking"
                  checked={localFilters.parking === null}
                  onChange={() => handleFilterChange('parking', null)}
                  className="rounded border-muted text-primary focus:ring-primary bg-surface"
                />
                <span className="ml-2 text-sm text-textMain">Any</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="parking"
                  checked={localFilters.parking === true}
                  onChange={() => handleFilterChange('parking', true)}
                  className="rounded border-muted text-primary focus:ring-primary bg-surface"
                />
                <span className="ml-2 text-sm text-textMain">Available</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="parking"
                  checked={localFilters.parking === false}
                  onChange={() => handleFilterChange('parking', false)}
                  className="rounded border-muted text-primary focus:ring-primary bg-surface"
                />
                <span className="ml-2 text-sm text-textMain">Not Available</span>
              </label>
            </div>
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
            <Button onClick={applyFilters} variant="primary" size="sm" fullWidth>
              Apply Filters
            </Button>
            <Button onClick={clearFilters} variant="outline" size="sm" fullWidth>
              Clear All
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" 
          onClick={onToggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggle();
            }
          }}
          aria-label="Close filters"
        />
      )}
    </>
  );
};

export default PropertyFilters;

