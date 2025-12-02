import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  Heart,
  Eye,
  Bell,
  Home,
  Wrench,
  Hammer,
  ShoppingCart,
  MessageCircle,
  ArrowRight,
  Clock,
  MapPin,
  DollarSign,
  Building2,
} from 'lucide-react';
import rentalRequestService from '../services/rentalRequestService';
import buySellRequestService from '../services/buySellRequestService';
import propertyService from '../services/propertyService';
import notificationService from '../services/notificationService';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { StatsSkeleton, GridSkeleton, PropertyCardSkeleton } from '../components/common/SkeletonLoader';
import { EmptyBookings, EmptyProperties, EmptyNotifications } from '../components/common/EmptyState';
import Button from '../components/common/Button';

const Dashboard = () => {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [recentBookings, setRecentBookings] = useState([]);
  const [favoriteProperties, setFavoriteProperties] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!authLoading && currentUser) {
      loadDashboardData();
    }
  }, [authLoading, currentUser]);

  const loadDashboardData = async () => {
    if (!currentUser || !db) return;

    setLoading(true);
    try {
      // Load data in parallel
      await Promise.all([
        loadRecentBookings(),
        loadFavoriteProperties(),
        loadRecentlyViewed(),
        loadNotifications(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentBookings = async () => {
    try {
      // Get rental requests
      const rentalRequests = await rentalRequestService.getByUser(currentUser.uid);
      
      // Get buy/sell requests
      const buySellRequests = await buySellRequestService.getByUser(currentUser.uid);

      // Combine and sort by date
      const allBookings = [
        ...rentalRequests.map((req) => ({
          ...req,
          type: 'rental',
          date: req.createdAt || req.requestDate,
        })),
        ...buySellRequests.map((req) => ({
          ...req,
          type: req.requestType || 'buy',
          date: req.createdAt || req.requestDate,
        })),
      ]
        .sort((a, b) => {
          const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
          const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
          return dateB - dateA;
        })
        .slice(0, 5);

      setRecentBookings(allBookings);
    } catch (error) {
      console.error('Error loading recent bookings:', error);
    }
  };

  const loadFavoriteProperties = async () => {
    try {
      if (!userProfile?.wishlist || userProfile.wishlist.length === 0) {
        setFavoriteProperties([]);
        return;
      }

      // Get properties from wishlist
      const propertyPromises = userProfile.wishlist.slice(0, 6).map(async (propertyId) => {
        try {
          const property = await propertyService.getPropertyById(propertyId);
          return property;
        } catch (error) {
          console.error(`Error loading property ${propertyId}:`, error);
          return null;
        }
      });

      const properties = (await Promise.all(propertyPromises)).filter(Boolean);
      setFavoriteProperties(properties);
    } catch (error) {
      console.error('Error loading favorite properties:', error);
    }
  };

  const loadRecentlyViewed = async () => {
    try {
      // Get recently viewed from localStorage or user profile
      const viewedIds = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      
      if (viewedIds.length === 0) {
        setRecentlyViewed([]);
        return;
      }

      // Get properties
      const propertyPromises = viewedIds.slice(0, 6).map(async (propertyId) => {
        try {
          const property = await propertyService.getPropertyById(propertyId);
          return property;
        } catch (error) {
          console.error(`Error loading property ${propertyId}:`, error);
          return null;
        }
      });

      const properties = (await Promise.all(propertyPromises)).filter(Boolean);
      setRecentlyViewed(properties);
    } catch (error) {
      console.error('Error loading recently viewed:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const snapshot = await getDocs(notificationsQuery);
      const notifs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const unread = notifs.filter((n) => !n.read).length;
      setNotifications(notifs);
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
      // Fallback without orderBy if index doesn't exist
      try {
        const fallbackQuery = query(
          collection(db, 'notifications'),
          where('userId', '==', currentUser.uid),
          limit(5)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const notifs = fallbackSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => {
            const aTime = a.createdAt?.toDate?.() || new Date(0);
            const bTime = b.createdAt?.toDate?.() || new Date(0);
            return bTime - aTime;
          });
        const unread = notifs.filter((n) => !n.read).length;
        setNotifications(notifs);
        setUnreadCount(unread);
      } catch (fallbackError) {
        console.error('Error loading notifications (fallback):', fallbackError);
      }
    }
  };


  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getBookingStatusColor = (status) => {
    const statusMap = {
      pending: 'text-yellow-600 bg-yellow-100',
      approved: 'text-green-600 bg-green-100',
      rejected: 'text-red-600 bg-red-100',
      completed: 'text-blue-600 bg-blue-100',
      cancelled: 'text-gray-600 bg-gray-100',
    };
    return statusMap[status] || 'text-gray-600 bg-gray-100';
  };

  const getBookingTypeLabel = (type) => {
    const typeMap = {
      rental: 'Rental',
      buy: 'Buy',
      sell: 'Sell',
    };
    return typeMap[type] || type;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <StatsSkeleton />
          </div>
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-textMain mb-4">Recent Bookings</h2>
            <GridSkeleton count={3} ItemComponent={PropertyCardSkeleton} />
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-textSecondary mb-4">Please log in to view your dashboard</p>
          <Button onClick={() => navigate('/login')}>Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-textMain">
            Welcome back, {userProfile?.displayName || userProfile?.name || 'User'}!
          </h1>
          <p className="text-textSecondary mt-2">Here's what's happening with your account</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Notifications */}
          <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-textSecondary mb-1">Notifications</p>
                <p className="text-2xl font-bold text-textMain">
                  {unreadCount > 0 ? `${unreadCount} New` : 'All Read'}
                </p>
              </div>
              <div className="bg-primary/10 p-3 rounded-full">
                <Bell className="w-6 h-6 text-primary" />
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4"
              onClick={() => navigate('/notifications')}
            >
              View All
            </Button>
          </div>

          {/* Favorite Properties */}
          <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-textSecondary mb-1">Favorites</p>
                <p className="text-2xl font-bold text-textMain">
                  {favoriteProperties.length} Properties
                </p>
              </div>
              <div className="bg-primary/10 p-3 rounded-full">
                <Heart className="w-6 h-6 text-primary" />
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4"
              onClick={() => navigate('/wishlist')}
            >
              View All
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-textMain mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/rent')}
              className="bg-surface hover:bg-background border border-muted rounded-base p-4 text-center transition-colors group"
            >
              <Home className="w-6 h-6 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-textMain">Book Rental</p>
            </button>

            <button
              onClick={() => navigate('/construction')}
              className="bg-surface hover:bg-background border border-muted rounded-base p-4 text-center transition-colors group"
            >
              <Hammer className="w-6 h-6 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-textMain">Construction</p>
            </button>

            <button
              onClick={() => navigate('/renovation')}
              className="bg-surface hover:bg-background border border-muted rounded-base p-4 text-center transition-colors group"
            >
              <Wrench className="w-6 h-6 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-textMain">Renovation</p>
            </button>

            <button
              onClick={() => navigate('/buy-sell')}
              className="bg-surface hover:bg-background border border-muted rounded-base p-4 text-center transition-colors group"
            >
              <ShoppingCart className="w-6 h-6 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-textMain">Buy/Sell</p>
            </button>

            <button
              onClick={() => navigate('/contact')}
              className="bg-surface hover:bg-background border border-muted rounded-base p-4 text-center transition-colors group"
            >
              <MessageCircle className="w-6 h-6 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-textMain">Support</p>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Bookings */}
          <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-textMain flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-primary" />
                Recent Bookings
              </h2>
              <Link
                to="/account"
                className="text-sm text-primary hover:text-primaryDark flex items-center"
              >
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            {recentBookings.length === 0 ? (
              <EmptyBookings />
            ) : (
              <div className="space-y-3">
                {recentBookings.map((booking, index) => (
                  <div
                    key={index}
                    className="border border-muted rounded-base p-4 hover:bg-background transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-textMain">
                            {getBookingTypeLabel(booking.type)}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${getBookingStatusColor(
                              booking.status
                            )}`}
                          >
                            {booking.status || 'pending'}
                          </span>
                        </div>
                        {booking.propertyId && (
                          <p className="text-sm text-textSecondary mb-1">
                            Property ID: {booking.propertyId}
                          </p>
                        )}
                        {booking.propertyAddress && (
                          <p className="text-xs text-textSecondary flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {booking.propertyAddress}
                          </p>
                        )}
                        <p className="text-xs text-textSecondary mt-2">
                          {formatDate(booking.date)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Preview */}
          <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-textMain flex items-center">
                <Bell className="w-5 h-5 mr-2 text-primary" />
                Notifications
              </h2>
              <Link
                to="/notifications"
                className="text-sm text-primary hover:text-primaryDark flex items-center"
              >
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            {notifications.length === 0 ? (
              <EmptyNotifications />
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`border rounded-base p-3 hover:bg-background transition-colors ${
                      notification.read ? 'border-muted' : 'border-primary/30 bg-primary/5'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-textMain mb-1">
                          {notification.title || 'Notification'}
                        </p>
                        <p className="text-xs text-textSecondary line-clamp-2">
                          {notification.message || notification.body}
                        </p>
                        <p className="text-xs text-textSecondary mt-2 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-primary rounded-full ml-2 mt-1" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Favorite Properties */}
          <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-textMain flex items-center">
                <Heart className="w-5 h-5 mr-2 text-primary" />
                Favorite Properties
              </h2>
              <Link
                to="/wishlist"
                className="text-sm text-primary hover:text-primaryDark flex items-center"
              >
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            {favoriteProperties.length === 0 ? (
              <EmptyProperties actionPath="/properties" actionLabel="Browse Properties" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {favoriteProperties.slice(0, 4).map((property) => (
                  <Link
                    key={property.id}
                    to={`/properties/${property.id}`}
                    className="border border-muted rounded-base overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {property.images && property.images[0] ? (
                      <img
                        src={property.images[0]}
                        alt={property.title}
                        className="w-full h-32 object-cover"
                      />
                    ) : (
                      <div className="w-full h-32 bg-muted flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-textSecondary" />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-sm font-medium text-textMain line-clamp-1 mb-1">
                        {property.title || property.address}
                      </p>
                      <p className="text-xs text-textSecondary flex items-center mb-2">
                        <MapPin className="w-3 h-3 mr-1" />
                        {property.location || property.city}
                      </p>
                      {property.price && (
                        <p className="text-sm font-semibold text-primary flex items-center">
                          <DollarSign className="w-4 h-4" />
                          {property.price.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recently Viewed */}
          <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-textMain flex items-center">
                <Eye className="w-5 h-5 mr-2 text-primary" />
                Recently Viewed
              </h2>
              <Link
                to="/properties"
                className="text-sm text-primary hover:text-primaryDark flex items-center"
              >
                Browse More <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            {recentlyViewed.length === 0 ? (
              <div className="text-center py-8">
                <Eye className="w-12 h-12 text-textSecondary mx-auto mb-3" />
                <p className="text-textSecondary mb-4">No recently viewed properties</p>
                <Button variant="ghost" size="sm" onClick={() => navigate('/properties')}>
                  Browse Properties
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recentlyViewed.slice(0, 4).map((property) => (
                  <Link
                    key={property.id}
                    to={`/properties/${property.id}`}
                    className="border border-muted rounded-base overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {property.images && property.images[0] ? (
                      <img
                        src={property.images[0]}
                        alt={property.title}
                        className="w-full h-32 object-cover"
                      />
                    ) : (
                      <div className="w-full h-32 bg-muted flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-textSecondary" />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-sm font-medium text-textMain line-clamp-1 mb-1">
                        {property.title || property.address}
                      </p>
                      <p className="text-xs text-textSecondary flex items-center mb-2">
                        <MapPin className="w-3 h-3 mr-1" />
                        {property.location || property.city}
                      </p>
                      {property.price && (
                        <p className="text-sm font-semibold text-primary flex items-center">
                          <DollarSign className="w-4 h-4" />
                          {property.price.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

