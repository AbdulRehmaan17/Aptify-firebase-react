import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { getOrCreateChat } from '../../utils/chatHelpers';
import {
  Hammer,
  Calendar,
  DollarSign,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  Eye,
  ArrowRight,
} from 'lucide-react';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const MyConstructionRequests = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [updatesMap, setUpdatesMap] = useState({}); // Map of requestId -> updates array

  useEffect(() => {
    if (!authLoading && currentUser) {
      loadRequests();
    } else if (!authLoading && !currentUser) {
      setLoading(false);
    }
  }, [authLoading, currentUser]);

  const loadRequests = () => {
    if (!currentUser || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const requestsQuery = query(
        collection(db, 'constructionProjects'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        requestsQuery,
        async (snapshot) => {
          try {
            const requestsList = (snapshot.docs || []).map((doc) => {
              if (!doc || !doc.id) return null;
              return {
                id: doc.id,
                ...doc.data(),
              };
            }).filter(Boolean); // Remove any null entries
          
            // Load updates for each request using a safe async pattern
            const fetchUpdates = async () => {
              try {
                const updatesPromises = (requestsList || []).map(async (request) => {
                  if (!request || !request.id) {
                    return null;
                  }
                  try {
                    const updatesQuery = query(
                      collection(db, 'constructionProjects', request.id, 'updates'),
                      orderBy('createdAt', 'asc')
                    );
                    const updatesSnapshot = await getDocs(updatesQuery);
                    return {
                      requestId: request.id,
                      updates: (updatesSnapshot.docs || [])
                        .map((doc) => {
                          if (!doc || !doc.id) return null;
                          return {
                            id: doc.id,
                            ...doc.data(),
                          };
                        })
                        .filter(Boolean),
                    };
                  } catch (error) {
                    console.error(`Error loading updates for request ${request?.id}:`, error);
                    return {
                      requestId: request?.id || null,
                      updates: [],
                    };
                  }
                });

                const results = await Promise.all(updatesPromises);
                const safeResults =
                  (results || []).filter(
                    (item) => item && item.requestId && Array.isArray(item.updates)
                  ) || [];

                const newUpdatesMap = {};
                safeResults.forEach(({ requestId, updates }) => {
                  newUpdatesMap[requestId] = updates;
                });

                setUpdatesMap(newUpdatesMap);
              } catch (error) {
                console.error('Error fetching updates:', error);
                setUpdatesMap({});
              }
            };

            await fetchUpdates();
            
            setRequests(requestsList || []);
            setLoading(false);
          } catch (error) {
            console.error('Error processing snapshot:', error);
            setRequests([]);
            setUpdatesMap({});
            setLoading(false);
          }
        },
        (error) => {
          console.error('Error loading requests:', error);
          // Fallback without orderBy
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            const fallbackQuery = query(
              collection(db, 'constructionProjects'),
              where('userId', '==', currentUser.uid)
            );
            const fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              async (fallbackSnapshot) => {
                try {
                  const requestsList = (fallbackSnapshot.docs || [])
                    .map((doc) => {
                      if (!doc || !doc.id) return null;
                      return {
                        id: doc.id,
                        ...doc.data(),
                      };
                    })
                    .filter(Boolean)
                    .sort((a, b) => {
                      const aTime = a.createdAt?.toDate?.() || new Date(0);
                      const bTime = b.createdAt?.toDate?.() || new Date(0);
                      return bTime - aTime;
                    });
                  
                  // Load updates for each request using a safe async pattern
                  const fetchUpdates = async () => {
                    try {
                      const updatesPromises = (requestsList || []).map(async (request) => {
                        if (!request || !request.id) {
                          return null;
                        }
                        try {
                          const updatesQuery = query(
                            collection(db, 'constructionProjects', request.id, 'updates'),
                            orderBy('createdAt', 'asc')
                          );
                          const updatesSnapshot = await getDocs(updatesQuery);
                          return {
                            requestId: request.id,
                            updates: (updatesSnapshot.docs || [])
                              .map((doc) => {
                                if (!doc || !doc.id) return null;
                                return {
                                  id: doc.id,
                                  ...doc.data(),
                                };
                              })
                              .filter(Boolean),
                          };
                        } catch (error) {
                          console.error(`Error loading updates for request ${request?.id}:`, error);
                          return {
                            requestId: request?.id || null,
                            updates: [],
                          };
                        }
                      });

                      const results = await Promise.all(updatesPromises);
                      const safeResults =
                        (results || []).filter(
                          (item) => item && item.requestId && Array.isArray(item.updates)
                        ) || [];

                      const newUpdatesMap = {};
                      safeResults.forEach(({ requestId, updates }) => {
                        newUpdatesMap[requestId] = updates;
                      });

                      setUpdatesMap(newUpdatesMap);
                    } catch (error) {
                      console.error('Error fetching updates:', error);
                      setUpdatesMap({});
                    }
                  };

                  await fetchUpdates();
                  
                  setRequests(requestsList || []);
                  setLoading(false);
                } catch (error) {
                  console.error('Error processing fallback snapshot:', error);
                  setRequests([]);
                  setUpdatesMap({});
                  setLoading(false);
                }
              },
              (fallbackError) => {
                console.error('Error loading requests (fallback):', fallbackError);
                toast.error('Failed to load requests');
                setRequests([]);
                setUpdatesMap({});
                setLoading(false);
              }
            );
            return () => fallbackUnsubscribe();
          } else {
            toast.error('Failed to load requests');
            setRequests([]);
            setUpdatesMap({});
            setLoading(false);
          }
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up requests listener:', error);
      setRequests([]);
      setUpdatesMap({});
      setLoading(false);
    }
  };

  const handleStartChat = async (request) => {
    if (!request || !request.providerId || !currentUser) {
      toast.error('No provider assigned yet');
      return;
    }

    try {
      const chatId = await getOrCreateChat(currentUser.uid, request.providerId);
      navigate(`/chat?chatId=${chatId}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const d = date?.toDate ? date.toDate() : new Date(date);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return 'N/A';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
      }).format(price);
    } catch (error) {
      console.error('Error formatting price:', error);
      return 'N/A';
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'text-gray-600 bg-gray-100';
    const statusMap = {
      Pending: 'text-yellow-600 bg-yellow-100',
      Accepted: 'text-green-600 bg-green-100',
      'In Progress': 'text-blue-600 bg-blue-100',
      Completed: 'text-green-600 bg-green-100',
      Rejected: 'text-red-600 bg-red-100',
      Cancelled: 'text-gray-600 bg-gray-100',
    };
    return statusMap[status] || 'text-gray-600 bg-gray-100';
  };

  const getStatusIcon = (status) => {
    if (!status) return <AlertCircle className="w-4 h-4" />;
    switch (status) {
      case 'Accepted':
      case 'Completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'Rejected':
        return <XCircle className="w-4 h-4" />;
      case 'In Progress':
        return <Clock className="w-4 h-4" />;
      case 'Pending':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusTimeline = (request) => {
    if (!request) return [];
    const timeline = [];
    
    timeline.push({
      status: 'Request Submitted',
      date: request.createdAt || null,
      completed: true,
      icon: <CheckCircle className="w-4 h-4" />,
    });

    if (request.status === 'Pending') {
      timeline.push({
        status: 'Awaiting Provider Response',
        date: null,
        completed: false,
        icon: <Clock className="w-4 h-4" />,
      });
    }

    if (request.status === 'Accepted' || request.status === 'In Progress' || request.status === 'Completed') {
      timeline.push({
        status: 'Request Accepted',
        date: request.updatedAt || request.acceptedAt || null,
        completed: true,
        icon: <CheckCircle className="w-4 h-4" />,
      });
    }

    if (request.status === 'In Progress' || request.status === 'Completed') {
      timeline.push({
        status: 'Work In Progress',
        date: request.inProgressAt || request.updatedAt || null,
        completed: true,
        icon: <Clock className="w-4 h-4" />,
      });
    }

    if (request.status === 'Completed') {
      timeline.push({
        status: 'Project Completed',
        date: request.completedAt || request.updatedAt || null,
        completed: true,
        icon: <CheckCircle className="w-4 h-4" />,
      });
    }

    if (request.status === 'Rejected') {
      timeline.push({
        status: 'Request Rejected',
        date: request.updatedAt || request.rejectedAt || null,
        completed: true,
        icon: <XCircle className="w-4 h-4" />,
      });
    }

    return timeline;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-textSecondary mb-4">Please log in to view your requests</p>
          <Button onClick={() => navigate('/login')}>Login</Button>
        </div>
      </div>
    );
  }

  const requestsList = Array.isArray(requests) ? requests : [];

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-textMain">My Construction Requests</h1>
            <p className="text-textSecondary mt-2">View and manage your construction project requests</p>
          </div>
          <Button onClick={() => navigate('/construction/request')} className="flex items-center">
            <Hammer className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </div>

        {/* Requests List */}
        {requestsList.length === 0 ? (
          <div className="bg-surface rounded-base shadow-md p-12 border border-muted text-center">
            <Hammer className="w-16 h-16 text-textSecondary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-textMain mb-2">No construction requests yet</h2>
            <p className="text-textSecondary mb-6">Start by submitting a construction project request</p>
            <Button onClick={() => navigate('/construction/request')}>
              Submit New Request
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {requestsList.map((request) => {
              if (!request || !request.id) return null;
              const timeline = getStatusTimeline(request);

              return (
                <div
                  key={request.id}
                  className="bg-surface rounded-base shadow-md p-6 border border-muted"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Request Info */}
                    <div className="lg:col-span-2">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                                request.status
                              )}`}
                            >
                              {getStatusIcon(request.status)}
                              <span className="ml-2">{request.status || 'Unknown'}</span>
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-textMain mb-2 capitalize">
                            {request.projectType || 'Construction Project'}
                          </h3>
                          <p className="text-sm text-textSecondary line-clamp-2 mb-2">
                            {request.description || request.details || 'No description provided'}
                          </p>
                          <div className="flex items-center text-sm text-textSecondary mb-2">
                            <MapPin className="w-4 h-4 mr-2" />
                            <span>
                              {request.location || request.propertyAddress || 'N/A'}, {request.city || 'N/A'}
                            </span>
                          </div>
                        </div>
                        <Link
                          to={`/construction/my-requests/${request.id}`}
                          className="text-primary hover:text-primaryDark"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                      </div>

                      {/* Project Details */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-textSecondary mb-1">Budget</p>
                          <p className="text-sm font-medium text-textMain">
                            {formatPrice(request.budget)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-textSecondary mb-1">Timeline</p>
                          <p className="text-sm font-medium text-textMain">
                            {request.timeline || 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* Provider Info */}
                      {request.providerId && (
                        <div className="mb-4 p-3 bg-background rounded-base">
                          <p className="text-xs text-textSecondary mb-1">Assigned Provider</p>
                          <p className="text-sm font-medium text-textMain">
                            Provider ID: {String(request.providerId).slice(0, 8)}...
                          </p>
                        </div>
                      )}

                      {/* Created Date */}
                      <p className="text-xs text-textSecondary">
                        Created: {formatDate(request.createdAt)}
                      </p>
                    </div>

                    {/* Status Timeline */}
                    <div>
                      <h4 className="text-sm font-semibold text-textMain mb-3">Progress Timeline</h4>
                      <div className="space-y-3">
                        {Array.isArray(timeline) && timeline.length > 0 ? (
                          timeline.map((item, index) => {
                            if (!item) return null;
                            return (
                              <div key={index} className="flex items-start space-x-3">
                                <div
                                  className={`mt-0.5 ${
                                    item.completed ? 'text-green-500' : 'text-textSecondary'
                                  }`}
                                >
                                  {item.icon || <AlertCircle className="w-4 h-4" />}
                                </div>
                                <div className="flex-1">
                                  <p
                                    className={`text-sm ${
                                      item.completed ? 'text-textMain' : 'text-textSecondary'
                                    }`}
                                  >
                                    {item.status || 'Unknown'}
                                  </p>
                                  {item.note && (
                                    <p className="text-xs text-textSecondary mt-0.5">
                                      {item.note}
                                    </p>
                                  )}
                                  {item.date && (
                                    <p className="text-xs text-textSecondary mt-1">
                                      {formatDate(item.date)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-textSecondary">No timeline data available</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-4 border-t border-muted flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {request.providerId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartChat(request)}
                          className="flex items-center"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Chat with Provider
                        </Button>
                      )}
                    </div>
                    <Link
                      to={`/construction/my-requests/${request.id}`}
                      className="text-sm text-primary hover:text-primaryDark flex items-center"
                    >
                      View Details <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
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

export default MyConstructionRequests;
