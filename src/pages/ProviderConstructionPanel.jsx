import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Building2, Calendar, DollarSign, MapPin, User, FileText, AlertCircle } from 'lucide-react';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

/**
 * ProviderConstructionPanel Component
 *
 * Displays construction projects assigned to the current provider.
 * Queries "constructionProjects" collection where providerId == currentUser.uid.
 * Fetches client names from "users" collection and property titles from "properties" collection.
 * Allows providers to update project status (Pending → In Progress → Completed).
 * Handles collections not existing gracefully.
 */
const ProviderConstructionPanel = () => {
  const navigate = useNavigate();
  const { user: contextUser, loading: authLoading } = useAuth();

  // Get currentUser from Firebase auth
  const currentUser = auth?.currentUser || contextUser;

  // State management
  const [projects, setProjects] = useState([]);
  const [clientNames, setClientNames] = useState({}); // Cache client names by userId
  const [propertyNames, setPropertyNames] = useState({}); // Cache property titles by propertyId
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState({}); // Track which project is being updated

  /**
   * Fetch client name from users collection
   * Caches the result to avoid repeated fetches
   * Handles collection not existing gracefully
   * @param {string} userId - User document ID
   * @returns {Promise<string>} - Client name or "Unknown Client"
   */
  const fetchClientName = async (userId) => {
    // Return cached name if available
    if (clientNames[userId]) {
      return clientNames[userId];
    }

    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        // Try multiple possible name fields
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
      // Handle collection not existing gracefully
      if (err.code === 'not-found' || err.message?.includes('not found')) {
        return 'Client Not Found';
      }
      return 'Error Loading Client';
    }
  };

  /**
   * Fetch property title from properties collection
   * Caches the result to avoid repeated fetches
   * Handles collection not existing gracefully
   * @param {string} propertyId - Property document ID
   * @returns {Promise<string>} - Property title or "Unknown Property"
   */
  const fetchPropertyTitle = async (propertyId) => {
    // Return cached title if available
    if (propertyNames[propertyId]) {
      return propertyNames[propertyId];
    }

    try {
      const propertyRef = doc(db, 'properties', propertyId);
      const propertySnap = await getDoc(propertyRef);

      if (propertySnap.exists()) {
        const propertyData = propertySnap.data();
        const title = propertyData.title || propertyData.name || 'Unknown Property';

        // Cache the property title
        setPropertyNames((prev) => ({
          ...prev,
          [propertyId]: title,
        }));

        return title;
      }

      return 'Property Not Found';
    } catch (err) {
      console.error(`Error fetching property ${propertyId}:`, err);
      // Handle collection not existing gracefully
      if (err.code === 'not-found' || err.message?.includes('not found')) {
        return 'Property Not Found';
      }
      return 'Error Loading Property';
    }
  };

  /**
   * Setup real-time listener for construction projects
   * Queries "constructionProjects" collection where providerId == currentUser.uid
   * Uses onSnapshot() for real-time updates
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

    const providerId = currentUser.uid;
    console.log('Setting up real-time listener for provider:', providerId);

    try {
      setLoading(true);
      setError(null);

      // Create query filtered by providerId
      // Collection will be automatically created if it doesn't exist
      const projectsQuery = query(
        collection(db, 'constructionProjects'),
        where('providerId', '==', providerId)
      );

      // Setup real-time listener using onSnapshot
      const unsubscribe = onSnapshot(
        projectsQuery,
        async (snapshot) => {
          console.log(`Received ${snapshot.docs.length} projects from snapshot`);

          // Handle empty collection gracefully
          if (snapshot.empty) {
            console.log('No construction projects assigned to provider');
            setProjects([]);
            setLoading(false);
            return;
          }

          // Map documents to array with id
          const projectsList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Fetch client names and property titles for all projects
          const fetchPromises = projectsList.map(async (project) => {
            const clientNamePromise = project.userId
              ? fetchClientName(project.userId)
              : Promise.resolve('No Client');

            const propertyTitlePromise = project.propertyId
              ? fetchPropertyTitle(project.propertyId)
              : Promise.resolve('No Property');

            const [clientName, propertyTitle] = await Promise.all([
              clientNamePromise,
              propertyTitlePromise,
            ]);

            return { project, clientName, propertyTitle };
          });

          const results = await Promise.all(fetchPromises);

          // Update caches
          const newClientNames = {};
          const newPropertyNames = {};

          results.forEach(({ project, clientName, propertyTitle }) => {
            if (project.userId && clientName) {
              newClientNames[project.userId] = clientName;
            }
            if (project.propertyId && propertyTitle) {
              newPropertyNames[project.propertyId] = propertyTitle;
            }
          });

          setClientNames((prev) => ({ ...prev, ...newClientNames }));
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
   * Uses color-coded tags for different statuses
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
        return `${baseClasses} bg-slate-100 text-slate-800`;
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
   * Get available status options based on current status
   * Status flow: Pending → In Progress → Completed
   * @param {string} currentStatus - Current project status
   * @returns {Array<string>} - Available status options
   */
  const getAvailableStatuses = (currentStatus) => {
    const status = currentStatus?.toLowerCase();

    switch (status) {
      case 'pending':
        return ['Pending', 'In Progress'];
      case 'in progress':
      case 'inprogress':
        return ['In Progress', 'Completed'];
      case 'completed':
        return ['Completed'];
      default:
        return ['Pending', 'In Progress', 'Completed'];
    }
  };

  /**
   * Handle status update
   * Updates the project document in Firestore with new status and updatedAt timestamp
   * Uses updateDoc() and serverTimestamp()
   * @param {string} projectId - Project document ID
   * @param {string} newStatus - New status value
   */
  const handleStatusUpdate = async (projectId, newStatus) => {
    try {
      setUpdatingStatus((prev) => ({ ...prev, [projectId]: true }));

      // Update project document in Firestore
      const projectRef = doc(db, 'constructionProjects', projectId);
      await updateDoc(projectRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // Show success toast confirming update
      toast.success(`Project status updated to ${newStatus} successfully!`);
      console.log(`Project ${projectId} status updated to ${newStatus}`);
    } catch (err) {
      console.error('Error updating project status:', err);
      toast.error(err.message || 'Failed to update project status. Please try again.');
    } finally {
      setUpdatingStatus((prev) => {
        const newState = { ...prev };
        delete newState[projectId];
        return newState;
      });
    }
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
          <p className="text-gray-600 mb-6">Please log in to view your construction projects.</p>
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
            Provider Construction Panel
          </h1>
          <p className="text-lg text-gray-600">
            Manage your assigned construction projects and update their status.
          </p>
        </div>

        {/* Empty State */}
        {projects.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Projects Assigned</h2>
            <p className="text-gray-600">No construction requests assigned to you yet.</p>
          </div>
        ) : (
          /* Projects Table - Desktop View */
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Responsive Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Property Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Budget
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      End Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Update Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {projects.map((project) => {
                    const clientName = project.userId
                      ? clientNames[project.userId] || 'Loading...'
                      : 'No Client';

                    const propertyTitle = project.propertyId
                      ? propertyNames[project.propertyId] || 'Loading...'
                      : 'No Property';

                    const availableStatuses = getAvailableStatuses(project.status);
                    const isUpdating = updatingStatus[project.id] || false;

                    return (
                      <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                        {/* Client Name */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <User className="w-4 h-4 mr-1 flex-shrink-0" />
                            <span className="truncate max-w-xs">{clientName}</span>
                          </div>
                        </td>

                        {/* Property Title */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                            <span className="truncate max-w-xs">{propertyTitle}</span>
                          </div>
                        </td>

                        {/* Project Type */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {project.projectType || 'Not specified'}
                          </div>
                        </td>

                        {/* Description */}
                        <td className="px-6 py-4">
                          <div
                            className="text-sm text-gray-600 max-w-xs truncate"
                            title={project.description}
                          >
                            {project.description || 'No description'}
                          </div>
                        </td>

                        {/* Budget */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <DollarSign className="w-4 h-4 mr-1 flex-shrink-0" />
                            {formatBudget(project.budget)}
                          </div>
                        </td>

                        {/* Start Date */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="w-4 h-4 mr-1 flex-shrink-0" />
                            {formatDate(project.startDate)}
                          </div>
                        </td>

                        {/* End Date */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-600">
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

                        {/* Update Status Dropdown */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={project.status || 'Pending'}
                              onChange={(e) => handleStatusUpdate(project.id, e.target.value)}
                              disabled={isUpdating}
                              className={`px-3 py-1 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm font-medium transition-colors ${
                                isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                              }`}
                            >
                              {availableStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                            {isUpdating && <LoadingSpinner size="sm" />}
                          </div>
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
                const clientName = project.userId
                  ? clientNames[project.userId] || 'Loading...'
                  : 'No Client';

                const propertyTitle = project.propertyId
                  ? propertyNames[project.propertyId] || 'Loading...'
                  : 'No Property';

                const availableStatuses = getAvailableStatuses(project.status);
                const isUpdating = updatingStatus[project.id] || false;

                return (
                  <div key={project.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                          {project.projectType || 'Construction Project'}
                        </h3>
                        <p className="text-xs text-gray-600 mt-1">
                          {clientName} - {propertyTitle}
                        </p>
                      </div>
                      <span className={getStatusBadgeClasses(project.status)}>
                        {project.status || 'Unknown'}
                      </span>
                    </div>

                    {project.description && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Description</p>
                        <p className="text-sm text-gray-700">{project.description}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Budget</p>
                        <p className="font-medium text-gray-900">{formatBudget(project.budget)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Start Date</p>
                        <p className="font-medium text-gray-900">{formatDate(project.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">End Date</p>
                        <p className="font-medium text-gray-900">{formatDate(project.endDate)}</p>
                      </div>
                    </div>

                    {/* Status Update Dropdown */}
                    <div className="pt-2 border-t border-gray-200">
                      <label className="block text-xs text-gray-500 mb-2">Update Status:</label>
                      <div className="flex items-center gap-2">
                        <select
                          value={project.status || 'Pending'}
                          onChange={(e) => handleStatusUpdate(project.id, e.target.value)}
                          disabled={isUpdating}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm font-medium transition-colors"
                        >
                          {availableStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        {isUpdating && <LoadingSpinner size="sm" />}
                      </div>
                    </div>
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

export default ProviderConstructionPanel;
