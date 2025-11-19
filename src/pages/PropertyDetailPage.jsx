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

        // Fetch similar properties
        if (propertyData) {
          try {
            const similar = await propertyService.getAll(
              {
                type: propertyData.type,
                city: propertyData.address?.city,
              },
              { limit: 4, sortBy: 'createdAt', sortOrder: 'desc' }
            );
            // Filter out current property
            const filtered = similar.filter((p) => p.id !== id);
            setSimilarProperties(filtered.slice(0, 3));
          } catch (err) {
            console.error('Error fetching similar properties:', err);
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

  const handleRentalSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to submit a rental request');
      navigate('/auth');
      return;
    }

    if (!rentalFormData.startDate || !rentalFormData.endDate) {
      toast.error('Please select start and end dates');
      return;
    }

    if (new Date(rentalFormData.startDate) >= new Date(rentalFormData.endDate)) {
      toast.error('End date must be after start date');
      return;
    }

    try {
      setSubmittingRental(true);
      await rentalRequestService.create({
        userId: user.uid,
        propertyId: id,
        startDate: rentalFormData.startDate,
        endDate: rentalFormData.endDate,
        message: rentalFormData.message,
      });
      toast.success('Rental request submitted successfully!');
      setShowRentalModal(false);
      setRentalFormData({ startDate: '', endDate: '', message: '' });
    } catch (error) {
      console.error('Error submitting rental request:', error);
      toast.error('Failed to submit rental request');
    } finally {
      setSubmittingRental(false);
    }
  };

  const handleBuySellSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to make a purchase offer');
      navigate('/auth');
      return;
    }

    if (!buySellFormData.offerAmount || Number(buySellFormData.offerAmount) <= 0) {
      toast.error('Please enter a valid offer amount');
      return;
    }

    try {
      setSubmittingBuySell(true);
      await buySellRequestService.create({
        userId: user.uid,
        propertyId: id,
        offerAmount: buySellFormData.offerAmount,
        message: buySellFormData.message,
      });
      toast.success('Purchase offer submitted successfully!');
      setShowBuySellModal(false);
      setBuySellFormData({ offerAmount: '', message: '' });
    } catch (error) {
      console.error('Error submitting buy/sell request:', error);
      toast.error('Failed to submit purchase offer');
    } finally {
      setSubmittingBuySell(false);
    }
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
          <p className="text-red-600 mb-4 font-inter text-lg">{error || 'Property not found'}</p>
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-600 mb-6">
          <Link to="/" className="hover:text-luxury-gold">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link to="/properties" className="hover:text-luxury-gold">
            Properties
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{property.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Property Images Carousel */}
          <div className="relative group">
            {displayImage ? (
              <div className="relative w-full h-[500px] sm:h-[600px] rounded-xl shadow-2xl overflow-hidden">
                <motion.img
                  key={activeImageIndex}
                  src={displayImage}
                  alt={property.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                />
                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors z-10"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-6 h-6 text-gray-800" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors z-10"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-6 h-6 text-gray-800" />
                    </button>
                    {/* Image Counter */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 text-white text-sm rounded-full">
                      {activeImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="w-full h-[500px] sm:h-[600px] bg-gray-200 rounded-xl flex items-center justify-center">
                <span className="text-gray-400">No image available</span>
              </div>
            )}

            {/* Image Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      activeImageIndex === index
                        ? 'border-luxury-gold scale-105'
                        : 'border-gray-300 hover:border-gray-400'
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
                <span className="text-sm text-gray-500">
                  Status: {property.status || 'published'}
                </span>
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

              {/* Owner Contact & Action Buttons */}
              {property.ownerName && !isOwner && (
                <div className="mb-8 p-4 bg-white rounded-lg shadow-md">
                  <h3 className="text-xl font-semibold mb-4">Contact Owner</h3>
                  <p className="text-gray-700 mb-2 font-medium">{property.ownerName}</p>
                  {property.ownerPhone && (
                    <div className="flex items-center gap-2 text-gray-600 mb-4">
                      <Phone className="w-4 h-4" />
                      <a
                        href={`tel:${property.ownerPhone}`}
                        className="hover:text-blue-600 transition-colors"
                      >
                        {property.ownerPhone}
                      </a>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-luxury-gold text-charcoal hover:bg-yellow-600"
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
                        onClick={() => {
                          navigate(`/chat?property=${id}&owner=${property.ownerId}`);
                        }}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    </div>
                    {/* Request Rental Button (for rent properties) */}
                    {property.type === 'rent' && (
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => setShowRentalModal(true)}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Request Rental
                      </Button>
                    )}
                    {/* Make Purchase Offer Button (for sale properties) */}
                    {property.type === 'sale' && (
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
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
                <div className="mb-8 p-4 bg-white rounded-lg shadow-md">
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
                      className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
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
        {similarProperties.length > 0 && (
          <div className="mt-12">
            <h2 className="text-3xl font-display font-bold text-gray-900 mb-6">Similar Properties</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarProperties.map((similarProperty) => (
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
          <p className="text-gray-700">
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
              className="bg-red-600 hover:bg-red-700 text-white"
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
        <form onSubmit={handleRentalSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={rentalFormData.startDate}
              onChange={(e) =>
                setRentalFormData((prev) => ({ ...prev, startDate: e.target.value }))
              }
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={rentalFormData.endDate}
              onChange={(e) =>
                setRentalFormData((prev) => ({ ...prev, endDate: e.target.value }))
              }
              min={rentalFormData.startDate || new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
            <textarea
              value={rentalFormData.message}
              onChange={(e) =>
                setRentalFormData((prev) => ({ ...prev, message: e.target.value }))
              }
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Tell the owner about your rental needs..."
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowRentalModal(false);
                setRentalFormData({ startDate: '', endDate: '', message: '' });
              }}
              disabled={submittingRental}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submittingRental} disabled={submittingRental}>
              Submit Request
            </Button>
          </div>
        </form>
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
        <form onSubmit={handleBuySellSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Offer Amount (PKR) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              value={buySellFormData.offerAmount}
              onChange={(e) =>
                setBuySellFormData((prev) => ({ ...prev, offerAmount: e.target.value }))
              }
              placeholder="Enter your offer amount"
              min="0"
              step="1000"
              required
              leftIcon={<DollarSign className="w-4 h-4" />}
            />
            {property && (
              <p className="mt-1 text-sm text-gray-500">
                Property price: {formatPrice(property.price)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
            <textarea
              value={buySellFormData.message}
              onChange={(e) =>
                setBuySellFormData((prev) => ({ ...prev, message: e.target.value }))
              }
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Tell the owner about your offer..."
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowBuySellModal(false);
                setBuySellFormData({ offerAmount: '', message: '' });
              }}
              disabled={submittingBuySell}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submittingBuySell} disabled={submittingBuySell}>
              Submit Offer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PropertyDetailPage;
