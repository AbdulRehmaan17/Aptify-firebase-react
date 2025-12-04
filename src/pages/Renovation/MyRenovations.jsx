import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { getOrCreateChat } from '../../utils/chatHelpers';
import {
  Wrench,
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
  Star,
} from 'lucide-react';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const MyRenovations = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);

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
        collection(db, 'renovationProjects'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        requestsQuery,
        (snapshot) => {
          const requestsList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setRequests(requestsList);
          setLoading(false);
        },
        (error) => {
          console.error('Error loading requests:', error);
          // Fallback without orderBy
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            const fallbackQuery = query(
              collection(db, 'renovationProjects'),
              where('userId', '==', currentUser.uid)
            );
            const fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              (fallbackSnapshot) => {
                const requestsList = fallbackSnapshot.docs
                  .map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                  }))
                  .sort((a, b) => {
                    const aTime = a.createdAt?.toDate?.() || new Date(0);
                    const bTime = b.createdAt?.toDate?.() || new Date(0);
                    return bTime - aTime;
                  });
                setRequests(requestsList);
                setLoading(false);
              },
              (fallbackError) => {
                console.error('Error loading requests (fallback):', fallbackError);
                toast.error('Failed to load requests');
                setLoading(false);
              }
            );
            return () => fallbackUnsubscribe();
          } else {
            toast.error('Failed to load requests');
            setLoading(false);
          }
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up requests listener:', error);
      setLoading(false);
    }
  };

  const handleStartChat = async (request) => {
    if (!request.providerId) {
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

  const handleReview = (request) => {
    navigate(`/renovation/my-renovations/${request.id}?tab=review`);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getStatusColor = (status) => {
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
    const timeline = [];
    
    timeline.push({
      status: 'Request Submitted',
      date: request.createdAt,
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
        date: request.updatedAt || request.acceptedAt,
        completed: true,
        icon: <CheckCircle className="w-4 h-4" />,
      });
    }

    if (request.status === 'In Progress' || request.status === 'Completed') {
      timeline.push({
        status: 'Work In Progress',
        date: request.inProgressAt || request.updatedAt,
        completed: true,
        icon: <Clock className="w-4 h-4" />,
      });
    }

    if (request.status === 'Completed') {
      timeline.push({
        status: 'Project Completed',
        date: request.completedAt || request.updatedAt,
        completed: true,
        icon: <CheckCircle className="w-4 h-4" />,
      });
    }

    if (request.status === 'Rejected') {
      timeline.push({
        status: 'Request Rejected',
        date: request.updatedAt || request.rejectedAt,
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

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-textMain">My Renovation Requests</h1>
            <p className="text-textSecondary mt-2">View and manage your renovation project requests</p>
          </div>
          <Button onClick={() => navigate('/renovation/request')} className="flex items-center">
            <Wrench className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </div>

        {/* Requests List */}
        {requests.length === 0 ? (
          <div className="bg-surface rounded-base shadow-md p-12 border border-muted text-center">
            <Wrench className="w-16 h-16 text-textSecondary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-textMain mb-2">No renovation requests yet</h2>
            <p className="text-textSecondary mb-6">Start by submitting a renovation project request</p>
            <Button onClick={() => navigate('/renovation/request')}>
              Submit New Request
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {requests.map((request) => {
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
                              <span className="ml-2">{request.status}</span>
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-textMain mb-2 capitalize">
                            {request.serviceCategory || 'Renovation Project'}
                          </h3>
                          <p className="text-sm text-textSecondary line-clamp-2 mb-2">
                            {request.detailedDescription || request.description}
                          </p>
                          <div className="flex items-center text-sm text-textSecondary mb-2">
                            <MapPin className="w-4 h-4 mr-2" />
                            <span>
                              {request.location || request.propertyAddress}, {request.city || 'N/A'}
                            </span>
                          </div>
                        </div>
                        <Link
                          to={`/renovation/my-renovations/${request.id}`}
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
                          <p className="text-xs text-textSecondary mb-1">Preferred Date</p>
                          <p className="text-sm font-medium text-textMain">
                            {formatDate(request.preferredDate)}
                          </p>
                        </div>
                      </div>

                      {/* Provider Info */}
                      {request.providerId && (
                        <div className="mb-4 p-3 bg-background rounded-base">
                          <p className="text-xs text-textSecondary mb-1">Assigned Provider</p>
                          <p className="text-sm font-medium text-textMain">
                            Provider ID: {request.providerId.slice(0, 8)}...
                          </p>
                        </div>
                      )}

                      {/* Quote Info */}
                      {request.quote && (
                        <div className="mb-4 p-3 bg-background rounded-base">
                          <p className="text-xs text-textSecondary mb-1">Provider Quote</p>
                          <p className="text-sm font-medium text-primary">
                            {formatPrice(request.quote)}
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
                        {timeline.map((item, index) => (
                          <div key={index} className="flex items-start space-x-3">
                            <div
                              className={`mt-0.5 ${
                                item.completed ? 'text-green-500' : 'text-textSecondary'
                              }`}
                            >
                              {item.icon}
                            </div>
                            <div className="flex-1">
                              <p
                                className={`text-sm ${
                                  item.completed ? 'text-textMain' : 'text-textSecondary'
                                }`}
                              >
                                {item.status}
                              </p>
                              {item.date && (
                                <p className="text-xs text-textSecondary mt-1">
                                  {formatDate(item.date)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
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
                      {request.status === 'Completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReview(request)}
                          className="flex items-center"
                        >
                          <Star className="w-4 h-4 mr-2" />
                          Leave Review
                        </Button>
                      )}
                    </div>
                    <Link
                      to={`/renovation/my-renovations/${request.id}`}
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

export default MyRenovations;






