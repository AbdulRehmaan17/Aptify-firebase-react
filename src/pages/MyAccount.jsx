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
  X,
  Plus,
  Search,
  Building2,
  Calendar,
  Settings,
  Mail,
  Phone,
  MapPin,
  Eye,
  Trash2,
  Wrench,
  Hammer,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import userService from '../services/userService';
import { getSafeAvatarUrl, isValidImageUrl } from '../utils/avatarHelpers';
import propertyService from '../services/propertyService';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  getDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
// FIXED: Imports preserved - components handle blocked collections gracefully
import RegisterAsRenovator from './Dashboard/sections/RegisterAsRenovator';
import RegisterAsConstructor from './Dashboard/sections/RegisterAsConstructor';

/**
 * MyAccount Component
 * Main user account dashboard with profile, listings, requests, and settings
 */
const MyAccount = () => {
  const navigate = useNavigate();
  const { currentUser, userProfile: authUserProfile, loading: authLoading, currentUserRole, isApprovedProvider } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileLoading, setProfileLoading] = useState(true);

  // Profile state
  const [profile, setProfile] = useState({
    displayName: '',
    email: '',
    phone: '',
    address: '',
    photoURL: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});

  // Data state
  const [myProperties, setMyProperties] = useState([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [chats, setChats] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  
  // Provider approval status
  const [providerStatus, setProviderStatus] = useState({
    renovator: null, // 'pending', 'approved', 'rejected', null
    constructor: null,
  });

  // Summary counts
  const [summaryCounts, setSummaryCounts] = useState({
    properties: 0,
    requests: 0,
    reviews: 0,
    chats: 0,
  });

  // Tabs configuration
  // FIXED: All tabs preserved - blocked collections handled gracefully with try/catch
  const tabs = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'properties', label: 'My Listings', icon: Home },
    { key: 'my-projects', label: 'My Projects', icon: Building2 },
    { key: 'requests', label: 'Service Requests', icon: Calendar },
    { key: 'reviews', label: 'My Reviews', icon: Star },
    { key: 'messages', label: 'Messages', icon: MessageCircle },
    // Show dashboard only if role matches AND isApprovedProvider is true
    ...(currentUserRole === 'renovator' && isApprovedProvider
      ? [{ key: 'renovator-dashboard', label: 'Renovator Panel', icon: Wrench }]
      : []),
    ...(currentUserRole === 'constructor' && isApprovedProvider
      ? [{ key: 'constructor-dashboard', label: 'Constructor Panel', icon: Hammer }]
      : []),
    { key: 'register-renovator', label: 'Register as Renovator', icon: Wrench },
    { key: 'register-constructor', label: 'Register as Constructor', icon: Hammer },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  // Fetch user profile
  useEffect(() => {
    if (authLoading || !currentUser?.uid) {
      return;
    }

    let mounted = true;

    const fetchProfile = async () => {
      try {
        setProfileLoading(true);
        const userProfile = await userService.getProfile(currentUser.uid);

        if (mounted) {
          setProfile({
            displayName: userProfile?.displayName || userProfile?.name || currentUser?.displayName || '',
            email: userProfile?.email || currentUser?.email || '',
            phone: userProfile?.phone || userProfile?.phoneNumber || '',
            address:
              typeof userProfile?.address === 'string'
                ? userProfile.address
                : userProfile?.address?.line1 || userProfile?.address || '',
            // Avatar fallback order:
            // 1) Firestore profile photoURL
            // 2) Firebase Auth currentUser.photoURL (e.g. Google avatar)
            // 3) Empty (handled by UI default icon)
            photoURL: userProfile?.photoURL || currentUser?.photoURL || '',
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        if (mounted && !error.message?.includes('not found')) {
          toast.error('Failed to load profile');
        }
        // Set default values from auth user
        if (mounted) {
          setProfile({
            displayName: currentUser?.displayName || currentUser?.email?.split('@')[0] || '',
            email: currentUser?.email || '',
            phone: '',
            address: '',
            photoURL: currentUser?.photoURL || '',
          });
        }
      } finally {
        if (mounted) {
          setProfileLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      mounted = false;
    };
  }, [authLoading, currentUser]);

  // Fetch property count for summary (always runs, includes both sale and rent)
  useEffect(() => {
    if (!currentUser?.uid || !db) return;

    try {
      // Query all properties owned by user (includes both sale and rent)
      const propertiesCountQuery = query(
        collection(db, 'properties'),
        where('ownerId', '==', currentUser.uid)
      );

      const unsubscribe = onSnapshot(
        propertiesCountQuery,
        (snapshot) => {
          // Get all properties, including both type: 'sale' and type: 'rent'
          const allProperties = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          
          // Remove duplicates by ID (shouldn't happen, but safety check)
          const uniqueProperties = Array.from(
            new Map(allProperties.map((p) => [p.id, p])).values()
          );

          // Update summary count with total properties (sale + rent)
          setSummaryCounts((prev) => ({ ...prev, properties: uniqueProperties.length }));
        },
        (error) => {
          console.error('Error fetching property count:', error);
          // Handle permission errors gracefully
          if (error.code === 'permission-denied') {
            console.warn('Permission denied - user may not have access to properties');
            setSummaryCounts((prev) => ({ ...prev, properties: 0 }));
            return;
          }
          // Set count to 0 on error
          setSummaryCounts((prev) => ({ ...prev, properties: 0 }));
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up property count listener:', error);
      setSummaryCounts((prev) => ({ ...prev, properties: 0 }));
    }
  }, [currentUser?.uid, db]);

  // Fetch user properties (for properties tab only)
  useEffect(() => {
    if (!currentUser?.uid || !db || activeTab !== 'properties') {
      // Clear properties when not on properties tab to save memory
      if (activeTab !== 'properties') {
        setMyProperties([]);
      }
      return;
    }

    setPropertiesLoading(true);

    try {
      const propertiesQuery = query(
        collection(db, 'properties'),
        where('ownerId', '==', currentUser.uid),
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
          console.error('Error fetching properties:', error);
          // FIXED: Handle permission errors gracefully
          if (error.code === 'permission-denied') {
            console.warn('Permission denied - user may not have access to properties');
            setMyProperties([]);
            setPropertiesLoading(false);
            return;
          }
          // Fallback without orderBy for index errors
          if (error.code === 'failed-precondition') {
            const fallbackQuery = query(
              collection(db, 'properties'),
              where('ownerId', '==', currentUser.uid)
            );
            // FIXED: Store unsubscribe for cleanup
            const fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              (snapshot) => {
                const properties = snapshot.docs.map((doc) => ({
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
                setMyProperties([]);
                setPropertiesLoading(false);
              }
            );
            // FIXED: Return cleanup function for fallback listener
            return () => fallbackUnsubscribe();
          } else {
            setMyProperties([]);
            setPropertiesLoading(false);
          }
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up properties listener:', error);
      setPropertiesLoading(false);
    }
  }, [currentUser?.uid, activeTab, db]);

  // Fetch service requests
  // FIXED: Wrapped in try/catch to handle blocked collections gracefully
  useEffect(() => {
    if (!currentUser?.uid || !db || activeTab !== 'requests') {
      setServiceRequests([]);
      setRequestsLoading(false);
      return;
    }

    setRequestsLoading(true);

    const fetchRequests = async () => {
      try {
        // FIXED: These collections are blocked, but we try anyway and handle gracefully
        const collections = ['rentalRequests', 'buySellRequests', 'constructionProjects', 'renovationProjects'];
        const allRequests = [];

        for (const colName of collections) {
          try {
            // STABILIZED: Remove orderBy from Firestore query to avoid index requirement
            // Sorting is done client-side after fetching
            const q = query(
              collection(db, colName),
              where('userId', '==', currentUser.uid)
            );
            const snapshot = await getDocs(q);
            snapshot.docs.forEach((doc) => {
              allRequests.push({
                id: doc.id,
                type: colName,
                ...doc.data(),
              });
            });
          } catch (err) {
            // STABILIZED: Handle errors gracefully without fallback retries
            if (err.code === 'permission-denied') {
              // Silently skip blocked collections
              continue;
            }
            // Log other errors but continue processing other collections
            if (import.meta.env.DEV) {
              console.warn(`Error fetching ${colName}:`, err.message);
            }
          }
        }

        // Sort by date
        allRequests.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return bTime - aTime;
        });

        setServiceRequests(allRequests);
        setSummaryCounts((prev) => ({ ...prev, requests: allRequests.length }));
        setRequestsLoading(false);
      } catch (error) {
        console.error('Error fetching service requests:', error);
        // FIXED: Always set empty array on error to prevent blank screen
        setServiceRequests([]);
        setSummaryCounts((prev) => ({ ...prev, requests: 0 }));
        setRequestsLoading(false);
      }
    };

    fetchRequests();
  }, [currentUser?.uid, activeTab, db]);

  // Fetch reviews
  // FIXED: Wrapped in try/catch to handle blocked collection gracefully
  useEffect(() => {
    if (!currentUser?.uid || !db || activeTab !== 'reviews') {
      setReviews([]);
      setReviewsLoading(false);
      return;
    }

    setReviewsLoading(true);

    try {
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('reviewerId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        reviewsQuery,
        (snapshot) => {
          const reviewsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setReviews(reviewsData);
          setSummaryCounts((prev) => ({ ...prev, reviews: reviewsData.length }));
          setReviewsLoading(false);
        },
        (error) => {
          // FIXED: Handle permission denied gracefully
          if (error.code === 'permission-denied') {
            console.warn('Reviews collection is blocked by Firestore rules');
          } else {
            console.error('Error fetching reviews:', error);
          }
          // FIXED: Always set empty array to prevent blank screen
          setReviews([]);
          setSummaryCounts((prev) => ({ ...prev, reviews: 0 }));
          setReviewsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up reviews listener:', error);
      // FIXED: Always set empty array to prevent blank screen
      setReviews([]);
      setSummaryCounts((prev) => ({ ...prev, reviews: 0 }));
      setReviewsLoading(false);
    }
  }, [currentUser?.uid, activeTab, db]);

  // Fetch chats
  // FIXED: Wrapped in try/catch to handle blocked collection gracefully
  useEffect(() => {
    if (!currentUser?.uid || !db || activeTab !== 'messages') {
      setChats([]);
      setChatsLoading(false);
      return;
    }

    setChatsLoading(true);

    try {
      const chatsQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', currentUser.uid)
      );

      const unsubscribe = onSnapshot(
        chatsQuery,
        (snapshot) => {
          const chatsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setChats(chatsData);
          setSummaryCounts((prev) => ({ ...prev, chats: chatsData.length }));
          setChatsLoading(false);
        },
        (error) => {
          // FIXED: Handle permission denied gracefully
          if (error.code === 'permission-denied') {
            console.warn('Chats collection is blocked by Firestore rules');
          } else {
            console.error('Error fetching chats:', error);
          }
          // FIXED: Always set empty array to prevent blank screen
          setChats([]);
          setSummaryCounts((prev) => ({ ...prev, chats: 0 }));
          setChatsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up chats listener:', error);
      // FIXED: Always set empty array to prevent blank screen
      setChats([]);
      setSummaryCounts((prev) => ({ ...prev, chats: 0 }));
      setChatsLoading(false);
    }
  }, [currentUser?.uid, activeTab, db]);

  // Profile handlers
  const validateForm = () => {
    const newErrors = {};
    if (!profile.displayName?.trim()) {
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

    if (!currentUser?.uid) {
      toast.error('User not authenticated.');
      return;
    }

    try {
      await userService.updateProfile(currentUser.uid, {
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

  // Loading state
  if (authLoading || (profileLoading && !profile.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold text-textMain mb-8">My Account</h1>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-card rounded-lg p-6 border border-borderColor">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-textSecondary">Properties</p>
                  <p className="text-3xl font-bold text-primary mt-2">{summaryCounts.properties}</p>
                </div>
                <Home className="w-12 h-12 text-primary opacity-20" />
              </div>
            </div>
            <div className="bg-card rounded-lg p-6 border border-borderColor">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-textSecondary">Requests</p>
                  <p className="text-3xl font-bold text-primary mt-2">{summaryCounts.requests}</p>
                </div>
                <Calendar className="w-12 h-12 text-primary opacity-20" />
              </div>
            </div>
            <div className="bg-card rounded-lg p-6 border border-borderColor">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-textSecondary">Reviews</p>
                  <p className="text-3xl font-bold text-primary mt-2">{summaryCounts.reviews}</p>
                </div>
                <Star className="w-12 h-12 text-primary opacity-20" />
              </div>
            </div>
            <div className="bg-card rounded-lg p-6 border border-borderColor">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-textSecondary">Messages</p>
                  <p className="text-3xl font-bold text-primary mt-2">{summaryCounts.chats}</p>
                </div>
                <MessageCircle className="w-12 h-12 text-primary opacity-20" />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Tabs */}
            <aside className="lg:col-span-1">
              <div className="bg-card rounded-lg p-4 border border-borderColor sticky top-24 overflow-auto max-h-[calc(100vh-8rem)]">
                <nav className="space-y-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-left ${
                          isActive
                            ? 'bg-primary text-white'
                            : 'text-textSecondary hover:bg-muted hover:text-textMain'
                        }`}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium flex-1">{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* Content Area */}
            <section className="lg:col-span-3">
              <div className="bg-card rounded-lg p-6 border border-borderColor min-h-[500px]">
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-textMain">Profile Information</h2>
                      {!isEditing && (
                        <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-textMain mb-2">
                            Display Name
                          </label>
                          <input
                            type="text"
                            name="displayName"
                            value={profile.displayName}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-borderColor rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-textMain"
                          />
                          {errors.displayName && (
                            <p className="mt-1 text-sm text-error">{errors.displayName}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-textMain mb-2">Email</label>
                          <input
                            type="email"
                            name="email"
                            value={profile.email}
                            disabled
                            className="w-full px-4 py-2 border border-borderColor rounded-lg bg-muted text-textSecondary cursor-not-allowed"
                          />
                          <p className="mt-1 text-xs text-textSecondary">Email cannot be changed</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-textMain mb-2">Phone</label>
                          <input
                            type="tel"
                            name="phone"
                            value={profile.phone}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-borderColor rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-textMain"
                          />
                          {errors.phone && (
                            <p className="mt-1 text-sm text-error">{errors.phone}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-textMain mb-2">Address</label>
                          <textarea
                            name="address"
                            value={profile.address}
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full px-4 py-2 border border-borderColor rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-textMain"
                          />
                        </div>

                        <div className="flex space-x-4">
                          <Button onClick={handleSave}>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsEditing(false);
                              setErrors({});
                            }}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center space-x-6">
                          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                            {(() => {
                              // PHASE 4: Guaranteed render strategy with resolvedAvatarUrl
                              const avatarUrl = getSafeAvatarUrl({
                                photoURL: profile.photoURL,
                                user: currentUser,
                                userProfile: authUserProfile,
                                displayName: profile.displayName,
                                email: profile.email
                              });
                              
                              // PHASE 3: Verify URL is valid before rendering
                              if (!isValidImageUrl(avatarUrl)) {
                                return <User className="w-12 h-12 text-primary" />;
                              }
                              
                              return (
                                <>
                                  <img
                                    key={avatarUrl} // Key ensures re-render when avatarUrl changes
                                    src={avatarUrl}
                                    alt={profile.displayName}
                                    className="w-24 h-24 rounded-full object-cover"
                                    onError={(e) => {
                                      // PHASE 3: Handle blocked images - hide and show fallback
                                      e.target.style.display = 'none';
                                      const icon = e.target.nextElementSibling;
                                      if (icon) {
                                        icon.classList.remove('hidden');
                                      }
                                    }}
                                    onLoad={() => {
                                      // Hide fallback icon if image loads successfully
                                      const icon = e.target.nextElementSibling;
                                      if (icon) icon.classList.add('hidden');
                                    }}
                                  />
                                  <User className="w-12 h-12 text-primary hidden" />
                                </>
                              );
                            })()}
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-textMain">
                              {profile.displayName || 'User'}
                            </h3>
                            <p className="text-textSecondary">{profile.email}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-borderColor">
                          <div className="flex items-start space-x-4">
                            <Mail className="w-5 h-5 text-primary mt-1" />
                            <div>
                              <p className="text-sm font-medium text-textSecondary">Email</p>
                              <p className="text-textMain">{profile.email || 'Not provided'}</p>
                            </div>
                          </div>

                          <div className="flex items-start space-x-4">
                            <Phone className="w-5 h-5 text-primary mt-1" />
                            <div>
                              <p className="text-sm font-medium text-textSecondary">Phone</p>
                              <p className="text-textMain">{profile.phone || 'Not provided'}</p>
                            </div>
                          </div>

                          <div className="flex items-start space-x-4 md:col-span-2">
                            <MapPin className="w-5 h-5 text-primary mt-1" />
                            <div>
                              <p className="text-sm font-medium text-textSecondary">Address</p>
                              <p className="text-textMain">{profile.address || 'Not provided'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Properties Tab */}
                {activeTab === 'properties' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-textMain">My Listings</h2>
                      <Link to="/post-property">
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Post New Property
                        </Button>
                      </Link>
                    </div>

                    {propertiesLoading ? (
                      <div className="flex justify-center py-12">
                        <LoadingSpinner />
                      </div>
                    ) : myProperties.length === 0 ? (
                      <div className="text-center py-12">
                        <Home className="w-16 h-16 text-muted mx-auto mb-4" />
                        <p className="text-textSecondary mb-4">You haven't posted any properties yet.</p>
                        <Link to="/post-property">
                          <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Post Your First Property
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {myProperties.map((property) => (
                          <div
                            key={property.id}
                            className="border border-borderColor rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-textMain mb-2">
                                  {property.title || property.name || 'Untitled Property'}
                                </h3>
                                <p className="text-textSecondary text-sm mb-2">
                                  {property.description?.substring(0, 150)}...
                                </p>
                                <div className="flex items-center space-x-4 text-sm text-textSecondary">
                                  <span>Price: ${property.price?.toLocaleString() || 'N/A'}</span>
                                  <span>Status: {property.status || 'draft'}</span>
                                </div>
                              </div>
                              <div className="flex space-x-2 ml-4">
                                <Link to={`/properties/${property.id}`}>
                                  <Button variant="outline" size="sm">
                                    <Eye className="w-4 h-4 mr-2" />
                                    View
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* My Projects Tab */}
                {activeTab === 'my-projects' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-textMain">My Projects</h2>
                      <Button onClick={() => navigate('/my-projects')} variant="outline">
                        View Full Page
                      </Button>
                    </div>
                    <p className="text-textSecondary mb-6">
                      View and manage all your service requests and projects in one place.
                    </p>
                    <Button onClick={() => navigate('/my-projects')} variant="primary" fullWidth>
                      <Building2 className="w-4 h-4 mr-2" />
                      Open My Projects
                    </Button>
                  </div>
                )}

                {/* Requests Tab */}
                {activeTab === 'requests' && (
                  <div>
                    <h2 className="text-2xl font-bold text-textMain mb-6">Service Requests</h2>

                    {requestsLoading ? (
                      <div className="flex justify-center py-12">
                        <LoadingSpinner />
                      </div>
                    ) : serviceRequests.length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="w-16 h-16 text-muted mx-auto mb-4" />
                        <p className="text-textSecondary">You have no service requests yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {serviceRequests.map((request) => (
                          <div
                            key={`${request.type}-${request.id}`}
                            className="border border-borderColor rounded-lg p-4"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Building2 className="w-5 h-5 text-primary" />
                                  <h3 className="font-semibold text-textMain">
                                    {request.type?.replace(/([A-Z])/g, ' $1').trim() || 'Request'}
                                  </h3>
                                </div>
                                <p className="text-textSecondary text-sm">
                                  Status: <span className="font-medium">{request.status || 'Pending'}</span>
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Reviews Tab */}
                {activeTab === 'reviews' && (
                  <div>
                    <h2 className="text-2xl font-bold text-textMain mb-6">My Reviews</h2>

                    {reviewsLoading ? (
                      <div className="flex justify-center py-12">
                        <LoadingSpinner />
                      </div>
                    ) : reviews.length === 0 ? (
                      <div className="text-center py-12">
                        <Star className="w-16 h-16 text-muted mx-auto mb-4" />
                        <p className="text-textSecondary">You haven't written any reviews yet.</p>
                        <p className="text-sm text-textSecondary mt-2">
                          Note: Reviews may be unavailable due to Firestore security rules.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {reviews.map((review) => (
                          <div key={review.id} className="border border-borderColor rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < (review.rating || 0)
                                          ? 'text-accent fill-current'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <p className="text-textMain mb-2">{review.comment || review.text || ''}</p>
                                <p className="text-xs text-textSecondary">
                                  {review.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Messages Tab */}
                {activeTab === 'messages' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-textMain">Messages</h2>
                      <Link to="/chats">
                        <Button variant="outline">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          View All Chats
                        </Button>
                      </Link>
                    </div>

                    {chatsLoading ? (
                      <div className="flex justify-center py-12">
                        <LoadingSpinner />
                      </div>
                    ) : chats.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageCircle className="w-16 h-16 text-muted mx-auto mb-4" />
                        <p className="text-textSecondary mb-4">You have no messages yet.</p>
                        <Link to="/chats">
                          <Button>Start a Conversation</Button>
                        </Link>
                        <p className="text-sm text-textSecondary mt-4">
                          Note: Messages may be unavailable due to Firestore security rules.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {chats.slice(0, 10).map((chat) => (
                          <Link
                            key={chat.id}
                            to={`/chat?chatId=${chat.id}`}
                            className="block border border-borderColor rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                <MessageCircle className="w-6 h-6 text-primary" />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-textMain">Chat #{chat.id.substring(0, 8)}</h3>
                                <p className="text-sm text-textSecondary">
                                  Last message: {chat.lastMessage?.substring(0, 50) || 'No messages yet'}
                                </p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Renovator Panel */}
                {activeTab === 'renovator-dashboard' && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-textMain">Renovator Panel</h2>
                    <p className="text-textSecondary">
                      Access your renovator dashboard, manage projects, and view requests.
                    </p>
                    <Button variant="primary" onClick={() => navigate('/renovator-dashboard')} icon={Wrench}>
                      Open Renovator Dashboard
                    </Button>
                  </div>
                )}

                {/* Constructor Panel */}
                {activeTab === 'constructor-dashboard' && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-textMain">Constructor Panel</h2>
                    <p className="text-textSecondary">
                      Access your constructor dashboard, manage projects, and view requests.
                    </p>
                    <Button variant="primary" onClick={() => navigate('/constructor/dashboard')} icon={Hammer}>
                      Open Constructor Dashboard
                    </Button>
                  </div>
                )}

                {/* Register as Renovator Tab */}
                {activeTab === 'register-renovator' && (
                  <RegisterAsRenovator />
                )}

                {/* Register as Constructor Tab */}
                {activeTab === 'register-constructor' && (
                  <RegisterAsConstructor />
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                  <div>
                    <h2 className="text-2xl font-bold text-textMain mb-6">Settings</h2>

                    <div className="space-y-6">
                      <div className="border border-borderColor rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-textMain mb-4">Account Settings</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-textMain mb-2">
                              Email Notifications
                            </label>
                            <p className="text-sm text-textSecondary mb-2">
                              Receive email updates about your properties and requests
                            </p>
                            <Button variant="outline" size="sm">
                              Enable Notifications
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="border border-borderColor rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-textMain mb-4">Privacy</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-textMain mb-2">
                              Profile Visibility
                            </label>
                            <p className="text-sm text-textSecondary">
                              Control who can see your profile information
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border border-red-200 rounded-lg p-6 bg-red-50">
                        <h3 className="text-lg font-semibold text-textMain mb-4">Danger Zone</h3>
                        <Button variant="danger" size="sm">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Account
                        </Button>
                        <p className="text-xs text-textSecondary mt-2">
                          This action cannot be undone. All your data will be permanently deleted.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyAccount;
