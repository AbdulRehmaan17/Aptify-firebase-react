import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, Trash2, MapPin, DollarSign, Building2 } from 'lucide-react';
import userService from '../../../services/userService';
import propertyService from '../../../services/propertyService';
import marketplaceService from '../../../services/marketplaceService';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import Button from '../../../components/common/Button';

const Favorites = ({ user, onDataReload }) => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userProfile = await userService.getProfile(user.uid);
      const wishlist = userProfile?.wishlist || [];

      const fetchedItems = await Promise.all(
        wishlist.map(async (item) => {
          try {
            if (item.itemType === 'property') {
              const property = await propertyService.getById(item.itemId, false);
              return property ? { ...property, type: 'property' } : null;
            } else if (item.itemType === 'marketplace') {
              const product = await marketplaceService.getById(item.itemId);
              return product ? { ...product, type: 'marketplace' } : null;
            }
            return null;
          } catch (error) {
            console.error('Error fetching favorite item:', error);
            return null;
          }
        })
      );
      setFavorites(fetchedItems.filter(Boolean));
    } catch (error) {
      console.error('Error loading favorites:', error);
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (itemId, itemType) => {
    if (!user) return;
    try {
      await userService.removeFromWishlist(user.uid, itemId, itemType);
      setFavorites((prev) => prev.filter((item) => !(item.id === itemId && item.type === itemType)));
      toast.success('Removed from favorites');
      if (onDataReload) {
        onDataReload();
      }
    } catch (error) {
      console.error('Error removing from favorites:', error);
      toast.error('Failed to remove from favorites');
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'Price not available';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-textMain">My Favorites</h1>
          <p className="text-textSecondary mt-2">Your saved properties and marketplace items</p>
        </div>
        <Button onClick={() => navigate('/properties')} variant="primary">
          Browse Properties
        </Button>
      </div>

      {favorites.length === 0 ? (
        <div className="bg-surface rounded-lg shadow-md p-12 text-center border border-muted">
          <Heart className="w-16 h-16 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-textMain mb-2">No favorites yet</h3>
          <p className="text-textSecondary mb-4">Start by adding properties or items to your favorites</p>
          <Button onClick={() => navigate('/properties')} variant="primary">
            Browse Properties
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((item) => (
            <div
              key={`${item.id}-${item.type}`}
              className="bg-surface rounded-lg shadow-md overflow-hidden border border-muted hover:shadow-lg transition-shadow"
            >
              <Link to={item.type === 'property' ? `/properties/${item.id}` : `/marketplace/${item.id}`}>
                <div className="relative h-48 bg-muted">
                  {item.images?.[0] || item.imageUrl ? (
                    <img
                      src={item.images?.[0] || item.imageUrl}
                      alt={item.title || item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="w-12 h-12 text-textSecondary" />
                    </div>
                  )}
                </div>
              </Link>
              <div className="p-4">
                <Link to={item.type === 'property' ? `/properties/${item.id}` : `/marketplace/${item.id}`}>
                  <h3 className="text-lg font-semibold text-textMain mb-2 line-clamp-1">
                    {item.title || item.name}
                  </h3>
                </Link>
                <div className="flex items-center text-textSecondary text-sm mb-2">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span className="truncate">
                    {item.location || item.address?.city || item.city || 'Location not specified'}
                  </span>
                </div>
                <p className="text-primary font-bold text-xl mb-3">{formatPrice(item.price)}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveFavorite(item.id, item.type)}
                  className="w-full text-error hover:bg-error/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove from Favorites
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites;

