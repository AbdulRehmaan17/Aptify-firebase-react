import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Home,
  MessageCircle,
  Star,
  Bell,
  Edit2,
  Save,
  Trash2,
  Eye,
  X,
  Plus,
  Search,
  Building2,
  Calendar,
  DollarSign,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import userService from '../services/userService';
import propertyService from '../services/propertyService';
import rentalRequestService from '../services/rentalRequestService';
import buySellRequestService from '../services/buySellRequestService';
import reviewsService from '../services/reviewsService';
import notificationService from '../services/notificationService';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';

const MyAccount = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  // Profile state
  const [profile, setProfile] = useState({
    displayName: '',
    email: '',
    phone: '',
    address: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [errors, setErrors] = useState({});

  // Summary counts
  const [summaryCounts, setSummaryCounts] = useState({
    properties: 0,
    activeRequests: 0,
    unreadMessages: 0,
  });

  // Data state
  const [myProperties, setMyProperties] = useState([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [allRequests, setAllRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [activeChats, setActiveChats] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [myReviews, setMyReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Delete confirmation modals
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    type: null, // 'property', 'review'
    id: null,
    title: null,
  });

  // Tabs configuration
  const tabs = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'properties', label: 'My Properties', icon: Home },
    { key: 'requests', label: 'My Requests', icon: Calendar },
    { key: 'chats', label: 'My Chats', icon: MessageCircle },
    { key: 'reviews', label: 'My Reviews', icon: Star },
    { key: 'notifications', label: 'Notifications', icon: Bell },
  ];

  // Fetch profile
  useEffect(() => {
    if (!authLoading && user) {
      const fetchProfile = async () => {
        try {
          const userProfile = await userService.getProfile(user.uid);
          setProfile({
            displayName: userProfile.displayName || userProfile.name || '',
            email: userProfile.email || user.email,
            phone: userProfile.phone || userProfile.phoneNumber || '',
            address:
              typeof userProfile.address === 'string'
                ? userProfile.address
                : userProfile.address?.line1 || userProfile.address || '',
          });
        } catch (error) {
          console.error('Error fetching profile:', error);
          toast.error('Failed to load profile');
        } finally {
          setProfileLoading(false);
        }
      };
      fetchProfile();
    } else if (!authLoading && !user) {
      toast.error('Please log in to view your account.');
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  // Live updates for summary counts
  useEffect(() => {
    if (!user || authLoading || !db) return;

    const unsubscribes = [];

    // Properties count
    const propertiesQuery = query(
      collection(db, 'properties'),
      where('ownerId', '==', user.uid)
    );
    const unsubscribeProperties = onSnapshot(
      propertiesQuery,
      (snapshot) => {
        setSummaryCounts((prev) => ({
          ...prev,
          properties: snapshot.size,
        }));
      },
      (error) => {
        console.error('Error fetching properties count:', error);
      }
    );
    unsubscribes.push(unsubscribeProperties);

    // Active requests count (rental + buySell + construction + renovation)
    const rentalQuery = query(
      collection(db, 'rentalRequests'),
      where('userId', '==', user.uid)
    );
    const buySellQuery = query(
      collection(db, 'buySellRequests'),
      where('userId', '==', user.uid)
    );
    const constructionQuery = query(
      collection(db, 'constructionProjects'),
      where('userId', '==', user.uid)
    );
    const renovationQuery = query(
      collection(db, 'renovationProjects'),
      where('userId', '==', user.uid)
    );

    let rentalCount = 0;
    let buySellCount = 0;
    let constructionCount = 0;
    let renovationCount = 0;

    const unsubscribeRental = onSnapshot(rentalQuery, (snapshot) => {
      rentalCount = snapshot.size;
      updateActiveRequestsCount();
    });
    unsubscribes.push(unsubscribeRental);

    const unsubscribeBuySell = onSnapshot(buySellQuery, (snapshot) => {
      buySellCount = snapshot.size;
      updateActiveRequestsCount();
    });
    unsubscribes.push(unsubscribeBuySell);

    const unsubscribeConstruction = onSnapshot(constructionQuery, (snapshot) => {
      constructionCount = snapshot.size;
      updateActiveRequestsCount();
    });
    unsubscribes.push(unsubscribeConstruction);

    const unsubscribeRenovation = onSnapshot(renovationQuery, (snapshot) => {
      renovationCount = snapshot.size;
      updateActiveRequestsCount();
    });
    unsubscribes.push(unsubscribeRenovation);

    function updateActiveRequestsCount() {
      setSummaryCounts((prev) => ({
        ...prev,
        activeRequests: rentalCount + buySellCount + constructionCount + renovationCount,
      }));
    }

    // Unread messages count (from chats)
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );
    const unsubscribeChats = onSnapshot(
      chatsQuery,
      async (snapshot) => {
        let unreadCount = 0;
        const chatPromises = snapshot.docs.map(async (chatDoc) => {
          const chatData = chatDoc.data();
          const unreadFor = chatData.unreadFor || {};
          return unreadFor[user.uid] || 0;
        });
        const counts = await Promise.all(chatPromises);
        unreadCount = counts.reduce((sum, count) => sum + count, 0);
        setSummaryCounts((prev) => ({
          ...prev,
          unreadMessages: unreadCount,
        }));
      },
      (error) => {
        console.error('Error fetching chats count:', error);
      }
    );
    unsubscribes.push(unsubscribeChats);

    // Unread notifications count
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );
    const unsubscribeNotifications = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        setUnreadNotificationCount(snapshot.size);
      },
      (error) => {
        console.error('Error fetching notifications count:', error);
      }
    );
    unsubscribes.push(unsubscribeNotifications);

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [user, authLoading]);

  // Live updates for My Properties tab
  useEffect(() => {
    if (!user || authLoading || !db || activeTab !== 'properties') return;

    setPropertiesLoading(true);
    const propertiesQuery = query(
      collection(db, 'properties'),
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      propertiesQuery,
      (snapshot) => {
        const properties = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMyProperties(properties);
        setPropertiesLoading(false);
      },
      (error) => {
        // Fallback without orderBy
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
          const fallbackQuery = query(
            collection(db, 'properties'),
            where('ownerId', '==', user.uid)
          );
          const fallbackUnsubscribe = onSnapshot(
            fallbackQuery,
            (fallbackSnapshot) => {
              const properties = fallbackSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }));
              properties.sort((a, b) => {
                const aTime = a.createdAt?.toDate?.() || new Date(0);
                const bTime = b.createdAt?.toDate?.() || new Date(0);
                return bTime - aTime;
              });
              setMyProperties(properties);
              setPropertiesLoading(false);
            },
            (fallbackError) => {
              console.error('Error fetching properties (fallback):', fallbackError);
              toast.error('Failed to load properties');
              setMyProperties([]);
              setPropertiesLoading(false);
            }
          );
          return () => fallbackUnsubscribe();
        } else {
          console.error('Error fetching properties:', error);
          toast.error('Failed to load properties');
          setMyProperties([]);
          setPropertiesLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [user, authLoading, activeTab]);

  // Live updates for My Requests tab
  useEffect(() => {
    if (!user || authLoading || !db || activeTab !== 'requests') return;

    setRequestsLoading(true);
    const unsubscribes = [];
    const allRequestsData = [];

    // Rental requests
    const rentalQuery = query(
      collection(db, 'rentalRequests'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeRental = onSnapshot(
      rentalQuery,
      (snapshot) => {
        const requests = snapshot.docs.map((doc) => ({
          id: doc.id,
          type: 'rental',
          ...doc.data(),
        }));
        updateAllRequests('rental', requests);
      },
      (error) => {
        if (error.code === 'failed-precondition') {
          const fallbackQuery = query(
            collection(db, 'rentalRequests'),
            where('userId', '==', user.uid)
          );
          const fallbackUnsub = onSnapshot(fallbackQuery, (snapshot) => {
            const requests = snapshot.docs.map((doc) => ({
              id: doc.id,
              type: 'rental',
              ...doc.data(),
            }));
            requests.sort((a, b) => {
              const aTime = a.createdAt?.toDate?.() || new Date(0);
              const bTime = b.createdAt?.toDate?.() || new Date(0);
              return bTime - aTime;
            });
            updateAllRequests('rental', requests);
          });
          return () => fallbackUnsub();
        }
      }
    );
    unsubscribes.push(unsubscribeRental);

    // Buy/Sell requests
    const buySellQuery = query(
      collection(db, 'buySellRequests'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeBuySell = onSnapshot(
      buySellQuery,
      (snapshot) => {
        const requests = snapshot.docs.map((doc) => ({
          id: doc.id,
          type: 'buySell',
          ...doc.data(),
        }));
        updateAllRequests('buySell', requests);
      },
      (error) => {
        if (error.code === 'failed-precondition') {
          const fallbackQuery = query(
            collection(db, 'buySellRequests'),
            where('userId', '==', user.uid)
          );
          const fallbackUnsub = onSnapshot(fallbackQuery, (snapshot) => {
            const requests = snapshot.docs.map((doc) => ({
              id: doc.id,
              type: 'buySell',
              ...doc.data(),
            }));
            requests.sort((a, b) => {
              const aTime = a.createdAt?.toDate?.() || new Date(0);
              const bTime = b.createdAt?.toDate?.() || new Date(0);
              return bTime - aTime;
            });
            updateAllRequests('buySell', requests);
          });
          return () => fallbackUnsub();
        }
      }
    );
    unsubscribes.push(unsubscribeBuySell);

    // Construction projects (try clientId first, fallback to userId)
    const constructionQuery = query(
      collection(db, 'constructionProjects'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeConstruction = onSnapshot(
      constructionQuery,
      (snapshot) => {
        const requests = snapshot.docs.map((doc) => ({
          id: doc.id,
          type: 'construction',
          ...doc.data(),
        }));
        updateAllRequests('construction', requests);
      },
      (error) => {
        if (error.code === 'failed-precondition') {
          const fallbackQuery = query(
            collection(db, 'constructionProjects'),
            where('userId', '==', user.uid)
          );
          const fallbackUnsub = onSnapshot(fallbackQuery, (snapshot) => {
            const requests = snapshot.docs.map((doc) => ({
              id: doc.id,
              type: 'construction',
              ...doc.data(),
            }));
            requests.sort((a, b) => {
              const aTime = a.createdAt?.toDate?.() || new Date(0);
              const bTime = b.createdAt?.toDate?.() || new Date(0);
              return bTime - aTime;
            });
            updateAllRequests('construction', requests);
          });
          return () => fallbackUnsub();
        }
      }
    );
    unsubscribes.push(unsubscribeConstruction);

    // Renovation projects (try clientId first, fallback to userId)
    const renovationQuery = query(
      collection(db, 'renovationProjects'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeRenovation = onSnapshot(
      renovationQuery,
      (snapshot) => {
        const requests = snapshot.docs.map((doc) => ({
          id: doc.id,
          type: 'renovation',
          ...doc.data(),
        }));
        updateAllRequests('renovation', requests);
      },
      (error) => {
        if (error.code === 'failed-precondition') {
          const fallbackQuery = query(
            collection(db, 'renovationProjects'),
            where('userId', '==', user.uid)
          );
          const fallbackUnsub = onSnapshot(fallbackQuery, (snapshot) => {
            const requests = snapshot.docs.map((doc) => ({
              id: doc.id,
              type: 'renovation',
              ...doc.data(),
            }));
            requests.sort((a, b) => {
              const aTime = a.createdAt?.toDate?.() || new Date(0);
              const bTime = b.createdAt?.toDate?.() || new Date(0);
              return bTime - aTime;
            });
            updateAllRequests('renovation', requests);
          });
          return () => fallbackUnsub();
        }
      }
    );
    unsubscribes.push(unsubscribeRenovation);

    function updateAllRequests(type, requests) {
      setAllRequests((prev) => {
        const filtered = prev.filter((r) => r.type !== type);
        const combined = [...filtered, ...requests];
        combined.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return bTime - aTime;
        });
        setRequestsLoading(false);
        return combined;
      });
    }

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [user, authLoading, activeTab]);

  // Live updates for My Chats tab
  useEffect(() => {
    if (!user || authLoading || !db || activeTab !== 'chats') return;

    setChatsLoading(true);
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      chatsQuery,
      async (snapshot) => {
        const chats = await Promise.all(
          snapshot.docs.slice(0, 5).map(async (chatDoc) => {
            const chatData = chatDoc.data();
            const otherUid = chatData.participants?.find((uid) => uid !== user.uid);
            let otherName = 'Unknown';
            if (otherUid) {
              try {
                const userDoc = await getDoc(doc(db, 'users', otherUid));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  otherName = userData.name || userData.displayName || userData.email || 'Unknown';
                }
              } catch (err) {
                console.error('Error fetching user name:', err);
              }
            }
            return {
              id: chatDoc.id,
              ...chatData,
              otherParticipantName: otherName,
            };
          })
        );
        setActiveChats(chats);
        setChatsLoading(false);
      },
      (error) => {
        if (error.code === 'failed-precondition') {
          const fallbackQuery = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', user.uid)
          );
          const fallbackUnsubscribe = onSnapshot(
            fallbackQuery,
            async (snapshot) => {
              const chats = await Promise.all(
                snapshot.docs.slice(0, 5).map(async (chatDoc) => {
                  const chatData = chatDoc.data();
                  const otherUid = chatData.participants?.find((uid) => uid !== user.uid);
                  let otherName = 'Unknown';
                  if (otherUid) {
                    try {
                      const userDoc = await getDoc(doc(db, 'users', otherUid));
                      if (userDoc.exists()) {
                        const userData = userDoc.data();
                        otherName = userData.name || userData.displayName || userData.email || 'Unknown';
                      }
                    } catch (err) {
                      console.error('Error fetching user name:', err);
                    }
                  }
                  return {
                    id: chatDoc.id,
                    ...chatData,
                    otherParticipantName: otherName,
                  };
                })
              );
              chats.sort((a, b) => {
                const aTime = a.updatedAt?.toDate?.() || new Date(0);
                const bTime = b.updatedAt?.toDate?.() || new Date(0);
                return bTime - aTime;
              });
              setActiveChats(chats);
              setChatsLoading(false);
            },
            (fallbackError) => {
              console.error('Error fetching chats (fallback):', fallbackError);
              setActiveChats([]);
              setChatsLoading(false);
            }
          );
          return () => fallbackUnsubscribe();
        } else {
          console.error('Error fetching chats:', error);
          setActiveChats([]);
          setChatsLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [user, authLoading, activeTab]);

  // Live updates for My Reviews tab
  useEffect(() => {
    if (!user || authLoading || !db || activeTab !== 'reviews') return;

    setReviewsLoading(true);
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('reviewerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      reviewsQuery,
      (snapshot) => {
        const reviews = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMyReviews(reviews);
        setReviewsLoading(false);
      },
      (error) => {
        if (error.code === 'failed-precondition') {
          const fallbackQuery = query(
            collection(db, 'reviews'),
            where('reviewerId', '==', user.uid)
          );
          const fallbackUnsubscribe = onSnapshot(
            fallbackQuery,
            (snapshot) => {
              const reviews = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }));
              reviews.sort((a, b) => {
                const aTime = a.createdAt?.toDate?.() || new Date(0);
                const bTime = b.createdAt?.toDate?.() || new Date(0);
                return bTime - aTime;
              });
              setMyReviews(reviews);
              setReviewsLoading(false);
            },
            (fallbackError) => {
              console.error('Error fetching reviews (fallback):', fallbackError);
              setMyReviews([]);
              setReviewsLoading(false);
            }
          );
          return () => fallbackUnsubscribe();
        } else {
          console.error('Error fetching reviews:', error);
          setMyReviews([]);
          setReviewsLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [user, authLoading, activeTab]);

  // Profile handlers
  const validateForm = () => {
    const newErrors = {};
    if (!profile.displayName.trim()) {
      newErrors.displayName = 'Name is required';
    }
    if (profile.phone && !/^\+?[\d\s-]{10,15}$/.test(profile.phone)) {
      newErrors.phone = 'Invalid phone number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors in the form.');
      return;
    }

    try {
      await userService.updateProfile(user.uid, {
        displayName: profile.displayName,
        phone: profile.phone,
        address: profile.address,
      });
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile.');
    }
  };

  // Delete handlers
  const handleDeleteProperty = async (propertyId) => {
    try {
      await propertyService.delete(propertyId);
      toast.success('Property deleted successfully');
      setDeleteModal({ isOpen: false, type: null, id: null, title: null });
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error(error.message || 'Failed to delete property');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      await reviewsService.delete(reviewId);
      toast.success('Review deleted successfully');
      setDeleteModal({ isOpen: false, type: null, id: null, title: null });
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error(error.message || 'Failed to delete review');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  const getRequestTypeLabel = (type) => {
    switch (type) {
      case 'rental':
        return 'Rental Request';
      case 'buySell':
        return 'Buy/Sell Offer';
      case 'construction':
        return 'Construction Project';
      case 'renovation':
        return 'Renovation Project';
      default:
        return 'Request';
    }
  };

  const getRequestTypeIcon = (type) => {
    switch (type) {
      case 'rental':
        return <Calendar className="w-5 h-5" />;
      case 'buySell':
        return <DollarSign className="w-5 h-5" />;
      case 'construction':
        return <Building2 className="w-5 h-5" />;
      case 'renovation':
        return <Wrench className="w-5 h-5" />;
      default:
        return <Calendar className="w-5 h-5" />;
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-textMain mb-8">My Account</h1>

        {/* Header Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card-base p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-textSecondary">My Properties</p>
                <p className="text-3xl font-bold text-primary mt-2">{summaryCounts.properties}</p>
              </div>
              <Home className="w-12 h-12 text-primary" />
            </div>
          </div>
          <div className="card-base p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-textSecondary">Active Requests</p>
                <p className="text-3xl font-bold text-primary mt-2">{summaryCounts.activeRequests}</p>
              </div>
              <Calendar className="w-12 h-12 text-primary" />
            </div>
          </div>
          <div className="card-base p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-textSecondary">Unread Messages</p>
                <p className="text-3xl font-bold text-textMain mt-2">{summaryCounts.unreadMessages}</p>
              </div>
              <MessageCircle className="w-12 h-12 text-primary" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6 flex flex-wrap gap-3">
          <Link to="/post-property">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Post Property
            </Button>
          </Link>
          <Link to="/providers">
            <Button variant="outline">
              <Search className="w-4 h-4 mr-2" />
              Browse Providers
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1">
            <div className="card-base p-4 sticky top-24">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  const count =
                    tab.key === 'notifications' ? unreadNotificationCount : null;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-textSecondary hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{tab.label}</span>
                      </div>
                      {count !== null && count > 0 && (
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            isActive
                              ? 'bg-surface text-primary'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <div className="card-base p-6">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-textMain flex items-center">
                      <User className="w-6 h-6 mr-2" />
                      Profile Information
                    </h2>
                    <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
                      {isEditing ? 'Cancel' : 'Edit'} <Edit2 className="w-4 h-4 ml-2" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-textSecondary mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="displayName"
                        value={profile.displayName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full px-4 py-2 border rounded-lg ${
                          errors.displayName ? 'border-error' : 'border-muted'
                        } ${!isEditing ? 'bg-muted' : ''}`}
                      />
                      {errors.displayName && (
                        <p className="text-error text-xs mt-1">{errors.displayName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-textSecondary mb-1">Email</label>
                      <input
                        type="email"
                        value={profile.email}
                        disabled
                        className="w-full px-4 py-2 border border-muted rounded-base bg-muted cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-textSecondary mb-1">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        name="phone"
                        value={profile.phone}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full px-4 py-2 border rounded-lg ${
                          errors.phone ? 'border-error' : 'border-muted'
                        } ${!isEditing ? 'bg-muted' : ''}`}
                      />
                      {errors.phone && (
                        <p className="text-error text-xs mt-1">{errors.phone}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-textSecondary mb-1">Address</label>
                      <textarea
                        name="address"
                        value={profile.address}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        rows="3"
                        className={`w-full px-4 py-2 border rounded-lg ${
                          errors.address ? 'border-error' : 'border-muted'
                        } ${!isEditing ? 'bg-muted' : ''}`}
                      />
                    </div>

                    {isEditing && (
                      <Button onClick={handleSave} className="w-full">
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* My Properties Tab */}
              {activeTab === 'properties' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-textMain flex items-center">
                      <Home className="w-6 h-6 mr-2" />
                      My Properties ({summaryCounts.properties})
                    </h2>
                    <Link to="/post-property">
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Post New Property
                      </Button>
                    </Link>
                  </div>

                  {propertiesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <LoadingSpinner size="md" />
                    </div>
                  ) : myProperties.length === 0 ? (
                    <div className="text-center py-12">
                      <Home className="w-16 h-16 text-muted mx-auto mb-4" />
                      <p className="text-textSecondary mb-4">No properties listed yet</p>
                      <Link to="/post-property">
                        <Button>Post Your First Property</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myProperties.map((property) => (
                        <div
                          key={property.id}
                          className="border border-muted rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-semibold text-textMain">{property.title}</h3>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${
                                property.status === 'published' || property.status === 'active'
                                  ? 'bg-primary/20 text-primary'
                                  : 'bg-accent text-accent'
                              }`}
                            >
                              {property.status || 'published'}
                            </span>
                          </div>
                          <p className="text-sm text-textSecondary mb-2">
                            {property.address?.city || property.city || 'N/A'}
                          </p>
                          <p className="text-lg font-bold text-primary mb-4">
                            {new Intl.NumberFormat('en-PK', {
                              style: 'currency',
                              currency: 'PKR',
                            }).format(property.price)}
                          </p>
                          <div className="flex gap-2">
                            <Link to={`/properties/${property.id}`} className="flex-1">
                              <Button variant="outline" size="sm" className="w-full">
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </Button>
                            </Link>
                            <Link to={`/post-property?edit=${property.id}`}>
                              <Button variant="outline" size="sm">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setDeleteModal({
                                  isOpen: true,
                                  type: 'property',
                                  id: property.id,
                                  title: property.title,
                                })
                              }
                            >
                              <Trash2 className="w-4 h-4 text-error" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* My Requests Tab */}
              {activeTab === 'requests' && (
                <div>
                  <h2 className="text-2xl font-bold text-textMain mb-6 flex items-center">
                    <Calendar className="w-6 h-6 mr-2" />
                    My Requests ({summaryCounts.activeRequests})
                  </h2>

                  {requestsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <LoadingSpinner size="md" />
                    </div>
                  ) : allRequests.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="w-16 h-16 text-muted mx-auto mb-4" />
                      <p className="text-textSecondary mb-4">No requests yet</p>
                      <div className="flex flex-wrap gap-3 justify-center">
                        <Link to="/rent">
                          <Button>Request Rental</Button>
                        </Link>
                        <Link to="/buy">
                          <Button>Make Purchase Offer</Button>
                        </Link>
                        <Link to="/request-construction">
                          <Button>Request Construction</Button>
                        </Link>
                        <Link to="/request-renovation">
                          <Button>Request Renovation</Button>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {allRequests.map((request) => (
                        <div
                          key={`${request.type}-${request.id}`}
                          className="border border-muted rounded-base p-4"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              {getRequestTypeIcon(request.type)}
                              <div>
                                <h3 className="font-semibold text-textMain">
                                  {getRequestTypeLabel(request.type)}
                                </h3>
                                <p className="text-sm text-textSecondary">
                                  {request.type === 'rental' && request.startDate && request.endDate
                                    ? `${formatDate(request.startDate)} - ${formatDate(request.endDate)}`
                                    : request.type === 'buySell' && request.offerAmount
                                    ? `Offer: ${new Intl.NumberFormat('en-PK', {
                                        style: 'currency',
                                        currency: 'PKR',
                                      }).format(request.offerAmount)}`
                                    : request.type === 'construction' && request.projectType
                                    ? `Type: ${request.projectType}`
                                    : request.type === 'renovation' && request.projectType
                                    ? `Type: ${request.projectType}`
                                    : 'N/A'}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${
                                request.status === 'Accepted' || request.status === 'Completed'
                                  ? 'bg-primary/20 text-primary'
                                  : request.status === 'Rejected' || request.status === 'Cancelled'
                                  ? 'bg-error text-error'
                                  : 'bg-accent text-accent'
                              }`}
                            >
                              {request.status || 'Pending'}
                            </span>
                          </div>
                          {request.message && (
                            <p className="text-sm text-textSecondary mt-2">{request.message}</p>
                          )}
                          {request.propertyId && (
                            <Link to={`/properties/${request.propertyId}`} className="mt-3 inline-block">
                              <Button variant="outline" size="sm">
                                View Property
                              </Button>
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* My Chats Tab */}
              {activeTab === 'chats' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-textMain flex items-center">
                      <MessageCircle className="w-6 h-6 mr-2" />
                      My Chats
                    </h2>
                    <Link to="/chats">
                      <Button>View All Chats</Button>
                    </Link>
                  </div>

                  {chatsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <LoadingSpinner size="md" />
                    </div>
                  ) : activeChats.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle className="w-16 h-16 text-muted mx-auto mb-4" />
                      <p className="text-textSecondary mb-4">No active chats yet</p>
                      <Link to="/chats">
                        <Button>Start a Chat</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeChats.map((chat) => (
                        <Link
                          key={chat.id}
                          to={`/chats?chatId=${chat.id}`}
                          className="block border border-muted rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <MessageCircle className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-textMain">
                                  {chat.otherParticipantName || 'Unknown User'}
                                </h3>
                                <p className="text-sm text-textSecondary">
                                  {formatDate(chat.updatedAt)}
                                </p>
                              </div>
                            </div>
                            {chat.unreadFor?.[user.uid] > 0 && (
                              <span className="bg-primary text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                                {chat.unreadFor[user.uid]}
                              </span>
                            )}
                          </div>
                        </Link>
                      ))}
                      <Link to="/chats">
                        <Button variant="outline" className="w-full">
                          View All Chats
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* My Reviews Tab */}
              {activeTab === 'reviews' && (
                <div>
                  <h2 className="text-2xl font-bold text-textMain mb-6 flex items-center">
                    <Star className="w-6 h-6 mr-2" />
                    My Reviews ({myReviews.length})
                  </h2>

                  {reviewsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <LoadingSpinner size="md" />
                    </div>
                  ) : myReviews.length === 0 ? (
                    <div className="text-center py-12">
                      <Star className="w-16 h-16 text-muted mx-auto mb-4" />
                      <p className="text-textSecondary">No reviews written yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myReviews.map((review) => (
                        <div key={review.id} className="border border-muted rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-5 h-5 ${
                                      i < review.rating
                                        ? 'text-accent fill-current'
                                        : 'text-muted'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-textSecondary capitalize">
                                {review.targetType}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-textSecondary">
                                {formatDate(review.createdAt)}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setDeleteModal({
                                    isOpen: true,
                                    type: 'review',
                                    id: review.id,
                                    title: `Review for ${review.targetType}`,
                                  })
                                }
                              >
                                <Trash2 className="w-4 h-4 text-error" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-textSecondary mt-2">{review.comment}</p>
                          {review.targetId && (
                            <Link
                              to={
                                review.targetType === 'property'
                                  ? `/properties/${review.targetId}`
                                  : review.targetType === 'construction'
                                  ? `/construction-providers/${review.targetId}`
                                  : `/renovation-providers/${review.targetId}`
                              }
                              className="mt-3 inline-block"
                            >
                              <Button variant="outline" size="sm">
                                View {review.targetType === 'property' ? 'Property' : 'Provider'}
                              </Button>
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-textMain flex items-center">
                      <Bell className="w-6 h-6 mr-2" />
                      Notifications ({unreadNotificationCount} unread)
                    </h2>
                    <Link to="/notifications">
                      <Button variant="outline">View All</Button>
                    </Link>
                  </div>

                  <div className="text-center py-12">
                    <Bell className="w-16 h-16 text-muted mx-auto mb-4" />
                    <p className="text-textSecondary mb-4">View all notifications</p>
                    <Link to="/notifications">
                      <Button>Go to Notifications</Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, type: null, id: null, title: null })}
        title="Confirm Delete"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-textSecondary">
            Are you sure you want to delete {deleteModal.title}? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ isOpen: false, type: null, id: null, title: null })}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteModal.type === 'property') {
                  handleDeleteProperty(deleteModal.id);
                } else if (deleteModal.type === 'review') {
                  handleDeleteReview(deleteModal.id);
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MyAccount;
