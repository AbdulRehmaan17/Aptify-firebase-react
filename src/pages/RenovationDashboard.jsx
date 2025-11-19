import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, getDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  Wrench,
  Calendar,
  DollarSign,
  MapPin,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  User,
} from 'lucide-react';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

/**
 * RenovationDashboard Component
 *
 * Displays user's renovation projects in real-time using Firestore onSnapshot.
 * Queries "renovationProjects" collection where userId == currentUser.uid.
 * Shows project details including property names fetched from properties collection.
 * Displays photo thumbnails and allows cancellation of pending projects.
 * Supports expandable cards to view full details including provider info.
 * Handles collection not existing gracefully.
 */
const RenovationDashboard = () => {
  const navigate = useNavigate();
  const { user: contextUser, loading: authLoading } = useAuth();

  // Get currentUser from Firebase auth
  const currentUser = auth?.currentUser || contextUser;

  // State management
  const [projects, setProjects] = useState([]);
  const [propertyNames, setPropertyNames] = useState({}); // Cache property names by propertyId
  const [providerNames, setProviderNames] = useState({}); // Cache provider names by providerId
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [expandedProjectId, setExpandedProjectId] = useState(null); // Track which project is expanded

  /**
   * Fetch property name from Firestore
   * Caches the result to avoid repeated fetches
   * @param {string} propertyId - Property document ID
   * @returns {Promise<string>} - Property name or "Unknown Property"
   */
  const fetchPropertyName = async (propertyId) => {
    // Return cached name if available
    if (propertyNames[propertyId]) {
      return propertyNames[propertyId];
    }

    try {
      const propertyRef = doc(db, 'properties', propertyId);
      const propertySnap = await getDoc(propertyRef);

      if (propertySnap.exists()) {
        const propertyData = propertySnap.data();
        const name = propertyData.title || propertyData.name || 'Unknown Property';

        // Cache the property name
        setPropertyNames((prev) => ({
          ...prev,
          [propertyId]: name,
        }));

        return name;
      }

      return 'Property Not Found';
    } catch (err) {
      console.error(`Error fetching property ${propertyId}:`, err);
      return 'Error Loading Property';
    }
  };

  /**
   * Fetch provider name from serviceProviders collection
   * Caches the result to avoid repeated fetches
   * @param {string} providerId - Provider document ID
   * @returns {Promise<string>} - Provider name or "No Provider"
   */
  const fetchProviderName = async (providerId) => {
    // Return cached name if available
    if (providerNames[providerId]) {
      return providerNames[providerId];
    }

    try {
      const providerRef = doc(db, 'serviceProviders', providerId);
      const providerSnap = await getDoc(providerRef);

      if (providerSnap.exists()) {
        const providerData = providerSnap.data();
        const name = providerData.name || 'Unknown Provider';

        // Cache the provider name
        setProviderNames((prev) => ({
          ...prev,
          [providerId]: name,
        }));

        return name;
      }

      return 'Provider Not Found';
    } catch (err) {
      console.error(`Error fetching provider ${providerId}:`, err);
      return 'Error Loading Provider';
    }
  };

  /**
   * Setup real-time listener for renovation projects
   * Uses onSnapshot() for real-time updates
   * Queries "renovationProjects" collection where userId == currentUser.uid
   * Handles collection not existing gracefully
   */
  useEffect(() => {
    // Wait for auth to load
    if (authLoading) {
      return;
    }

    // Check if user is authenticated
    if (!currentUser || !currentUser.uid) {
      setLoading(false);
      setError('Please log in to view your renovation projects.');
      return;
    }

    const userId = currentUser.uid;
    console.log('Setting up real-time listener for user:', userId);

    try {
      setLoading(true);
      setError(null);

      // Create query filtered by userId
      // Collection will be automatically created if it doesn't exist
      const projectsQuery = query(
        collection(db, 'renovationProjects'),
        where('userId', '==', userId)
      );

      // Setup real-time listener using onSnapshot
      const unsubscribe = onSnapshot(
        projectsQuery,
        async (snapshot) => {
          console.log(`Received ${snapshot.docs.length} renovation projects from snapshot`);

          // Handle empty collection gracefully
          if (snapshot.empty) {
            console.log('No renovation projects found for user');
            setProjects([]);
            setLoading(false);
            return;
          }

          // Map documents to array with id
          const projectsList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Fetch property names and provider names for all projects
          const fetchPromises = projectsList.map(async (project) => {
            const propertyNamePromise = project.propertyId
              ? fetchPropertyName(project.propertyId)
              : Promise.resolve('No Property');

            const providerNamePromise = project.providerId
              ? fetchProviderName(project.providerId)
              : Promise.resolve('No Provider');

            const [propertyName, providerName] = await Promise.all([
              propertyNamePromise,
              providerNamePromise,
            ]);

            return { project, propertyName, providerName };
          });

          const results = await Promise.all(fetchPromises);

          // Update caches
          const newPropertyNames = {};
          const newProviderNames = {};

          results.forEach(({ project, propertyName, providerName }) => {
            if (project.propertyId && propertyName) {
              newPropertyNames[project.propertyId] = propertyName;
            }
            if (project.providerId && providerName) {
              newProviderNames[project.providerId] = providerName;
            }
          });

          setPropertyNames((prev) => ({ ...prev, ...newPropertyNames }));
          setProviderNames((prev) => ({ ...prev, ...newProviderNames }));
          setProjects(projectsList);
          setLoading(false);
        },
        (err) => {
          // Error callback for onSnapshot
          console.error('Error in onSnapshot:', err);

          // Handle collection not existing or permission errors gracefully
          if (err.code === 'permission-denied') {
            setError('Permission denied. Please check Firestore security rules.');
            toast.error('Permission denied. Please contact administrator.');
          } else if (err.code === 'not-found' || err.message?.includes('not found')) {
            // Collection doesn't exist - this is okay, show empty state
            console.log('Collection does not exist yet. Showing empty state.');
            setProjects([]);
            setError(null);
          } else {
            setError(err.message || 'Failed to load renovation projects');
            toast.error('Failed to load renovation projects. Please try again.');
          }
          setLoading(false);
        }
      );

      // Cleanup function to unsubscribe from listener
      return () => {
        console.log('Unsubscribing from renovation projects listener');
        unsubscribe();
      };
    } catch (err) {
      console.error('Error setting up listener:', err);

      // Handle collection not existing gracefully
      if (err.code === 'not-found' || err.message?.includes('not found')) {
        console.log('Collection does not exist yet. Showing empty state.');
        setProjects([]);
        setError(null);
      } else {
        setError(err.message || 'Failed to setup real-time listener');
        toast.error('Failed to setup real-time listener.');
      }
      setLoading(false);
    }
  }, [currentUser, authLoading]);

  /**
   * Format date for display
   * Handles both Firestore Timestamp and string dates
   * @param {any} dateValue - Date value from Firestore
   * @returns {string} - Formatted date string
   */
  const formatDate = (dateValue) => {
    if (!dateValue) return 'Not set';

    try {
      // Handle Firestore Timestamp
      if (dateValue.seconds) {
        return new Date(dateValue.seconds * 1000).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }

      // Handle string dates
      if (typeof dateValue === 'string') {
        return new Date(dateValue).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }

      // Handle Date objects
      if (dateValue instanceof Date) {
        return dateValue.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }

      return 'Invalid date';
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Invalid date';
    }
  };

  /**
   * Format budget/price for display
   * @param {number} amount - Budget amount
   * @returns {string} - Formatted currency string
   */
  const formatBudget = (amount) => {
    if (!amount && amount !== 0) return 'Not set';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  /**
   * Get status badge styling based on status
   * Uses specific colors: Pending = yellow, In Progress = teal, Completed = green
   * @param {string} status - Project status
   * @returns {string} - Tailwind CSS classes for badge
   */
  const getStatusBadgeClasses = (status) => {
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-semibold';

    switch (status?.toLowerCase()) {
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'in progress':
      case 'inprogress':
        return `${baseClasses} bg-teal-100 text-teal-800`;
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'cancelled':
      case 'canceled':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  /**
   * Handle project cancellation
   * Deletes the project document from Firestore
   * Shows confirmation dialog before deletion
   * Only allowed for projects with status == "Pending"
   * @param {string} projectId - Project document ID
   */
  const handleCancelProject = async (projectId) => {
    // Confirm cancellation using window.confirm()
    if (
      !window.confirm(
        'Are you sure you want to cancel this renovation request? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      setCancellingId(projectId);

      // Delete project document from Firestore
      const projectRef = doc(db, 'renovationProjects', projectId);
      await deleteDoc(projectRef);

      toast.success('Renovation request cancelled successfully.');
      console.log('Renovation project cancelled:', projectId);
    } catch (err) {
      console.error('Error cancelling project:', err);
      toast.error(err.message || 'Failed to cancel project. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  /**
   * Toggle expanded state for project details
   * @param {string} projectId - Project document ID
   */
  const toggleExpanded = (projectId) => {
    setExpandedProjectId(expandedProjectId === projectId ? null : projectId);
  };

  // Show loading spinner while checking auth or initial load
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser || !currentUser.uid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please log in to view your renovation projects.</p>
          <Button onClick={() => navigate('/auth')} variant="primary">
            Log In
          </Button>
        </div>
      </div>
    );
  }

  // Error state (only show if there's an actual error, not just empty collection)
  if (error && projects.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Projects</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()} variant="primary">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-2">
            Renovation Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            View and manage your renovation projects in real-time.
          </p>
        </div>

        {/* Empty State */}
        {projects.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Wrench className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Renovation Projects</h2>
            <p className="text-gray-600 mb-6">
              You have not requested any renovation services yet.
            </p>
            <Button onClick={() => navigate('/renovation-request')} variant="primary">
              Request Renovation Service
            </Button>
          </div>
        ) : (
          /* Projects Grid */
          <div className="space-y-4">
            {projects.map((project) => {
              const propertyName = project.propertyId
                ? propertyNames[project.propertyId] || 'Loading...'
                : 'No Property';

              const providerName = project.providerId
                ? providerNames[project.providerId] || 'Loading...'
                : null;

              const isExpanded = expandedProjectId === project.id;
              const firstPhoto =
                project.photos && Array.isArray(project.photos) && project.photos.length > 0
                  ? project.photos[0]
                  : null;

              return (
                <div
                  key={project.id}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
                >
                  {/* Project Card Header */}
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      {/* Left Section: Project Info */}
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          {/* Photo Thumbnail */}
                          {firstPhoto && (
                            <div className="flex-shrink-0">
                              <img
                                src={firstPhoto}
                                alt="Project thumbnail"
                                className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                onError={(e) => {
                                  e.target.src = 'https://via.placeholder.com/80x80?text=No+Image';
                                }}
                              />
                            </div>
                          )}

                          {/* Project Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-semibold text-gray-900">
                                {project.serviceCategory || 'Renovation Project'}
                              </h3>
                              <span className={getStatusBadgeClasses(project.status)}>
                                {project.status || 'Unknown'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                                <span className="truncate">{propertyName}</span>
                              </div>
                              <div className="flex items-center">
                                <DollarSign className="w-4 h-4 mr-1 flex-shrink-0" />
                                <span>{formatBudget(project.budget)}</span>
                              </div>
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1 flex-shrink-0" />
                                <span>Preferred: {formatDate(project.preferredDate)}</span>
                              </div>
                              {project.photos &&
                                Array.isArray(project.photos) &&
                                project.photos.length > 0 && (
                                  <div className="flex items-center">
                                    <ImageIcon className="w-4 h-4 mr-1 flex-shrink-0" />
                                    <span>
                                      {project.photos.length} photo
                                      {project.photos.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Section: Actions */}
                      <div className="flex items-center gap-3">
                        {/* Cancel Button (only for Pending status) */}
                        {project.status?.toLowerCase() === 'pending' && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleCancelProject(project.id)}
                            disabled={cancellingId === project.id}
                            loading={cancellingId === project.id}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel Request
                          </Button>
                        )}

                        {/* View Details Toggle */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleExpanded(project.id)}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-1" />
                              Hide Details
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-1" />
                              View Details
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details Section */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-6 bg-gray-50">
                      <div className="space-y-4">
                        {/* Detailed Description */}
                        {project.detailedDescription && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">
                              Description
                            </h4>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {project.detailedDescription}
                            </p>
                          </div>
                        )}

                        {/* Provider Info */}
                        {providerName && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">
                              Assigned Provider
                            </h4>
                            <div className="flex items-center text-sm text-gray-600">
                              <User className="w-4 h-4 mr-2 flex-shrink-0" />
                              <span>{providerName}</span>
                            </div>
                          </div>
                        )}

                        {/* Photos Gallery */}
                        {project.photos &&
                          Array.isArray(project.photos) &&
                          project.photos.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Photos</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {project.photos.map((photoUrl, index) => (
                                  <div key={index} className="relative group">
                                    <img
                                      src={photoUrl}
                                      alt={`Project photo ${index + 1}`}
                                      className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => window.open(photoUrl, '_blank')}
                                      onError={(e) => {
                                        e.target.src =
                                          'https://via.placeholder.com/200x150?text=Image+Error';
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* Additional Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Service Category</p>
                            <p className="text-sm font-medium text-gray-900">
                              {project.serviceCategory || 'Not specified'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Status</p>
                            <span className={getStatusBadgeClasses(project.status)}>
                              {project.status || 'Unknown'}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Budget</p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatBudget(project.budget)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Preferred Date</p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatDate(project.preferredDate)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RenovationDashboard;
