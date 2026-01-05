import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Bed, Bath, Square, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../common/Button';
import toast from 'react-hot-toast';

const PropertyCard = ({ property, isFavorite = false, onFavoriteToggle }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const formatPrice = (price) => {
    if (!price) return 'Price not available';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getImageUrl = () => {
    // NORMALIZED: Use coverImage if exists, else first photo, else null (fallback UI will show)
    // Priority: coverImage -> photos[0] -> legacy fields -> null
    
    // 1. Check coverImage (highest priority)
    if (property.coverImage && typeof property.coverImage === 'string') {
      const trimmed = property.coverImage.trim();
      if (trimmed.length > 0 && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
        return trimmed;
      }
    }
    
    // 2. Check photos array (first valid URL)
    if (property.photos && Array.isArray(property.photos)) {
      for (const photo of property.photos) {
        if (typeof photo === 'string') {
          const trimmed = photo.trim();
          if (trimmed.length > 0 && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
            return trimmed;
          }
        }
      }
    }
    
    // 3. Legacy fields (backward compatibility)
    if (property.imageUrl && typeof property.imageUrl === 'string') {
      const trimmed = property.imageUrl.trim();
      if (trimmed.length > 0 && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
        return trimmed;
      }
    }
    if (property.image && typeof property.image === 'string') {
      const trimmed = property.image.trim();
      if (trimmed.length > 0 && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
        return trimmed;
      }
    }
    
    // 4. Return null - fallback UI will show
    return null;
  };

  const imageUrl = getImageUrl();

  const handleFavoriteToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Please sign in to add to favorites');
      return;
    }

    if (onFavoriteToggle) {
      onFavoriteToggle(property.id, !isFavorite);
    }
  };

  // Check if this is a demo property
  const isDemo = property.id?.startsWith('demo-');

  const handleCardClick = (e) => {
    if (isDemo) {
      e.preventDefault();
      navigate('/properties');
    }
  };

  return (
    <Link
      to={isDemo ? '/properties' : `/properties/${property.id}`}
      className="block"
      onClick={handleCardClick}
    >
      <div className="bg-card shadow-sm rounded-lg border border-muted p-4 hover:shadow-md hover:border-primary transition group">
        {/* Image */}
        <div className="relative h-48 sm:h-56 overflow-hidden bg-muted rounded-lg mb-4 flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={property.title || 'Property'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={(e) => {
                // FIXED: Hide broken image and show fallback
                e.target.style.display = 'none';
                const fallback = e.target.nextElementSibling;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          {/* FIXED: Fallback UI for missing images */}
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-muted to-muted/50 text-textSecondary ${
              imageUrl ? 'hidden' : 'flex'
            }`}
            style={{ display: imageUrl ? 'none' : 'flex' }}
          >
            <Home className="w-12 h-12 mb-2 opacity-50" />
            <span className="text-sm font-medium">No Image Available</span>
          </div>
          {/* Status Badge */}
          <div className="absolute top-2 left-2">
            <span
              className={`px-2 py-1 rounded text-xs font-semibold ${
                property.status === 'published'
                  ? 'bg-success text-white'
                  : property.status === 'pending'
                    ? 'bg-accent text-white'
                    : 'bg-textSecondary text-white'
              }`}
            >
              {property.status === 'published' ? 'Available' : property.status || 'Unknown'}
            </span>
          </div>
          {/* Type Badge */}
          <div className="absolute top-2 right-2">
            <span className="px-2 py-1 rounded text-xs font-semibold bg-primary text-white capitalize">
              {property.type || 'Property'}
            </span>
          </div>
          {/* Favorite Button */}
          {user && (
            <button
              onClick={handleFavoriteToggle}
              className="absolute bottom-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors"
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg
                className={`w-5 h-5 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'}`}
                fill={isFavorite ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div>
          {/* Title */}
          <h3 className="text-textMain font-semibold text-lg mb-2 line-clamp-2">
            {property.title || 'Untitled Property'}
          </h3>

          {/* Location */}
          {property.address && (
            <div className="flex items-center text-textSecondary text-sm mb-3">
              <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
              <span className="truncate">
                {(() => {
                  if (typeof property.address === 'string') {
                    return property.address;
                  }
                  const parts = [];
                  if (property.address?.line1) parts.push(property.address.line1);
                  if (property.address?.city && !parts.includes(property.address.city)) {
                    parts.push(property.address.city);
                  }
                  return parts.length > 0 ? parts.join(', ') : 'Location not specified';
                })()}
              </span>
            </div>
          )}

          {/* Price */}
          <div className="mb-3">
            <p className="text-primary font-bold text-xl">{formatPrice(property.price)}</p>
            {property.type === 'rent' && <p className="text-xs text-textSecondary">per month</p>}
          </div>

          {/* Features */}
          <div className="flex items-center gap-4 text-sm text-textSecondary mb-3">
            {property.bedrooms !== undefined && property.bedrooms !== null && (
              <div className="flex items-center">
                <Bed className="w-4 h-4 mr-1" />
                <span>{property.bedrooms}</span>
              </div>
            )}
            {property.bathrooms !== undefined && property.bathrooms !== null && (
              <div className="flex items-center">
                <Bath className="w-4 h-4 mr-1" />
                <span>{property.bathrooms}</span>
              </div>
            )}
            {property.areaSqFt && (
              <div className="flex items-center">
                <Square className="w-4 h-4 mr-1" />
                <span>{property.areaSqFt} sqft</span>
              </div>
            )}
          </div>

          {/* Amenities Tags */}
          {property.amenities && property.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {property.amenities.slice(0, 3).map((amenity, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-muted text-textSecondary text-xs rounded-base"
                >
                  {amenity}
                </span>
              ))}
              {property.amenities.length > 3 && (
                <span className="px-2 py-1 bg-muted text-textSecondary text-xs rounded-base">
                  +{property.amenities.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Action Button */}
          <Button
            className="w-full mt-2"
            variant="primary"
            onClick={(e) => {
              e.preventDefault();
              // Navigate is handled by the Link wrapper
            }}
          >
            View Details
          </Button>
        </div>
      </div>
    </Link>
  );
};

export default PropertyCard;
