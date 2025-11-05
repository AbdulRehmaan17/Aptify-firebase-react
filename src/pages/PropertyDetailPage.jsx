import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, MapPin, Bed, Bath, Square, Heart, Share2, Phone, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import propertyService from '../services/propertyService';
import userService from '../services/userService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';

const PropertyDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        const propertyData = await propertyService.getById(id, true);
        setProperty(propertyData);

        // Check if property is in user's favorites
        if (user) {
          try {
            const favorites = await userService.getFavorites(user.uid);
            setIsFavorite(favorites.includes(id));
          } catch (err) {
            console.error('Error checking favorites:', err);
          }
        }
      } catch (err) {
        console.error('Error fetching property:', err);
        setError(err.message || 'Failed to load property details.');
        toast.error(err.message || 'Failed to load property.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProperty();
    }
  }, [id, user]);

  const handleToggleFavorite = async () => {
    if (!user) {
      toast.error('Please log in to add favorites.');
      navigate('/auth');
      return;
    }

    try {
      if (isFavorite) {
        await userService.removeFromFavorites(user.uid, id);
        await propertyService.toggleFavorite(id, false);
        setIsFavorite(false);
        toast.success('Removed from favorites');
      } else {
        await userService.addToFavorites(user.uid, id);
        await propertyService.toggleFavorite(id, true);
        setIsFavorite(true);
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites.');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link.');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-red-600 mb-4 font-inter text-lg">
            {error || 'Property not found'}
          </p>
          <Button onClick={() => navigate('/properties')} variant="primary">
            Back to Properties
          </Button>
        </motion.div>
      </div>
    );
  }

  const images = property.photos || (property.coverImage ? [property.coverImage] : []);
  const displayImage = images[activeImageIndex] || images[0] || '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-ivory min-h-screen">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-600 mb-6">
          <Link to="/" className="hover:text-luxury-gold">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/properties" className="hover:text-luxury-gold">Properties</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{property.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Property Images */}
          <div className="relative group">
            {displayImage ? (
              <motion.img
                src={displayImage}
                alt={property.title}
                className="w-full h-[500px] sm:h-[600px] object-cover rounded-xl shadow-2xl"
                loading="lazy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              />
            ) : (
              <div className="w-full h-[500px] sm:h-[600px] bg-gray-200 rounded-xl flex items-center justify-center">
                <span className="text-gray-400">No image available</span>
              </div>
            )}

            {/* Image Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                      activeImageIndex === index ? 'border-luxury-gold' : 'border-gray-300'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Property Details */}
          <motion.div
            className="flex flex-col"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-4xl sm:text-5xl font-display font-bold text-charcoal mb-3 tracking-tight">
                    {property.title}
                  </h1>
                  <div className="flex items-center text-gray-500 mb-4">
                    <MapPin className="w-5 h-5 mr-2" />
                    <span>
                      {property.address?.line1 || ''}
                      {property.address?.city ? `, ${property.address.city}` : ''}
                      {property.address?.state ? `, ${property.address.state}` : ''}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleToggleFavorite}
                    className={`p-2 rounded-full transition-colors ${
                      isFavorite
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-luxury-gold text-charcoal mb-4">
                  {property.type?.toUpperCase() || 'PROPERTY'}
                </span>
                <p className="text-3xl font-bold text-charcoal mb-4 font-inter">
                  {formatPrice(property.price)}
                </p>
                <span className="text-sm text-gray-500">Status: {property.status || 'published'}</span>
              </div>

              {/* Property Features */}
              <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-white rounded-lg">
                <div className="text-center">
                  <Bed className="w-6 h-6 mx-auto mb-2 text-luxury-gold" />
                  <p className="text-sm text-gray-600">Bedrooms</p>
                  <p className="text-lg font-semibold">{property.bedrooms || '-'}</p>
                </div>
                <div className="text-center">
                  <Bath className="w-6 h-6 mx-auto mb-2 text-luxury-gold" />
                  <p className="text-sm text-gray-600">Bathrooms</p>
                  <p className="text-lg font-semibold">{property.bathrooms || '-'}</p>
                </div>
                <div className="text-center">
                  <Square className="w-6 h-6 mx-auto mb-2 text-luxury-gold" />
                  <p className="text-sm text-gray-600">Area</p>
                  <p className="text-lg font-semibold">{property.areaSqFt || '-'} sqft</p>
                </div>
              </div>

              <p className="text-gray-600 mb-8 font-inter leading-relaxed">
                {property.description}
              </p>

              {/* Amenities */}
              {property.amenities && property.amenities.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {property.amenities.map((amenity, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Owner Contact */}
              {property.ownerName && (
                <div className="mb-8 p-4 bg-white rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">Contact Owner</h3>
                  <p className="text-gray-700 mb-2">{property.ownerName}</p>
                  {property.ownerPhone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{property.ownerPhone}</span>
                    </div>
                  )}
                  <Button
                    className="mt-4 w-full bg-luxury-gold text-charcoal hover:bg-yellow-600"
                    onClick={() => toast.info('Contact functionality coming soon!')}
                  >
                    Contact Owner
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default PropertyDetailPage;

