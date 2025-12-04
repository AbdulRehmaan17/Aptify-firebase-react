import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import propertyService from '../../services/propertyService';
import userService from '../../services/userService';
import { getOrCreateChat } from '../../utils/chatHelpers';
import {
  MapPin,
  DollarSign,
  Home,
  Bed,
  Bath,
  Square,
  Car,
  CheckCircle,
  XCircle,
  Edit2,
  ArrowLeft,
  Heart,
  MessageSquare,
  User,
  Phone,
  Mail,
} from 'lucide-react';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { ui } from '../../styles/ui';

const ViewListing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const isOwner = currentUser && listing && listing.ownerId === currentUser.uid;

  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id]);

  useEffect(() => {
    if (currentUser && listing) {
      checkFavorite();
    }
  }, [currentUser, listing]);

  const fetchListing = async () => {
    try {
      setLoading(true);
      const propertyData = await propertyService.getById(id, false);

      if (propertyData.type !== 'buy' && propertyData.listingType !== 'buy' && 
          propertyData.type !== 'sell' && propertyData.listingType !== 'sell') {
        toast.error('This is not a buy/sell listing.');
        navigate('/buy-sell/marketplace');
        return;
      }

      setListing(propertyData);
    } catch (err) {
      console.error('Error fetching listing:', err);
      setError(err.message || 'Failed to load listing.');
      toast.error('Failed to load listing');
      navigate('/buy-sell/marketplace');
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = async () => {
    if (!currentUser || !listing) return;

    try {
      const favorites = await userService.getFavorites(currentUser.uid);
      setIsFavorite(favorites.includes(listing.id));
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (!currentUser) {
      toast.error('Please log in to add to favorites');
      navigate('/login');
      return;
    }

    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await userService.removeFromFavorites(currentUser.uid, listing.id);
        setIsFavorite(false);
        toast.success('Removed from favorites');
      } else {
        await userService.addToFavorites(currentUser.uid, listing.id);
        setIsFavorite(true);
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleContactSeller = async () => {
    if (!currentUser) {
      toast.error('Please log in to contact the seller');
      navigate('/login');
      return;
    }

    if (isOwner) {
      toast.error('You cannot contact yourself');
      return;
    }

    try {
      const chatId = await getOrCreateChat(currentUser.uid, listing.ownerId);
      navigate(`/chat?chatId=${chatId}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-textSecondary mb-4">Listing not found or an error occurred.</p>
          <Button onClick={() => navigate('/buy-sell/marketplace')}>Back to Marketplace</Button>
        </div>
      </div>
    );
  }

  const images = listing.photos || [];

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/buy-sell/marketplace')}
            className="text-textSecondary hover:text-primary"
          >
            <ArrowLeft className="w-5 h-5 mr-2" /> Back to Marketplace
          </Button>
          {isOwner && (
            <Button onClick={() => navigate(`/buy-sell/edit/${listing.id}`)} className={ui.primaryButton}>
              <Edit2 className="w-5 h-5 mr-2" /> Edit Listing
            </Button>
          )}
        </div>

        <div className={`${ui.card} p-6`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div>
              <div className="relative rounded-lg overflow-hidden mb-4 aspect-w-16 aspect-h-9">
                <img
                  src={images[activeImageIndex] || listing.coverImage || 'https://via.placeholder.com/800x450?text=No+Image'}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {images.length > 1 && (
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  {images.map((img, index) => (
                    <img
                      key={index}
                      src={img}
                      alt={`Thumbnail ${index + 1}`}
                      className={`w-20 h-16 object-cover rounded-md cursor-pointer border-2 ${
                        index === activeImageIndex ? 'border-primary' : 'border-transparent'
                      }`}
                      onClick={() => setActiveImageIndex(index)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-display font-bold text-textMain">{listing.title}</h1>
                {currentUser && !isOwner && (
                  <button
                    onClick={handleToggleFavorite}
                    disabled={favoriteLoading}
                    className={`p-2 rounded-full transition-colors ${
                      isFavorite
                        ? 'bg-red-100 text-red-600'
                        : 'bg-muted text-textSecondary hover:bg-red-100 hover:text-red-600'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>
                )}
              </div>

              <p className="text-textSecondary text-lg flex items-center mb-4">
                <MapPin className="w-5 h-5 mr-2 text-muted" />{' '}
                {listing.address?.line1}, {listing.address?.city}, {listing.address?.country}
              </p>

              <div className="flex items-center space-x-4 mb-6">
                <span className={`${ui.tealTag} text-base capitalize`}>
                  {listing.category}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  listing.status === 'active'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-textSecondary'
                }`}>
                  {listing.status === 'active' ? 'Available' : 'Unavailable'}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  (listing.listingType || listing.type) === 'sell'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  {(listing.listingType || listing.type) === 'sell' ? 'For Sale' : 'Want to Buy'}
                </span>
              </div>

              <p className="text-primary font-bold text-4xl mb-6 flex items-center">
                <DollarSign className="w-8 h-8 mr-2" /> {formatPrice(listing.price)}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6 text-textSecondary">
                <div className="flex items-center">
                  <Bed className="w-5 h-5 mr-2 text-muted" /> {listing.bedrooms || 0} Bedrooms
                </div>
                <div className="flex items-center">
                  <Bath className="w-5 h-5 mr-2 text-muted" /> {listing.bathrooms || 0} Bathrooms
                </div>
                <div className="flex items-center">
                  <Square className="w-5 h-5 mr-2 text-muted" /> {listing.areaSqFt || 0} sq ft
                </div>
                <div className="flex items-center">
                  <Car className="w-5 h-5 mr-2 text-muted" />{' '}
                  {listing.parking ? 'Parking Available' : 'No Parking'}
                </div>
                <div className="flex items-center">
                  {listing.furnished ? (
                    <CheckCircle className="w-5 h-5 mr-2 text-primary" />
                  ) : (
                    <XCircle className="w-5 h-5 mr-2 text-muted" />
                  )}
                  {listing.furnished ? 'Furnished' : 'Unfurnished'}
                </div>
              </div>

              <h2 className="text-xl font-semibold text-textMain mb-3">Description</h2>
              <p className="text-textSecondary leading-relaxed mb-6">{listing.description}</p>

              {/* Owner Contact Info (if not owner) */}
              {!isOwner && listing.ownerName && (
                <div className="mt-8 p-4 bg-muted/20 rounded-base border border-muted">
                  <h3 className="text-lg font-semibold text-textMain mb-3">Contact Seller</h3>
                  <p className="text-textSecondary flex items-center mb-2">
                    <User className="w-4 h-4 mr-2 text-primary" /> {listing.ownerName}
                  </p>
                  {listing.ownerPhone && (
                    <p className="text-textSecondary flex items-center mb-2">
                      <Phone className="w-4 h-4 mr-2 text-primary" /> {listing.ownerPhone}
                    </p>
                  )}
                  {listing.ownerEmail && (
                    <p className="text-textSecondary flex items-center mb-4">
                      <Mail className="w-4 h-4 mr-2 text-primary" /> {listing.ownerEmail}
                    </p>
                  )}
                  <Button
                    onClick={handleContactSeller}
                    className={`${ui.primaryButton} w-full`}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" /> Contact Seller
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewListing;






