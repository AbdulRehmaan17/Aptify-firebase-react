import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Bed, Bath, Square, Heart, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import userService from '../../services/userService';
import Button from '../common/Button';
import toast from 'react-hot-toast';

const PropertyCard = ({ property, isFavorite = false, onFavoriteToggle }) => {
  const { user } = useAuth();
  const { addToCart } = useCart();
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
    // Check multiple possible image fields
    if (property.photos && Array.isArray(property.photos) && property.photos.length > 0) {
      const url = property.photos[0];
      console.log('Using photos[0]:', url);
      return url;
    }
    if (property.coverImage) {
      console.log('Using coverImage:', property.coverImage);
      return property.coverImage;
    }
    if (property.imageUrl) {
      console.log('Using imageUrl:', property.imageUrl);
      return property.imageUrl;
    }
    if (property.image) {
      console.log('Using image:', property.image);
      return property.image;
    }
    // Debug: log what image fields exist
    console.log('No image found. Property image fields:', {
      photos: property.photos,
      coverImage: property.coverImage,
      imageUrl: property.imageUrl,
      image: property.image,
    });
    // Placeholder image
    return 'https://via.placeholder.com/400x300?text=No+Image';
  };

  const handleFavoriteToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Please sign in to add to favorites');
      return;
    }

    try {
      if (isFavorite) {
        await userService.removeFromFavorites(user.uid, property.id);
        await userService.removeFromWishlist(user.uid, property.id);
        toast.success('Removed from favorites');
      } else {
        await userService.addToFavorites(user.uid, property.id);
        await userService.addToWishlist(user.uid, property.id, 'property');
        toast.success('Added to favorites');
      }
      if (onFavoriteToggle) {
        onFavoriteToggle(property.id, !isFavorite);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Please sign in to add to cart');
      return;
    }

    // Only allow adding properties for sale to cart
    if (property.type !== 'sale') {
      toast.error('Only properties for sale can be added to cart');
      return;
    }

    try {
      addToCart({
        itemId: property.id,
        itemType: 'property',
        name: property.title,
        price: property.price,
        image: getImageUrl(),
        quantity: 1,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
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
      <div className="bg-surface shadow-soft rounded-lg border border-muted p-4 hover:shadow-md hover:border-primary transition group">
        {/* Image */}
        <div className="relative h-48 sm:h-56 overflow-hidden bg-muted rounded-lg mb-4">
          <img
            src={getImageUrl()}
            alt={property.title || 'Property'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              console.error('Image failed to load:', e.target.src);
              e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
            }}
            onLoad={() => {
              console.log('Image loaded successfully:', getImageUrl());
            }}
          />
          {/* Status Badge */}
          <div className="absolute top-2 left-2">
            <span
              className={`px-2 py-1 rounded-base text-xs font-semibold ${
                property.status === 'published'
                  ? 'bg-primary text-white'
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
            <span className="px-2 py-1 rounded-base text-xs font-semibold bg-primary text-white capitalize">
              {property.type || 'Property'}
            </span>
          </div>
          {/* Favorite Button */}
          {user && (
            <button
              onClick={handleFavoriteToggle}
              className="absolute bottom-2 right-2 p-2 bg-surface rounded-full shadow-md hover:bg-error/10 transition-colors"
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg
                className={`w-5 h-5 ${isFavorite ? 'text-error fill-current' : 'text-textSecondary'}`}
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
                <span key={index} className="px-2 py-1 bg-muted text-textSecondary text-xs rounded-base">
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

          {/* Action Buttons */}
          <div className="flex gap-2 mt-2">
            {property.type === 'sale' && (
              <Button
                className="flex-1"
                variant="outline"
                onClick={handleAddToCart}
              >
                <ShoppingCart className="w-4 h-4 mr-1" />
                Add to Cart
              </Button>
            )}
            <Button
              className={property.type === 'sale' ? 'flex-1' : 'w-full'}
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
      </div>
    </Link>
  );
};

export default PropertyCard;
