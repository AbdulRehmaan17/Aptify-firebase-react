import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/notificationService';
import {
  Bell,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  Check,
  Trash2,
} from 'lucide-react';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

/**
 * NotificationDetailPage Component
 * Displays a single notification with full details
 */
const NotificationDetailPage = () => {
  const { notificationId } = useParams();
  const navigate = useNavigate();
  const { user: contextUser } = useAuth();
  const currentUser = contextUser;
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [markingAsRead, setMarkingAsRead] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchNotification = async () => {
      if (!notificationId || !db || !currentUser?.uid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const notificationRef = doc(db, 'notifications', notificationId);
        const notificationSnap = await getDoc(notificationRef);

        if (!notificationSnap.exists()) {
          setNotification(null);
          setLoading(false);
          return;
        }

        const notificationData = {
          id: notificationSnap.id,
          ...notificationSnap.data(),
        };

        // Verify this notification belongs to the current user
        if (notificationData.userId !== currentUser.uid) {
          toast.error('You do not have permission to view this notification.');
          navigate('/notifications');
          return;
        }

        setNotification(notificationData);

        // Mark as read if unread
        if (!notificationData.read) {
          notificationService.markAsRead(notificationId).catch(console.error);
        }
      } catch (error) {
        console.error('Error fetching notification:', error);
        toast.error('Failed to load notification');
        setNotification(null);
      } finally {
        setLoading(false);
      }
    };

    fetchNotification();
  }, [notificationId, currentUser?.uid, navigate]);

  const handleMarkAsRead = async () => {
    if (!notification || notification.read) return;

    try {
      setMarkingAsRead(true);
      await notificationService.markAsRead(notification.id);
      setNotification({ ...notification, read: true });
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    } finally {
      setMarkingAsRead(false);
    }
  };

  const handleDelete = async () => {
    if (!notification) return;

    if (!window.confirm('Are you sure you want to delete this notification?')) {
      return;
    }

    try {
      setDeleting(true);
      await notificationService.delete(notification.id);
      toast.success('Notification deleted');
      navigate('/notifications');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    } finally {
      setDeleting(false);
    }
  };

  const handleNavigateToLink = () => {
    if (!notification?.link) return;

    const link = notification.link.trim();
    if (link.startsWith('/')) {
      navigate(link);
    } else {
      console.warn('Invalid notification link format:', link);
      toast.error('Invalid notification link');
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
        return <CheckCircle className="w-6 h-6 text-primary" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-accent" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-error" />;
      default:
        return <Info className="w-6 h-6 text-primary" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-primary/10 border-primary/30';
      case 'warning':
        return 'bg-accent/10 border-accent/30';
      case 'error':
        return 'bg-error/10 border-error/30';
      default:
        return 'bg-primary/10 border-primary/20';
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button variant="outline" onClick={() => navigate('/notifications')} className="mb-6">
            <ArrowLeft className="w-5 h-5 mr-2" /> Back to Notifications
          </Button>
          <div className="bg-surface rounded-base shadow-lg p-12 text-center">
            <Bell className="w-16 h-16 mx-auto text-muted mb-4" />
            <h2 className="text-2xl font-bold text-textMain mb-2">Notification Not Found</h2>
            <p className="text-textSecondary mb-6">
              The notification you're looking for doesn't exist or has been deleted.
            </p>
            <Button onClick={() => navigate('/notifications')}>Go to Notifications</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Button variant="outline" onClick={() => navigate('/notifications')} className="mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back to Notifications
        </Button>

        {/* Notification Card */}
        <div
          className={`bg-surface rounded-base shadow-md p-8 border-l-4 ${
            !notification.read ? `${getTypeColor(notification.type)} border-l-4` : 'border-muted'
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4 flex-1">
              <div className="flex-shrink-0 mt-1">{getTypeIcon(notification.type)}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-display font-bold text-textMain">
                    {notification.title || 'Notification'}
                  </h1>
                  {!notification.read && (
                    <span className="w-3 h-3 bg-primary rounded-full"></span>
                  )}
                  {notification.isBroadcast && (
                    <span className="px-2 py-1 text-xs font-medium bg-primary text-white rounded">
                      Broadcast
                    </span>
                  )}
                </div>
                <p className="text-sm text-textSecondary">{formatDate(notification.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="mb-6">
            <p className="text-textMain leading-relaxed text-lg">{notification.message}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-6 border-t border-muted">
            {!notification.read && (
              <Button
                variant="outline"
                onClick={handleMarkAsRead}
                disabled={markingAsRead}
                loading={markingAsRead}
              >
                <Check className="w-4 h-4 mr-2" />
                Mark as Read
              </Button>
            )}
            {notification.link && (
              <Button variant="primary" onClick={handleNavigateToLink}>
                View Related Content
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleting}
              loading={deleting}
              className="text-error hover:text-error hover:border-error"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationDetailPage;





