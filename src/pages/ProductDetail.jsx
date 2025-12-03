import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, MapPin, Heart, Share2, Phone, Mail, MessageSquare, ShoppingCart, ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import marketplaceService from '../services/marketplaceService';
import userService from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getOrCreateChat } from '../utils/chatHelpers';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import ReviewsAndRatings from './ReviewsAndRatings';
import Modal from '../components/common/Modal';
import BuySellOfferForm from './BuySellOfferForm';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, currentUser } = useAuth();
  const { addToCart, items } = useCart();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [similarListings, setSimilarListings] = useState([]);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const messagesEndRef = useRef(null);

  const currentUserId = user?.uid || currentUser?.uid;
  const isSeller = currentUserId && listing && listing.sellerId === currentUserId;

  useEffect(() => {
    const fetchListing = async () => {
      try {
        setLoading(true);
        const listingData = await marketplaceService.getById(id, true);
        setListing(listingData);

        // Check if in favorites/wishlist
        if (currentUserId) {
          try {
            const isInWishlist = await userService.isInWishlist(currentUserId, id);
            setIsFavorite(isInWishlist);
          } catch (err) {
            console.error('Error checking wishlist:', err);
          }
        }

        // Fetch similar listings
        if (listingData) {
          try {
            const similar = await marketplaceService.getAll(
              {
                category: listingData.category,
                status: 'active',
              },
              { limit: 4, sortBy: 'createdAt', sortOrder: 'desc' }
            );
            const filtered = similar.filter((l) => l.id !== id);
            setSimilarListings(filtered.slice(0, 3));
          } catch (err) {
            console.error('Error fetching similar listings:', err);
          }
        }
      } catch (err) {
        console.error('Error fetching listing:', err);
        setError(err.message || 'Failed to load listing details.');
        toast.error(err.message || 'Failed to load listing.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchListing();
    }
  }, [id, currentUserId]);

  const handleToggleFavorite = async () => {
    if (!currentUserId) {
      toast.error('Please log in to add to wishlist.');
      navigate('/auth');
      return;
    }

    try {
      if (isFavorite) {
        await userService.removeFromWishlist(currentUserId, id);
        setIsFavorite(false);
        toast.success('Removed from wishlist');
      } else {
        await userService.addToWishlist(currentUserId, id, 'marketplace');
        setIsFavorite(true);
        toast.success('Added to wishlist');
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      toast.error('Failed to update wishlist.');
    }
  };

  const handleAddToCart = () => {
    if (!currentUserId) {
      toast.error('Please log in to add items to cart.');
      navigate('/auth');
      return;
    }

    if (!listing) return;

    try {
      addToCart({
        itemId: id,
        itemType: 'marketplace',
        name: listing.title,
        price: listing.price,
        image: listing.coverImage || listing.images?.[0] || null,
        sellerId: listing.sellerId || null,
        quantity: 1,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
    }
  };

  const isInCart = items.some((item) => {
    const itemId = item.itemId || item.productId;
    return itemId === id && (item.itemType === 'marketplace' || !item.itemType);
  });

  const handleContactSeller = async () => {
    if (!currentUserId) {
      toast.error('Please log in to contact the seller');
      navigate('/auth');
      return;
    }

    if (isSeller) {
      toast.error('You cannot contact yourself');
      return;
    }

    try {
      const chatId = await getOrCreateChat(currentUserId, listing.sellerId);
      navigate(`/chat?chatId=${chatId}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to start chat. Please try again.');
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

  const nextImage = () => {
    const images = listing.images || [];
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    const images = listing.images || [];
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-error mb-4 font-inter text-lg">{error || 'Listing not found'}</p>
          <Button onClick={() => navigate('/buy')} variant="primary">
            Back to Marketplace
          </Button>
        </motion.div>
      </div>
    );
  }

  const images = listing.images || [];
  const displayImage = images[activeImageIndex] || listing.coverImage || '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-background min-h-screen">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
        {/* Breadcrumbs */}
        <nav className="text-sm text-textSecondary mb-6">
          <Link to="/" className="hover:text-primary">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link to="/buy" className="hover:text-primary">
            Marketplace
          </Link>
          <span className="mx-2">/</span>
          <span className="text-textMain">{listing.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Image Gallery */}
          <div className="relative group">
            {displayImage ? (
              <div className="relative w-full h-[500px] sm:h-[600px] rounded-base shadow-lg overflow-hidden">
                <motion.img
                  key={activeImageIndex}
                  src={displayImage}
                  alt={listing.title}
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
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      activeImageIndex === index
                        ? 'border-primary scale-105'
                        : 'border-muted hover:border-primary'
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

          {/* Product Details */}
          <motion.div
            className="flex flex-col"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-4xl sm:text-5xl font-display font-bold text-textMain mb-3 tracking-tight">
                    {listing.title}
                  </h1>
                  <div className="flex items-center text-textSecondary mb-4">
                    <MapPin className="w-5 h-5 mr-2" />
                    <span>
                      {listing.location}
                      {listing.city ? `, ${listing.city}` : ''}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleToggleFavorite}
                    className={`p-2 rounded-full transition-colors ${
                      isFavorite
                        ? 'bg-error text-white'
                        : 'bg-muted text-textSecondary hover:bg-accent'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-full bg-muted text-textSecondary hover:bg-accent transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-primary text-white mb-4 capitalize">
                  {listing.category}
                </span>
                <p className="text-3xl font-bold text-textMain mb-4 font-inter">
                  {formatPrice(listing.price)}
                </p>
                <div className="flex items-center gap-4 text-sm text-textSecondary">
                  <span>Condition: <span className="capitalize font-medium">{listing.condition}</span></span>
                  <span>Status: <span className="capitalize font-medium">{listing.status}</span></span>
                </div>
              </div>

              <p className="text-textSecondary mb-8 font-inter leading-relaxed">
                {listing.description}
              </p>

              {/* Seller Contact & Action Buttons */}
              {!isSeller && listing.sellerName && (
                <div className="mb-8 p-4 card-base shadow-md">
                  <h3 className="text-xl font-semibold mb-4">Contact Seller</h3>
                  <p className="text-textMain mb-2 font-medium">{listing.sellerName}</p>
                  {listing.sellerPhone && (
                    <div className="flex items-center gap-2 text-textSecondary mb-4">
                      <Phone className="w-4 h-4" />
                      <a
                        href={`tel:${listing.sellerPhone}`}
                        className="hover:text-primary transition-colors"
                      >
                        {listing.sellerPhone}
                      </a>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-primary text-white hover:bg-primaryDark"
                        onClick={handleContactSeller}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Message Seller
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleAddToCart}
                        disabled={isInCart}
                      >
                        <ShoppingCart className={`w-4 h-4 mr-2 ${isInCart ? 'fill-current' : ''}`} />
                        {isInCart ? 'In Cart' : 'Add to Cart'}
                      </Button>
                    </div>
                    <Button
                      className="w-full bg-primary hover:bg-primaryDark text-white"
                      onClick={() => setShowOfferModal(true)}
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Make an Offer
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Similar Listings Section */}
        {similarListings.length > 0 && (
          <div className="mt-12">
            <h2 className="text-3xl font-display font-bold text-textMain mb-6">Similar Items</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarListings.map((similarListing) => (
                <Link
                  key={similarListing.id}
                  to={`/marketplace/${similarListing.id}`}
                  className="block"
                >
                  <div className="bg-surface rounded-base shadow-md overflow-hidden border border-muted hover:shadow-lg transition-shadow">
                    <div className="relative h-48 w-full">
                      <img
                        src={similarListing.coverImage || similarListing.images?.[0] || 'https://via.placeholder.com/400x250?text=No+Image'}
                        alt={similarListing.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-textMain mb-2 line-clamp-1">
                        {similarListing.title}
                      </h3>
                      <p className="text-primary font-bold text-xl">
                        {formatPrice(similarListing.price)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Reviews & Ratings Section */}
        {id && (
          <div className="mt-12">
            <ReviewsAndRatings key={id} targetId={id} targetType="marketplace" />
          </div>
        )}
      </motion.div>

      {/* Offer Modal */}
      <Modal
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        title="Make an Offer"
        size="md"
      >
        <BuySellOfferForm
          listingId={id}
          listingTitle={listing?.title}
          listingPrice={listing?.price}
          onSuccess={() => {
            setShowOfferModal(false);
            toast.success('Offer submitted successfully!');
          }}
          onCancel={() => setShowOfferModal(false)}
        />
      </Modal>
    </div>
  );
};

export default ProductDetail;


