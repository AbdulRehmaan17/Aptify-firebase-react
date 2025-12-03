import React, { useState, useEffect } from 'react';
import { Filter, X, DollarSign, MapPin, Home } from 'lucide-react';
import Button from '../common/Button';

const PropertyFilters = ({ filters, onFiltersChange, isOpen, onToggle }) => {
  const [localFilters, setLocalFilters] = useState({
    type: filters.type || '',
    city: filters.city || '',
    minPrice: filters.minPrice || '',
    maxPrice: filters.maxPrice || '',
    bedrooms: filters.bedrooms || '',
    bathrooms: filters.bathrooms || '',
    furnished: filters.furnished !== null ? filters.furnished : null,
    parking: filters.parking !== null ? filters.parking : null,
  });

  useEffect(() => {
    setLocalFilters({
      type: filters.type || '',
      city: filters.city || '',
      minPrice: filters.minPrice || '',
      maxPrice: filters.maxPrice || '',
      bedrooms: filters.bedrooms || '',
      bathrooms: filters.bathrooms || '',
      furnished: filters.furnished !== null ? filters.furnished : null,
      parking: filters.parking !== null ? filters.parking : null,
    });
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    if (onToggle) onToggle();
  };

  const clearFilters = () => {
    const resetFilters = {
      type: '',
      city: '',
      minPrice: '',
      maxPrice: '',
      bedrooms: '',
      bathrooms: '',
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
    localFilters.furnished !== null,
    localFilters.parking !== null,
  ].filter(Boolean).length;

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
          <h2 className="text-lg font-semibold text-textMain">Filters</h2>
          <button onClick={onToggle} className="p-2">
            <X className="w-5 h-5 text-textSecondary" />
          </button>
        </div>

        <div className="space-y-6 bg-surface rounded-base p-4 border border-muted">
          {/* Property Type */}
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              <Home className="w-4 h-4 inline mr-1" />
              Property Type
            </label>
            <select
              value={localFilters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary bg-surface text-textMain"
            >
              <option value="">All Types</option>
              <option value="sale">For Sale</option>
              <option value="rent">For Rent</option>
              <option value="renovation">Renovation</option>
            </select>
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              City
            </label>
            <input
              type="text"
              value={localFilters.city}
              onChange={(e) => handleFilterChange('city', e.target.value)}
              placeholder="e.g., Lahore"
              className="w-full px-3 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary bg-surface text-textMain"
            />
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Price Range (PKR)
            </label>
            <div className="space-y-2">
              <input
                type="number"
                value={localFilters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                placeholder="Min Price"
                className="w-full px-3 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary bg-surface text-textMain"
              />
              <input
                type="number"
                value={localFilters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                placeholder="Max Price"
                className="w-full px-3 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary bg-surface text-textMain"
              />
            </div>
          </div>

          {/* Bedrooms */}
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              Bedrooms
            </label>
            <select
              value={localFilters.bedrooms}
              onChange={(e) => handleFilterChange('bedrooms', e.target.value)}
              className="w-full px-3 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary bg-surface text-textMain"
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
            <label className="block text-sm font-medium text-textSecondary mb-2">
              Bathrooms
            </label>
            <select
              value={localFilters.bathrooms}
              onChange={(e) => handleFilterChange('bathrooms', e.target.value)}
              className="w-full px-3 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary bg-surface text-textMain"
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
            <label className="block text-sm font-medium text-textSecondary mb-2">
              Furnished
            </label>
            <select
              value={localFilters.furnished === null ? '' : localFilters.furnished ? 'yes' : 'no'}
              onChange={(e) => {
                const value = e.target.value === '' ? null : e.target.value === 'yes';
                handleFilterChange('furnished', value);
              }}
              className="w-full px-3 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary bg-surface text-textMain"
            >
              <option value="">Any</option>
              <option value="yes">Furnished</option>
              <option value="no">Unfurnished</option>
            </select>
          </div>

          {/* Parking */}
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              Parking
            </label>
            <select
              value={localFilters.parking === null ? '' : localFilters.parking ? 'yes' : 'no'}
              onChange={(e) => {
                const value = e.target.value === '' ? null : e.target.value === 'yes';
                handleFilterChange('parking', value);
              }}
              className="w-full px-3 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary bg-surface text-textMain"
            >
              <option value="">Any</option>
              <option value="yes">Available</option>
              <option value="no">Not Available</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-muted">
            <Button onClick={applyFilters} className="flex-1 bg-primary hover:bg-primaryDark text-white">
              Apply Filters
            </Button>
            <Button onClick={clearFilters} variant="outline" className="flex-1">
              Clear
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PropertyFilters;


