import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Home,
  Calendar,
  DollarSign,
  Wrench,
  Building2,
  MessageCircle,
  Star,
  Bell,
  Edit2,
  Save,
  LogOut,
  Eye,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import userService from '../services/userService';
import rentalRequestService from '../services/rentalRequestService';
import buySellRequestService from '../services/buySellRequestService';
import propertyService from '../services/propertyService';
import reviewsService from '../services/reviewsService';
import notificationService from '../services/notificationService';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';

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

  // Counts state
  const [counts, setCounts] = useState({
    properties: 0,
    rentalRequests: 0,
    buySellRequests: 0,
    constructionRequests: 0,
    renovationRequests: 0,
    chats: 0,
    reviews: 0,
    notifications: 0,
  });

  // Data state
  const [myProperties, setMyProperties] = useState([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [rentalRequestsSent, setRentalRequestsSent] = useState([]);
  const [buySellRequestsSent, setBuySellRequestsSent] = useState([]);
  const [constructionRequests, setConstructionRequests] = useState([]);
  const [renovationRequests, setRenovationRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [myReviews, setMyReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Tabs configuration
  const tabs = [
    { key: 'profile', label: 'Profile Info', icon: User, count: null },
    { key: 'properties', label: 'My Properties', icon: Home, count: counts.properties },
    { key: 'rental-buysell', label: 'Rental/Buy-Sell', icon: DollarSign, count: counts.rentalRequests + counts.buySellRequests },
    { key: 'construction', label: 'Construction', icon: Building2, count: counts.constructionRequests },
    { key: 'renovation', label: 'Renovation', icon: Wrench, count: counts.renovationRequests },
    { key: 'chats', label: 'My Chats', icon: MessageCircle, count: counts.chats },
    { key: 'reviews', label: 'My Reviews', icon: Star, count: counts.reviews },
    { key: 'notifications', label: 'Notifications', icon: Bell, count: counts.notifications },
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
                : userProfile.address?.line1 || '',
          });
        } catch (error) {
          console.error('Error fetching profile:', error);
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

  // Fetch counts
  useEffect(() => {
    if (!user || authLoading) return;

    const fetchCounts = async () => {
      try {
        // Properties count
        const propertiesQuery = query(
          collection(db, 'properties'),
          where('ownerId', '==', user.uid)
        );
        const propertiesSnapshot = await getDocs(propertiesQuery);
        const propertiesCount = propertiesSnapshot.size;

        // Rental requests count
        const rentalRequests = await rentalRequestService.getByUser(user.uid);
        const rentalCount = rentalRequests.length;

        // Buy/Sell requests count
        const buySellRequests = await buySellRequestService.getByUser(user.uid);
        const buySellCount = buySellRequests.length;

        // Construction projects count
        const constructionQuery = query(
          collection(db, 'constructionProjects'),
          where('userId', '==', user.uid)
        );
        const constructionSnapshot = await getDocs(constructionQuery);
        const constructionCount = constructionSnapshot.size;

        // Renovation projects count
        const renovationQuery = query(
          collection(db, 'renovationProjects'),
          where('userId', '==', user.uid)
        );
        const renovationSnapshot = await getDocs(renovationQuery);
        const renovationCount = renovationSnapshot.size;

        // Chat messages count (check if chat document exists)
        const chatDoc = await getDoc(doc(db, 'supportChats', user.uid));
        const chatCount = chatDoc.exists() ? 1 : 0;

        // Reviews count
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('reviewerId', '==', user.uid)
        );
        const reviewsSnapshot = await getDocs(reviewsQuery);
        const reviewsCount = reviewsSnapshot.size;

        // Notifications count
        const unreadCount = await notificationService.getUnreadCount(user.uid);

        setCounts({
          properties: propertiesCount,
          rentalRequests: rentalCount,
          buySellRequests: buySellCount,
          constructionRequests: constructionCount,
          renovationRequests: renovationCount,
          chats: chatCount,
          reviews: reviewsCount,
          notifications: unreadCount,
        });
      } catch (error) {
        console.error('Error fetching counts:', error);
      }
    };

    fetchCounts();
  }, [user, authLoading]);

  // Fetch data based on active tab
  useEffect(() => {
    if (!user || authLoading || !activeTab) return;

    const fetchTabData = async () => {
      try {
        if (activeTab === 'properties') {
          setPropertiesLoading(true);
          const propertiesQuery = query(
            collection(db, 'properties'),
            where('ownerId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const snapshot = await getDocs(propertiesQuery);
          const properties = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setMyProperties(properties);
          setPropertiesLoading(false);
        } else if (activeTab === 'rental-buysell') {
          setRequestsLoading(true);
          const [rentals, buySells] = await Promise.all([
            rentalRequestService.getByUser(user.uid),
            buySellRequestService.getByUser(user.uid),
          ]);

          // Fetch property details
          const rentalsWithProps = await Promise.all(
            rentals.map(async (req) => {
              try {
                const property = await propertyService.getById(req.propertyId, false);
                return { ...req, property };
              } catch {
                return { ...req, property: null };
              }
            })
          );

          const buySellsWithProps = await Promise.all(
            buySells.map(async (req) => {
              try {
                const property = await propertyService.getById(req.propertyId, false);
                return { ...req, property };
              } catch {
                return { ...req, property: null };
              }
            })
          );

          setRentalRequestsSent(rentalsWithProps);
          setBuySellRequestsSent(buySellsWithProps);
          setRequestsLoading(false);
        } else if (activeTab === 'construction') {
          setRequestsLoading(true);
          const constructionQuery = query(
            collection(db, 'constructionProjects'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const snapshot = await getDocs(constructionQuery);
          const projects = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setConstructionRequests(projects);
          setRequestsLoading(false);
        } else if (activeTab === 'renovation') {
          setRequestsLoading(true);
          const renovationQuery = query(
            collection(db, 'renovationProjects'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const snapshot = await getDocs(renovationQuery);
          const projects = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setRenovationRequests(projects);
          setRequestsLoading(false);
        } else if (activeTab === 'chats') {
          setChatsLoading(true);
          const messagesRef = collection(db, 'supportChats', user.uid, 'messages');
          const messagesQuery = query(messagesRef, orderBy('createdAt', 'desc'));
          const unsubscribe = onSnapshot(
            messagesQuery,
            (snapshot) => {
              const messages = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }));
              setChatMessages(messages);
              setChatsLoading(false);
            },
            (error) => {
              console.error('Error fetching chat messages:', error);
              setChatsLoading(false);
            }
          );
          return () => unsubscribe();
        } else if (activeTab === 'reviews') {
          setReviewsLoading(true);
          const reviewsQuery = query(
            collection(db, 'reviews'),
            where('reviewerId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const snapshot = await getDocs(reviewsQuery);
          const reviews = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setMyReviews(reviews);
          setReviewsLoading(false);
        } else if (activeTab === 'notifications') {
          setNotificationsLoading(true);
          const notificationsQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const unsubscribe = onSnapshot(
            notificationsQuery,
            (snapshot) => {
              const notifs = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }));
              setNotifications(notifs);
              setNotificationsLoading(false);
            },
            (error) => {
              console.error('Error fetching notifications:', error);
              setNotificationsLoading(false);
            }
          );
          return () => unsubscribe();
        }
      } catch (error) {
        console.error('Error fetching tab data:', error);
        if (activeTab === 'properties') setPropertiesLoading(false);
        if (activeTab === 'rental-buysell' || activeTab === 'construction' || activeTab === 'renovation') setRequestsLoading(false);
        if (activeTab === 'chats') setChatsLoading(false);
        if (activeTab === 'reviews') setReviewsLoading(false);
        if (activeTab === 'notifications') setNotificationsLoading(false);
      }
    };

    fetchTabData();
  }, [user, authLoading, activeTab]);

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

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully.');
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out.');
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

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">My Account</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-24">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{tab.label}</span>
                      </div>
                      {tab.count !== null && tab.count > 0 && (
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            isActive
                              ? 'bg-white text-blue-600'
                              : 'bg-blue-100 text-blue-600'
                          }`}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Log Out
                </Button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Profile Info Tab */}
              {activeTab === 'profile' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                      <User className="w-6 h-6 mr-2" />
                      Profile Information
                    </h2>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      {isEditing ? 'Cancel' : 'Edit'} <Edit2 className="w-4 h-4 ml-2" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="displayName"
                        value={profile.displayName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full px-4 py-2 border rounded-lg ${
                          errors.displayName ? 'border-red-500' : 'border-gray-300'
                        } ${!isEditing ? 'bg-gray-100' : ''}`}
                      />
                      {errors.displayName && (
                        <p className="text-red-500 text-xs mt-1">{errors.displayName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profile.email}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        name="phone"
                        value={profile.phone}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full px-4 py-2 border rounded-lg ${
                          errors.phone ? 'border-red-500' : 'border-gray-300'
                        } ${!isEditing ? 'bg-gray-100' : ''}`}
                      />
                      {errors.phone && (
                        <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <textarea
                        name="address"
                        value={profile.address}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        rows="3"
                        className={`w-full px-4 py-2 border rounded-lg ${
                          errors.address ? 'border-red-500' : 'border-gray-300'
                        } ${!isEditing ? 'bg-gray-100' : ''}`}
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
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                      <Home className="w-6 h-6 mr-2" />
                      My Properties ({counts.properties})
                    </h2>
                    <Link to="/post-property">
                      <Button>Post New Property</Button>
                    </Link>
                  </div>

                  {propertiesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <LoadingSpinner size="md" />
                    </div>
                  ) : myProperties.length === 0 ? (
                    <div className="text-center py-12">
                      <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">No properties listed yet</p>
                      <Link to="/post-property">
                        <Button>Post Your First Property</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myProperties.map((property) => (
                        <div
                          key={property.id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {property.title}
                            </h3>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${
                                property.status === 'published' || property.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {property.status || 'published'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{property.city}</p>
                          <p className="text-lg font-bold text-blue-600 mb-4">
                            {new Intl.NumberFormat('en-PK', {
                              style: 'currency',
                              currency: 'PKR',
                            }).format(property.price)}
                          </p>
                          <div className="flex gap-2">
                            <Link
                              to={`/properties/${property.id}`}
                              className="flex-1"
                            >
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
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Rental/Buy-Sell Requests Tab */}
              {activeTab === 'rental-buysell' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <DollarSign className="w-6 h-6 mr-2" />
                    Rental & Buy-Sell Requests
                  </h2>

                  {requestsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <LoadingSpinner size="md" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Rental Requests */}
                      {rentalRequestsSent.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Calendar className="w-5 h-5 mr-2" />
                            Rental Requests ({rentalRequestsSent.length})
                          </h3>
                          <div className="space-y-3">
                            {rentalRequestsSent.map((request) => (
                              <div
                                key={request.id}
                                className="border border-gray-200 rounded-lg p-4"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900">
                                      {request.property?.title || 'Property'}
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                      {formatDate(request.startDate)} - {formatDate(request.endDate)}
                                    </p>
                                  </div>
                                  <span
                                    className={`px-2 py-1 text-xs font-medium rounded ${
                                      request.status === 'Accepted'
                                        ? 'bg-green-100 text-green-800'
                                        : request.status === 'Rejected'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                    }`}
                                  >
                                    {request.status}
                                  </span>
                                </div>
                                {request.message && (
                                  <p className="text-sm text-gray-700 mt-2">{request.message}</p>
                                )}
                                <Link to={`/properties/${request.propertyId}`}>
                                  <Button variant="outline" size="sm" className="mt-3">
                                    View Property
                                  </Button>
                                </Link>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Buy/Sell Requests */}
                      {buySellRequestsSent.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <DollarSign className="w-5 h-5 mr-2" />
                            Purchase Offers ({buySellRequestsSent.length})
                          </h3>
                          <div className="space-y-3">
                            {buySellRequestsSent.map((request) => (
                              <div
                                key={request.id}
                                className="border border-gray-200 rounded-lg p-4"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900">
                                      {request.property?.title || 'Property'}
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                      Offer: {new Intl.NumberFormat('en-PK', {
                                        style: 'currency',
                                        currency: 'PKR',
                                      }).format(request.offerAmount)}
                                    </p>
                                  </div>
                                  <span
                                    className={`px-2 py-1 text-xs font-medium rounded ${
                                      request.status === 'Accepted'
                                        ? 'bg-green-100 text-green-800'
                                        : request.status === 'Rejected'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                    }`}
                                  >
                                    {request.status}
                                  </span>
                                </div>
                                {request.message && (
                                  <p className="text-sm text-gray-700 mt-2">{request.message}</p>
                                )}
                                <Link to={`/properties/${request.propertyId}`}>
                                  <Button variant="outline" size="sm" className="mt-3">
                                    View Property
                                  </Button>
                                </Link>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {rentalRequestsSent.length === 0 && buySellRequestsSent.length === 0 && (
                        <div className="text-center py-12">
                          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">No requests sent yet</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Construction Requests Tab */}
              {activeTab === 'construction' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <Building2 className="w-6 h-6 mr-2" />
                    Construction Requests ({counts.constructionRequests})
                  </h2>

                  {requestsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <LoadingSpinner size="md" />
                    </div>
                  ) : constructionRequests.length === 0 ? (
                    <div className="text-center py-12">
                      <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">No construction requests yet</p>
                      <Link to="/request-construction">
                        <Button>Request Construction Service</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {constructionRequests.map((project) => (
                        <div
                          key={project.id}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">Project #{project.id.slice(0, 8)}</h3>
                              <p className="text-sm text-gray-600">
                                Budget: {new Intl.NumberFormat('en-PK', {
                                  style: 'currency',
                                  currency: 'PKR',
                                }).format(project.budget)}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${
                                project.status === 'Completed'
                                  ? 'bg-green-100 text-green-800'
                                  : project.status === 'In Progress'
                                    ? 'bg-blue-100 text-blue-800'
                                    : project.status === 'Accepted'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {project.status || 'Pending'}
                            </span>
                          </div>
                          {project.description && (
                            <p className="text-sm text-gray-700 mt-2">{project.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Created: {formatDate(project.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Renovation Requests Tab */}
              {activeTab === 'renovation' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <Wrench className="w-6 h-6 mr-2" />
                    Renovation Requests ({counts.renovationRequests})
                  </h2>

                  {requestsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <LoadingSpinner size="md" />
                    </div>
                  ) : renovationRequests.length === 0 ? (
                    <div className="text-center py-12">
                      <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">No renovation requests yet</p>
                      <Link to="/request-renovation">
                        <Button>Request Renovation Service</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {renovationRequests.map((project) => (
                        <div
                          key={project.id}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">Project #{project.id.slice(0, 8)}</h3>
                              <p className="text-sm text-gray-600">
                                Budget: {new Intl.NumberFormat('en-PK', {
                                  style: 'currency',
                                  currency: 'PKR',
                                }).format(project.budget)}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${
                                project.status === 'Completed'
                                  ? 'bg-green-100 text-green-800'
                                  : project.status === 'In Progress'
                                    ? 'bg-blue-100 text-blue-800'
                                    : project.status === 'Accepted'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {project.status || 'Pending'}
                            </span>
                          </div>
                          {project.description && (
                            <p className="text-sm text-gray-700 mt-2">{project.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Created: {formatDate(project.createdAt)}
                          </p>
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
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                      <MessageCircle className="w-6 h-6 mr-2" />
                      My Chats
                    </h2>
                    <Link to="/chatbot">
                      <Button>Open Support Chat</Button>
                    </Link>
                  </div>

                  {chatsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <LoadingSpinner size="md" />
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">No chat messages yet</p>
                      <Link to="/chatbot">
                        <Button>Start a Chat</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chatMessages.slice(0, 10).map((message) => (
                        <div
                          key={message.id}
                          className={`border rounded-lg p-4 ${
                            message.isAdmin
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="font-medium text-gray-900">
                              {message.isAdmin ? 'Admin' : 'You'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(message.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{message.text}</p>
                        </div>
                      ))}
                      <Link to="/chatbot">
                        <Button variant="outline" className="w-full">
                          View All Messages
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* My Reviews Tab */}
              {activeTab === 'reviews' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <Star className="w-6 h-6 mr-2" />
                    My Reviews ({counts.reviews})
                  </h2>

                  {reviewsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <LoadingSpinner size="md" />
                    </div>
                  ) : myReviews.length === 0 ? (
                    <div className="text-center py-12">
                      <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No reviews written yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myReviews.map((review) => (
                        <div
                          key={review.id}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-5 h-5 ${
                                      i < review.rating
                                        ? 'text-yellow-400 fill-current'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-gray-600">
                                {review.targetType === 'property' ? 'Property' : review.targetType === 'construction' ? 'Construction' : 'Renovation'}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(review.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mt-2">{review.comment}</p>
                          <Link
                            to={
                              review.targetType === 'property'
                                ? `/properties/${review.targetId}`
                                : review.targetType === 'construction'
                                  ? `/construction-providers/${review.targetId}`
                                  : `/renovation-providers/${review.targetId}`
                            }
                          >
                            <Button variant="outline" size="sm" className="mt-3">
                              View {review.targetType === 'property' ? 'Property' : 'Provider'}
                            </Button>
                          </Link>
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
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                      <Bell className="w-6 h-6 mr-2" />
                      Notifications ({counts.notifications} unread)
                    </h2>
                    <Link to="/notifications">
                      <Button variant="outline">View All</Button>
                    </Link>
                  </div>

                  {notificationsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <LoadingSpinner size="md" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-12">
                      <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No notifications yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.slice(0, 10).map((notification) => (
                        <div
                          key={notification.id}
                          className={`border rounded-lg p-4 ${
                            !notification.read
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {formatDate(notification.createdAt)}
                          </p>
                          {notification.link && (
                            <Link to={notification.link}>
                              <Button variant="outline" size="sm" className="mt-3">
                                View Details
                              </Button>
                            </Link>
                          )}
                        </div>
                      ))}
                      <Link to="/notifications">
                        <Button variant="outline" className="w-full">
                          View All Notifications
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyAccount;
