import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Clock } from 'lucide-react';
import notificationService from '../../../services/notificationService';
import { collection, query, where, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import Button from '../../../components/common/Button';

const Notifications = ({ user, onDataReload }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAsRead, setMarkingAsRead] = useState(null);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user || !db) return;
    setLoading(true);
    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(notificationsQuery);
      const notifs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setNotifications(notifs);
    } catch (error) {
      console.error('Error loading notifications:', error);
      // Fallback without orderBy
      try {
        const fallbackQuery = query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const notifs = fallbackSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => {
            const aTime = a.createdAt?.toDate?.() || new Date(0);
            const bTime = b.createdAt?.toDate?.() || new Date(0);
            return bTime - aTime;
          });
        setNotifications(notifs);
      } catch (fallbackError) {
        console.error('Error loading notifications (fallback):', fallbackError);
        toast.error('Failed to load notifications');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    if (!db) return;
    setMarkingAsRead(notificationId);
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      toast.success('Notification marked as read');
      if (onDataReload) {
        onDataReload();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    } finally {
      setMarkingAsRead(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!db) return;
    try {
      const unreadNotifications = notifications.filter((n) => !n.read);
      await Promise.all(
        unreadNotifications.map((n) =>
          updateDoc(doc(db, 'notifications', n.id), { read: true })
        )
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
      if (onDataReload) {
        onDataReload();
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date?.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-textMain">Notifications</h1>
          <p className="text-textSecondary mt-2">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            <Check className="w-4 h-4 mr-2" />
            Mark All as Read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-surface rounded-lg shadow-md p-12 text-center border border-muted">
          <Bell className="w-16 h-16 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-textMain mb-2">No notifications</h3>
          <p className="text-textSecondary">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-surface rounded-lg shadow-md p-6 border transition-colors ${
                notification.read ? 'border-muted' : 'border-primary/30 bg-primary/5'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-textMain">
                      {notification.title || 'Notification'}
                    </h3>
                    {!notification.read && (
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                    )}
                  </div>
                  <p className="text-textSecondary mb-3">{notification.message || notification.body}</p>
                  <div className="flex items-center text-textSecondary text-sm">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{formatDate(notification.createdAt)}</span>
                  </div>
                </div>
                {!notification.read && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkAsRead(notification.id)}
                    disabled={markingAsRead === notification.id}
                    className="ml-4"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Mark Read
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;


