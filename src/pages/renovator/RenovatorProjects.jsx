import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/common/Button';
import {
  Filter,
  Building2,
  Calendar,
  DollarSign,
  User,
  MapPin,
  FileText,
  ArrowRight,
  SortAsc,
  SortDesc,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * RenovatorProjects Component
 * Lists all renovation projects assigned to the renovator
 * Shows detailed project cards with customer info, property details, budget, and status
 * Uses real-time onSnapshot listener with proper cleanup
 * Includes filtering by status and date, and sorting options
 */
const RenovatorProjects = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [projectsWithDetails, setProjectsWithDetails] = useState([]); // Projects with fetched customer/property data
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'Pending', 'In Progress', 'Completed', 'Rejected'
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'week', 'month'
  const [sortOrder, setSortOrder] = useState('latest'); // 'latest', 'oldest'
  const [clientNames, setClientNames] = useState({}); // Cache for client names
  const [propertyInfo, setPropertyInfo] = useState({}); // Cache for property info

  // Refs for cleanup
  const unsubscribeRef = useRef(null);
  const fallbackUnsubscribeRef = useRef(null);

  // Fetch client name
  const fetchClientName = async (userId) => {
    if (!userId) return 'Unknown Client';
    
    // Return cached name if available
    if (clientNames[userId]) {
      return clientNames[userId];
    }

    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const name =
          userData.displayName ||
          userData.name ||
          userData.fullName ||
          `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
          userData.email?.split('@')[0] ||
          'Unknown Client';

        // Cache the client name
        setClientNames((prev) => ({
          ...prev,
          [userId]: name,
        }));

        return name;
      }

      return 'Client Not Found';
    } catch (err) {
      console.error(`Error fetching client ${userId}:`, err);
      return 'Error Loading Client';
    }
  };

  // Fetch property info
  const fetchPropertyInfo = async (propertyId) => {
    if (!propertyId) return null;

    // Return cached property if available
    if (propertyInfo[propertyId]) {
      return propertyInfo[propertyId];
    }

    try {
      const propertyRef = doc(db, 'properties', propertyId);
      const propertySnap = await getDoc(propertyRef);

      if (propertySnap.exists()) {
        const propData = propertySnap.data();
        const info = {
          title: propData.title || propData.name || 'Unknown Property',
          address:
            propData.address?.line1 ||
            propData.address ||
            propData.location ||
            'Address not available',
          city: propData.city || propData.address?.city || '',
          type: propData.type || 'Property',
        };

        // Cache the property info
        setPropertyInfo((prev) => ({
          ...prev,
          [propertyId]: info,
        }));

        return info;
      }

      return null;
    } catch (err) {
      console.error(`Error fetching property ${propertyId}:`, err);
      return null;
    }
  };

  // Fetch projects with real-time listener
  useEffect(() => {
    if (authLoading) return;

    if (!currentUser || !currentUser.uid || !db) {
      setLoading(false);
      if (!authLoading && !currentUser) {
        toast.error('Please log in to view your projects.');
        navigate('/auth');
      }
      return;
    }

    const providerId = currentUser.uid;
    console.log('Setting up real-time listener for renovator projects, providerId:', providerId);

    setLoading(true);

    try {
      // Create query filtered by providerId and ordered by createdAt
      const projectsQuery = query(
        collection(db, 'renovationProjects'),
        where('providerId', '==', providerId),
        orderBy('createdAt', 'desc')
      );

      // Setup real-time listener using onSnapshot
      unsubscribeRef.current = onSnapshot(
        projectsQuery,
        async (snapshot) => {
          console.log(`Received ${snapshot.docs.length} renovation projects from snapshot`);

          const projectsList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setProjects(projectsList);

          // Fetch client names and property info for all projects
          const projectsWithDetailsPromises = projectsList.map(async (project) => {
            const clientName = await fetchClientName(project.userId || project.clientId);
            const property = project.propertyId ? await fetchPropertyInfo(project.propertyId) : null;

            return {
              ...project,
              clientName,
              propertyInfo: property,
            };
          });

          const projectsWithDetailsData = await Promise.all(projectsWithDetailsPromises);
          setProjectsWithDetails(projectsWithDetailsData);
          setLoading(false);
        },
        (error) => {
          console.error('Error in onSnapshot:', error);

          // Handle index errors with fallback query
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            console.log('Index not found, using fallback query without orderBy');
            const fallbackQuery = query(
              collection(db, 'renovationProjects'),
              where('providerId', '==', providerId)
            );

            fallbackUnsubscribeRef.current = onSnapshot(
              fallbackQuery,
              async (snapshot) => {
                const projectsList = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));

                // Sort client-side by createdAt
                projectsList.sort((a, b) => {
                  const aTime = a.createdAt?.toDate?.() || new Date(0);
                  const bTime = b.createdAt?.toDate?.() || new Date(0);
                  return bTime - aTime;
                });

                setProjects(projectsList);

                // Fetch client names and property info
                const projectsWithDetailsPromises = projectsList.map(async (project) => {
                  const clientName = await fetchClientName(project.userId || project.clientId);
                  const property = project.propertyId ? await fetchPropertyInfo(project.propertyId) : null;

                  return {
                    ...project,
                    clientName,
                    propertyInfo: property,
                  };
                });

                const projectsWithDetailsData = await Promise.all(projectsWithDetailsPromises);
                setProjectsWithDetails(projectsWithDetailsData);
                setLoading(false);
              },
              (fallbackError) => {
                console.error('Error in fallback query:', fallbackError);
                setProjects([]);
                setProjectsWithDetails([]);
                setLoading(false);
                toast.error('Failed to load projects. Please try again.');
              }
            );

            fallbackUnsubscribeRef.current = fallbackUnsubscribeRef;
          } else {
            if (error.code === 'permission-denied') {
              toast.error('Permission denied. Please check Firestore security rules.');
            } else {
              toast.error('Failed to load renovation projects.');
            }
            setProjects([]);
            setProjectsWithDetails([]);
            setLoading(false);
          }
        }
      );

      // Cleanup function
      return () => {
        console.log('Unsubscribing from renovator projects listener');
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
        if (fallbackUnsubscribeRef.current) {
          console.log('Unsubscribing from fallback renovator projects listener');
          fallbackUnsubscribeRef.current();
          fallbackUnsubscribeRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error setting up listener:', error);
      setLoading(false);
      toast.error('Failed to setup real-time listener.');
    }
  }, [currentUser, authLoading, navigate]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...projectsWithDetails];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(
        (project) => project.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter((project) => {
        if (!project.createdAt) return false;
        const projectDate = project.createdAt.toDate ? project.createdAt.toDate() : new Date(project.createdAt);
        const diffTime = now - projectDate;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        switch (dateFilter) {
          case 'today':
            return diffDays < 1;
          case 'week':
            return diffDays < 7;
          case 'month':
            return diffDays < 30;
          default:
            return true;
        }
      });
    }

    // Sort
    if (sortOrder === 'latest') {
      filtered.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return bTime - aTime;
      });
    } else {
      filtered.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return aTime - bTime;
      });
    }

    setFilteredProjects(filtered);
  }, [projectsWithDetails, statusFilter, dateFilter, sortOrder]);

  // Get status badge classes
  const getStatusBadgeClasses = (status) => {
    const statusLower = status?.toLowerCase() || '';
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-semibold border';

    switch (statusLower) {
      case 'pending':
        return `${baseClasses} bg-accent/20 text-accent border-accent/30`;
      case 'in progress':
      case 'inprogress':
        return `${baseClasses} bg-primary/20 text-primary border-primary/30`;
      case 'completed':
        return `${baseClasses} bg-primary/20 text-primary border-primary/30`;
      case 'rejected':
      case 'cancelled':
      case 'canceled':
        return `${baseClasses} bg-red-100 text-red-800 border-red-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 border-gray-300`;
    }
  };

  // Format status for display
  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    const statusLower = status.toLowerCase();
    if (statusLower === 'inprogress') return 'In Progress';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
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
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Format budget
  const formatBudget = (budget) => {
    if (!budget) return 'N/A';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(budget);
  };

  // Get status counts for summary
  const getStatusCounts = () => {
    return {
      all: projectsWithDetails.length,
      pending: projectsWithDetails.filter((p) => p.status?.toLowerCase() === 'pending').length,
      inProgress: projectsWithDetails.filter(
        (p) => p.status?.toLowerCase() === 'in progress' || p.status?.toLowerCase() === 'inprogress'
      ).length,
      completed: projectsWithDetails.filter((p) => p.status?.toLowerCase() === 'completed').length,
      rejected: projectsWithDetails.filter(
        (p) => p.status?.toLowerCase() === 'rejected' || p.status?.toLowerCase() === 'cancelled'
      ).length,
    };
  };

  const statusCounts = getStatusCounts();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-textMain mb-2">My Renovation Projects</h1>
              <p className="text-textSecondary">
                Manage and track all your assigned renovation projects
              </p>
            </div>
          </div>
        </div>

        {/* Filters and Sorting */}
        <div className="mb-6 space-y-4">
          {/* Status Filter */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-textSecondary" />
              <span className="text-sm font-medium text-textSecondary">Filter by Status:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-surface text-textSecondary hover:bg-muted'
                }`}
              >
                All ({statusCounts.all})
              </button>
              <button
                onClick={() => setStatusFilter('Pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'Pending'
                    ? 'bg-accent/20 text-accent border border-accent/30'
                    : 'bg-surface text-textSecondary hover:bg-muted'
                }`}
              >
                Pending ({statusCounts.pending})
              </button>
              <button
                onClick={() => setStatusFilter('In Progress')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'In Progress'
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-surface text-textSecondary hover:bg-muted'
                }`}
              >
                In Progress ({statusCounts.inProgress})
              </button>
              <button
                onClick={() => setStatusFilter('Completed')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'Completed'
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-surface text-textSecondary hover:bg-muted'
                }`}
              >
                Completed ({statusCounts.completed})
              </button>
              <button
                onClick={() => setStatusFilter('Rejected')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'Rejected'
                    ? 'bg-red-100 text-red-800 border border-red-300'
                    : 'bg-surface text-textSecondary hover:bg-muted'
                }`}
              >
                Rejected ({statusCounts.rejected})
              </button>
            </div>
          </div>

          {/* Date Filter and Sort */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-textSecondary" />
              <span className="text-sm font-medium text-textSecondary">Filter by Date:</span>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm border border-borderColor bg-surface text-textMain focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              {sortOrder === 'latest' ? (
                <SortDesc className="w-5 h-5 text-textSecondary" />
              ) : (
                <SortAsc className="w-5 h-5 text-textSecondary" />
              )}
              <span className="text-sm font-medium text-textSecondary">Sort:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm border border-borderColor bg-surface text-textMain focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="latest">Latest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Projects List */}
        {filteredProjects.length > 0 ? (
          <div className="space-y-4">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="bg-surface rounded-lg border border-borderColor p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Left Section - Project Details */}
                  <div className="flex-1 space-y-4">
                    {/* Header with Status */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-textMain mb-2">
                          {project.serviceCategory || project.projectType || 'Renovation Project'}
                        </h3>
                        <span className={getStatusBadgeClasses(project.status)}>
                          {formatStatus(project.status)}
                        </span>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="flex items-center gap-2 text-textSecondary">
                      <User className="w-4 h-4" />
                      <span className="text-sm">
                        <span className="font-medium text-textMain">Customer:</span>{' '}
                        {project.clientName || 'Unknown Client'}
                      </span>
                    </div>

                    {/* Property Info */}
                    {project.propertyInfo ? (
                      <div className="flex items-start gap-2 text-textSecondary">
                        <MapPin className="w-4 h-4 mt-1" />
                        <div className="text-sm">
                          <span className="font-medium text-textMain">Property:</span>{' '}
                          {project.propertyInfo.title}
                          <br />
                          <span className="text-textSecondary">
                            {project.propertyInfo.address}
                            {project.propertyInfo.city && `, ${project.propertyInfo.city}`}
                          </span>
                        </div>
                      </div>
                    ) : project.propertyAddress || project.location ? (
                      <div className="flex items-start gap-2 text-textSecondary">
                        <MapPin className="w-4 h-4 mt-1" />
                        <div className="text-sm">
                          <span className="font-medium text-textMain">Location:</span>{' '}
                          {project.propertyAddress || project.location}
                          {project.city && `, ${project.city}`}
                        </div>
                      </div>
                    ) : null}

                    {/* Budget */}
                    {project.budget && (
                      <div className="flex items-center gap-2 text-textSecondary">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-sm">
                          <span className="font-medium text-textMain">Budget:</span>{' '}
                          {formatBudget(project.budget)}
                        </span>
                      </div>
                    )}

                    {/* Description */}
                    {(project.detailedDescription || project.description || project.details) && (
                      <div className="flex items-start gap-2 text-textSecondary">
                        <FileText className="w-4 h-4 mt-1" />
                        <p className="text-sm line-clamp-3">
                          {project.detailedDescription || project.description || project.details}
                        </p>
                      </div>
                    )}

                    {/* Dates */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-textSecondary">
                      {project.createdAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Created: {formatDate(project.createdAt)}</span>
                        </div>
                      )}
                      {project.preferredDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Preferred: {formatDate(project.preferredDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Section - Actions */}
                  <div className="lg:w-48 flex-shrink-0 flex lg:flex-col gap-2">
                    <Button
                      onClick={() => navigate(`/renovator/project/${project.id}`)}
                      variant="primary"
                      className="flex-1 lg:w-full flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Project Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-surface rounded-lg border border-borderColor">
            <Building2 className="w-16 h-16 mx-auto text-textSecondary mb-4" />
            <h3 className="text-xl font-semibold text-textMain mb-2">
              {statusFilter === 'all' && dateFilter === 'all'
                ? 'No Projects Found'
                : 'No Projects Match Your Filters'}
            </h3>
            <p className="text-textSecondary mb-6">
              {statusFilter === 'all' && dateFilter === 'all'
                ? "You don't have any renovation projects assigned yet."
                : `You don't have any projects matching the selected filters.`}
            </p>
            {(statusFilter !== 'all' || dateFilter !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter('all');
                  setDateFilter('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RenovatorProjects;
