import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, getDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Building2, Calendar, DollarSign, MapPin, X, AlertCircle } from 'lucide-react';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

/**
 * ConstructionDashboard Component
 *
 * Displays user's construction projects in real-time using Firestore onSnapshot.
 * Queries "constructionProjects" collection where userId == currentUser.uid.
 * Shows project details including property names fetched from properties collection.
 * Allows cancellation of pending projects.
 * Handles collection not existing gracefully.
 */
const ConstructionDashboard = () => {
  const navigate = useNavigate();
  const { user: contextUser, loading: authLoading } = useAuth();

  // Get currentUser from Firebase auth
  const currentUser = auth?.currentUser || contextUser;

  // State management
  const [projects, setProjects] = useState([]);
  const [propertyNames, setPropertyNames] = useState({}); // Cache property names by propertyId
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

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
   * Setup real-time listener for construction projects
   * Uses onSnapshot() for real-time updates
   * Queries "constructionProjects" collection where userId == currentUser.uid
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
      setError('Please log in to view your construction projects.');
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
        collection(db, 'constructionProjects'),
        where('userId', '==', userId)
      );

      // Setup real-time listener using onSnapshot
      const unsubscribe = onSnapshot(
        projectsQuery,
        async (snapshot) => {
          console.log(`Received ${snapshot.docs.length} projects from snapshot`);

          // Handle empty collection gracefully
          if (snapshot.empty) {
            console.log('No construction projects found for user');
            setProjects([]);
            setLoading(false);
            return;
          }

          // Map documents to array with id
          const projectsList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Fetch property names for all projects
          const propertyNamePromises = projectsList.map(async (project) => {
            if (project.propertyId) {
              const propertyName = await fetchPropertyName(project.propertyId);
              return { projectId: project.id, propertyName };
            }
            return { projectId: project.id, propertyName: 'No Property' };
          });

          const propertyNameResults = await Promise.all(propertyNamePromises);

          // Update property names cache
          const newPropertyNames = {};
          propertyNameResults.forEach(({ projectId, propertyName }) => {
            const project = projectsList.find((p) => p.id === projectId);
            if (project && project.propertyId) {
              newPropertyNames[project.propertyId] = propertyName;
            }
          });

          setPropertyNames((prev) => ({ ...prev, ...newPropertyNames }));
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
            setError(err.message || 'Failed to load construction projects');
            toast.error('Failed to load construction projects. Please try again.');
          }
          setLoading(false);
        }
      );

      // Cleanup function to unsubscribe from listener
      return () => {
        console.log('Unsubscribing from construction projects listener');
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
   * Uses specific colors: Pending = yellow, In Progress = slate, Completed = green
   * @param {string} status - Project status
   * @returns {string} - Tailwind CSS classes for badge
   */
  const getStatusBadgeClasses = (status) => {
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-semibold';

    switch (status?.toLowerCase()) {
      case 'pending':
        return `${baseClasses} bg-accent/20 text-accent`;
      case 'in progress':
      case 'inprogress':
        return `${baseClasses} bg-primary/20 text-primary`;
      case 'completed':
        return `${baseClasses} bg-primary/20 text-primary`;
      case 'cancelled':
      case 'canceled':
        return `${baseClasses} bg-error/20 text-error`;
      default:
        return `${baseClasses} bg-muted text-textMain`;
    }
  };

  /**
   * Handle project cancellation
   * Deletes the project document from Firestore
   * Shows confirmation dialog before deletion
   * @param {string} projectId - Project document ID
   */
  const handleCancelProject = async (projectId) => {
    // Confirm cancellation using window.confirm()
    if (
      !window.confirm('Are you sure you want to cancel this project? This action cannot be undone.')
    ) {
      return;
    }

    try {
      setCancellingId(projectId);

      // Delete project document from Firestore
      const projectRef = doc(db, 'constructionProjects', projectId);
      await deleteDoc(projectRef);

      toast.success('Project cancelled successfully.');
      console.log('Project cancelled:', projectId);
    } catch (err) {
      console.error('Error cancelling project:', err);
      toast.error(err.message || 'Failed to cancel project. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  // Show loading spinner while checking auth or initial load
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser || !currentUser.uid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 mx-auto text-error mb-4" />
          <h2 className="text-2xl font-bold text-textMain mb-2">Authentication Required</h2>
          <p className="text-textSecondary mb-6">Please log in to view your construction projects.</p>
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 mx-auto text-error mb-4" />
          <h2 className="text-2xl font-bold text-textMain mb-2">Error Loading Projects</h2>
          <p className="text-textSecondary mb-6">{error}</p>
          <Button onClick={() => window.location.reload()} variant="primary">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold text-textMain mb-2">
            Construction Dashboard
          </h1>
          <p className="text-lg text-textSecondary">
            View and manage your construction projects in real-time.
          </p>
        </div>

        {/* Empty State */}
        {projects.length === 0 ? (
          <div className="bg-surface rounded-base shadow-lg p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto text-muted mb-4" />
            <h2 className="text-2xl font-bold text-textMain mb-2">No Construction Projects</h2>
            <p className="text-textSecondary mb-6">
              You have not requested any construction services yet.
            </p>
            <Button onClick={() => navigate('/construction-request')} variant="primary">
              Request Construction Service
            </Button>
          </div>
        ) : (
          /* Projects Table - Desktop View */
          <div className="bg-surface rounded-base shadow-lg overflow-hidden">
            {/* Responsive Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-muted">
                <thead className="bg-background">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                      Project Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                      Budget
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                      End Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-textSecondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-gray-200">
                  {projects.map((project) => {
                    const propertyName = project.propertyId
                      ? propertyNames[project.propertyId] || 'Loading...'
                      : 'No Property';

                    return (
                      <tr key={project.id} className="hover:bg-background transition-colors">
                        {/* Project Type */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-textMain">
                            {project.projectType || 'Not specified'}
                          </div>
                        </td>

                        {/* Property */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-textSecondary">
                            <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                            <span className="truncate max-w-xs">{propertyName}</span>
                          </div>
                        </td>

                        {/* Budget */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-textMain">
                            <DollarSign className="w-4 h-4 mr-1 flex-shrink-0" />
                            {formatBudget(project.budget)}
                          </div>
                        </td>

                        {/* Start Date */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-textSecondary">
                            <Calendar className="w-4 h-4 mr-1 flex-shrink-0" />
                            {formatDate(project.startDate)}
                          </div>
                        </td>

                        {/* End Date */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-textSecondary">
                            <Calendar className="w-4 h-4 mr-1 flex-shrink-0" />
                            {formatDate(project.endDate)}
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={getStatusBadgeClasses(project.status)}>
                            {project.status || 'Unknown'}
                          </span>
                        </td>

                        {/* Actions - Cancel button only for Pending status */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (hidden on desktop) */}
            <div className="md:hidden divide-y divide-gray-200">
              {projects.map((project) => {
                const propertyName = project.propertyId
                  ? propertyNames[project.propertyId] || 'Loading...'
                  : 'No Property';

                return (
                  <div key={project.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-semibold text-textMain">
                          {project.projectType || 'Not specified'}
                        </h3>
                        <p className="text-xs text-textSecondary mt-1">{propertyName}</p>
                      </div>
                      <span className={getStatusBadgeClasses(project.status)}>
                        {project.status || 'Unknown'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-textSecondary">Budget</p>
                        <p className="font-medium text-textMain">{formatBudget(project.budget)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-textSecondary">Start Date</p>
                        <p className="font-medium text-textMain">{formatDate(project.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-textSecondary">End Date</p>
                        <p className="font-medium text-textMain">{formatDate(project.endDate)}</p>
                      </div>
                    </div>

                    {/* Cancel button only for Pending status */}
                    {project.status?.toLowerCase() === 'pending' && (
                      <div className="pt-2">
                        <Button
                          variant="danger"
                          size="sm"
                          fullWidth
                          onClick={() => handleCancelProject(project.id)}
                          disabled={cancellingId === project.id}
                          loading={cancellingId === project.id}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancel Request
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConstructionDashboard;
