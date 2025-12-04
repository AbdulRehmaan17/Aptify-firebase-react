import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Heart,
  Bell,
  Home,
  ShoppingCart,
  Wrench,
  Hammer,
  Star,
  ArrowRight,
  Clock,
  MapPin,
  DollarSign,
  Building2,
} from 'lucide-react';
import rentalRequestService from '../../../services/rentalRequestService';
import buySellRequestService from '../../../services/buySellRequestService';
import constructionRequestService from '../../../services/constructionRequestService';
import renovationRequestService from '../../../services/renovationRequestService';
import propertyService from '../../../services/propertyService';
import notificationService from '../../../services/notificationService';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import Button from '../../../components/common/Button';

const Overview = ({ user, userProfile }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    properties: 0,
    rentalRequests: 0,
    buySellRequests: 0,
    constructionRequests: 0,
    renovationRequests: 0,
    favorites: 0,
    reviews: 0,
    unreadNotifications: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (user) {
      loadOverviewData();
    }
  }, [user]);

  const loadOverviewData = async () => {
    if (!user || !db) return;
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadRecentBookings(),
        loadNotifications(),
      ]);
    } catch (error) {
      console.error('Error loading overview data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [
        properties,
        rentalRequests,
        buySellRequests,
        constructionRequests,
        renovationRequests,
      ] = await Promise.all([
        propertyService.getByOwner(user.uid).catch(() => []),
        rentalRequestService.getByUser(user.uid).catch(() => []),
        buySellRequestService.getByUser(user.uid).catch(() => []),
        constructionRequestService.getByUser(user.uid).catch(() => []),
        renovationRequestService.getByUser(user.uid).catch(() => []),
      ]);

      const favorites = userProfile?.wishlist?.length || 0;

      setStats({
        properties: properties.length,
        rentalRequests: rentalRequests.length,
        buySellRequests: buySellRequests.length,
        constructionRequests: constructionRequests.length,
        renovationRequests: renovationRequests.length,
        favorites,
        reviews: 0, // TODO: Load from reviews collection
        unreadNotifications: notifications.filter((n) => !n.read).length,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentBookings = async () => {
    try {
      const [rentalRequests, buySellRequests, constructionRequests, renovationRequests] =
        await Promise.all([
          rentalRequestService.getByUser(user.uid).catch(() => []),
          buySellRequestService.getByUser(user.uid).catch(() => []),
          constructionRequestService.getByUser(user.uid).catch(() => []),
          renovationRequestService.getByUser(user.uid).catch(() => []),
        ]);

      const allBookings = [
        ...rentalRequests.map((r) => ({ ...r, type: 'rental' })),
        ...buySellRequests.map((r) => ({ ...r, type: 'buy-sell' })),
        ...constructionRequests.map((r) => ({ ...r, type: 'construction' })),
        ...renovationRequests.map((r) => ({ ...r, type: 'renovation' })),
      ]
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
          return dateB - dateA;
        })
        .slice(0, 5);

      setRecentBookings(allBookings);
    } catch (error) {
      console.error('Error loading recent bookings:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const snapshot = await getDocs(notificationsQuery);
      const notifs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setNotifications(notifs);
    } catch (error) {
      console.error('Error loading notifications:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-textMain">
          Welcome back, {userProfile?.displayName || userProfile?.name || 'User'}!
        </h1>
        <p className="text-textSecondary mt-2">Here's what's happening with your account</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface rounded-lg shadow-md p-6 border border-muted">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-textSecondary mb-1">My Properties</p>
              <p className="text-2xl font-bold text-textMain">{stats.properties}</p>
            </div>
            <div className="bg-primary/10 p-3 rounded-full">
              <Home className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-lg shadow-md p-6 border border-muted">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-textSecondary mb-1">Rental Requests</p>
              <p className="text-2xl font-bold text-textMain">{stats.rentalRequests}</p>
            </div>
            <div className="bg-blue-500/10 p-3 rounded-full">
              <Calendar className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-lg shadow-md p-6 border border-muted">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-textSecondary mb-1">Favorites</p>
              <p className="text-2xl font-bold text-textMain">{stats.favorites}</p>
            </div>
            <div className="bg-red-500/10 p-3 rounded-full">
              <Heart className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-lg shadow-md p-6 border border-muted">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-textSecondary mb-1">Notifications</p>
              <p className="text-2xl font-bold text-textMain">
                {stats.unreadNotifications > 0 ? `${stats.unreadNotifications} New` : 'All Read'}
              </p>
            </div>
            <div className="bg-yellow-500/10 p-3 rounded-full">
              <Bell className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="bg-surface rounded-lg shadow-md p-6 border border-muted">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-textMain flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-primary" />
              Recent Activity
            </h2>
          </div>

          {recentBookings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-textSecondary">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBookings.map((booking, index) => (
                <div
                  key={index}
                  className="border border-muted rounded-lg p-4 hover:bg-background transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-textMain capitalize">
                          {booking.type}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-muted text-textSecondary">
                          {booking.status || 'pending'}
                        </span>
                      </div>
                      <p className="text-xs text-textSecondary mt-2 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDate(booking.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Notifications */}
        <div className="bg-surface rounded-lg shadow-md p-6 border border-muted">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-textMain flex items-center">
              <Bell className="w-5 h-5 mr-2 text-primary" />
              Recent Notifications
            </h2>
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-textSecondary">No notifications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border rounded-lg p-3 hover:bg-background transition-colors ${
                    notification.read ? 'border-muted' : 'border-primary/30 bg-primary/5'
                  }`}
                >
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Overview;


