import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, MapPin, Bed, Bath, Square, Heart, Share2, Phone, Mail, Edit, Trash2, ChevronLeft, ChevronRight, Calendar, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import propertyService from '../services/propertyService';
import userService from '../services/userService';
import rentalRequestService from '../services/rentalRequestService';
import buySellRequestService from '../services/buySellRequestService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import ReviewsAndRatings from './ReviewsAndRatings';
import PropertyCard from '../components/property/PropertyCard';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import RentalRequestForm from './RentalRequestForm';
import BuySellOfferForm from './BuySellOfferForm';
import GoogleMap from '../components/maps/GoogleMap';
import MapErrorBoundary from '../components/maps/MapErrorBoundary';
import { formatAddress, safeText } from '../utils/formatHelpers';

const PropertyDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, currentUserRole } = useAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [similarProperties, setSimilarProperties] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [showBuySellModal, setShowBuySellModal] = useState(false);
  const [rentalFormData, setRentalFormData] = useState({
    startDate: '',
    endDate: '',
    message: '',
  });
  const [buySellFormData, setBuySellFormData] = useState({
    offerAmount: '',
    message: '',
  });
  const [submittingRental, setSubmittingRental] = useState(false);
  const [submittingBuySell, setSubmittingBuySell] = useState(false);
  const isOwner = user && property && property.ownerId === user.uid;
  const isAdmin = currentUserRole === 'admin';

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        setError(null); // Clear previous errors
        
        const propertyData = await propertyService.getById(id, true);
        
        // Always set property, even if some data is missing
        if (propertyData) {
          setProperty(propertyData);

          // Check if property is in user's favorites (non-blocking)
          if (user) {
            try {
              const favorites = await userService.getFavorites(user.uid);
              setIsFavorite(favorites.includes(id));
            } catch (err) {
              console.warn('Error checking favorites (non-critical):', err);
              // Don't set error - favorites are optional
            }
          }

          // Fetch similar properties (non-blocking)
          try {
            const similar = await propertyService.getAll(
              {
                type: propertyData.type,
                city: propertyData.address?.city,
              },
              { limit: 4, sortBy: 'createdAt', sortOrder: 'desc' }
            );
            // Filter out current property
            const filtered = similar.filter((p) => p && p.id && p.id !== id);
            setSimilarProperties(filtered.slice(0, 3));
          } catch (err) {
            console.warn('Error fetching similar properties (non-critical):', err);
            // Don't set error - similar properties are optional
            setSimilarProperties([]);
          }
        } else {
          setError('Property not found');
        }
      } catch (err) {
        console.error('Error fetching property:', err);
        // Set error but don't block page render
        setError(err.message || 'Failed to load property details.');
        // Show toast but don't prevent navigation
        toast.error(err.message || 'Failed to load property.');
        // Set property to null so page can show empty state
        setProperty(null);
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

  const handleDelete = async () => {
    if (!property || (!isOwner && !isAdmin)) return;

    try {
      setDeleting(true);
      await propertyService.delete(id);
      toast.success('Property deleted successfully');
      navigate('/properties');
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error('Failed to delete property');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleEdit = () => {
    navigate(`/post-property?edit=${id}`);
  };

  const nextImage = () => {
    const images = property.photos || (property.coverImage ? [property.coverImage] : []);
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    const images = property.photos || (property.coverImage ? [property.coverImage] : []);
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleRentalSuccess = () => {
    setShowRentalModal(false);
    setRentalFormData({ startDate: '', endDate: '', message: '' });
  };

  const handleBuySellSuccess = () => {
    setShowBuySellModal(false);
    setBuySellFormData({ offerAmount: '', message: '' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-error mb-4 font-inter text-lg">{error || 'Property not found'}</p>
          <Button onClick={() => navigate('/properties')} variant="primary">
            Back to Properties
          </Button>
        </motion.div>
      </div>
    );
  }

  // NORMALIZED: Get images array - filter out invalid values
  // Defensive: Ensure property exists before accessing properties
  const getNormalizedImages = () => {
    if (!property) return [];
    
    const images = [];
    
    // Add coverImage if valid
    if (property.coverImage && typeof property.coverImage === 'string') {
      const trimmed = property.coverImage.trim();
      if (trimmed.length > 0 && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
        images.push(trimmed);
      }
    }
    
    // Add photos array (filter invalid values)
    if (property.photos && Array.isArray(property.photos)) {
      for (const photo of property.photos) {
        if (typeof photo === 'string') {
          const trimmed = photo.trim();
          if (trimmed.length > 0 && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
            // Avoid duplicates if coverImage is same as first photo
            if (images.length === 0 || images[0] !== trimmed) {
              images.push(trimmed);
            }
          }
        }
      }
    }
    
    return images;
  };
  
  // Defensive: Only access property fields after validation
  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-error mb-4 font-inter text-lg">Property not found</p>
          <Button onClick={() => navigate('/properties')} variant="primary">
            Back to Properties
          </Button>
        </motion.div>
      </div>
    );
  }
  
  const images = getNormalizedImages();
  const displayImage = images[activeImageIndex] || images[0] || '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-background min-h-screen">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
        {/* Breadcrumbs */}
        <nav className="text-sm text-textSecondary mb-6">
          <Link to="/" className="hover:text-primary">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link to="/properties" className="hover:text-primary">
            Properties
          </Link>
          <span className="mx-2">/</span>
          <span className="text-textMain">{property.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Property Images Carousel */}
          <div className="relative group">
            {displayImage ? (
              <div className="relative w-full h-[500px] sm:h-[600px] rounded-base shadow-lg overflow-hidden">
              <motion.img
                  key={activeImageIndex}
                src={displayImage}
                alt={property.title}
                  className="w-full h-full object-cover"
                loading="lazy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/600x400?text=Image+Not+Available';
                  e.target.onerror = null; // Prevent infinite loop
                }}
              />
                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-surface/90 rounded-full shadow-lg hover:bg-surface transition-colors z-10"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-6 h-6 text-textMain" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-surface/90 rounded-full shadow-lg hover:bg-surface transition-colors z-10"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-6 h-6 text-textMain" />
                    </button>
                    {/* Image Counter */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 text-white text-sm rounded-full">
                      {activeImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="w-full h-[500px] sm:h-[600px] bg-muted rounded-base flex items-center justify-center">
                <span className="text-textSecondary">No image available</span>
              </div>
            )}

            {/* Image Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                      activeImageIndex === index
                        ? 'border-primary scale-105'
                        : 'border-muted hover:border-primary'
                    }`}
                    aria-label={`View image ${index + 1} of ${images.length}`}
                    title={`Image ${index + 1}`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/80x80?text=Image+Error';
                        e.target.onerror = null; // Prevent infinite loop
                      }}
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
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-textMain mb-3 tracking-tight break-words">
                    {property.title}
                  </h1>
                  <div className="flex items-center text-textSecondary mb-4 flex-wrap">
                    <MapPin className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span className="break-words">
                      {formatAddress(property.address)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={handleToggleFavorite}
                    className={`p-2 rounded-full transition-colors ${
                      isFavorite
                        ? 'bg-error text-white'
                        : 'bg-muted text-textSecondary hover:bg-accent'
                    }`}
                    aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-full bg-muted text-textSecondary hover:bg-accent transition-colors"
                    aria-label="Share property"
                    title="Share property"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-primary text-white mb-4">
                  {property.type?.toUpperCase() || 'PROPERTY'}
                </span>
                <p className="text-3xl font-bold text-textMain mb-4 font-inter">
                  {formatPrice(property.price)}
                </p>
                <span className="text-sm text-textSecondary">
                  Status: {property.status || 'published'}
                </span>
              </div>

              {/* Property Features */}
              <div className="grid grid-cols-3 gap-4 mb-6 p-4 card-base">
                <div className="text-center">
                  <Bed className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm text-textSecondary">Bedrooms</p>
                  <p className="text-lg font-semibold">{property.bedrooms || '-'}</p>
                </div>
                <div className="text-center">
                  <Bath className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm text-textSecondary">Bathrooms</p>
                  <p className="text-lg font-semibold">{property.bathrooms || '-'}</p>
                </div>
                <div className="text-center">
                  <Square className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm text-textSecondary">Area</p>
                  <p className="text-lg font-semibold">{property.areaSqFt || '-'} sqft</p>
                </div>
              </div>

              <p className="text-textSecondary mb-8 font-inter leading-relaxed">
                {property.description}
              </p>

              {/* Amenities */}
              {/* Defensive: Validate amenities is an array before rendering */}
              {property.amenities && 
               Array.isArray(property.amenities) && 
               property.amenities.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {property.amenities
                      .filter(amenity => amenity != null && String(amenity).trim().length > 0)
                      .map((amenity, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-muted rounded-full text-sm text-textSecondary"
                        >
                          {String(amenity)}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Location Map - Always show if location data exists */}
              {/* Defensive: Validate nested objects before access */}
              {property.location && 
               typeof property.location === 'object' && 
               typeof property.location.lat === 'number' && 
               typeof property.location.lng === 'number' ? (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4">Location</h3>
                  <MapErrorBoundary height="400px">
                    <GoogleMap
                      center={{
                        lat: property.location.lat,
                        lng: property.location.lng,
                      }}
                      zoom={15}
                      height="400px"
                      draggable={false}
                      clickable={false}
                    />
                  </MapErrorBoundary>
                  {property.location.address && typeof property.location.address === 'string' && (
                    <p className="text-sm text-textSecondary mt-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      {property.location.address}
                    </p>
                  )}
                </div>
              ) : (property.address || (property.location && typeof property.location === 'object' && property.location.address)) ? (
                // Show placeholder if address exists but no coordinates
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4">Location</h3>
                  <MapErrorBoundary height="400px">
                    <GoogleMap
                      center={{
                        lat: 24.8607,
                        lng: 67.0011,
                      }}
                      zoom={15}
                      height="400px"
                      draggable={false}
                      clickable={false}
                    />
                  </MapErrorBoundary>
                  <p className="text-sm text-textSecondary mt-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    {(property.location && typeof property.location === 'object' && property.location.address) || 
                     formatAddress(property.address) || 
                     'Address not available'}
                  </p>
                </div>
              ) : null}

              {/* Owner Contact & Action Buttons */}
              {/* Defensive: Validate ownerName is a string before rendering */}
              {property.ownerName && 
               typeof property.ownerName === 'string' && 
               property.ownerName.trim().length > 0 && 
               !isOwner && (
                <div className="mb-8 p-4 card-base shadow-md">
                  <h3 className="text-xl font-semibold mb-4">Contact Owner</h3>
                  <p className="text-textMain mb-2 font-medium">{property.ownerName}</p>
                  {property.ownerPhone && 
                   typeof property.ownerPhone === 'string' && 
                   property.ownerPhone.trim().length > 0 && (
                    <div className="flex items-center gap-2 text-textSecondary mb-4">
                      <Phone className="w-4 h-4" />
                      <a
                        href={`tel:${property.ownerPhone}`}
                        className="hover:text-primary transition-colors"
                      >
                        {property.ownerPhone}
                      </a>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-primary text-white hover:bg-primaryDark"
                        onClick={() => {
                          if (property.ownerPhone) {
                            window.location.href = `tel:${property.ownerPhone}`;
                          } else {
                            toast.error('Phone number not available');
                          }
                        }}
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Call Owner
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={async () => {
                          if (!user) {
                            toast.error('Please log in to message the owner');
                            navigate('/auth');
                            return;
                          }
                          try {
                            const { findOrCreateConversation } = await import('../utils/chatHelpers');
                            const chatId = await findOrCreateConversation(user.uid, property.ownerId);
                            navigate(`/chat?chatId=${chatId}`);
                          } catch (error) {
                            console.error('Error creating chat:', error);
                            toast.error('Failed to start chat. Please try again.');
                          }
                        }}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Message Owner
                      </Button>
                    </div>
                    {/* Request Rental Button (for rent properties) */}
                    {property.type === 'rent' && (
                      <Button
                        className="w-full bg-primary hover:bg-primaryDark text-white"
                        onClick={() => setShowRentalModal(true)}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Request Rental
                      </Button>
                    )}
                    {/* Make Purchase Offer Button (for sale properties) */}
                    {property.type === 'sale' && (
                      <Button
                        className="w-full bg-primary hover:bg-primaryDark text-white"
                        onClick={() => setShowBuySellModal(true)}
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Make Purchase Offer
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Edit/Delete Buttons for Owner/Admin */}
              {(isOwner || isAdmin) && (
                <div className="mb-8 p-4 card-base shadow-md">
                  <h3 className="text-xl font-semibold mb-4">Manage Property</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleEdit}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Property
                    </Button>
                  <Button
                      variant="outline"
                      className="flex-1 text-error border-error hover:bg-error/10"
                      onClick={() => setShowDeleteModal(true)}
                  >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                  </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Similar Properties Section */}
        {/* Defensive: Validate similarProperties is an array before rendering */}
        {Array.isArray(similarProperties) && similarProperties.length > 0 && (
          <div className="mt-12">
            <h2 className="text-3xl font-display font-bold text-textMain mb-6">Similar Properties</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarProperties
                .filter(p => p && p.id) // Ensure property has required fields
                .map((similarProperty) => (
                  <PropertyCard key={similarProperty.id} property={similarProperty} />
                ))}
            </div>
          </div>
        )}

        {/* Reviews & Ratings Section */}
        {id && (
          <div className="mt-12">
            <ReviewsAndRatings key={id} targetId={id} targetType="property" />
          </div>
        )}
      </motion.div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Property"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-textSecondary">
            Are you sure you want to delete this property? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              className="bg-error hover:bg-error text-white"
              onClick={handleDelete}
              loading={deleting}
              disabled={deleting}
            >
              Delete Property
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rental Request Modal */}
      <Modal
        isOpen={showRentalModal}
        onClose={() => {
          setShowRentalModal(false);
          setRentalFormData({ startDate: '', endDate: '', message: '' });
        }}
        title="Request Rental"
        size="md"
      >
        <RentalRequestForm
          propertyId={id}
          propertyTitle={property?.title}
          onSuccess={handleRentalSuccess}
          onCancel={() => {
            setShowRentalModal(false);
            setRentalFormData({ startDate: '', endDate: '', message: '' });
          }}
        />
      </Modal>

      {/* Buy/Sell Offer Modal */}
      <Modal
        isOpen={showBuySellModal}
        onClose={() => {
          setShowBuySellModal(false);
          setBuySellFormData({ offerAmount: '', message: '' });
        }}
        title="Make Purchase Offer"
        size="md"
      >
        <BuySellOfferForm
          propertyId={id}
          propertyTitle={property?.title}
          propertyPrice={property?.price}
          onSuccess={handleBuySellSuccess}
          onCancel={() => {
            setShowBuySellModal(false);
            setBuySellFormData({ offerAmount: '', message: '' });
          }}
        />
      </Modal>
    </div>
  );
};

export default PropertyDetailPage;
