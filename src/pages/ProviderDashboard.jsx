import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  Star,
  TrendingUp,
  Edit2,
  Settings,
  Briefcase,
  Award,
  AlertCircle,
  MapPin,
  Phone,
  Mail,
  Building2,
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { updateDocById } from '../firebase/firestoreFunctions';
import reviewsService from '../services/reviewsService';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';

const ProviderDashboard = () => {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRequests: 0,
    activeJobs: 0,
    completedJobs: 0,
    earnings: 0,
    averageRating: 0,
    totalReviews: 0,
  });
  const [recentRequests, setRecentRequests] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({
    businessName: '',
    phone: '',
    email: '',
    address: '',
    bio: '',
    specialties: '',
  });

  useEffect(() => {
    if (!authLoading && currentUser) {
      loadDashboardData();
    }
  }, [authLoading, currentUser]);

  useEffect(() => {
    if (userProfile) {
      setIsAvailable(userProfile.available !== false);
      setProfileData({
        businessName: userProfile.businessName || userProfile.displayName || '',
        phone: userProfile.phone || '',
        email: currentUser?.email || '',
        address: userProfile.address || userProfile.addresses?.[0]?.fullAddress || '',
        bio: userProfile.bio || '',
        specialties: userProfile.specialties || userProfile.specialization || '',
      });
    }
  }, [userProfile, currentUser]);

  const loadDashboardData = async () => {
    if (!currentUser || !db) return;

    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadRecentRequests(),
        loadReviews(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const providerId = currentUser.uid;
      const role = userProfile?.role;

      // Determine collection names based on role
      let constructionCollection = 'constructionProjects';
      let renovationCollection = 'renovationProjects';

      // Get all requests for this provider
      const [constructionRequests, renovationRequests] = await Promise.all([
        getDocs(
          query(
            collection(db, constructionCollection),
            where('providerId', '==', providerId)
          )
        ).catch(() => ({ docs: [] })),
        getDocs(
          query(
            collection(db, renovationCollection),
            where('providerId', '==', providerId)
          )
        ).catch(() => ({ docs: [] })),
      ]);

      const allRequests = [
        ...constructionRequests.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        ...renovationRequests.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      ];

      // Calculate stats
      const totalRequests = allRequests.length;
      const activeJobs = allRequests.filter(
        (req) => req.status === 'In Progress' || req.status === 'Pending' || req.status === 'Accepted'
      ).length;
      const completedJobs = allRequests.filter(
        (req) => req.status === 'Completed' || req.status === 'Done'
      ).length;

      // Calculate earnings (sum of completed job budgets)
      const earnings = allRequests
        .filter((req) => req.status === 'Completed' || req.status === 'Done')
        .reduce((sum, req) => sum + (req.budget || req.amount || 0), 0);

      // Get reviews
      const providerReviews = await reviewsService.getByProvider(providerId).catch(() => []);
      const totalReviews = providerReviews.length;
      const averageRating =
        totalReviews > 0
          ? providerReviews.reduce((sum, review) => sum + (review.rating || 0), 0) / totalReviews
          : 0;

      setStats({
        totalRequests,
        activeJobs,
        completedJobs,
        earnings,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentRequests = async () => {
    try {
      const providerId = currentUser.uid;
      const role = userProfile?.role;

      let constructionCollection = 'constructionProjects';
      let renovationCollection = 'renovationProjects';

      // Get recent requests
      const [constructionRequests, renovationRequests] = await Promise.all([
        getDocs(
          query(
            collection(db, constructionCollection),
            where('providerId', '==', providerId),
            orderBy('createdAt', 'desc'),
            limit(5)
          )
        ).catch(() => ({ docs: [] })),
        getDocs(
          query(
            collection(db, renovationCollection),
            where('providerId', '==', providerId),
            orderBy('createdAt', 'desc'),
            limit(5)
          )
        ).catch(() => ({ docs: [] })),
      ]);

      const allRequests = [
        ...constructionRequests.docs.map((doc) => ({
          id: doc.id,
          type: 'construction',
          ...doc.data(),
        })),
        ...renovationRequests.docs.map((doc) => ({
          id: doc.id,
          type: 'renovation',
          ...doc.data(),
        })),
      ]
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return bTime - aTime;
        })
        .slice(0, 5);

      setRecentRequests(allRequests);
    } catch (error) {
      console.error('Error loading recent requests:', error);
    }
  };

  const loadReviews = async () => {
    try {
      // Get reviews for this provider - reviews might have providerId or targetId matching userId
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('targetId', '==', currentUser.uid),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      
      try {
        const snapshot = await getDocs(reviewsQuery);
        const reviewsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setReviews(reviewsList);
      } catch (error) {
        // Fallback: try without orderBy or query by providerId field
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
          const fallbackQuery = query(
            collection(db, 'reviews'),
            where('targetId', '==', currentUser.uid),
            limit(10)
          );
          const fallbackSnapshot = await getDocs(fallbackQuery);
          const reviewsList = fallbackSnapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
            .sort((a, b) => {
              const aTime = a.createdAt?.toDate?.() || new Date(0);
              const bTime = b.createdAt?.toDate?.() || new Date(0);
              return bTime - aTime;
            })
            .slice(0, 5);
          setReviews(reviewsList);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
      // Set empty array on error
      setReviews([]);
    }
  };

  const handleToggleAvailability = async () => {
    try {
      const newAvailability = !isAvailable;
      await updateDocById('users', currentUser.uid, {
        available: newAvailability,
        updatedAt: new Date(),
      });
      setIsAvailable(newAvailability);
      toast.success(`Availability ${newAvailability ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await updateDocById('users', currentUser.uid, {
        businessName: profileData.businessName,
        phone: profileData.phone,
        address: profileData.address,
        bio: profileData.bio,
        specialties: profileData.specialties,
        updatedAt: new Date(),
      });
      toast.success('Profile updated successfully');
      setShowProfileModal(false);
      // Reload user profile
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
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

  const getStatusColor = (status) => {
    const statusMap = {
      Pending: 'text-yellow-600 bg-yellow-100',
      'In Progress': 'text-blue-600 bg-blue-100',
      Accepted: 'text-green-600 bg-green-100',
      Completed: 'text-green-600 bg-green-100',
      Done: 'text-green-600 bg-green-100',
      Rejected: 'text-red-600 bg-red-100',
      Cancelled: 'text-gray-600 bg-gray-100',
    };
    return statusMap[status] || 'text-gray-600 bg-gray-100';
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
          <p className="text-textSecondary mb-4">Please log in to view your dashboard</p>
          <Button onClick={() => navigate('/login')}>Login</Button>
        </div>
      </div>
    );
  }

  const isProvider = userProfile?.role === 'constructor' || userProfile?.role === 'renovator' || userProfile?.role === 'provider';
  if (!isProvider) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-textSecondary mb-4">This page is only available for service providers</p>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
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
            <h1 className="text-3xl font-display font-bold text-textMain">
              Provider Dashboard
            </h1>
            <p className="text-textSecondary mt-2">
              Welcome back, {userProfile?.businessName || userProfile?.displayName || 'Provider'}!
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => setShowProfileModal(true)}
              className="flex items-center"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
            <Button
              variant={isAvailable ? 'primary' : 'ghost'}
              onClick={handleToggleAvailability}
              className="flex items-center"
            >
              {isAvailable ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Available
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Unavailable
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Requests */}
          <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-textSecondary mb-1">Total Requests</p>
                <p className="text-2xl font-bold text-textMain">{stats.totalRequests}</p>
              </div>
              <div className="bg-primary/10 p-3 rounded-full">
                <Briefcase className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          {/* Active Jobs */}
          <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-textSecondary mb-1">Active Jobs</p>
                <p className="text-2xl font-bold text-textMain">{stats.activeJobs}</p>
              </div>
              <div className="bg-blue-500/10 p-3 rounded-full">
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          {/* Completed Jobs */}
          <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-textSecondary mb-1">Completed Jobs</p>
                <p className="text-2xl font-bold text-textMain">{stats.completedJobs}</p>
              </div>
              <div className="bg-green-500/10 p-3 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>

          {/* Earnings */}
          <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-textSecondary mb-1">Total Earnings</p>
                <p className="text-2xl font-bold text-textMain">
                  ${stats.earnings.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-500/10 p-3 rounded-full">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>

          {/* Average Rating */}
          <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-textSecondary mb-1">Average Rating</p>
                <p className="text-2xl font-bold text-textMain flex items-center">
                  {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
                  {stats.averageRating > 0 && (
                    <Star className="w-5 h-5 text-yellow-500 ml-1 fill-current" />
                  )}
                </p>
              </div>
              <div className="bg-yellow-500/10 p-3 rounded-full">
                <Star className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </div>

          {/* Total Reviews */}
          <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-textSecondary mb-1">Total Reviews</p>
                <p className="text-2xl font-bold text-textMain">{stats.totalReviews}</p>
              </div>
              <div className="bg-purple-500/10 p-3 rounded-full">
                <Award className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Requests */}
          <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-textMain flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-primary" />
                Recent Requests
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (userProfile?.role === 'constructor') {
                    navigate('/provider-construction-panel');
                  } else if (userProfile?.role === 'renovator') {
                    navigate('/provider-renovation-panel');
                  }
                }}
              >
                View All
              </Button>
            </div>

            {recentRequests.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="w-12 h-12 text-textSecondary mx-auto mb-3" />
                <p className="text-textSecondary">No requests yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentRequests.map((request) => (
                  <div
                    key={request.id}
                    className="border border-muted rounded-base p-4 hover:bg-background transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-textMain capitalize">
                            {request.type}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                              request.status
                            )}`}
                          >
                            {request.status}
                          </span>
                        </div>
                        {request.details && (
                          <p className="text-sm text-textSecondary line-clamp-2 mb-2">
                            {request.details}
                          </p>
                        )}
                        {request.budget && (
                          <p className="text-sm font-medium text-textMain">
                            Budget: ${request.budget.toLocaleString()}
                          </p>
                        )}
                        <p className="text-xs text-textSecondary mt-2">
                          {formatDate(request.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Reviews */}
          <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-textMain flex items-center">
                <Star className="w-5 h-5 mr-2 text-primary" />
                Recent Reviews
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/reviews')}>
                View All
              </Button>
            </div>

            {reviews.length === 0 ? (
              <div className="text-center py-8">
                <Star className="w-12 h-12 text-textSecondary mx-auto mb-3" />
                <p className="text-textSecondary">No reviews yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="border border-muted rounded-base p-4 hover:bg-background transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < (review.rating || 0)
                                  ? 'text-yellow-500 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium text-textMain">
                          {review.rating}/5
                        </span>
                      </div>
                      <span className="text-xs text-textSecondary">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-textSecondary line-clamp-2">{review.comment}</p>
                    )}
                    {review.reviewerName && (
                      <p className="text-xs text-textSecondary mt-2">- {review.reviewerName}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edit Profile Modal */}
        <Modal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          title="Edit Provider Profile"
        >
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <Input
              label="Business Name"
              value={profileData.businessName}
              onChange={(e) =>
                setProfileData({ ...profileData, businessName: e.target.value })
              }
              placeholder="Enter business name"
              leftIcon={<Building2 className="w-4 h-4" />}
            />

            <Input
              label="Phone"
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              placeholder="Enter phone number"
              leftIcon={<Phone className="w-4 h-4" />}
            />

            <Input
              label="Email"
              type="email"
              value={profileData.email}
              disabled
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">
                Address
              </label>
              <textarea
                value={profileData.address}
                onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-muted rounded-base focus:border-primary focus:ring-primary transition-colors"
                placeholder="Enter business address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">Bio</label>
              <textarea
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-muted rounded-base focus:border-primary focus:ring-primary transition-colors"
                placeholder="Tell clients about your business"
              />
            </div>

            <Input
              label="Specialties"
              value={profileData.specialties}
              onChange={(e) => setProfileData({ ...profileData, specialties: e.target.value })}
              placeholder="e.g., Kitchen Renovation, Bathroom Remodeling"
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowProfileModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};

export default ProviderDashboard;
