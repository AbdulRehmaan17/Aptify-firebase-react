import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/notificationService';
import {
  Bell,
  Check,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
} from 'lucide-react';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import Modal from '../components/common/Modal';

/**
 * NotificationsPage Component
 * Full notifications page with all management features
 */
const NotificationsPage = () => {
  const { user: contextUser } = useAuth();
  const currentUser = auth?.currentUser || contextUser;
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAsRead, setMarkingAsRead] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  // Setup real-time listener
  useEffect(() => {
    if (!currentUser || !currentUser.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const userId = currentUser.uid;

    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          const notifs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Sort client-side if orderBy fails
          notifs.sort((a, b) => {
            const aTime = a.createdAt?.toDate?.() || new Date(0);
            const bTime = b.createdAt?.toDate?.() || new Date(0);
            return bTime - aTime;
          });

          setNotifications(notifs);
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching notifications:', error);
          // Fallback without orderBy
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            const fallbackQuery = query(
              collection(db, 'notifications'),
              where('userId', '==', userId)
            );

            const fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              (snapshot) => {
                const notifs = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));

                notifs.sort((a, b) => {
                  const aTime = a.createdAt?.toDate?.() || new Date(0);
                  const bTime = b.createdAt?.toDate?.() || new Date(0);
                  return bTime - aTime;
                });

                setNotifications(notifs);
                setLoading(false);
              },
              (fallbackError) => {
                console.error('Error fetching notifications (fallback):', fallbackError);
                setLoading(false);
              }
            );

            return () => fallbackUnsubscribe();
          } else {
            setLoading(false);
          }
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up notifications listener:', error);
      setLoading(false);
    }
  }, [currentUser]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      setMarkingAsRead(notificationId);
      await notificationService.markAsRead(notificationId);
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    } finally {
      setMarkingAsRead(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setClearingAll(true);
      await notificationService.markAllAsRead(currentUser.uid);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all notifications as read');
    } finally {
      setClearingAll(false);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      setDeletingId(notificationId);
      await notificationService.delete(notificationId);
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    try {
      setClearingAll(true);
      await notificationService.clearAll(currentUser.uid);
      toast.success('All notifications cleared');
      setShowClearAllModal(false);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      toast.error('Failed to clear all notifications');
    } finally {
      setClearingAll(false);
    }
  };

  const handleNotificationClick = (notification) => {
    // Mark as read if unread
    if (!notification.read) {
      notificationService.markAsRead(notification.id).catch(console.error);
    }

    // Navigate if link exists
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Date not available';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Date not available';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to view notifications</p>
          <Button onClick={() => navigate('/auth')}>Log In</Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">
                Notifications
              </h1>
              <p className="text-gray-600">
                {unreadCount > 0
                  ? `${unreadCount} unread ${unreadCount === 1 ? 'notification' : 'notifications'}`
                  : 'All caught up!'}
              </p>
            </div>
            {notifications.length > 0 && (
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    disabled={clearingAll}
                    loading={clearingAll}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Mark All Read
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowClearAllModal(true)}
                  disabled={clearingAll}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Bell className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Notifications</h2>
            <p className="text-gray-600 mb-6">You're all caught up! No notifications to display.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg shadow-md p-6 border-l-4 transition-all ${
                  !notification.read
                    ? `${getTypeColor(notification.type)} border-l-4`
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">{getTypeIcon(notification.type)}</div>

                  {/* Content */}
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">
                            {notification.title || 'Notification'}
                          </h3>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                          {notification.isBroadcast && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                              Broadcast
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700 leading-relaxed">{notification.message}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          {formatDate(notification.createdAt)}
                        </p>
                        {notification.link && (
                          <p className="text-sm text-blue-600 mt-1 hover:underline">
                            Click to view →
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-start gap-2 flex-shrink-0">
                    {!notification.read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        disabled={markingAsRead === notification.id}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      disabled={deletingId === notification.id}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clear All Confirmation Modal */}
      <Modal
        isOpen={showClearAllModal}
        onClose={() => setShowClearAllModal(false)}
        title="Clear All Notifications"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete all notifications? This action cannot be undone.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Total notifications:</strong> {notifications.length}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Unread:</strong> {unreadCount}
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowClearAllModal(false)}
              disabled={clearingAll}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleClearAll}
              loading={clearingAll}
              disabled={clearingAll}
            >
              Clear All
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default NotificationsPage;

