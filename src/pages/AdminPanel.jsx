import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Home,
  FileText,
  MessageSquare,
  MessageCircle,
  Bell,
  RefreshCw,
  Shield,
  ShieldOff,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Calendar,
  Search,
  Ban,
  Check,
  Image as ImageIcon,
  Clock,
  PlayCircle,
  Filter,
  Star,
  CreditCard,
} from 'lucide-react';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
  addDoc,
  writeBatch,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import notificationService from '../services/notificationService';
import propertyService from '../services/propertyService';
import reviewsService from '../services/reviewsService';
import transactionService from '../services/transactionService';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AdminPanel = () => {
  const { user, currentUser, currentUserRole, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    users: 0,
    properties: 0,
    providers: 0,
    requests: 0,
    supportChats: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [providers, setProviders] = useState([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [viewProfileModalOpen, setViewProfileModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [properties, setProperties] = useState([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [viewPropertyModalOpen, setViewPropertyModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [deletePropertyModalOpen, setDeletePropertyModalOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  const [propertySearch, setPropertySearch] = useState({ city: '', ownerEmail: '' });
  const [ownerEmails, setOwnerEmails] = useState({}); // Cache for owner emails
  const [allRequests, setAllRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [viewRequestModalOpen, setViewRequestModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestFilters, setRequestFilters] = useState({
    type: '',
    status: '',
    startDate: '',
    endDate: '',
  });
  const [userNames, setUserNames] = useState({}); // Cache for user names
  const [propertyTitles, setPropertyTitles] = useState({}); // Cache for property titles
  const [providerNames, setProviderNames] = useState({}); // Cache for provider names
  const [supportMessages, setSupportMessages] = useState([]);
  const [supportMessagesLoading, setSupportMessagesLoading] = useState(true);
  const [viewMessageModalOpen, setViewMessageModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [messageReplies, setMessageReplies] = useState({}); // Cache for replies by messageId
  const [deleteMessageModalOpen, setDeleteMessageModalOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [userEmails, setUserEmails] = useState({}); // Cache for user emails
  const [supportChats, setSupportChats] = useState([]);
  const [supportChatsLoading, setSupportChatsLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    target: 'all-users', // 'all-users', 'all-providers', 'single-uid'
    singleUid: '',
  });
  const [sendingNotifications, setSendingNotifications] = useState(false);
  const [notificationProgress, setNotificationProgress] = useState({ sent: 0, total: 0 });
  const [allNotifications, setAllNotifications] = useState([]);
  const [allNotificationsLoading, setAllNotificationsLoading] = useState(false);
  const [notificationFilters, setNotificationFilters] = useState({
    userId: '',
    type: '',
  });
  const [deleteNotificationModalOpen, setDeleteNotificationModalOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [allReviews, setAllReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewFilters, setReviewFilters] = useState({
    targetType: '',
    minRating: '',
  });
  const [deleteReviewModalOpen, setDeleteReviewModalOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [allTransactions, setAllTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionFilters, setTransactionFilters] = useState({
    status: '',
    targetType: '',
    userId: '',
  });

  // Fetch transactions when transactions tab is active
  useEffect(() => {
    if (activeTab !== 'transactions' || !db) return;

    setTransactionsLoading(true);
    const transactionsQuery = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      transactionsQuery,
      async (snapshot) => {
        const transactionsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllTransactions(transactionsData);

        // Fetch user names
        const namePromises = transactionsData.map(async (transaction) => {
          if (transaction.userId && !userNames[transaction.userId]) {
            try {
              const userDoc = await getDoc(doc(db, 'users', transaction.userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                setUserNames((prev) => ({
                  ...prev,
                  [transaction.userId]: userData.name || userData.displayName || 'Unknown',
                }));
              }
            } catch (error) {
              console.error(`Error fetching user ${transaction.userId}:`, error);
            }
          }
        });
        await Promise.all(namePromises);

        setTransactionsLoading(false);
      },
      (error) => {
        console.error('Error fetching transactions:', error);
        if (error.code === 'failed-precondition') {
          // Fallback without orderBy
          const fallbackQuery = query(collection(db, 'transactions'));
          const fallbackUnsubscribe = onSnapshot(
            fallbackQuery,
            async (snapshot) => {
              const transactionsData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }));
              transactionsData.sort((a, b) => {
                const aTime = a.createdAt?.toDate?.() || new Date(0);
                const bTime = b.createdAt?.toDate?.() || new Date(0);
                return bTime - aTime;
              });
              setAllTransactions(transactionsData);
              setTransactionsLoading(false);
            },
            (fallbackError) => {
              console.error('Error fetching transactions (fallback):', fallbackError);
              setTransactionsLoading(false);
            }
          );
          return () => fallbackUnsubscribe();
        } else {
          setTransactionsLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [activeTab, db, userNames]);

  // Fetch reviews when reviews tab is active
  useEffect(() => {
    if (activeTab !== 'reviews' || !db) return;

    setReviewsLoading(true);
    const reviewsQuery = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      reviewsQuery,
      async (snapshot) => {
        const reviewsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllReviews(reviewsData);

        // Fetch reviewer names
        const namePromises = reviewsData.map(async (review) => {
          if (review.reviewerId && !userNames[review.reviewerId]) {
            try {
              const userDoc = await getDoc(doc(db, 'users', review.reviewerId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                setUserNames((prev) => ({
                  ...prev,
                  [review.reviewerId]: userData.name || userData.displayName || 'Unknown',
                }));
              }
            } catch (error) {
              console.error(`Error fetching user ${review.reviewerId}:`, error);
            }
          }
        });
        await Promise.all(namePromises);

        setReviewsLoading(false);
      },
      (error) => {
        console.error('Error fetching reviews:', error);
        if (error.code === 'failed-precondition') {
          // Fallback without orderBy
          const fallbackQuery = query(collection(db, 'reviews'));
          const fallbackUnsubscribe = onSnapshot(
            fallbackQuery,
            async (snapshot) => {
              const reviewsData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }));
              reviewsData.sort((a, b) => {
                const aTime = a.createdAt?.toDate?.() || new Date(0);
                const bTime = b.createdAt?.toDate?.() || new Date(0);
                return bTime - aTime;
              });
              setAllReviews(reviewsData);
              setReviewsLoading(false);
            },
            (fallbackError) => {
              console.error('Error fetching reviews (fallback):', fallbackError);
              setReviewsLoading(false);
            }
          );
          return () => fallbackUnsubscribe();
        } else {
          setReviewsLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [activeTab, db, userNames]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Access denied if not logged in or not admin
  if (!user || !currentUser || currentUserRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-textMain mb-4">Access Denied</h1>
          <p className="text-textSecondary mb-6">You do not have permission to access this page.</p>
          <Link
            to="/auth"
            className="inline-block px-6 py-3 bg-primary text-white rounded-base hover:bg-primaryDark transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Tab configuration
  const tabs = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'users', label: 'Manage Users', icon: Users },
    { key: 'providers', label: 'Manage Providers', icon: Building2 },
    { key: 'properties', label: 'Manage Properties', icon: Home },
    { key: 'requests', label: 'Manage Requests', icon: FileText },
    { key: 'reviews', label: 'Manage Reviews', icon: Star },
    { key: 'transactions', label: 'Transactions', icon: CreditCard },
    { key: 'support-messages', label: 'Support Messages', icon: MessageSquare },
    { key: 'support-chats', label: 'Support Chats', icon: MessageCircle },
    { key: 'notifications', label: 'Send Notifications', icon: Bell },
    { key: 'manage-notifications', label: 'Manage Notifications', icon: Bell },
  ];

  // Fetch platform statistics
  const fetchStats = async () => {
    if (!db) return;

    setStatsLoading(true);
    try {
      // Fetch all counts in parallel
      const [
        usersSnapshot,
        propertiesSnapshot,
        providersSnapshot,
        renovationProjectsSnapshot,
        constructionProjectsSnapshot,
        supportMessagesSnapshot,
      ] = await Promise.allSettled([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'properties')),
        getDocs(query(collection(db, 'serviceProviders'), where('isApproved', '==', true))),
        getDocs(collection(db, 'renovationProjects')),
        getDocs(collection(db, 'constructionProjects')),
        getDocs(collection(db, 'supportMessages')),
      ]);

      // Extract counts, defaulting to 0 if collection doesn't exist or query fails
      const usersCount =
        usersSnapshot.status === 'fulfilled' ? usersSnapshot.value.size : 0;
      const propertiesCount =
        propertiesSnapshot.status === 'fulfilled' ? propertiesSnapshot.value.size : 0;
      const providersCount =
        providersSnapshot.status === 'fulfilled' ? providersSnapshot.value.size : 0;
      const renovationCount =
        renovationProjectsSnapshot.status === 'fulfilled'
          ? renovationProjectsSnapshot.value.size
          : 0;
      const constructionCount =
        constructionProjectsSnapshot.status === 'fulfilled'
          ? constructionProjectsSnapshot.value.size
          : 0;
      const requestsCount = renovationCount + constructionCount;
      const supportChatsCount =
        supportMessagesSnapshot.status === 'fulfilled' ? supportMessagesSnapshot.value.size : 0;

      setStats({
        users: usersCount,
        properties: propertiesCount,
        providers: providersCount,
        requests: requestsCount,
        supportChats: supportChatsCount,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set all to 0 on error
      setStats({
        users: 0,
        properties: 0,
        providers: 0,
        requests: 0,
        supportChats: 0,
      });
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch stats when Overview tab is active
  useEffect(() => {
    if (activeTab === 'overview' && db) {
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Real-time users listener for Manage Users tab
  useEffect(() => {
    if (activeTab !== 'users' || !db) {
      return;
    }

    setUsersLoading(true);
    try {
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(
        usersQuery,
        (snapshot) => {
          const usersList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setUsers(usersList);
          setUsersLoading(false);
        },
        (error) => {
          console.error('Error fetching users:', error);
          toast.error('Failed to load users');
          setUsersLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up users listener:', error);
      setUsersLoading(false);
    }
  }, [activeTab]);

  // Real-time providers listener for Manage Providers tab
  useEffect(() => {
    if (activeTab !== 'providers' || !db) {
      return;
    }

    setProvidersLoading(true);
    try {
      const providersQuery = query(
        collection(db, 'serviceProviders'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        providersQuery,
        (snapshot) => {
          const providersList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setProviders(providersList);
          setProvidersLoading(false);
        },
        (error) => {
          console.error('Error fetching providers:', error);
          // Fallback without orderBy if index doesn't exist
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            const fallbackQuery = query(collection(db, 'serviceProviders'));
            const fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              (snapshot) => {
                const providersList = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));
                // Sort client-side
                providersList.sort((a, b) => {
                  const aTime = a.createdAt?.toDate?.() || new Date(0);
                  const bTime = b.createdAt?.toDate?.() || new Date(0);
                  return bTime - aTime;
                });
                setProviders(providersList);
                setProvidersLoading(false);
              },
              (fallbackError) => {
                console.error('Error fetching providers (fallback):', fallbackError);
                toast.error('Failed to load providers');
                setProvidersLoading(false);
              }
            );
            return () => fallbackUnsubscribe();
          } else {
            toast.error('Failed to load providers');
            setProvidersLoading(false);
          }
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up providers listener:', error);
      setProvidersLoading(false);
    }
  }, [activeTab]);

  // Real-time properties listener for Manage Properties tab
  useEffect(() => {
    if (activeTab !== 'properties' || !db) {
      return;
    }

    setPropertiesLoading(true);
    try {
      const propertiesQuery = query(collection(db, 'properties'), orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(
        propertiesQuery,
        async (snapshot) => {
          const propertiesList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Fetch owner emails for properties
          const emailPromises = propertiesList.map(async (property) => {
            if (property.ownerId && !ownerEmails[property.ownerId]) {
              try {
                const userDoc = await getDoc(doc(db, 'users', property.ownerId));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  setOwnerEmails((prev) => ({
                    ...prev,
                    [property.ownerId]: userData.email || 'N/A',
                  }));
                  return { ownerId: property.ownerId, email: userData.email || 'N/A' };
                }
              } catch (error) {
                console.error(`Error fetching email for user ${property.ownerId}:`, error);
              }
            }
            return null;
          });

          await Promise.all(emailPromises);

          setProperties(propertiesList);
          setPropertiesLoading(false);
        },
        (error) => {
          console.error('Error fetching properties:', error);
          // Fallback without orderBy if index doesn't exist
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            const fallbackQuery = query(collection(db, 'properties'));
            const fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              async (snapshot) => {
                const propertiesList = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));
                // Sort client-side
                propertiesList.sort((a, b) => {
                  const aTime = a.createdAt?.toDate?.() || new Date(0);
                  const bTime = b.createdAt?.toDate?.() || new Date(0);
                  return bTime - aTime;
                });

                // Fetch owner emails
                const emailPromises = propertiesList.map(async (property) => {
                  if (property.ownerId && !ownerEmails[property.ownerId]) {
                    try {
                      const userDoc = await getDoc(doc(db, 'users', property.ownerId));
                      if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setOwnerEmails((prev) => ({
                          ...prev,
                          [property.ownerId]: userData.email || 'N/A',
                        }));
                      }
                    } catch (error) {
                      console.error(`Error fetching email for user ${property.ownerId}:`, error);
                    }
                  }
                });

                await Promise.all(emailPromises);

                setProperties(propertiesList);
                setPropertiesLoading(false);
              },
              (fallbackError) => {
                console.error('Error fetching properties (fallback):', fallbackError);
                toast.error('Failed to load properties');
                setPropertiesLoading(false);
              }
            );
            return () => fallbackUnsubscribe();
          } else {
            toast.error('Failed to load properties');
            setPropertiesLoading(false);
          }
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up properties listener:', error);
      setPropertiesLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Real-time requests listener for Manage Requests tab
  useEffect(() => {
    if (activeTab !== 'requests' || !db) {
      return;
    }

    setRequestsLoading(true);
    const unsubscribes = [];

    try {
      // FIXED: Fetch all collections including new provider approval requests
      const collections = [
        { name: 'rentalRequests', type: 'Rental' },
        { name: 'buySellRequests', type: 'Buy/Sell' },
        { name: 'constructionProjects', type: 'Construction' },
        { name: 'renovationProjects', type: 'Renovation' },
        { name: 'requests', type: 'Provider Approval' }, // NEW: Provider approval requests
      ];

      collections.forEach(({ name, type }) => {
        try {
          const requestsQuery = query(collection(db, name), orderBy('createdAt', 'desc'));

          const unsubscribe = onSnapshot(
            requestsQuery,
            async (snapshot) => {
              const requests = snapshot.docs.map((doc) => {
                const data = doc.data();
                // FIXED: For 'requests' collection, set requestType based on type field
                const requestType = name === 'requests' && data.type 
                  ? 'Provider Approval' 
                  : type;
                return {
                  id: doc.id,
                  requestType: requestType,
                  collection: name,
                  ...data,
                };
              });

              // Update combined requests list
              setAllRequests((prev) => {
                const filtered = prev.filter((r) => r.collection !== name);
                const combined = [...filtered, ...requests];
                // Sort by createdAt
                combined.sort((a, b) => {
                  const aTime = a.createdAt?.toDate?.() || new Date(0);
                  const bTime = b.createdAt?.toDate?.() || new Date(0);
                  return bTime - aTime;
                });
                return combined;
              });

              // Fetch related data (user names, property titles, provider names)
              const fetchPromises = requests.map(async (request) => {
                // Fetch user name
                if (request.userId && !userNames[request.userId]) {
                  try {
                    const userDoc = await getDoc(doc(db, 'users', request.userId));
                    if (userDoc.exists()) {
                      const userData = userDoc.data();
                      setUserNames((prev) => ({
                        ...prev,
                        [request.userId]: userData.name || userData.displayName || 'Unknown',
                      }));
                    }
                  } catch (error) {
                    console.error(`Error fetching user ${request.userId}:`, error);
                  }
                }

                // Fetch property title
                if (request.propertyId && !propertyTitles[request.propertyId]) {
                  try {
                    const property = await propertyService.getById(request.propertyId, false);
                    setPropertyTitles((prev) => ({
                      ...prev,
                      [request.propertyId]: property.title || 'Unknown Property',
                    }));
                  } catch (error) {
                    console.error(`Error fetching property ${request.propertyId}:`, error);
                  }
                }

                // Fetch provider name (for construction/renovation projects)
                if (request.providerId && !providerNames[request.providerId]) {
                  try {
                    const providerDoc = await getDoc(doc(db, 'serviceProviders', request.providerId));
                    if (providerDoc.exists()) {
                      const providerData = providerDoc.data();
                      setProviderNames((prev) => ({
                        ...prev,
                        [request.providerId]: providerData.name || 'Unknown Provider',
                      }));
                    }
                  } catch (error) {
                    console.error(`Error fetching provider ${request.providerId}:`, error);
                  }
                }
              });

              await Promise.all(fetchPromises);
              setRequestsLoading(false);
            },
            (error) => {
              console.error(`Error fetching ${name}:`, error);
              // Fallback without orderBy
              if (error.code === 'failed-precondition' || error.message?.includes('index')) {
                const fallbackQuery = query(collection(db, name));
                const fallbackUnsubscribe = onSnapshot(
                  fallbackQuery,
                  async (snapshot) => {
                    const requests = snapshot.docs.map((doc) => ({
                      id: doc.id,
                      requestType: type,
                      collection: name,
                      ...doc.data(),
                    }));

                    setAllRequests((prev) => {
                      const filtered = prev.filter((r) => r.collection !== name);
                      const combined = [...filtered, ...requests];
                      combined.sort((a, b) => {
                        const aTime = a.createdAt?.toDate?.() || new Date(0);
                        const bTime = b.createdAt?.toDate?.() || new Date(0);
                        return bTime - aTime;
                      });
                      return combined;
                    });

                    setRequestsLoading(false);
                  },
                  (fallbackError) => {
                    console.error(`Error fetching ${name} (fallback):`, fallbackError);
                  }
                );
                unsubscribes.push(fallbackUnsubscribe);
              } else {
                setRequestsLoading(false);
              }
            }
          );

          unsubscribes.push(unsubscribe);
        } catch (error) {
          console.error(`Error setting up ${name} listener:`, error);
        }
      });

      return () => {
        unsubscribes.forEach((unsub) => unsub());
      };
    } catch (error) {
      console.error('Error setting up requests listeners:', error);
      setRequestsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Real-time support messages listener for Support Messages tab
  useEffect(() => {
    if (activeTab !== 'support-messages' || !db) {
      return;
    }

    setSupportMessagesLoading(true);
    try {
      const messagesQuery = query(
        collection(db, 'supportMessages'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        messagesQuery,
        async (snapshot) => {
          const messagesList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Fetch user names and emails
          const fetchPromises = messagesList.map(async (message) => {
            if (message.userId && (!userNames[message.userId] || !userEmails[message.userId])) {
              try {
                const userDoc = await getDoc(doc(db, 'users', message.userId));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  setUserNames((prev) => ({
                    ...prev,
                    [message.userId]: userData.name || userData.displayName || 'Unknown',
                  }));
                  setUserEmails((prev) => ({
                    ...prev,
                    [message.userId]: userData.email || 'N/A',
                  }));
                }
              } catch (error) {
                console.error(`Error fetching user ${message.userId}:`, error);
              }
            }

            // Fetch replies for this message
            if (!messageReplies[message.id]) {
              try {
                const repliesSnapshot = await getDocs(
                  collection(db, 'supportMessages', message.id, 'replies')
                );
                const replies = repliesSnapshot.docs.map((replyDoc) => ({
                  id: replyDoc.id,
                  ...replyDoc.data(),
                }));
                replies.sort((a, b) => {
                  const aTime = a.createdAt?.toDate?.() || new Date(0);
                  const bTime = b.createdAt?.toDate?.() || new Date(0);
                  return aTime - bTime; // Oldest first
                });
                setMessageReplies((prev) => ({
                  ...prev,
                  [message.id]: replies,
                }));
              } catch (error) {
                console.error(`Error fetching replies for message ${message.id}:`, error);
              }
            }
          });

          await Promise.all(fetchPromises);
          setSupportMessages(messagesList);
          setSupportMessagesLoading(false);
        },
        (error) => {
          console.error('Error fetching support messages:', error);
          // Fallback without orderBy
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            const fallbackQuery = query(collection(db, 'supportMessages'));
            const fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              async (snapshot) => {
                const messagesList = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));
                // Sort client-side
                messagesList.sort((a, b) => {
                  const aTime = a.createdAt?.toDate?.() || new Date(0);
                  const bTime = b.createdAt?.toDate?.() || new Date(0);
                  return bTime - aTime;
                });

                // Fetch user data
                const fetchPromises = messagesList.map(async (message) => {
                  if (message.userId && (!userNames[message.userId] || !userEmails[message.userId])) {
                    try {
                      const userDoc = await getDoc(doc(db, 'users', message.userId));
                      if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setUserNames((prev) => ({
                          ...prev,
                          [message.userId]: userData.name || userData.displayName || 'Unknown',
                        }));
                        setUserEmails((prev) => ({
                          ...prev,
                          [message.userId]: userData.email || 'N/A',
                        }));
                      }
                    } catch (error) {
                      console.error(`Error fetching user ${message.userId}:`, error);
                    }
                  }
                });

                await Promise.all(fetchPromises);
                setSupportMessages(messagesList);
                setSupportMessagesLoading(false);
              },
              (fallbackError) => {
                console.error('Error fetching support messages (fallback):', fallbackError);
                toast.error('Failed to load support messages');
                setSupportMessagesLoading(false);
              }
            );
            return () => fallbackUnsubscribe();
          } else {
            toast.error('Failed to load support messages');
            setSupportMessagesLoading(false);
          }
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up support messages listener:', error);
      setSupportMessagesLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Fetch replies when viewing a message
  useEffect(() => {
    if (selectedMessage && db) {
      const repliesRef = collection(db, 'supportMessages', selectedMessage.id, 'replies');
      const repliesQuery = query(repliesRef, orderBy('createdAt', 'asc'));

      const unsubscribe = onSnapshot(
        repliesQuery,
        (snapshot) => {
          const replies = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setMessageReplies((prev) => ({
            ...prev,
            [selectedMessage.id]: replies,
          }));
        },
        (error) => {
          console.error('Error fetching replies:', error);
          // Fallback without orderBy
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            const fallbackUnsubscribe = onSnapshot(
              repliesRef,
              (snapshot) => {
                const replies = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));
                replies.sort((a, b) => {
                  const aTime = a.createdAt?.toDate?.() || new Date(0);
                  const bTime = b.createdAt?.toDate?.() || new Date(0);
                  return aTime - bTime;
                });
                setMessageReplies((prev) => ({
                  ...prev,
                  [selectedMessage.id]: replies,
                }));
              }
            );
            return () => fallbackUnsubscribe();
          }
        }
      );

      return () => unsubscribe();
    }
  }, [selectedMessage, db]);

  // Real-time support chats listener for Support Chats tab
  useEffect(() => {
    if (activeTab !== 'support-chats' || !db) {
      return;
    }

    setSupportChatsLoading(true);
    try {
      const chatsQuery = query(collection(db, 'supportChats'), orderBy('updatedAt', 'desc'));

      const unsubscribe = onSnapshot(
        chatsQuery,
        async (snapshot) => {
          const chatsList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Fetch user names
          const fetchPromises = chatsList.map(async (chat) => {
            // In new structure, document ID is userId, so use chat.id or chat.userId
            const chatUserId = chat.userId || chat.id;
            if (chatUserId && !userNames[chatUserId]) {
              try {
                const userDoc = await getDoc(doc(db, 'users', chatUserId));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  setUserNames((prev) => ({
                    ...prev,
                    [chatUserId]: userData.name || userData.displayName || 'Unknown',
                  }));
                  setUserEmails((prev) => ({
                    ...prev,
                    [chatUserId]: userData.email || 'N/A',
                  }));
                }
              } catch (error) {
                console.error(`Error fetching user ${chatUserId}:`, error);
              }
            }
          });

          await Promise.all(fetchPromises);
          setSupportChats(chatsList);
          setSupportChatsLoading(false);
        },
        (error) => {
          console.error('Error fetching support chats:', error);
          // Fallback without orderBy
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            const fallbackQuery = query(collection(db, 'supportChats'));
            const fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              async (snapshot) => {
                const chatsList = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));
                // Sort client-side
                chatsList.sort((a, b) => {
                  const aTime = a.updatedAt?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
                  const bTime = b.updatedAt?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
                  return bTime - aTime;
                });

                // Fetch user names
                const fetchPromises = chatsList.map(async (chat) => {
                  // In new structure, document ID is userId, so use chat.id or chat.userId
                  const chatUserId = chat.userId || chat.id;
                  if (chatUserId && !userNames[chatUserId]) {
                    try {
                      const userDoc = await getDoc(doc(db, 'users', chatUserId));
                      if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setUserNames((prev) => ({
                          ...prev,
                          [chatUserId]: userData.name || userData.displayName || 'Unknown',
                        }));
                        setUserEmails((prev) => ({
                          ...prev,
                          [chatUserId]: userData.email || 'N/A',
                        }));
                      }
                    } catch (error) {
                      console.error(`Error fetching user ${chatUserId}:`, error);
                    }
                  }
                });

                await Promise.all(fetchPromises);
                setSupportChats(chatsList);
                setSupportChatsLoading(false);
              },
              (fallbackError) => {
                console.error('Error fetching support chats (fallback):', fallbackError);
                toast.error('Failed to load support chats');
                setSupportChatsLoading(false);
              }
            );
            return () => fallbackUnsubscribe();
          } else {
            toast.error('Failed to load support chats');
            setSupportChatsLoading(false);
          }
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up support chats listener:', error);
      setSupportChatsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Load messages when chat is selected
  useEffect(() => {
    if (!selectedChat || !db) {
      setChatMessages([]);
      return;
    }

    // Use userId as the chat document ID
    const chatUserId = selectedChat.userId || selectedChat.id;
    const messagesRef = collection(db, 'supportChats', chatUserId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setChatMessages(messages);
      },
      (error) => {
        console.error('Error fetching chat messages:', error);
        // Fallback without orderBy
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
          const fallbackUnsubscribe = onSnapshot(
            messagesRef,
            (snapshot) => {
              const messages = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }));
              messages.sort((a, b) => {
                const aTime = a.createdAt?.toDate?.() || new Date(0);
                const bTime = b.createdAt?.toDate?.() || new Date(0);
                return aTime - bTime;
              });
              setChatMessages(messages);
            }
          );
          return () => fallbackUnsubscribe();
        }
      }
    );

    return () => unsubscribe();
  }, [selectedChat, db]);

  // Handle promote to admin
  const handlePromoteToAdmin = async (userId) => {
    if (!db) return;

    try {
      setProcessing(true);
      await updateDoc(doc(db, 'users', userId), {
        role: 'admin',
        updatedAt: new Date(),
      });
      toast.success('User promoted to admin successfully');
    } catch (error) {
      console.error('Error promoting user:', error);
      toast.error('Failed to promote user to admin');
    } finally {
      setProcessing(false);
    }
  };

  // Handle demote to user
  const handleDemoteToUser = async (userId) => {
    if (!db) return;

    try {
      setProcessing(true);
      await updateDoc(doc(db, 'users', userId), {
        role: 'customer',
        updatedAt: new Date(),
      });
      toast.success('User demoted to customer successfully');
    } catch (error) {
      console.error('Error demoting user:', error);
      toast.error('Failed to demote user');
    } finally {
      setProcessing(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!userToDelete || !db) return;

    try {
      setProcessing(true);
      await deleteDoc(doc(db, 'users', userToDelete.id));
      toast.success('User deleted successfully');
      setDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setProcessing(false);
    }
  };

  // Handle approve provider
  const handleApproveProvider = async (provider) => {
    if (!db) return;

    try {
      setProcessing(true);
      const providerRef = doc(db, 'serviceProviders', provider.id);

      // Update provider document
      await updateDoc(providerRef, {
        isApproved: true,
        approved: true,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update user role if needed
      if (provider.userId) {
        const userRef = doc(db, 'users', provider.userId);
        const roleToSet = provider.serviceType === 'Construction' ? 'constructor' : 'renovator';
        await updateDoc(userRef, {
          role: roleToSet,
          updatedAt: serverTimestamp(),
        });
      }

      // Create notification for provider
      if (provider.serviceType === 'Construction') {
        await notificationService.notifyProviderProfileApproved(provider.userId);
      } else {
        await notificationService.sendNotification(
          provider.userId,
          'Provider Application Approved',
          `Congratulations! Your ${provider.serviceType} provider application has been approved. You can now start receiving project requests.`,
          'success',
          '/renovator-dashboard'
        );
      }

      toast.success('Provider approved successfully');
    } catch (error) {
      console.error('Error approving provider:', error);
      toast.error('Failed to approve provider');
    } finally {
      setProcessing(false);
    }
  };

  // Handle reject provider
  const handleRejectProvider = async () => {
    if (!selectedProvider || !db) return;

    try {
      setProcessing(true);
      const providerRef = doc(db, 'serviceProviders', selectedProvider.id);

      // Update provider document
      await updateDoc(providerRef, {
        isApproved: false,
        approved: false,
        rejectedReason: rejectReason.trim() || 'Application rejected by admin',
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create notification for provider
      await notificationService.sendNotification(
        selectedProvider.userId,
        'Provider Application Rejected',
        `Your ${selectedProvider.serviceType} provider application has been rejected.${rejectReason.trim() ? ` Reason: ${rejectReason.trim()}` : ''}`,
        'status-update',
        null
      );

      toast.success('Provider rejected successfully');
      setRejectModalOpen(false);
      setSelectedProvider(null);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting provider:', error);
      toast.error('Failed to reject provider');
    } finally {
      setProcessing(false);
    }
  };

  // Handle suspend/activate property
  const handleTogglePropertyStatus = async (property) => {
    if (!db) return;

    const newStatus = property.status === 'suspended' ? 'published' : 'suspended';
    const action = newStatus === 'suspended' ? 'suspended' : 'activated';

    try {
      setProcessing(true);
      const propertyRef = doc(db, 'properties', property.id);

      await updateDoc(propertyRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // Create notification for owner
      await notificationService.create(
        property.ownerId,
        `Property ${action === 'suspended' ? 'Suspended' : 'Activated'}`,
        `Your property "${property.title}" has been ${action}.${action === 'suspended' ? ' It will no longer be visible to the public.' : ' It is now visible to the public.'}`,
        action === 'suspended' ? 'warning' : 'success',
        `/properties/${property.id}`
      );

      toast.success(`Property ${action} successfully`);
    } catch (error) {
      console.error('Error toggling property status:', error);
      toast.error(`Failed to ${action} property`);
    } finally {
      setProcessing(false);
    }
  };

  // Handle delete property
  const handleDeleteProperty = async () => {
    if (!propertyToDelete || !db) return;

    try {
      setProcessing(true);
      const propertyRef = doc(db, 'properties', propertyToDelete.id);

      // Create notification for owner before deleting
      await notificationService.create(
        propertyToDelete.ownerId,
        'Property Deleted',
        `Your property "${propertyToDelete.title}" has been deleted by an administrator.`,
        'error',
        null
      );

      await deleteDoc(propertyRef);

      toast.success('Property deleted successfully');
      setDeletePropertyModalOpen(false);
      setPropertyToDelete(null);
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error('Failed to delete property');
    } finally {
      setProcessing(false);
    }
  };

  // Format date
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

  // Format price
  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Filter properties based on search
  const getFilteredProperties = () => {
    let filtered = properties;

    if (propertySearch.city.trim()) {
      filtered = filtered.filter((property) => {
        const city = property.address?.city || property.city || '';
        return city.toLowerCase().includes(propertySearch.city.toLowerCase());
      });
    }

    if (propertySearch.ownerEmail.trim()) {
      filtered = filtered.filter((property) => {
        const email = ownerEmails[property.ownerId] || '';
        return email.toLowerCase().includes(propertySearch.ownerEmail.toLowerCase());
      });
    }

    return filtered;
  };

  // Handle update request status
  const handleUpdateRequestStatus = async (request, newStatus) => {
    if (!db) return;

    try {
      setProcessing(true);
      const requestRef = doc(db, request.collection, request.id);

      // FIXED: Handle provider approval requests specially
      if (request.requestType === 'Provider Approval' && request.type && request.userId) {
        if (newStatus === 'approved') {
          // APPROVE: Update request, user role, and create provider profile
          await updateDoc(requestRef, {
            status: 'approved',
            updatedAt: serverTimestamp(),
          });

          // Update user role
          const userRef = doc(db, 'users', request.userId);
          await updateDoc(userRef, {
            role: request.type, // 'renovator' or 'constructor'
            isApprovedProvider: true,
            updatedAt: serverTimestamp(),
          });

          // Create provider profile in providers collection
          const providerRef = doc(db, 'providers', request.userId);
          await setDoc(providerRef, {
            userId: request.userId,
            type: request.type,
            portfolio: request.portfolio || [],
            description: request.description || '',
            experience: request.experience || '',
            fullName: request.fullName || '',
            companyName: request.companyName || '',
            email: request.email || '',
            phoneNumber: request.phoneNumber || '',
            officeAddress: request.officeAddress || '',
            city: request.city || '',
            serviceCategories: request.serviceCategories || request.constructionServices || [],
            licenseFiles: request.licenseFiles || [],
            availability: request.availability || '',
            workingHours: request.workingHours || '',
            teamSize: request.teamSize || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });

          // Send notification
          await notificationService.sendNotification(
            request.userId,
            'Provider Application Approved',
            `Congratulations! Your ${request.type} application has been approved. You can now access provider features.`,
            'success',
            '/account'
          );

          toast.success('Provider approved successfully');
        } else if (newStatus === 'rejected') {
          // REJECT: Update request and user status
          await updateDoc(requestRef, {
            status: 'rejected',
            updatedAt: serverTimestamp(),
          });

          // Update user
          const userRef = doc(db, 'users', request.userId);
          await updateDoc(userRef, {
            isApprovedProvider: false,
            updatedAt: serverTimestamp(),
          });

          // Send notification
          await notificationService.sendNotification(
            request.userId,
            'Provider Application Rejected',
            `Your ${request.type} application has been rejected. Please contact support for more information.`,
            'error',
            '/account'
          );

          toast.success('Provider request rejected');
        }
        setProcessing(false);
        return;
      }

      // Original logic for other request types
      await updateDoc(requestRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // Create notifications
      const statusMessages = {
        Accepted: 'has been accepted',
        Approved: 'has been approved',
        Rejected: 'has been rejected',
        'In Progress': 'is now in progress',
        Completed: 'has been completed',
        Cancelled: 'has been cancelled',
      };

      const message = statusMessages[newStatus] || `status has been updated to ${newStatus}`;
      const notificationType =
        newStatus === 'Accepted' || newStatus === 'Approved' || newStatus === 'Completed'
          ? 'success'
          : newStatus === 'Rejected' || newStatus === 'Cancelled'
            ? 'error'
            : 'info';

      // Notify requester (userId)
      if (request.userId) {
        let title = '';
        let link = null;

        if (request.requestType === 'Rental') {
          title = 'Rental Request Updated';
          link = `/properties/${request.propertyId}`;
        } else if (request.requestType === 'Buy/Sell') {
          title = 'Purchase Offer Updated';
          link = `/properties/${request.propertyId}`;
        } else if (request.requestType === 'Construction') {
          title = 'Construction Project Updated';
          link = '/constructor-dashboard';
        } else if (request.requestType === 'Renovation') {
          title = 'Renovation Project Updated';
          link = '/renovator-dashboard';
        }

        await notificationService.sendNotification(
          request.userId,
          title,
          `Your ${request.requestType.toLowerCase()} request ${message}.`,
          'status-update',
          link
        );
      }

      // Notify provider (if construction/renovation project)
      if (request.providerId && (request.requestType === 'Construction' || request.requestType === 'Renovation')) {
        await notificationService.sendNotification(
          request.providerId,
          `${request.requestType} Project Status Updated`,
          `A ${request.requestType.toLowerCase()} project assigned to you ${message}.`,
          'status-update',
          request.requestType === 'Construction' ? '/constructor-dashboard' : '/renovator-dashboard'
        );
      }

      toast.success(`Request status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating request status:', error);
      // FIXED: Better error handling with specific messages
      if (error.code === 'permission-denied') {
        toast.error('Permission denied. You may not have admin privileges.');
      } else {
        toast.error(error.message || 'Failed to update request status');
      }
    } finally {
      setProcessing(false);
    }
  };

  // Filter requests based on filters
  // Fetch all notifications for manage-notifications tab
  useEffect(() => {
    if (activeTab !== 'manage-notifications' || !db) return;

    setAllNotificationsLoading(true);
    try {
      const notificationsQuery = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          const notifs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setAllNotifications(notifs);
          setAllNotificationsLoading(false);
        },
        (error) => {
          console.error('Error fetching notifications:', error);
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            const fallbackQuery = query(collection(db, 'notifications'));
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
                setAllNotifications(notifs);
                setAllNotificationsLoading(false);
              },
              (fallbackError) => {
                console.error('Error fetching notifications (fallback):', fallbackError);
                setAllNotificationsLoading(false);
              }
            );
            return () => fallbackUnsubscribe();
          } else {
            setAllNotificationsLoading(false);
          }
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up notifications listener:', error);
      setAllNotificationsLoading(false);
    }
  }, [activeTab]);

  const getFilteredNotifications = () => {
    let filtered = [...allNotifications];

    if (notificationFilters.userId.trim()) {
      filtered = filtered.filter((n) =>
        n.userId?.toLowerCase().includes(notificationFilters.userId.toLowerCase())
      );
    }

    if (notificationFilters.type) {
      filtered = filtered.filter((n) => n.type === notificationFilters.type);
    }

    return filtered;
  };

  const getFilteredRequests = () => {
    let filtered = allRequests;

    if (requestFilters.type) {
      filtered = filtered.filter((request) => request.requestType === requestFilters.type);
    }

    if (requestFilters.status) {
      filtered = filtered.filter((request) => request.status === requestFilters.status);
    }

    if (requestFilters.startDate) {
      filtered = filtered.filter((request) => {
        const requestDate = request.createdAt?.toDate?.() || new Date(0);
        const startDate = new Date(requestFilters.startDate);
        return requestDate >= startDate;
      });
    }

    if (requestFilters.endDate) {
      filtered = filtered.filter((request) => {
        const requestDate = request.createdAt?.toDate?.() || new Date(0);
        const endDate = new Date(requestFilters.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        return requestDate <= endDate;
      });
    }

    return filtered;
  };

  // Handle reply to support message
  const handleReplyToMessage = async () => {
    if (!selectedMessage || !db || !currentUser || !replyText.trim()) {
      toast.error('Please enter a reply message');
      return;
    }

    try {
      setProcessing(true);
      const repliesRef = collection(db, 'supportMessages', selectedMessage.id, 'replies');

      await addDoc(repliesRef, {
        adminId: currentUser.uid,
        adminName: currentUser.email || user?.email || 'Admin',
        replyText: replyText.trim(),
        createdAt: serverTimestamp(),
      });

      // Update message updatedAt
      await updateDoc(doc(db, 'supportMessages', selectedMessage.id), {
        updatedAt: serverTimestamp(),
      });

      // Create notification for user
      await notificationService.sendNotification(
        selectedMessage.userId,
        'Support Message Reply',
        `An admin has replied to your support message: "${selectedMessage.subject}".`,
        'admin',
        '/account'
      );

      toast.success('Reply sent successfully');
      setReplyModalOpen(false);
      setReplyText('');
    } catch (error) {
      console.error('Error replying to message:', error);
      toast.error('Failed to send reply');
    } finally {
      setProcessing(false);
    }
  };

  // Handle delete support message
  const handleDeleteMessage = async () => {
    if (!messageToDelete || !db) return;

    try {
      setProcessing(true);

      // Delete all replies first
      try {
        const repliesSnapshot = await getDocs(
          collection(db, 'supportMessages', messageToDelete.id, 'replies')
        );
        const deletePromises = repliesSnapshot.docs.map((replyDoc) =>
          deleteDoc(doc(db, 'supportMessages', messageToDelete.id, 'replies', replyDoc.id))
        );
        await Promise.all(deletePromises);
      } catch (error) {
        console.error('Error deleting replies:', error);
        // Continue with message deletion even if replies deletion fails
      }

      // Delete the message
      await deleteDoc(doc(db, 'supportMessages', messageToDelete.id));

      toast.success('Message deleted successfully');
      setDeleteMessageModalOpen(false);
      setMessageToDelete(null);
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    } finally {
      setProcessing(false);
    }
  };

  // Handle send chat message
  const handleSendChatMessage = async () => {
    if (!selectedChat || !db || !currentUser || !newMessageText.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      setProcessing(true);
      // Use userId as the chat document ID
      const chatUserId = selectedChat.userId || selectedChat.id;
      const messagesRef = collection(db, 'supportChats', chatUserId, 'messages');

      // Add message
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        text: newMessageText.trim(),
        isAdmin: true,
        createdAt: serverTimestamp(),
      });

      // Update chat document (document ID = userId)
      const chatRef = doc(db, 'supportChats', chatUserId);
      await updateDoc(chatRef, {
        adminId: currentUser.uid,
        unreadForUser: true,
        unreadForAdmin: false,
        lastMessage: newMessageText.trim().substring(0, 100),
        updatedAt: serverTimestamp(),
      });

      // Create notification for user
      await notificationService.sendNotification(
        chatUserId,
        'New Support Chat Message',
        `You have a new message from support: "${newMessageText.trim().substring(0, 50)}${newMessageText.trim().length > 50 ? '...' : ''}"`,
        'admin',
        '/chatbot'
      );

      setNewMessageText('');
      toast.success('Message sent');
    } catch (error) {
      console.error('Error sending chat message:', error);
      toast.error('Failed to send message');
    } finally {
      setProcessing(false);
    }
  };

  // Handle send notifications
  const handleSendNotifications = async () => {
    if (!db || !notificationForm.title.trim() || !notificationForm.message.trim()) {
      toast.error('Please fill in title and message');
      return;
    }

    try {
      setSendingNotifications(true);
      setNotificationProgress({ sent: 0, total: 0 });

      let userIds = [];

      if (notificationForm.target === 'all-users') {
        // Fetch all users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        userIds = usersSnapshot.docs.map((doc) => doc.id);
      } else if (notificationForm.target === 'all-providers') {
        // Fetch approved providers
        const providersSnapshot = await getDocs(
          query(
            collection(db, 'serviceProviders'),
            where('isApproved', '==', true)
          )
        );
        userIds = providersSnapshot.docs.map((doc) => doc.data().userId).filter(Boolean);
      } else if (notificationForm.target === 'single-uid') {
        if (!notificationForm.singleUid.trim()) {
          toast.error('Please enter a user UID');
          setSendingNotifications(false);
          return;
        }
        userIds = [notificationForm.singleUid.trim()];
      }

      if (userIds.length === 0) {
        toast.error('No users found to send notifications to');
        setSendingNotifications(false);
        return;
      }

      // Warn if > 500 users
      if (userIds.length > 500) {
        toast.error(
          `Too many users (${userIds.length}). Please use batches. Limiting to 500 for now.`
        );
        userIds = userIds.slice(0, 500);
      }

      setNotificationProgress({ sent: 0, total: userIds.length });

      // Batch create notifications (Firestore batch limit is 500)
      const batchSize = 500;
      let sentCount = 0;

      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchUsers = userIds.slice(i, i + batchSize);

        batchUsers.forEach((userId) => {
          const notificationRef = doc(collection(db, 'notifications'));
          batch.set(notificationRef, {
            userId,
            title: notificationForm.title.trim(),
            message: notificationForm.message.trim(),
            type: 'admin',
            read: false,
            link: null,
            createdAt: serverTimestamp(),
          });
        });

        await batch.commit();
        sentCount += batchUsers.length;
        setNotificationProgress({ sent: sentCount, total: userIds.length });
      }

      toast.success(`Notifications sent to ${sentCount} ${notificationForm.target === 'all-providers' ? 'providers' : 'users'}`);
      setNotificationForm({ title: '', message: '', target: 'all-users', singleUid: '' });
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast.error(`Failed to send notifications: ${error.message}`);
    } finally {
      setSendingNotifications(false);
      setNotificationProgress({ sent: 0, total: 0 });
    }
  };

  // Render placeholder content based on active tab
  const renderTabContent = () => {
    if (activeTab === 'overview') {
      return (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-textMain">Overview</h2>
            <Button
              onClick={fetchStats}
              disabled={statsLoading}
              loading={statsLoading}
              size="sm"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {statsLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-surface rounded-lg border border-muted shadow-sm hover:shadow-md transition p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-textSecondary mb-1">Total Users</p>
                      <p className="text-primary font-bold text-3xl">{stats.users}</p>
                    </div>
                    <Users className="w-10 h-10 text-primary opacity-50" />
                  </div>
                </div>

                <div className="bg-surface rounded-lg border border-muted shadow-sm hover:shadow-md transition p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-textSecondary mb-1">Properties</p>
                      <p className="text-primary font-bold text-3xl">{stats.properties}</p>
                    </div>
                    <Home className="w-10 h-10 text-primary opacity-50" />
                  </div>
                </div>

                <div className="bg-surface rounded-lg border border-muted shadow-sm hover:shadow-md transition p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-textSecondary mb-1">Providers</p>
                      <p className="text-primary font-bold text-3xl">{stats.providers}</p>
                    </div>
                    <Building2 className="w-10 h-10 text-primary opacity-50" />
                  </div>
                </div>

                <div className="bg-surface rounded-lg border border-muted shadow-sm hover:shadow-md transition p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-textSecondary mb-1">Requests</p>
                      <p className="text-primary font-bold text-3xl">{stats.requests}</p>
                    </div>
                    <FileText className="w-10 h-10 text-primary opacity-50" />
                  </div>
                </div>

                <div className="bg-surface rounded-lg border border-muted shadow-sm hover:shadow-md transition p-6 md:col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-textSecondary mb-1">Support Messages</p>
                      <p className="text-primary font-bold text-3xl">{stats.supportChats}</p>
                    </div>
                    <MessageSquare className="w-10 h-10 text-primary opacity-50" />
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-surface rounded-lg p-6 border border-muted shadow-sm">
                <h3 className="text-lg font-semibold text-textMain mb-4">Platform Statistics</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      { name: 'Users', value: stats.users },
                      { name: 'Properties', value: stats.properties },
                      { name: 'Providers', value: stats.providers },
                      { name: 'Requests', value: stats.requests },
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#3b82f6" name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      );
    }

    // Manage Users tab
    if (activeTab === 'users') {
      return (
        <div className="p-6">
          <h2 className="text-2xl font-bold text-textMain mb-6">Manage Users</h2>

          {usersLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : users.length === 0 ? (
            <div className="bg-surface rounded-lg shadow p-8 text-center">
              <Users className="w-16 h-16 text-muted mx-auto mb-4" />
              <p className="text-textSecondary">No users found</p>
            </div>
          ) : (
            <div className="bg-surface rounded-lg shadow-sm border border-muted overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-muted">
                  <thead className="bg-background">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Created At
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface divide-y divide-muted">
                    {users.map((userItem) => {
                      const isCurrentUser = userItem.id === currentUser?.uid;
                      const isAdmin = userItem.role === 'admin';

                      return (
                        <tr key={userItem.id} className="hover:bg-background">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-textMain">
                              {userItem.name || userItem.displayName || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-textSecondary">{userItem.email || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                isAdmin
                                  ? 'bg-accent/20 text-accent'
                                  : 'bg-muted text-textMain'
                              }`}
                            >
                              {userItem.role || 'customer'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">
                            {formatDate(userItem.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              {!isAdmin ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePromoteToAdmin(userItem.id)}
                                  disabled={processing}
                                  className="text-primary border-primary hover:bg-primary"
                                >
                                  <Shield className="w-4 h-4 mr-1" />
                                  Promote
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDemoteToUser(userItem.id)}
                                  disabled={processing || isCurrentUser}
                                  className={`${
                                    isCurrentUser
                                      ? 'text-muted border-muted cursor-not-allowed'
                                      : 'text-orange-600 border-orange-300 hover:bg-orange-50'
                                  }`}
                                  title={isCurrentUser ? 'You cannot demote yourself' : 'Demote to customer'}
                                >
                                  <ShieldOff className="w-4 h-4 mr-1" />
                                  Demote
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setUserToDelete(userItem);
                                  setDeleteModalOpen(true);
                                }}
                                disabled={processing || isCurrentUser}
                                className={`${
                                  isCurrentUser
                                    ? 'text-textSecondary border-muted cursor-not-allowed'
                                    : 'text-error border-error hover:bg-error'
                                }`}
                                title={isCurrentUser ? 'You cannot delete yourself' : 'Delete user'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          <Modal
            isOpen={deleteModalOpen}
            onClose={() => {
              setDeleteModalOpen(false);
              setUserToDelete(null);
            }}
            title="Delete User"
            size="md"
          >
            <div className="space-y-4">
              <p className="text-textSecondary">
                Are you sure you want to delete user{' '}
                <strong>{userToDelete?.name || userToDelete?.email || 'this user'}</strong>?
              </p>
              <div className="bg-accent border border-accent rounded-lg p-4">
                <p className="text-sm text-accent">
                  <strong>Warning:</strong> This action cannot be undone. The user's account will be permanently
                  deleted. User content (properties, requests, etc.) will not be automatically deleted and should be
                  reviewed separately.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setUserToDelete(null);
                  }}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteUser}
                  loading={processing}
                  disabled={processing}
                >
                  Delete User
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      );
    }

    // Manage Providers tab
    if (activeTab === 'providers') {
      return (
        <div className="p-6">
          <h2 className="text-2xl font-bold text-textMain mb-6">Manage Providers</h2>

          {providersLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : providers.length === 0 ? (
            <div className="bg-surface rounded-lg shadow p-8 text-center">
              <Building2 className="w-16 h-16 text-muted mx-auto mb-4" />
              <p className="text-textSecondary">No providers found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {providers.map((provider) => {
                const isApproved = provider.isApproved || provider.approved;
                const specialization = provider.specialization || provider.expertise || [];
                const portfolioLinks = provider.portfolioLinks || [];

                return (
                  <div
                    key={provider.id}
                    className={`bg-surface rounded-lg shadow-sm border-2 ${
                      isApproved ? 'border-primary/30' : 'border-accent/30'
                    } p-6`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-textMain">{provider.name}</h3>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              isApproved
                                ? 'bg-primary/20 text-primary'
                                : 'bg-accent text-accent'
                            }`}
                          >
                            {isApproved ? 'Approved' : 'Pending'}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              provider.serviceType === 'Construction'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-primary text-primary'
                            }`}
                          >
                            {provider.serviceType || 'N/A'}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm text-textSecondary">
                          {provider.city && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>{provider.city}</span>
                            </div>
                          )}
                          {provider.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <span>{provider.phone}</span>
                            </div>
                          )}
                          {provider.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <span>{provider.email}</span>
                            </div>
                          )}
                          {provider.experience && (
                            <div className="flex items-center gap-2">
                              <Briefcase className="w-4 h-4" />
                              <span>{provider.experience} years experience</span>
                            </div>
                          )}
                          {provider.createdAt && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>Registered: {formatDate(provider.createdAt)}</span>
                            </div>
                          )}
                        </div>
                        {specialization.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-textSecondary mb-1">Specialization:</p>
                            <div className="flex flex-wrap gap-1">
                              {specialization.slice(0, 3).map((spec, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 text-xs bg-muted text-textSecondary rounded-base"
                                >
                                  {spec}
                                </span>
                              ))}
                              {specialization.length > 3 && (
                                <span className="px-2 py-1 text-xs text-textSecondary">
                                  +{specialization.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {portfolioLinks.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-textSecondary mb-1">Portfolio Links:</p>
                            <div className="flex flex-wrap gap-2">
                              {portfolioLinks.slice(0, 2).map((link, idx) => (
                                <a
                                  key={idx}
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:text-primary flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Portfolio {idx + 1}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-muted">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedProvider(provider);
                          setViewProfileModalOpen(true);
                        }}
                        className="text-primary border-primary/30 hover:bg-primary/10"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Profile
                      </Button>
                      {!isApproved ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveProvider(provider)}
                            disabled={processing}
                            className="text-primary border-primary/30 hover:bg-primary/10 flex-1"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedProvider(provider);
                              setRejectModalOpen(true);
                            }}
                            disabled={processing}
                            className="text-error border-error hover:bg-error"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProvider(provider);
                            setRejectModalOpen(true);
                          }}
                          disabled={processing}
                          className="text-orange-600 border-orange-300 hover:bg-orange-50 flex-1"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Revoke Approval
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* View Profile Modal */}
          <Modal
            isOpen={viewProfileModalOpen}
            onClose={() => {
              setViewProfileModalOpen(false);
              setSelectedProvider(null);
            }}
            title={`${selectedProvider?.name || 'Provider'} Profile`}
            size="lg"
          >
            {selectedProvider && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold text-textMain mb-4">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-textSecondary">Name</p>
                      <p className="text-textMain">{selectedProvider.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-textSecondary">Service Type</p>
                      <p className="text-textMain">{selectedProvider.serviceType || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-textSecondary">City</p>
                      <p className="text-textMain">{selectedProvider.city || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-textSecondary">Experience</p>
                      <p className="text-textMain">
                        {selectedProvider.experience || selectedProvider.experienceYears || 0} years
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-textSecondary">Phone</p>
                      <p className="text-textMain">{selectedProvider.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-textSecondary">Email</p>
                      <p className="text-textMain">{selectedProvider.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {selectedProvider.bio && (
                  <div>
                    <h3 className="text-lg font-semibold text-textMain mb-2">Bio</h3>
                    <p className="text-textSecondary">{selectedProvider.bio}</p>
                  </div>
                )}

                {/* Specialization */}
                {(selectedProvider.specialization || selectedProvider.expertise) && (
                  <div>
                    <h3 className="text-lg font-semibold text-textMain mb-2">Specialization</h3>
                    <div className="flex flex-wrap gap-2">
                      {(selectedProvider.specialization || selectedProvider.expertise || []).map(
                        (spec, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                          >
                            {spec}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Portfolio Links */}
                {selectedProvider.portfolioLinks && selectedProvider.portfolioLinks.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-textMain mb-2">Portfolio Links</h3>
                    <div className="space-y-2">
                      {selectedProvider.portfolioLinks.map((link, idx) => (
                        <a
                          key={idx}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:text-primary"
                        >
                          <ExternalLink className="w-4 h-4" />
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents */}
                <div>
                  <h3 className="text-lg font-semibold text-textMain mb-4">Documents</h3>
                  <div className="space-y-4">
                    {selectedProvider.cnicUrl && (
                      <div>
                        <p className="text-sm font-medium text-textSecondary mb-2">CNIC</p>
                        <a
                          href={selectedProvider.cnicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-primary hover:text-primary"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View CNIC Document
                        </a>
                      </div>
                    )}
                    {selectedProvider.profileImageUrl && (
                      <div>
                        <p className="text-sm font-medium text-textSecondary mb-2">Profile Image</p>
                        <img
                          src={selectedProvider.profileImageUrl}
                          alt="Profile"
                          className="w-32 h-32 object-cover rounded-lg border border-muted"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <h3 className="text-lg font-semibold text-textMain mb-2">Status</h3>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 text-sm font-medium rounded-full ${
                        selectedProvider.isApproved || selectedProvider.approved
                          ? 'bg-primary/20 text-primary'
                          : 'bg-accent/20 text-accent'
                      }`}
                    >
                      {selectedProvider.isApproved || selectedProvider.approved
                        ? 'Approved'
                        : 'Pending Approval'}
                    </span>
                    {selectedProvider.approvedAt && (
                      <span className="text-sm text-textSecondary">
                        Approved: {formatDate(selectedProvider.approvedAt)}
                      </span>
                    )}
                    {selectedProvider.rejectedReason && (
                      <span className="text-sm text-error">
                        Rejected: {selectedProvider.rejectedReason}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Modal>

          {/* Reject Provider Modal */}
          <Modal
            isOpen={rejectModalOpen}
            onClose={() => {
              setRejectModalOpen(false);
              setSelectedProvider(null);
              setRejectReason('');
            }}
            title={selectedProvider?.isApproved ? 'Revoke Approval' : 'Reject Provider'}
            size="md"
          >
            <div className="space-y-4">
              <p className="text-textSecondary">
                {selectedProvider?.isApproved
                  ? `Are you sure you want to revoke approval for ${selectedProvider?.name}?`
                  : `Are you sure you want to reject ${selectedProvider?.name}'s application?`}
              </p>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-muted rounded-lg focus:ring-2 focus:ring-red-500 focus:border-error resize-none"
                  placeholder="Enter reason for rejection..."
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectModalOpen(false);
                    setSelectedProvider(null);
                    setRejectReason('');
                  }}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleRejectProvider}
                  loading={processing}
                  disabled={processing}
                >
                  {selectedProvider?.isApproved ? 'Revoke Approval' : 'Reject Provider'}
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      );
    }

    // Manage Properties tab
    if (activeTab === 'properties') {
      const filteredProperties = getFilteredProperties();

      return (
        <div className="p-6">
          <h2 className="text-2xl font-bold text-textMain mb-6">Manage Properties</h2>

          {/* Search/Filter */}
            <div className="bg-surface rounded-lg shadow-sm border border-muted p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">
                  <Search className="w-4 h-4 inline mr-1" />
                  Filter by City
                </label>
                <Input
                  type="text"
                  value={propertySearch.city}
                  onChange={(e) =>
                    setPropertySearch((prev) => ({ ...prev, city: e.target.value }))
                  }
                  placeholder="Enter city name..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Filter by Owner Email
                </label>
                <Input
                  type="email"
                  value={propertySearch.ownerEmail}
                  onChange={(e) =>
                    setPropertySearch((prev) => ({ ...prev, ownerEmail: e.target.value }))
                  }
                  placeholder="Enter owner email..."
                />
              </div>
            </div>
            {(propertySearch.city || propertySearch.ownerEmail) && (
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPropertySearch({ city: '', ownerEmail: '' })}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>

          {propertiesLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="bg-surface rounded-lg shadow p-8 text-center">
              <Home className="w-16 h-16 text-muted mx-auto mb-4" />
              <p className="text-textSecondary">
                {properties.length === 0
                  ? 'No properties found'
                  : 'No properties match your search criteria'}
              </p>
            </div>
          ) : (
            <div className="bg-surface rounded-lg shadow-sm border border-muted overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-muted">
                  <thead className="bg-background">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Property
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Owner
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        City
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface divide-y divide-muted">
                    {filteredProperties.map((property) => {
                      const isSuspended = property.status === 'suspended';
                      const city = property.address?.city || property.city || 'N/A';
                      const ownerEmail = ownerEmails[property.ownerId] || 'Loading...';

                      return (
                        <tr key={property.id} className="hover:bg-background">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-textMain">{property.title}</div>
                            <div className="text-xs text-textSecondary mt-1">
                              {property.type || 'N/A'} • ID: {property.id.substring(0, 8)}...
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-textSecondary">{ownerEmail}</div>
                            <div className="text-xs text-textSecondary">
                              {property.ownerName || property.ownerId.substring(0, 8)}...
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">
                            {city}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-textMain">
                            {formatPrice(property.price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                isSuspended
                                  ? 'bg-error text-error'
                                  : property.status === 'published'
                                    ? 'bg-primary/20 text-primary'
                                    : 'bg-accent text-accent'
                              }`}
                            >
                              {property.status || 'pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">
                            {formatDate(property.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedProperty(property);
                                  setViewPropertyModalOpen(true);
                                }}
                                className="text-primary border-primary/30 hover:bg-primary/10"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleTogglePropertyStatus(property)}
                                disabled={processing}
                                className={
                                  isSuspended
                                    ? 'text-primary border-primary/30 hover:bg-primary/10'
                                    : 'text-accent border-accent/30 hover:bg-accent/10'
                                }
                              >
                                {isSuspended ? (
                                  <>
                                    <Check className="w-4 h-4 mr-1" />
                                    Activate
                                  </>
                                ) : (
                                  <>
                                    <Ban className="w-4 h-4 mr-1" />
                                    Suspend
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setPropertyToDelete(property);
                                  setDeletePropertyModalOpen(true);
                                }}
                                disabled={processing}
                                className="text-error border-error hover:bg-error"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* View Property Modal */}
          <Modal
            isOpen={viewPropertyModalOpen}
            onClose={() => {
              setViewPropertyModalOpen(false);
              setSelectedProperty(null);
            }}
            title={selectedProperty?.title || 'Property Details'}
            size="lg"
          >
            {selectedProperty && (
              <div className="space-y-6">
                {/* Images */}
                {(selectedProperty.photos?.length > 0 || selectedProperty.coverImage) && (
                  <div>
                    <h3 className="text-lg font-semibold text-textMain mb-3">Images</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedProperty.coverImage && (
                        <div>
                          <img
                            src={selectedProperty.coverImage}
                            alt="Cover"
                            className="w-full h-48 object-cover rounded-lg border border-muted"
                          />
                          <p className="text-xs text-textSecondary mt-1">Cover Image</p>
                        </div>
                      )}
                      {selectedProperty.photos?.slice(0, 3).map((photo, idx) => (
                        <div key={idx}>
                          <img
                            src={photo}
                            alt={`Property ${idx + 1}`}
                            className="w-full h-48 object-cover rounded-lg border border-muted"
                          />
                        </div>
                      ))}
                    </div>
                    {selectedProperty.photos?.length > 4 && (
                      <p className="text-sm text-textSecondary mt-2">
                        +{selectedProperty.photos.length - 4} more images
                      </p>
                    )}
                  </div>
                )}

                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold text-textMain mb-4">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-textSecondary">Title</p>
                      <p className="text-textMain">{selectedProperty.title}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-textSecondary">Type</p>
                      <p className="text-textMain capitalize">{selectedProperty.type || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-textSecondary">Price</p>
                      <p className="text-textMain">{formatPrice(selectedProperty.price)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-textSecondary">Status</p>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          selectedProperty.status === 'suspended'
                            ? 'bg-error text-error'
                            : selectedProperty.status === 'published'
                              ? 'bg-primary/20 text-primary'
                              : 'bg-accent/20 text-accent'
                        }`}
                      >
                        {selectedProperty.status || 'pending'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-textSecondary">City</p>
                      <p className="text-textMain">
                        {selectedProperty.address?.city || selectedProperty.city || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-textSecondary">Address</p>
                      <p className="text-textMain">
                        {selectedProperty.address?.line1 || selectedProperty.address || 'N/A'}
                      </p>
                    </div>
                    {selectedProperty.bedrooms && (
                      <div>
                        <p className="text-sm font-medium text-textSecondary">Bedrooms</p>
                        <p className="text-textMain">{selectedProperty.bedrooms}</p>
                      </div>
                    )}
                    {selectedProperty.bathrooms && (
                      <div>
                        <p className="text-sm font-medium text-textSecondary">Bathrooms</p>
                        <p className="text-textMain">{selectedProperty.bathrooms}</p>
                      </div>
                    )}
                    {selectedProperty.areaSqFt && (
                      <div>
                        <p className="text-sm font-medium text-textSecondary">Area</p>
                        <p className="text-textMain">{selectedProperty.areaSqFt} sq ft</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-textSecondary">Created</p>
                      <p className="text-textMain">{formatDate(selectedProperty.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedProperty.description && (
                  <div>
                    <h3 className="text-lg font-semibold text-textMain mb-2">Description</h3>
                    <p className="text-textSecondary whitespace-pre-wrap">{selectedProperty.description}</p>
                  </div>
                )}

                {/* Owner Info */}
                <div>
                  <h3 className="text-lg font-semibold text-textMain mb-4">Owner Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-textSecondary">Email</p>
                      <p className="text-textMain">{ownerEmails[selectedProperty.ownerId] || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-textSecondary">Name</p>
                      <p className="text-textMain">
                        {selectedProperty.ownerName || selectedProperty.ownerId || 'N/A'}
                      </p>
                    </div>
                    {selectedProperty.ownerPhone && (
                      <div>
                        <p className="text-sm font-medium text-textSecondary">Phone</p>
                        <p className="text-textMain">{selectedProperty.ownerPhone}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Amenities */}
                {selectedProperty.amenities?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-textMain mb-2">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProperty.amenities.map((amenity, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Modal>

          {/* Delete Property Confirmation Modal */}
          <Modal
            isOpen={deletePropertyModalOpen}
            onClose={() => {
              setDeletePropertyModalOpen(false);
              setPropertyToDelete(null);
            }}
            title="Delete Property"
            size="md"
          >
            <div className="space-y-4">
              <p className="text-textSecondary">
                Are you sure you want to delete property{' '}
                <strong>{propertyToDelete?.title || 'this property'}</strong>?
              </p>
              <div className="bg-error border border-error rounded-lg p-4">
                <p className="text-sm text-error">
                  <strong>Warning:</strong> This action cannot be undone. The property will be
                  permanently deleted from the system. The owner will be notified.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeletePropertyModalOpen(false);
                    setPropertyToDelete(null);
                  }}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteProperty}
                  loading={processing}
                  disabled={processing}
                >
                  Delete Property
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      );
    }

    // Manage Requests tab
    if (activeTab === 'requests') {
      const filteredRequests = getFilteredRequests();

      return (
        <div className="p-6">
          <h2 className="text-2xl font-bold text-textMain mb-6">Manage Requests</h2>

          {/* Filters */}
            <div className="bg-surface rounded-lg shadow-sm border border-muted p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Request Type
                </label>
                <select
                  value={requestFilters.type}
                  onChange={(e) =>
                    setRequestFilters((prev) => ({ ...prev, type: e.target.value }))
                  }
                  className="w-full px-4 py-2 border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Types</option>
                  <option value="Rental">Rental</option>
                  <option value="Buy/Sell">Buy/Sell</option>
                  <option value="Construction">Construction</option>
                  <option value="Renovation">Renovation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">Status</label>
                <select
                  value={requestFilters.status}
                  onChange={(e) =>
                    setRequestFilters((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="w-full px-4 py-2 border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="pending">pending</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Approved">Approved</option>
                  <option value="approved">approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="rejected">rejected</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">Start Date</label>
                <Input
                  type="date"
                  value={requestFilters.startDate}
                  onChange={(e) =>
                    setRequestFilters((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">End Date</label>
                <Input
                  type="date"
                  value={requestFilters.endDate}
                  onChange={(e) =>
                    setRequestFilters((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                />
              </div>
            </div>
            {(requestFilters.type ||
              requestFilters.status ||
              requestFilters.startDate ||
              requestFilters.endDate) && (
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setRequestFilters({ type: '', status: '', startDate: '', endDate: '' })
                  }
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>

          {requestsLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-surface rounded-lg shadow p-8 text-center">
              <FileText className="w-16 h-16 text-textSecondary mx-auto mb-4" />
              <p className="text-textSecondary">
                {allRequests.length === 0
                  ? 'No requests found'
                  : 'No requests match your filter criteria'}
              </p>
            </div>
          ) : (
            <div className="bg-surface rounded-lg shadow-sm border border-muted overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-muted">
                  <thead className="bg-background">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Requester
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Target
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface divide-y divide-muted">
                    {filteredRequests.map((request) => {
                      const requesterName = userNames[request.userId] || 'Loading...';
                      const targetName =
                        request.requestType === 'Rental' || request.requestType === 'Buy/Sell'
                          ? propertyTitles[request.propertyId] || 'Loading...'
                          : providerNames[request.providerId] || 'Loading...';

                      const getStatusColor = (status) => {
                        switch (status) {
                          case 'Accepted':
                          case 'Approved':
                          case 'Completed':
                            return 'bg-primary/20 text-primary';
                          case 'Rejected':
                          case 'Cancelled':
                            return 'bg-error text-error';
                          case 'In Progress':
                            return 'bg-primary/10 text-primary';
                          default:
                            return 'bg-accent text-accent';
                        }
                      };

                      return (
                        <tr key={`${request.collection}-${request.id}`} className="hover:bg-background">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                request.requestType === 'Rental'
                                  ? 'bg-primary/10 text-primary'
                                  : request.requestType === 'Buy/Sell'
                                    ? 'bg-primary text-primary'
                                    : request.requestType === 'Construction'
                                      ? 'bg-orange-100 text-orange-800'
                                      : 'bg-pink-100 text-pink-800'
                              }`}
                            >
                              {request.requestType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-textMain">{requesterName}</div>
                            <div className="text-xs text-textSecondary">{request.userId?.substring(0, 8)}...</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-textMain">{targetName}</div>
                            <div className="text-xs text-textSecondary">
                              {request.requestType === 'Rental' || request.requestType === 'Buy/Sell'
                                ? `Property: ${request.propertyId?.substring(0, 8)}...`
                                : `Provider: ${request.providerId?.substring(0, 8)}...`}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                request.status
                              )}`}
                            >
                              {request.status || 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">
                            {formatDate(request.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setViewRequestModalOpen(true);
                                }}
                                className="text-primary border-primary/30 hover:bg-primary/10"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              {request.status === 'pending' || request.status === 'Pending' ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdateRequestStatus(request, request.requestType === 'Provider Approval' ? 'approved' : 'Approved')}
                                    disabled={processing}
                                    className="text-primary border-primary/30 hover:bg-primary/10"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdateRequestStatus(request, request.requestType === 'Provider Approval' ? 'rejected' : 'Rejected')}
                                    disabled={processing}
                                    className="text-error border-error hover:bg-error"
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              ) : null}
                              {(request.status === 'Approved' || request.status === 'Accepted') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateRequestStatus(request, 'In Progress')}
                                  disabled={processing}
                                  className="text-primary border-primary/30 hover:bg-primary/10"
                                >
                                  <PlayCircle className="w-4 h-4 mr-1" />
                                  Start
                                </Button>
                              )}
                              {request.status === 'In Progress' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateRequestStatus(request, 'Completed')}
                                  disabled={processing}
                                  className="text-primary border-primary/30 hover:bg-primary/10"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Complete
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* View Request Modal */}
          <Modal
            isOpen={viewRequestModalOpen}
            onClose={() => {
              setViewRequestModalOpen(false);
              setSelectedRequest(null);
            }}
            title={`${selectedRequest?.requestType || 'Request'} Details`}
            size="lg"
          >
            {selectedRequest && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold text-textMain mb-4">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-textSecondary">Request Type</p>
                      <p className="text-textMain">{selectedRequest.requestType}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-textSecondary">Status</p>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          selectedRequest.status === 'Accepted' ||
                          selectedRequest.status === 'Approved' ||
                          selectedRequest.status === 'Completed'
                            ? 'bg-primary/20 text-primary'
                            : selectedRequest.status === 'Rejected' ||
                                selectedRequest.status === 'Cancelled'
                              ? 'bg-error text-error'
                              : selectedRequest.status === 'In Progress'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-accent text-accent'
                        }`}
                      >
                        {selectedRequest.status || 'Pending'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-textSecondary">Requester</p>
                      <p className="text-textMain">
                        {userNames[selectedRequest.userId] || 'Loading...'}
                      </p>
                      <p className="text-xs text-textSecondary">{selectedRequest.userId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-textSecondary">Created</p>
                      <p className="text-textMain">{formatDate(selectedRequest.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Request-specific details */}
                {selectedRequest.requestType === 'Rental' && (
                  <div>
                    <h3 className="text-lg font-semibold text-textMain mb-4">Rental Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-textSecondary">Property</p>
                        <p className="text-textMain">
                          {propertyTitles[selectedRequest.propertyId] || 'Loading...'}
                        </p>
                        <p className="text-xs text-textSecondary">{selectedRequest.propertyId}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-textSecondary">Start Date</p>
                        <p className="text-textMain">
                          {selectedRequest.startDate
                            ? new Date(selectedRequest.startDate).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-textSecondary">End Date</p>
                        <p className="text-textMain">
                          {selectedRequest.endDate
                            ? new Date(selectedRequest.endDate).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                    {selectedRequest.message && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-textSecondary mb-2">Message</p>
                        <p className="text-textSecondary whitespace-pre-wrap">{selectedRequest.message}</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedRequest.requestType === 'Buy/Sell' && (
                  <div>
                    <h3 className="text-lg font-semibold text-textMain mb-4">Purchase Offer Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-textSecondary">Property</p>
                        <p className="text-textMain">
                          {propertyTitles[selectedRequest.propertyId] || 'Loading...'}
                        </p>
                        <p className="text-xs text-textSecondary">{selectedRequest.propertyId}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-textSecondary">Offer Amount</p>
                        <p className="text-textMain">{formatPrice(selectedRequest.offerAmount)}</p>
                      </div>
                    </div>
                    {selectedRequest.message && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-textSecondary mb-2">Message</p>
                        <p className="text-textSecondary whitespace-pre-wrap">{selectedRequest.message}</p>
                      </div>
                    )}
                  </div>
                )}

                {(selectedRequest.requestType === 'Construction' ||
                  selectedRequest.requestType === 'Renovation') && (
                  <div>
                    <h3 className="text-lg font-semibold text-textMain mb-4">Project Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-textSecondary">Provider</p>
                        <p className="text-textMain">
                          {providerNames[selectedRequest.providerId] || 'Loading...'}
                        </p>
                        <p className="text-xs text-textSecondary">{selectedRequest.providerId}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-textSecondary">Budget</p>
                        <p className="text-textMain">{formatPrice(selectedRequest.budget)}</p>
                      </div>
                      {selectedRequest.timeline && (
                        <div>
                          <p className="text-sm font-medium text-textSecondary">Timeline</p>
                          <p className="text-textMain">{selectedRequest.timeline}</p>
                        </div>
                      )}
                      {selectedRequest.preferredDate && (
                        <div>
                          <p className="text-sm font-medium text-textSecondary">Preferred Date</p>
                          <p className="text-textMain">
                            {new Date(selectedRequest.preferredDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                    {(selectedRequest.description || selectedRequest.detailedDescription) && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-textSecondary mb-2">Description</p>
                        <p className="text-textSecondary whitespace-pre-wrap">
                          {selectedRequest.description || selectedRequest.detailedDescription}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Modal>
        </div>
      );
    }

    // Support Messages tab
    if (activeTab === 'support-messages') {
      return (
        <div className="p-6">
          <h2 className="text-2xl font-bold text-textMain mb-6">Support Messages</h2>

          {supportMessagesLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : supportMessages.length === 0 ? (
            <div className="bg-surface rounded-lg shadow p-8 text-center">
              <MessageSquare className="w-16 h-16 text-textSecondary mx-auto mb-4" />
              <p className="text-textSecondary">No support messages found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {supportMessages.map((message) => {
                const userName = userNames[message.userId] || 'Unknown';
                const userEmail = userEmails[message.userId] || 'N/A';
                const replies = messageReplies[message.id] || [];

                return (
                  <div
                    key={message.id}
                    className="bg-surface rounded-lg shadow-sm border border-muted p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-textMain">{message.subject}</h3>
                          {message.status && (
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                message.status === 'resolved' || message.status === 'closed'
                                  ? 'bg-primary/20 text-primary'
                                  : message.status === 'in-progress'
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-accent text-accent'
                              }`}
                            >
                              {message.status}
                            </span>
                          )}
                          {message.priority && (
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                message.priority === 'urgent'
                                  ? 'bg-error text-error'
                                  : message.priority === 'high'
                                    ? 'bg-orange-100 text-orange-800'
                                    : message.priority === 'medium'
                                      ? 'bg-accent text-accent'
                                      : 'bg-muted text-textMain'
                              }`}
                            >
                              {message.priority}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-textSecondary">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            <span>
                              <strong>From:</strong> {userName} ({userEmail})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              <strong>Created:</strong> {formatDate(message.createdAt)}
                            </span>
                          </div>
                          {message.updatedAt && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>
                                <strong>Updated:</strong> {formatDate(message.updatedAt)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedMessage(message);
                            setViewMessageModalOpen(true);
                          }}
                          className="text-primary border-primary/30 hover:bg-primary/10"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedMessage(message);
                            setReplyModalOpen(true);
                          }}
                          className="text-primary border-primary/30 hover:bg-primary/10"
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Reply
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setMessageToDelete(message);
                            setDeleteMessageModalOpen(true);
                          }}
                          className="text-error border-error hover:bg-error"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-medium text-textSecondary mb-2">Message:</p>
                      <p className="text-textSecondary whitespace-pre-wrap">{message.message}</p>
                    </div>

                    {/* Reply History */}
                    {replies.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-muted">
                        <p className="text-sm font-medium text-textSecondary mb-3">
                          Replies ({replies.length})
                        </p>
                        <div className="space-y-3">
                          {replies.map((reply) => (
                            <div
                              key={reply.id}
                              className="bg-background rounded-lg p-4 border border-muted"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-textMain">
                                    {reply.adminName || 'Admin'}
                                  </span>
                                  <span className="text-xs text-textSecondary">
                                    {formatDate(reply.createdAt)}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-textSecondary whitespace-pre-wrap">
                                {reply.replyText || reply.message}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* View Message Modal */}
          <Modal
            isOpen={viewMessageModalOpen}
            onClose={() => {
              setViewMessageModalOpen(false);
              setSelectedMessage(null);
            }}
            title={selectedMessage?.subject || 'Support Message'}
            size="lg"
          >
            {selectedMessage && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold text-textMain mb-4">Message Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-textSecondary">From</p>
                      <p className="text-textMain">
                        {userNames[selectedMessage.userId] || 'Unknown'} (
                        {userEmails[selectedMessage.userId] || 'N/A'})
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-textSecondary">Subject</p>
                      <p className="text-textMain">{selectedMessage.subject}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-textSecondary">Status</p>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          selectedMessage.status === 'resolved' || selectedMessage.status === 'closed'
                            ? 'bg-primary/20 text-primary'
                            : selectedMessage.status === 'in-progress'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-accent text-accent'
                        }`}
                      >
                        {selectedMessage.status || 'open'}
                      </span>
                    </div>
                    {selectedMessage.priority && (
                      <div>
                        <p className="text-sm font-medium text-textSecondary">Priority</p>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            selectedMessage.priority === 'urgent'
                              ? 'bg-error text-error'
                              : selectedMessage.priority === 'high'
                                ? 'bg-orange-100 text-orange-800'
                                : selectedMessage.priority === 'medium'
                                  ? 'bg-accent text-accent'
                                  : 'bg-muted text-textMain'
                          }`}
                        >
                          {selectedMessage.priority}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-textSecondary">Created</p>
                      <p className="text-textMain">{formatDate(selectedMessage.createdAt)}</p>
                    </div>
                    {selectedMessage.updatedAt && (
                      <div>
                        <p className="text-sm font-medium text-textSecondary">Updated</p>
                        <p className="text-textMain">{formatDate(selectedMessage.updatedAt)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Message Content */}
                <div>
                  <h3 className="text-lg font-semibold text-textMain mb-2">Message</h3>
                  <div className="bg-background rounded-lg p-4 border border-muted">
                    <p className="text-textSecondary whitespace-pre-wrap">{selectedMessage.message}</p>
                  </div>
                </div>

                {/* Reply History */}
                {messageReplies[selectedMessage.id] && messageReplies[selectedMessage.id].length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-textMain mb-4">
                      Reply History ({messageReplies[selectedMessage.id].length})
                    </h3>
                    <div className="space-y-3">
                      {messageReplies[selectedMessage.id].map((reply) => (
                        <div
                          key={reply.id}
                          className="bg-background rounded-lg p-4 border border-muted"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-textMain">
                                {reply.adminName || 'Admin'}
                              </span>
                              <span className="text-xs text-textSecondary">
                                {formatDate(reply.createdAt)}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-textSecondary whitespace-pre-wrap">
                            {reply.replyText || reply.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reply Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      setViewMessageModalOpen(false);
                      setReplyModalOpen(true);
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Reply to Message
                  </Button>
                </div>
              </div>
            )}
          </Modal>

          {/* Reply Modal */}
          <Modal
            isOpen={replyModalOpen}
            onClose={() => {
              setReplyModalOpen(false);
              setReplyText('');
              setSelectedMessage(null);
            }}
            title={`Reply to: ${selectedMessage?.subject || 'Support Message'}`}
            size="md"
          >
            <div className="space-y-4">
              {selectedMessage && (
                <div className="bg-background rounded-lg p-4 border border-muted">
                  <p className="text-sm font-medium text-textSecondary mb-2">Original Message:</p>
                  <p className="text-sm text-textSecondary whitespace-pre-wrap line-clamp-3">
                    {selectedMessage.message}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">
                  Your Reply
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                  placeholder="Enter your reply..."
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReplyModalOpen(false);
                    setReplyText('');
                    setSelectedMessage(null);
                  }}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReplyToMessage}
                  loading={processing}
                  disabled={processing || !replyText.trim()}
                >
                  Send Reply
                </Button>
              </div>
            </div>
          </Modal>

          {/* Delete Message Confirmation Modal */}
          <Modal
            isOpen={deleteMessageModalOpen}
            onClose={() => {
              setDeleteMessageModalOpen(false);
              setMessageToDelete(null);
            }}
            title="Delete Support Message"
            size="md"
          >
            <div className="space-y-4">
              <p className="text-textSecondary">
                Are you sure you want to delete the support message{' '}
                <strong>{messageToDelete?.subject || 'this message'}</strong>?
              </p>
              <div className="bg-error border border-error rounded-lg p-4">
                <p className="text-sm text-error">
                  <strong>Warning:</strong> This action cannot be undone. The message and all its
                  replies will be permanently deleted.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteMessageModalOpen(false);
                    setMessageToDelete(null);
                  }}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteMessage}
                  loading={processing}
                  disabled={processing}
                >
                  Delete Message
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      );
    }

    // Support Chats tab
    if (activeTab === 'support-chats') {
      return (
        <div className="p-6">
          <h2 className="text-2xl font-bold text-textMain mb-6">Support Chats</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat List */}
            <div className="lg:col-span-1">
              <div className="bg-surface rounded-lg shadow-sm border border-muted">
                <div className="p-4 border-b border-muted">
                  <h3 className="text-lg font-semibold text-textMain">Active Chats</h3>
                </div>
                {supportChatsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="md" />
                  </div>
                ) : supportChats.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageCircle className="w-12 h-12 text-textSecondary mx-auto mb-4" />
                    <p className="text-textSecondary">No support chats found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                    {supportChats.map((chat) => {
                      // In new structure, document ID is userId, so use chat.id or chat.userId
                      const chatUserId = chat.userId || chat.id;
                      const userName = userNames[chatUserId] || 'Unknown User';
                      const isSelected = selectedChat?.id === chat.id;
                      const hasUnread = chat.unreadForAdmin;

                      return (
                        <button
                          key={chat.id}
                          onClick={() => setSelectedChat(chat)}
                          className={`w-full p-4 text-left hover:bg-background transition-colors ${
                            isSelected ? 'bg-primary/10 border-l-4 border-primary' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-medium text-textMain truncate">
                                  {userName}
                                </p>
                                {hasUnread && (
                                  <span className="flex-shrink-0 w-2 h-2 bg-primary rounded-full"></span>
                                )}
                              </div>
                              {chat.lastMessage && (
                                <p className="text-xs text-textSecondary truncate">
                                  {chat.lastMessage}
                                </p>
                              )}
                              <p className="text-xs text-textSecondary mt-1">
                                {formatDate(chat.updatedAt || chat.createdAt)}
                              </p>
                            </div>
                            {chat.status && (
                              <span
                                className={`ml-2 px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                                  chat.status === 'active'
                                    ? 'bg-primary/20 text-primary'
                                    : chat.status === 'resolved'
                                      ? 'bg-muted text-textMain'
                                      : 'bg-error text-error'
                                }`}
                              >
                                {chat.status}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Chat Window */}
            <div className="lg:col-span-2">
              {selectedChat ? (
                <div className="bg-surface rounded-lg shadow-sm border border-muted flex flex-col h-[600px]">
                  {/* Chat Header */}
                  <div className="p-4 border-b border-muted">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-textMain">
                          {userNames[selectedChat.userId || selectedChat.id] || 'Unknown User'}
                        </h3>
                        <p className="text-sm text-textSecondary">
                          {userEmails[selectedChat.userId || selectedChat.id] || selectedChat.userId || selectedChat.id}
                        </p>
                      </div>
                      {selectedChat.status && (
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            selectedChat.status === 'active'
                              ? 'bg-primary/20 text-primary'
                              : selectedChat.status === 'resolved'
                                ? 'bg-muted text-textMain'
                                : 'bg-error text-error'
                          }`}
                        >
                          {selectedChat.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatMessages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-textSecondary">No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      chatMessages.map((message) => {
                        const isAdmin = message.isAdmin || message.senderId === currentUser?.uid;

                        return (
                          <div
                            key={message.id}
                            className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                isAdmin
                                  ? 'bg-primary text-white'
                                  : 'bg-muted text-textMain'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  isAdmin ? 'text-white/80' : 'text-textSecondary'
                                }`}
                              >
                                {formatDate(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-muted">
                    <div className="flex gap-2">
                      <textarea
                        value={newMessageText}
                        onChange={(e) => setNewMessageText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendChatMessage();
                          }
                        }}
                        rows={2}
                        className="flex-1 px-4 py-2 border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                        placeholder="Type your message..."
                        disabled={processing}
                      />
                      <Button
                        onClick={handleSendChatMessage}
                        loading={processing}
                        disabled={processing || !newMessageText.trim()}
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-surface rounded-lg shadow-sm border border-muted h-[600px] flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 text-textSecondary mx-auto mb-4" />
                    <p className="text-textSecondary">Select a chat to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Manage Reviews tab
    if (activeTab === 'reviews') {

      const getFilteredReviews = () => {
        let filtered = [...allReviews];
        if (reviewFilters.targetType) {
          filtered = filtered.filter((r) => r.targetType === reviewFilters.targetType);
        }
        if (reviewFilters.minRating) {
          filtered = filtered.filter((r) => r.rating >= Number(reviewFilters.minRating));
        }
        return filtered;
      };

      const handleDeleteReview = async () => {
        if (!reviewToDelete) return;
        try {
          setProcessing(true);
          await reviewsService.delete(reviewToDelete.id);
          setAllReviews((prev) => prev.filter((r) => r.id !== reviewToDelete.id));
          toast.success('Review deleted successfully');
          setDeleteReviewModalOpen(false);
          setReviewToDelete(null);
        } catch (error) {
          console.error('Error deleting review:', error);
          toast.error('Failed to delete review');
        } finally {
          setProcessing(false);
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

      const filteredReviews = getFilteredReviews();

      return (
        <div className="p-6">
          <h2 className="text-2xl font-bold text-textMain mb-6">Manage Reviews</h2>

          {/* Filters */}
            <div className="bg-surface rounded-lg shadow-sm border border-muted p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Target Type
                </label>
                <select
                  value={reviewFilters.targetType}
                  onChange={(e) =>
                    setReviewFilters((prev) => ({ ...prev, targetType: e.target.value }))
                  }
                  className="w-full px-4 py-2 border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Types</option>
                  <option value="property">Property</option>
                  <option value="construction">Construction</option>
                  <option value="renovation">Renovation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">Minimum Rating</label>
                <select
                  value={reviewFilters.minRating}
                  onChange={(e) =>
                    setReviewFilters((prev) => ({ ...prev, minRating: e.target.value }))
                  }
                  className="w-full px-4 py-2 border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Ratings</option>
                  <option value="1">1+ Stars</option>
                  <option value="2">2+ Stars</option>
                  <option value="3">3+ Stars</option>
                  <option value="4">4+ Stars</option>
                  <option value="5">5 Stars</option>
                </select>
              </div>
            </div>
            {(reviewFilters.targetType || reviewFilters.minRating) && (
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setReviewFilters({ targetType: '', minRating: '' })}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>

          {reviewsLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="bg-surface rounded-lg shadow p-8 text-center">
              <Star className="w-16 h-16 text-textSecondary mx-auto mb-4" />
              <p className="text-textSecondary">
                {allReviews.length === 0
                  ? 'No reviews found'
                  : 'No reviews match your filter criteria'}
              </p>
            </div>
          ) : (
            <div className="bg-surface rounded-lg shadow-sm border border-muted overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-muted">
                  <thead className="bg-background">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Reviewer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Target Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Rating
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Comment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface divide-y divide-muted">
                    {filteredReviews.map((review) => {
                      const reviewerName = userNames[review.reviewerId] || 'Loading...';
                      return (
                        <tr key={review.id} className="hover:bg-background">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-textMain">{reviewerName}</div>
                            <div className="text-xs text-textSecondary">{review.reviewerId?.substring(0, 8)}...</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                review.targetType === 'property'
                                  ? 'bg-primary/10 text-primary'
                                  : review.targetType === 'construction'
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-pink-100 text-pink-800'
                              }`}
                            >
                              {review.targetType}
                            </span>
                            <div className="text-xs text-textSecondary mt-1">
                              ID: {review.targetId?.substring(0, 8)}...
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating
                                      ? 'text-accent fill-yellow-400'
                                      : 'text-muted'
                                  }`}
                                />
                              ))}
                              <span className="ml-2 text-sm font-medium text-textMain">
                                {review.rating}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-textMain max-w-xs truncate">
                              {review.comment}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">
                            {formatDate(review.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setReviewToDelete(review);
                                setDeleteReviewModalOpen(true);
                              }}
                              className="text-error border-error hover:bg-error"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Delete Review Modal */}
          <Modal
            isOpen={deleteReviewModalOpen}
            onClose={() => {
              setDeleteReviewModalOpen(false);
              setReviewToDelete(null);
            }}
            title="Delete Review"
            size="md"
          >
            <div className="space-y-4">
              <p className="text-textSecondary">
                Are you sure you want to delete this review? This action cannot be undone.
              </p>
              {reviewToDelete && (
                <div className="bg-background p-4 rounded-lg">
                  <p className="text-sm text-textSecondary mb-2">
                    <strong>Rating:</strong> {reviewToDelete.rating} stars
                  </p>
                  <p className="text-sm text-textSecondary">
                    <strong>Comment:</strong> {reviewToDelete.comment.substring(0, 100)}
                    {reviewToDelete.comment.length > 100 ? '...' : ''}
                  </p>
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteReviewModalOpen(false);
                    setReviewToDelete(null);
                  }}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteReview}
                  loading={processing}
                  disabled={processing}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Review
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      );
    }

    // Transactions tab
    if (activeTab === 'transactions') {
      const getFilteredTransactions = () => {
        let filtered = [...allTransactions];
        if (transactionFilters.status) {
          filtered = filtered.filter((t) => t.status === transactionFilters.status);
        }
        if (transactionFilters.targetType) {
          filtered = filtered.filter((t) => t.targetType === transactionFilters.targetType);
        }
        if (transactionFilters.userId) {
          filtered = filtered.filter((t) => t.userId === transactionFilters.userId);
        }
        return filtered;
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

      const formatCurrency = (amount, currency = 'PKR') => {
        return new Intl.NumberFormat('en-PK', {
          style: 'currency',
          currency: currency,
        }).format(amount);
      };

      const filteredTransactions = getFilteredTransactions();

      return (
        <div className="p-6">
          <h2 className="text-2xl font-bold text-textMain mb-6">Transaction Logs</h2>

          {/* Filters */}
            <div className="bg-surface rounded-lg shadow-sm border border-muted p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Status
                </label>
                <select
                  value={transactionFilters.status}
                  onChange={(e) =>
                    setTransactionFilters((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="w-full px-4 py-2 border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">Target Type</label>
                <select
                  value={transactionFilters.targetType}
                  onChange={(e) =>
                    setTransactionFilters((prev) => ({ ...prev, targetType: e.target.value }))
                  }
                  className="w-full px-4 py-2 border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Types</option>
                  <option value="construction">Construction</option>
                  <option value="renovation">Renovation</option>
                  <option value="rental">Rental</option>
                  <option value="buySell">Buy/Sell</option>
                  <option value="property">Property</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">User ID</label>
                <Input
                  type="text"
                  value={transactionFilters.userId}
                  onChange={(e) =>
                    setTransactionFilters((prev) => ({ ...prev, userId: e.target.value }))
                  }
                  placeholder="Filter by user ID..."
                  className="w-full"
                />
              </div>
            </div>
            {(transactionFilters.status ||
              transactionFilters.targetType ||
              transactionFilters.userId) && (
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setTransactionFilters({ status: '', targetType: '', userId: '' })
                  }
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>

          {transactionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="bg-surface rounded-lg shadow p-8 text-center">
              <CreditCard className="w-16 h-16 text-textSecondary mx-auto mb-4" />
              <p className="text-textSecondary">
                {allTransactions.length === 0
                  ? 'No transactions found'
                  : 'No transactions match your filter criteria'}
              </p>
            </div>
          ) : (
            <div className="bg-surface rounded-lg shadow-sm border border-muted overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-muted">
                  <thead className="bg-background">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Target
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface divide-y divide-muted">
                    {filteredTransactions.map((transaction) => {
                      const userName = userNames[transaction.userId] || 'Loading...';
                      return (
                        <tr key={transaction.id} className="hover:bg-background">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-textMain">{userName}</div>
                            <div className="text-xs text-textSecondary">
                              {transaction.userId?.substring(0, 8)}...
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                transaction.targetType === 'construction'
                                  ? 'bg-orange-100 text-orange-800'
                                  : transaction.targetType === 'renovation'
                                    ? 'bg-pink-100 text-pink-800'
                                    : transaction.targetType === 'rental'
                                      ? 'bg-primary/10 text-primary'
                                      : transaction.targetType === 'buySell'
                                        ? 'bg-primary text-primary'
                                        : 'bg-muted text-textMain'
                              }`}
                            >
                              {transaction.targetType}
                            </span>
                            <div className="text-xs text-textSecondary mt-1">
                              ID: {transaction.targetId?.substring(0, 8)}...
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-textMain">
                              {formatCurrency(transaction.amount, transaction.currency)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                transaction.status === 'success'
                                  ? 'bg-primary/20 text-primary'
                                  : transaction.status === 'failed'
                                    ? 'bg-error text-error'
                                    : 'bg-accent text-accent'
                              }`}
                            >
                              {transaction.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">
                            {formatDate(transaction.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Notifications Sender tab
    if (activeTab === 'notifications') {
      return (
        <div className="p-6">
          <h2 className="text-2xl font-bold text-textMain mb-6">Send Notifications</h2>

          <div className="bg-surface rounded-lg shadow-sm border border-muted p-6 max-w-2xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendNotifications();
              }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">
                  Notification Title *
                </label>
                <Input
                  type="text"
                  value={notificationForm.title}
                  onChange={(e) =>
                    setNotificationForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Enter notification title..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">
                  Message *
                </label>
                <textarea
                  value={notificationForm.message}
                  onChange={(e) =>
                    setNotificationForm((prev) => ({ ...prev, message: e.target.value }))
                  }
                  rows={6}
                  className="w-full px-4 py-2 border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                  placeholder="Enter notification message..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">
                  Target Audience *
                </label>
                <select
                  value={notificationForm.target}
                  onChange={(e) =>
                    setNotificationForm((prev) => ({ ...prev, target: e.target.value }))
                  }
                  className="w-full px-4 py-2 border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                >
                  <option value="all-users">All Users</option>
                  <option value="all-providers">All Providers</option>
                  <option value="single-uid">Single User (by UID)</option>
                </select>
              </div>

              {notificationForm.target === 'single-uid' && (
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-2">
                    User UID *
                  </label>
                  <Input
                    type="text"
                    value={notificationForm.singleUid}
                    onChange={(e) =>
                      setNotificationForm((prev) => ({ ...prev, singleUid: e.target.value }))
                    }
                    placeholder="Enter user UID..."
                    required
                  />
                </div>
              )}

              {sendingNotifications && notificationProgress.total > 0 && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-primary">Sending notifications...</span>
                    <span className="text-sm text-primary">
                      {notificationProgress.sent} / {notificationProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-primary/20 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(notificationProgress.sent / notificationProgress.total) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  loading={sendingNotifications}
                  disabled={sendingNotifications || !notificationForm.title.trim() || !notificationForm.message.trim()}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Send Notifications
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setNotificationForm({ title: '', message: '', target: 'all-users', singleUid: '' })
                  }
                  disabled={sendingNotifications}
                >
                  Clear
                </Button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    // Fallback for unknown tabs
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-textMain mb-4">Page Not Found</h2>
        <div className="bg-surface rounded-lg shadow p-8 text-center">
          <p className="text-textSecondary">This tab is not yet implemented.</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface shadow-sm border-b border-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-textMain">Admin Panel</h1>
          <p className="text-sm text-textSecondary mt-1">Manage your platform</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <nav className="bg-surface rounded-lg shadow-sm border border-muted p-2">
              <ul className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <li key={tab.key}>
                      <button
                        onClick={() => setActiveTab(tab.key)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                          isActive
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-textSecondary hover:bg-background'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-textSecondary'}`} />
                        <span>{tab.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          {/* Right Content Area */}
          <main className="flex-1 min-w-0">
            <div className="bg-surface rounded-lg shadow-sm border border-muted">
              {renderTabContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
