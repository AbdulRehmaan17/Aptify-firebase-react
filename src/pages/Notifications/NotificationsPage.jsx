import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  X,
  Calendar,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Home,
} from 'lucide-react';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const NotificationsPage = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
  const [deleting, setDeleting] = useState(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate('/login');
      return;
    }

    if (currentUser && db) {
      loadNotifications();
    }
  }, [authLoading, currentUser, navigate]);

  const loadNotifications = () => {
    if (!db || !currentUser) return;

    setLoading(true);

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notifs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setNotifications(notifs);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading notifications:', error);
        // Fallback without orderBy
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
          const fallbackQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', currentUser.uid),
            limit(100)
          );
          const fallbackUnsubscribe = onSnapshot(
            fallbackQuery,
            (fallbackSnapshot) => {
              const notifs = fallbackSnapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
              }));
              // Sort client-side
              notifs.sort((a, b) => {
                const aTime = a.createdAt?.toDate?.() || new Date(0);
                const bTime = b.createdAt?.toDate?.() || new Date(0);
                return bTime - aTime;
              });
              setNotifications(notifs);
              setLoading(false);
            },
            (fallbackError) => {
              console.error('Error loading notifications (fallback):', fallbackError);
              toast.error('Failed to load notifications');
              setLoading(false);
            }
          );
          return () => fallbackUnsubscribe();
        } else {
          toast.error('Failed to load notifications');
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  };

  const handleMarkAsRead = async (notificationId) => {
    if (!db || !notificationId) return;

    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: new Date(),
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!db || !currentUser) return;

    try {
      setMarkingAllRead(true);
      const unreadNotifications = notifications.filter((n) => !n.read);

      if (unreadNotifications.length === 0) {
        toast.success('All notifications are already read');
        setMarkingAllRead(false);
        return;
      }

      const batch = writeBatch(db);
      unreadNotifications.forEach((notification) => {
        const notificationRef = doc(db, 'notifications', notification.id);
        batch.update(notificationRef, {
          read: true,
          readAt: new Date(),
        });
      });

      await batch.commit();
      toast.success(`Marked ${unreadNotifications.length} notifications as read`);
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleDelete = async (notificationId) => {
    if (!db || !notificationId) return;

    try {
      setDeleting(notificationId);
      await deleteDoc(doc(db, 'notifications', notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    } finally {
      setDeleting(null);
    }
  };

  const handleNotificationClick = (notification) => {
    // Mark as read when clicked
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }

    // Navigate to link if available
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      'status-update': CheckCircle,
      info: Info,
      success: CheckCircle,
      warning: AlertCircle,
      error: XCircle,
      'service-request': MessageSquare,
      admin: AlertCircle,
      system: Bell,
    };
    return icons[type] || Bell;
  };

  const getNotificationColor = (type) => {
    const colors = {
      'status-update': 'text-primary',
      info: 'text-blue-500',
      success: 'text-green-500',
      warning: 'text-yellow-500',
      error: 'text-red-500',
      'service-request': 'text-primary',
      admin: 'text-purple-500',
      system: 'text-gray-500',
    };
    return colors[type] || 'text-textSecondary';
  };

  const getNotificationBgColor = (type) => {
    const colors = {
      'status-update': 'bg-primary/10',
      info: 'bg-blue-100',
      success: 'bg-green-100',
      warning: 'bg-yellow-100',
      error: 'bg-red-100',
      'service-request': 'bg-primary/10',
      admin: 'bg-purple-100',
      system: 'bg-gray-100',
    };
    return colors[type] || 'bg-muted';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Recently';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'read') return notification.read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-textMain">Notifications</h1>
              <p className="text-textSecondary mt-2">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={handleMarkAllAsRead}
                loading={markingAllRead}
                variant="outline"
                className="flex items-center"
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark All Read
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-textSecondary" />
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-base text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-textSecondary hover:bg-muted'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-base text-sm font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-textSecondary hover:bg-muted'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-4 py-2 rounded-base text-sm font-medium transition-colors ${
                filter === 'read'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-textSecondary hover:bg-muted'
              }`}
            >
              Read ({notifications.length - unreadCount})
            </button>
          </div>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="bg-surface rounded-base shadow-md p-12 border border-muted text-center">
            <Bell className="w-16 h-16 text-textSecondary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-textMain mb-2">No notifications</h2>
            <p className="text-textSecondary">
              {filter === 'unread'
                ? "You're all caught up! No unread notifications."
                : filter === 'read'
                ? 'No read notifications yet.'
                : "You don't have any notifications yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const iconColor = getNotificationColor(notification.type);
              const bgColor = getNotificationBgColor(notification.type);

              return (
                <div
                  key={notification.id}
                  className={`bg-surface rounded-base shadow-md p-4 border border-muted hover:shadow-lg transition-all cursor-pointer ${
                    !notification.read ? 'border-l-4 border-l-primary' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    {/* Icon */}
                    <div className={`${bgColor} rounded-full p-2 flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-semibold text-textMain">{notification.title}</h3>
                        {!notification.read && (
                          <span className="ml-2 w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1"></span>
                        )}
                      </div>
                      <p className="text-textSecondary text-sm mb-2">{notification.message}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-textSecondary flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatTime(notification.createdAt)}
                        </span>
                        <div className="flex items-center space-x-2">
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification.id);
                              }}
                              className="text-xs text-primary hover:text-primaryDark flex items-center"
                              title="Mark as read"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Mark read
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(notification.id);
                            }}
                            disabled={deleting === notification.id}
                            className="text-xs text-error hover:text-red-700 flex items-center"
                            title="Delete notification"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;



