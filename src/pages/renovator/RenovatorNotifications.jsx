import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import notificationService from '../../services/notificationService';
import {
  Bell,
  Check,
  Trash2,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  ArrowLeft,
  Wrench,
} from 'lucide-react';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';

/**
 * RenovatorNotifications Component
 * Real-time notification center for renovation service providers
 * Shows notifications for new requests, customer messages, admin updates, and project status changes
 */
const RenovatorNotifications = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAsRead, setMarkingAsRead] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const unsubscribeRef = useRef(null);
  const fallbackUnsubscribeRef = useRef(null);

  // Setup real-time listener
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!currentUser || !currentUser.uid) {
      setLoading(false);
      if (!authLoading) {
        toast.error('Please log in to view notifications.');
        navigate('/auth');
      }
      return;
    }

    setLoading(true);
    const renovatorId = currentUser.uid;

    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', renovatorId),
        orderBy('createdAt', 'desc')
      );

      unsubscribeRef.current = onSnapshot(
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
              where('userId', '==', renovatorId)
            );

            fallbackUnsubscribeRef.current = onSnapshot(
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
          } else {
            setLoading(false);
          }
        }
      );

      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
        if (fallbackUnsubscribeRef.current) {
          fallbackUnsubscribeRef.current();
          fallbackUnsubscribeRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error setting up notifications listener:', error);
      setLoading(false);
    }
  }, [currentUser, authLoading, navigate]);

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
      const now = new Date();
      const diff = now - date;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
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
      case 'status-update':
        return <CheckCircle className="w-5 h-5 text-primary" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-accent" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'service-request':
      case 'request':
        return <Wrench className="w-5 h-5 text-primary" />;
      case 'admin':
        return <AlertCircle className="w-5 h-5 text-purple-600" />;
      case 'system':
        return <Info className="w-5 h-5 text-primary" />;
      default:
        return <Info className="w-5 h-5 text-primary" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'success':
      case 'status-update':
        return 'bg-primary/20 border-primary/30';
      case 'warning':
        return 'bg-accent/20 border-accent/30';
      case 'error':
        return 'bg-red-100 border-red-300';
      case 'service-request':
      case 'request':
        return 'bg-primary/10 border-primary/30';
      case 'admin':
        return 'bg-purple-100 border-purple-300';
      case 'system':
        return 'bg-primary/20 border-primary/30';
      default:
        return 'bg-primary/10 border-primary/20';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'service-request':
      case 'request':
        return 'Renovation Request';
      case 'status-update':
        return 'Status Update';
      case 'admin':
        return 'Admin Update';
      case 'system':
        return 'System';
      default:
        return 'Notification';
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-textSecondary mb-4">Please log in to view notifications</p>
          <Button onClick={() => navigate('/auth')}>Log In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/renovator/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-textMain mb-2">
                Notifications
              </h1>
              <p className="text-textSecondary">
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
          <div className="bg-surface rounded-lg shadow-lg p-12 text-center border border-borderColor">
            <Bell className="w-16 h-16 mx-auto text-textSecondary mb-4" />
            <h2 className="text-2xl font-bold text-textMain mb-2">No Notifications</h2>
            <p className="text-textSecondary mb-6">
              You're all caught up! No notifications to display.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-surface rounded-lg shadow-md p-6 border-l-4 transition-all ${
                  !notification.read
                    ? `${getTypeColor(notification.type)} border-l-4`
                    : 'border-borderColor'
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
                          <span className="px-2 py-1 text-xs font-medium bg-muted text-textSecondary rounded">
                            {getTypeLabel(notification.type)}
                          </span>
                          <h3 className="font-semibold text-textMain">
                            {notification.title || 'Notification'}
                          </h3>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-primary rounded-full"></span>
                          )}
                        </div>
                        <p className="text-textMain leading-relaxed">{notification.message}</p>
                        <p className="text-sm text-textSecondary mt-2">
                          {formatDate(notification.createdAt)}
                        </p>
                        {notification.link && (
                          <p className="text-sm text-primary mt-1 hover:underline">
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
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      disabled={deletingId === notification.id}
                      className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors disabled:opacity-50"
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
          <p className="text-textMain">
            Are you sure you want to delete all notifications? This action cannot be undone.
          </p>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-textSecondary">
              <strong>Total notifications:</strong> {notifications.length}
            </p>
            <p className="text-sm text-textSecondary">
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
              disabled={clearingAll}
            >
              {clearingAll ? 'Clearing...' : 'Clear All'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RenovatorNotifications;

