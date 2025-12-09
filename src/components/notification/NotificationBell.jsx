import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '../../firebase'; // AUTO-FIXED: Added auth import
import { useAuth } from '../../context/AuthContext';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import notificationService from '../../services/notificationService';

/**
 * NotificationBell Component
 * Displays notification bell with unread count and dropdown
 */
const NotificationBell = () => {
  const { currentUser, unreadCount: contextUnreadCount } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);
  const lastNotificationId = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Setup real-time listener for notifications
  useEffect(() => {
    // Guard: Ensure user is authenticated (notifications require auth per rules)
    if (!currentUser || !currentUser.uid || !db || !auth?.currentUser) {
      setLoading(false);
      setNotifications([]);
      return;
    }

    setLoading(true);
    const userId = currentUser.uid;
    let unsubscribe = null;
    let fallbackUnsubscribe = null;

    try {
      // Notifications require authentication per Firestore rules
      // Query must filter by userId matching current user
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      unsubscribe = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          const notifs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Sort client-side
          notifs.sort((a, b) => {
            const aTime = a.createdAt?.toDate?.() || new Date(0);
            const bTime = b.createdAt?.toDate?.() || new Date(0);
            return bTime - aTime;
          });

          setNotifications(notifs);
          setLoading(false);

          // Show toast for new notifications
          if (notifs.length > 0) {
            const latestNotification = notifs[0];
            if (latestNotification.id !== lastNotificationId.current && !latestNotification.read) {
              lastNotificationId.current = latestNotification.id;

              // Show toast based on type
              const toastOptions = {
                duration: 5000,
              };

              switch (latestNotification.type) {
                case 'success':
                  toast.success(latestNotification.title || 'New Notification', {
                    ...toastOptions,
                    description: latestNotification.message,
                  });
                  break;
                case 'warning':
                  toast(latestNotification.title || 'New Notification', {
                    ...toastOptions,
                    icon: '⚠️',
                    description: latestNotification.message,
                  });
                  break;
                case 'error':
                  toast.error(latestNotification.title || 'New Notification', {
                    ...toastOptions,
                    description: latestNotification.message,
                  });
                  break;
                default:
                  toast(latestNotification.title || 'New Notification', {
                    ...toastOptions,
                    icon: '🔔',
                    description: latestNotification.message,
                  });
              }
            }
          }
        },
        (error) => {
          console.error('Error fetching notifications:', error);

          // Handle permission errors
          if (error.code === 'permission-denied') {
            console.warn('Permission denied when fetching notifications. Check Firestore rules.');
            setNotifications([]);
            setLoading(false);
            return;
          }

          // Fallback without orderBy for index errors
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            try {
              const fallbackQuery = query(
                collection(db, 'notifications'),
                where('userId', '==', userId)
              );

              fallbackUnsubscribe = onSnapshot(
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
                  if (fallbackError.code === 'permission-denied') {
                    console.warn('Permission denied in fallback query. Check Firestore rules.');
                  }
                  setNotifications([]);
                  setLoading(false);
                }
              );
            } catch (fallbackSetupError) {
              console.error('Error setting up fallback query:', fallbackSetupError);
              setNotifications([]);
              setLoading(false);
            }
          } else {
            setNotifications([]);
            setLoading(false);
          }
        }
      );
    } catch (error) {
      console.error('Error setting up notifications listener:', error);
      setNotifications([]);
      setLoading(false);
    }

    // Cleanup function
    return () => {
      try {
        if (unsubscribe) {
          unsubscribe();
        }
        if (fallbackUnsubscribe) {
          fallbackUnsubscribe();
        }
      } catch (cleanupError) {
        console.error('Error cleaning up notifications listener:', cleanupError);
      }
    };
  }, [currentUser?.uid, db]);

  const handleMarkAsRead = async (notificationId, e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await notificationService.markAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
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
      setIsOpen(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Recently';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'warning':
        return 'bg-accent/20 text-accent border-accent/30';
      case 'error':
        return 'bg-error/20 text-error border-error/30';
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  if (!currentUser) {
    return null;
  }

  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
          } else {
            setIsOpen(true);
          }
        }}
        onDoubleClick={() => navigate('/notifications')}
        className="relative p-2 text-textSecondary hover:text-primary transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        {contextUnreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-0 right-0 bg-error text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
          >
            {contextUnreadCount > 9 ? '9+' : contextUnreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 bg-surface rounded-base shadow-xl border border-muted z-50 max-h-96 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-muted">
              <h3 className="font-semibold text-textMain">Notifications</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-textSecondary hover:text-textMain"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-4 text-center text-textSecondary">Loading...</div>
              ) : recentNotifications.length === 0 ? (
                <div className="p-8 text-center text-textSecondary">
                  <Bell className="w-12 h-12 mx-auto mb-2 text-muted" />
                  <p>No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-muted">
                  {recentNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 hover:bg-muted/30 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-primary/10' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded border ${getTypeColor(
                                notification.type
                              )}`}
                            >
                              {notification.type || 'info'}
                            </span>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-primary rounded-full"></span>
                            )}
                          </div>
                          <h4 className="font-semibold text-textMain text-sm mb-1 truncate">
                            {notification.title || 'Notification'}
                          </h4>
                          <p className="text-sm text-textSecondary line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-textSecondary mt-1">
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.read && (
                          <button
                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                            className="text-primary hover:text-primaryDark text-xs flex-shrink-0"
                            title="Mark as read"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-muted">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/notifications');
                }}
                className="block w-full text-center text-sm text-primary hover:text-primaryDark font-medium"
              >
                View all notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
