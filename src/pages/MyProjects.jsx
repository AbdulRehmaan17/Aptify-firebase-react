import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Building2,
  Wrench,
  Calendar,
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  ArrowRight,
  MapPin,
  DollarSign,
} from 'lucide-react';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

/**
 * MyProjects Component
 * 
 * Unified page showing ALL services started by the logged-in user:
 * - Construction Projects
 * - Renovation Projects
 * - Rental Requests
 * - Buy/Sell Requests
 * 
 * This replaces separate pages like MyRenovations, MyBookings, etc.
 */
const MyProjects = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'construction', 'renovation', 'rental', 'buy-sell'

  useEffect(() => {
    if (!authLoading && currentUser) {
      loadAllProjects();
    } else if (!authLoading && !currentUser) {
      setLoading(false);
    }
  }, [authLoading, currentUser]);

  /**
   * Load all projects from all collections
   */
  const loadAllProjects = () => {
    if (!currentUser || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const userId = currentUser.uid;
    const allProjects = [];
    let completedQueries = 0;
    const totalQueries = 4;

    const handleQueryComplete = () => {
      completedQueries++;
      if (completedQueries === totalQueries) {
        // Sort all projects by createdAt (newest first)
        allProjects.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toMillis?.() || b.createdAt?.toDate?.() || new Date(0);
          const aDate = aTime instanceof Date ? aTime : new Date(aTime);
          const bDate = bTime instanceof Date ? bTime : new Date(bTime);
          return bDate - aDate;
        });
        setProjects(allProjects);
        setLoading(false);
        console.log(`✅ Loaded ${allProjects.length} total projects`);
      }
    };

    // 1. Load Construction Projects (one-time read with graceful fallback)
    try {
      const constructionQuery = query(
        collection(db, 'constructionProjects'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      getDocs(constructionQuery)
        .then((snapshot) => {
          snapshot.docs.forEach((doc) => {
            allProjects.push({
              id: doc.id,
              type: 'construction',
              serviceType: 'Construction',
              ...doc.data(),
            });
          });
          handleQueryComplete();
        })
        .catch((error) => {
          console.error('Error loading construction projects:', error);
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            // Fallback without orderBy
            const fallbackQuery = query(
              collection(db, 'constructionProjects'),
              where('userId', '==', userId)
            );
            getDocs(fallbackQuery)
              .then((snapshot) => {
                snapshot.docs.forEach((doc) => {
                  allProjects.push({
                    id: doc.id,
                    type: 'construction',
                    serviceType: 'Construction',
                    ...doc.data(),
                  });
                });
                handleQueryComplete();
              })
              .catch(() => handleQueryComplete());
          } else {
            handleQueryComplete();
          }
        });
    } catch (error) {
      console.error('Error setting up construction projects query:', error);
      handleQueryComplete();
    }

    // 2. Load Renovation Projects (one-time read with graceful fallback)
    try {
      const renovationQuery = query(
        collection(db, 'renovationProjects'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      getDocs(renovationQuery)
        .then((snapshot) => {
          snapshot.docs.forEach((doc) => {
            allProjects.push({
              id: doc.id,
              type: 'renovation',
              serviceType: 'Renovation',
              ...doc.data(),
            });
          });
          handleQueryComplete();
        })
        .catch((error) => {
          console.error('Error loading renovation projects:', error);
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            const fallbackQuery = query(
              collection(db, 'renovationProjects'),
              where('userId', '==', userId)
            );
            getDocs(fallbackQuery)
              .then((snapshot) => {
                snapshot.docs.forEach((doc) => {
                  allProjects.push({
                    id: doc.id,
                    type: 'renovation',
                    serviceType: 'Renovation',
                    ...doc.data(),
                  });
                });
                handleQueryComplete();
              })
              .catch(() => handleQueryComplete());
          } else {
            handleQueryComplete();
          }
        });
    } catch (error) {
      console.error('Error setting up renovation projects query:', error);
      handleQueryComplete();
    }

    // 3. Load Rental Requests (one-time read with graceful fallback)
    try {
      const rentalQuery = query(
        collection(db, 'rentalRequests'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      getDocs(rentalQuery)
        .then((snapshot) => {
          snapshot.docs.forEach((doc) => {
            allProjects.push({
              id: doc.id,
              type: 'rental',
              serviceType: 'Rental',
              ...doc.data(),
            });
          });
          handleQueryComplete();
        })
        .catch((error) => {
          console.error('Error loading rental requests:', error);
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            const fallbackQuery = query(
              collection(db, 'rentalRequests'),
              where('userId', '==', userId)
            );
            getDocs(fallbackQuery)
              .then((snapshot) => {
                snapshot.docs.forEach((doc) => {
                  allProjects.push({
                    id: doc.id,
                    type: 'rental',
                    serviceType: 'Rental',
                    ...doc.data(),
                  });
                });
                handleQueryComplete();
              })
              .catch(() => handleQueryComplete());
          } else {
            handleQueryComplete();
          }
        });
    } catch (error) {
      console.error('Error setting up rental requests query:', error);
      handleQueryComplete();
    }

    // 4. Load Buy/Sell Requests (one-time read with graceful fallback)
    try {
      const buySellQuery = query(
        collection(db, 'buySellRequests'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      getDocs(buySellQuery)
        .then((snapshot) => {
          snapshot.docs.forEach((doc) => {
            allProjects.push({
              id: doc.id,
              type: 'buy-sell',
              serviceType: 'Buy/Sell',
              ...doc.data(),
            });
          });
          handleQueryComplete();
        })
        .catch((error) => {
          console.error('Error loading buy/sell requests:', error);
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            const fallbackQuery = query(
              collection(db, 'buySellRequests'),
              where('userId', '==', userId)
            );
            getDocs(fallbackQuery)
              .then((snapshot) => {
                snapshot.docs.forEach((doc) => {
                  allProjects.push({
                    id: doc.id,
                    type: 'buy-sell',
                    serviceType: 'Buy/Sell',
                    ...doc.data(),
                  });
                });
                handleQueryComplete();
              })
              .catch(() => handleQueryComplete());
          } else {
            handleQueryComplete();
          }
        });
    } catch (error) {
      console.error('Error setting up buy/sell requests query:', error);
      handleQueryComplete();
    }
  };

  /**
   * Get service icon based on type
   */
  const getServiceIcon = (type) => {
    switch (type) {
      case 'construction':
        return <Building2 className="w-5 h-5" />;
      case 'renovation':
        return <Wrench className="w-5 h-5" />;
      case 'rental':
        return <Calendar className="w-5 h-5" />;
      case 'buy-sell':
        return <ShoppingCart className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  /**
   * Get status color class
   */
  const getStatusColor = (status) => {
    const statusMap = {
      Pending: 'text-accent bg-accent/20',
      Accepted: 'text-primary bg-primary/20',
      'In Progress': 'text-primary bg-primary/20',
      Approved: 'text-primary bg-primary/20',
      Completed: 'text-green-600 bg-green-100',
      Done: 'text-green-600 bg-green-100',
      Rejected: 'text-red-600 bg-red-100',
      Cancelled: 'text-gray-600 bg-gray-100',
    };
    return statusMap[status] || 'text-gray-600 bg-gray-100';
  };

  /**
   * Get status icon
   */
  const getStatusIcon = (status) => {
    switch (status) {
      case 'Accepted':
      case 'Approved':
      case 'Completed':
      case 'Done':
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

  /**
   * Format date
   */
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date?.toDate ? date.toDate() : date?.toMillis ? new Date(date.toMillis()) : new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  /**
   * Format price
   */
  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  /**
   * Get detail link based on project type
   */
  const getDetailLink = (project) => {
    switch (project.type) {
      case 'construction':
        return `/construction/project/${project.id}`;
      case 'renovation':
        return `/renovation/my-renovations/${project.id}`;
      case 'rental':
        return `/rental/booking/${project.id}`;
      case 'buy-sell':
        return `/buy-sell/offer/${project.id}`;
      default:
        return '#';
    }
  };

  /**
   * Get project title
   */
  const getProjectTitle = (project) => {
    switch (project.type) {
      case 'construction':
        return project.details || project.description || 'Construction Project';
      case 'renovation':
        return project.detailedDescription || project.description || 'Renovation Project';
      case 'rental':
        return `Rental Request - ${formatDate(project.startDate)} to ${formatDate(project.endDate)}`;
      case 'buy-sell':
        return `Buy/Sell Offer - ${formatPrice(project.offerAmount)}`;
      default:
        return 'Project';
    }
  };

  /**
   * Filter projects by type
   */
  const filteredProjects = filter === 'all' 
    ? projects 
    : projects.filter(p => {
        if (filter === 'construction') return p.type === 'construction';
        if (filter === 'renovation') return p.type === 'renovation';
        if (filter === 'rental') return p.type === 'rental';
        if (filter === 'buy-sell') return p.type === 'buy-sell';
        return true;
      });

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
          <p className="text-textSecondary mb-4">Please log in to view your projects</p>
          <Button onClick={() => navigate('/auth')}>Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-textMain mb-2">My Projects</h1>
          <p className="text-textSecondary">View and manage all your service requests and projects</p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-surface text-textSecondary hover:bg-muted'
            }`}
          >
            All Projects ({projects.length})
          </button>
          <button
            onClick={() => setFilter('construction')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'construction'
                ? 'bg-primary text-white'
                : 'bg-surface text-textSecondary hover:bg-muted'
            }`}
          >
            Construction ({projects.filter(p => p.type === 'construction').length})
          </button>
          <button
            onClick={() => setFilter('renovation')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'renovation'
                ? 'bg-primary text-white'
                : 'bg-surface text-textSecondary hover:bg-muted'
            }`}
          >
            Renovation ({projects.filter(p => p.type === 'renovation').length})
          </button>
          <button
            onClick={() => setFilter('rental')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'rental'
                ? 'bg-primary text-white'
                : 'bg-surface text-textSecondary hover:bg-muted'
            }`}
          >
            Rental ({projects.filter(p => p.type === 'rental').length})
          </button>
          <button
            onClick={() => setFilter('buy-sell')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'buy-sell'
                ? 'bg-primary text-white'
                : 'bg-surface text-textSecondary hover:bg-muted'
            }`}
          >
            Buy/Sell ({projects.filter(p => p.type === 'buy-sell').length})
          </button>
        </div>

        {/* Projects List */}
        {filteredProjects.length === 0 ? (
          <div className="bg-surface rounded-base shadow-md p-12 border border-muted text-center">
            <AlertCircle className="w-16 h-16 text-textSecondary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-textMain mb-2">
              {filter === 'all' ? 'No projects yet' : `No ${filter} projects`}
            </h2>
            <p className="text-textSecondary mb-6">
              {filter === 'all'
                ? 'Start by submitting a service request or project'
                : `You haven't started any ${filter} projects yet`}
            </p>
            {filter === 'all' && (
              <div className="flex flex-wrap gap-4 justify-center">
                <Button onClick={() => navigate('/construction/request')}>
                  <Building2 className="w-4 h-4 mr-2" />
                  Request Construction
                </Button>
                <Button onClick={() => navigate('/renovation/request')}>
                  <Wrench className="w-4 h-4 mr-2" />
                  Request Renovation
                </Button>
                <Button onClick={() => navigate('/properties?type=rent')}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Rental
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredProjects.map((project) => (
              <div
                key={`${project.type}-${project.id}`}
                className="bg-surface rounded-base shadow-md p-6 border border-muted hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Service Icon */}
                    <div className="mt-1 text-primary">
                      {getServiceIcon(project.type)}
                    </div>

                    {/* Project Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            project.status
                          )}`}
                        >
                          {getStatusIcon(project.status)}
                          <span className="ml-2">{project.status || 'Pending'}</span>
                        </span>
                        <span className="text-sm font-medium text-textSecondary">
                          {project.serviceType}
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold text-textMain mb-2">
                        {getProjectTitle(project)}
                      </h3>

                      {/* Project Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {/* Budget/Amount */}
                        {(project.budget || project.offerAmount || project.totalCost) && (
                          <div className="flex items-center text-sm text-textSecondary">
                            <DollarSign className="w-4 h-4 mr-2" />
                            <span>
                              {formatPrice(project.budget || project.offerAmount || project.totalCost)}
                            </span>
                          </div>
                        )}

                        {/* Location */}
                        {(project.location || project.city || project.propertyAddress) && (
                          <div className="flex items-center text-sm text-textSecondary">
                            <MapPin className="w-4 h-4 mr-2" />
                            <span className="truncate">
                              {project.location || project.city || project.propertyAddress}
                            </span>
                          </div>
                        )}

                        {/* Created Date */}
                        <div className="flex items-center text-sm text-textSecondary">
                          <Clock className="w-4 h-4 mr-2" />
                          <span>Created: {formatDate(project.createdAt)}</span>
                        </div>
                      </div>

                      {/* Additional Info */}
                      {project.timeline && (
                        <p className="text-sm text-textSecondary mb-2">
                          Timeline: {project.timeline}
                        </p>
                      )}

                      {project.message && (
                        <p className="text-sm text-textSecondary mb-2 line-clamp-2">
                          {project.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* View Details Link */}
                  <Link
                    to={getDetailLink(project)}
                    className="text-primary hover:text-primaryDark ml-4"
                  >
                    <Eye className="w-5 h-5" />
                  </Link>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-4 border-t border-muted flex justify-end">
                  <Link
                    to={getDetailLink(project)}
                    className="text-sm text-primary hover:text-primaryDark flex items-center"
                  >
                    View Details <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyProjects;


