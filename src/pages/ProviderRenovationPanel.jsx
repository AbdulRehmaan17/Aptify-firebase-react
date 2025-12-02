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
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/notificationService';
import {
  Wrench,
  Calendar,
  DollarSign,
  MapPin,
  User,
  FileText,
  AlertCircle,
  Image as ImageIcon,
  CheckCircle,
  X,
} from 'lucide-react';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

/**
 * ProviderRenovationPanel Component
 *
 * Displays renovation projects assigned to the current provider.
 * Queries "renovationProjects" collection where providerId == currentUser.uid.
 * Also shows projects without providerId (pending requests) that can be accepted.
 * Fetches client names from "users" collection and property titles from "properties" collection.
 * Allows providers to accept/reject requests and update project status (Pending → In Progress → Completed).
 * Handles collections not existing gracefully.
 */
const ProviderRenovationPanel = () => {
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
  const [acceptingId, setAcceptingId] = useState(null); // Track which project is being accepted
  const [rejectingId, setRejectingId] = useState(null); // Track which project is being rejected

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
   * Setup real-time listener for renovation projects
   * Queries "renovationProjects" collection where providerId == currentUser.uid
   * Also queries for projects without providerId (pending requests that can be accepted)
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
      setError('Please log in to view your renovation projects.');
      return;
    }

    const providerId = currentUser.uid;
    console.log('Setting up real-time listener for provider:', providerId);

    try {
      setLoading(true);
      setError(null);

      // Query for projects assigned to this provider
      // Collection will be automatically created if it doesn't exist
      const projectsQuery = query(
        collection(db, 'renovationProjects'),
        where('providerId', '==', providerId)
      );

      // Setup real-time listener using onSnapshot
      const unsubscribe = onSnapshot(
        projectsQuery,
        async (snapshot) => {
          console.log(`Received ${snapshot.docs.length} renovation projects from snapshot`);

          // Handle empty collection gracefully
          if (snapshot.empty) {
            console.log('No renovation projects assigned to provider');
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
   * Uses color-coded tags for different statuses
   * @param {string} status - Project status
   * @returns {string} - Tailwind CSS classes for badge
   */
  const getStatusBadgeClasses = (status) => {
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-semibold';

    switch (status?.toLowerCase()) {
      case 'pending':
        return `${baseClasses} bg-accent text-accent`;
      case 'in progress':
      case 'inprogress':
      case 'assigned':
        return `${baseClasses} bg-accent text-accent`;
      case 'completed':
        return `${baseClasses} bg-primary/20 text-primary`;
      case 'cancelled':
      case 'canceled':
      case 'rejected':
        return `${baseClasses} bg-error/20 text-error`;
      default:
        return `${baseClasses} bg-muted text-textMain`;
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
      case 'assigned':
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
   * Handle accepting a renovation request
   * Sets providerId to currentUser.uid and status to "In Progress"
   * Uses updateDoc() with serverTimestamp()
   * @param {string} projectId - Project document ID
   */
  const handleAcceptRequest = async (projectId) => {
    if (!window.confirm('Are you sure you want to accept this renovation request?')) {
      return;
    }

    try {
      setAcceptingId(projectId);

      // Update project document in Firestore
      const projectRef = doc(db, 'renovationProjects', projectId);
      await updateDoc(projectRef, {
        providerId: currentUser.uid,
        status: 'Accepted',
        updatedAt: serverTimestamp(),
      });

      // Add update log
      try {
        const { addProjectUpdate } = await import('../utils/projectUpdates');
        await addProjectUpdate(
          'renovationProjects',
          projectId,
          'Accepted',
          currentUser.uid,
          'Request accepted by provider'
        );
      } catch (updateError) {
        console.error('Error adding update log:', updateError);
      }

      // Get project to find client
      const projectDoc = await getDoc(projectRef);
      const projectData = projectDoc.data();
      const clientId = projectData.userId || projectData.clientId;

      // Notify client
      if (clientId) {
        try {
          await notificationService.sendNotification(
            clientId,
            'Renovation Request Accepted',
            'Your renovation request has been accepted by the provider!',
            'status-update',
            '/my-account'
          );
        } catch (notifError) {
          console.error('Error creating notification:', notifError);
        }
      }

      toast.success('Renovation request accepted successfully!');
      console.log(`Project ${projectId} accepted by provider ${currentUser.uid}`);
    } catch (err) {
      console.error('Error accepting request:', err);
      toast.error(err.message || 'Failed to accept request. Please try again.');
    } finally {
      setAcceptingId(null);
    }
  };

  /**
   * Handle rejecting a renovation request
   * Sets status to "Rejected" (providerId remains unset)
   * Uses updateDoc() with serverTimestamp()
   * @param {string} projectId - Project document ID
   */
  const handleRejectRequest = async (projectId) => {
    if (!window.confirm('Are you sure you want to reject this renovation request?')) {
      return;
    }

    try {
      setRejectingId(projectId);

      // Update project document in Firestore
      const projectRef = doc(db, 'renovationProjects', projectId);
      await updateDoc(projectRef, {
        status: 'Rejected',
        updatedAt: serverTimestamp(),
      });

      // Add update log
      try {
        const { addProjectUpdate } = await import('../utils/projectUpdates');
        await addProjectUpdate(
          'renovationProjects',
          projectId,
          'Rejected',
          currentUser.uid,
          'Request rejected by provider'
        );
      } catch (updateError) {
        console.error('Error adding update log:', updateError);
      }

      // Get project to find client
      const projectDoc = await getDoc(projectRef);
      const projectData = projectDoc.data();
      const clientId = projectData.userId || projectData.clientId;

      // Notify client
      if (clientId) {
        try {
          await notificationService.sendNotification(
            clientId,
            'Renovation Request Rejected',
            'Your renovation request has been rejected by the provider.',
            'status-update',
            '/my-account'
          );
        } catch (notifError) {
          console.error('Error creating notification:', notifError);
        }
      }

      toast.success('Renovation request rejected.');
      console.log(`Project ${projectId} rejected by provider ${currentUser.uid}`);
    } catch (err) {
      console.error('Error rejecting request:', err);
      toast.error(err.message || 'Failed to reject request. Please try again.');
    } finally {
      setRejectingId(null);
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
      const projectRef = doc(db, 'renovationProjects', projectId);
      await updateDoc(projectRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // Add update log
      try {
        const { addProjectUpdate } = await import('../utils/projectUpdates');
        const note = newStatus === 'In Progress' ? 'Project started' : newStatus === 'Completed' ? 'Project completed' : `Status updated to ${newStatus}`;
        await addProjectUpdate(
          'renovationProjects',
          projectId,
          newStatus,
          currentUser.uid,
          note
        );
      } catch (updateError) {
        console.error('Error adding update log:', updateError);
      }

      // Get project to find client
      const projectDoc = await getDoc(projectRef);
      const projectData = projectDoc.data();
      const clientId = projectData.userId || projectData.clientId;

      // Notify client
      if (clientId) {
        try {
          await notificationService.sendNotification(
            clientId,
            'Renovation Project Status Updated',
            `Your renovation project status has been updated to ${newStatus}.`,
            'status-update',
            '/my-account'
          );
        } catch (notifError) {
          console.error('Error creating notification:', notifError);
        }
      }

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

  /**
   * Get description snippet (first 100 characters)
   * @param {string} description - Full description
   * @returns {string} - Description snippet
   */
  const getDescriptionSnippet = (description) => {
    if (!description) return 'No description';
    if (description.length <= 100) return description;
    return description.substring(0, 100) + '...';
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
          <p className="text-textSecondary mb-6">Please log in to view your renovation projects.</p>
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
            Provider Renovation Panel
          </h1>
          <p className="text-lg text-textSecondary">
            Manage your assigned renovation projects and update their status.
          </p>
        </div>

        {/* Empty State */}
        {projects.length === 0 ? (
          <div className="bg-surface rounded-base shadow-lg p-12 text-center">
            <Wrench className="w-16 h-16 mx-auto text-muted mb-4" />
            <h2 className="text-2xl font-bold text-textMain mb-2">No Projects Assigned</h2>
            <p className="text-textSecondary">No renovation requests assigned to you yet.</p>
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
                      Client Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                      Property Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                      Service Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                      Budget
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                      Preferred Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                      Photos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-textSecondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-muted">
                  {projects.map((project) => {
                    const clientName = project.userId
                      ? clientNames[project.userId] || 'Loading...'
                      : 'No Client';

                    const propertyTitle = project.propertyId
                      ? propertyNames[project.propertyId] || 'Loading...'
                      : 'No Property';

                    const availableStatuses = getAvailableStatuses(project.status);
                    const isUpdating = updatingStatus[project.id] || false;
                    const isAccepting = acceptingId === project.id;
                    const isRejecting = rejectingId === project.id;
                    const hasPhotos =
                      project.photos && Array.isArray(project.photos) && project.photos.length > 0;
                    const firstPhoto = hasPhotos ? project.photos[0] : null;
                    const photoCount = hasPhotos ? project.photos.length : 0;

                    return (
                      <tr key={project.id} className="hover:bg-background transition-colors">
                        {/* Client Name */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-textMain">
                            <User className="w-4 h-4 mr-1 flex-shrink-0" />
                            <span className="truncate max-w-xs">{clientName}</span>
                          </div>
                        </td>

                        {/* Property Title */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-textSecondary">
                            <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                            <span className="truncate max-w-xs">{propertyTitle}</span>
                          </div>
                        </td>

                        {/* Service Category */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-textMain">
                            {project.serviceCategory || 'Not specified'}
                          </div>
                        </td>

                        {/* Description Snippet */}
                        <td className="px-6 py-4">
                          <div
                            className="text-sm text-textSecondary max-w-xs truncate"
                            title={project.detailedDescription}
                          >
                            {getDescriptionSnippet(project.detailedDescription)}
                          </div>
                        </td>

                        {/* Budget */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-textMain">
                            <DollarSign className="w-4 h-4 mr-1 flex-shrink-0" />
                            {formatBudget(project.budget)}
                          </div>
                        </td>

                        {/* Preferred Date */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-textSecondary">
                            <Calendar className="w-4 h-4 mr-1 flex-shrink-0" />
                            {formatDate(project.preferredDate)}
                          </div>
                        </td>

                        {/* Photos Thumbnail */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {hasPhotos ? (
                            <div className="flex items-center gap-2">
                              <img
                                src={firstPhoto}
                                alt="Project photo"
                                className="w-12 h-12 object-cover rounded border border-muted"
                                onError={(e) => {
                                  e.target.src = 'https://via.placeholder.com/48x48?text=No+Image';
                                }}
                              />
                              <span className="text-xs text-textSecondary">
                                {photoCount} photo{photoCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted">No photos</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={getStatusBadgeClasses(project.status)}>
                            {project.status || 'Unknown'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {/* Accept/Reject buttons (only if no providerId or status is Pending) */}
                            {(!project.providerId ||
                              project.status?.toLowerCase() === 'pending') && (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleAcceptRequest(project.id)}
                                  disabled={isAccepting || isRejecting || isUpdating}
                                  loading={isAccepting}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Accept
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleRejectRequest(project.id)}
                                  disabled={isAccepting || isRejecting || isUpdating}
                                  loading={isRejecting}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}

                            {/* Status Update Dropdown (only if providerId is set) */}
                            {project.providerId && (
                              <select
                                value={project.status || 'Pending'}
                                onChange={(e) => handleStatusUpdate(project.id, e.target.value)}
                                disabled={isUpdating || isAccepting || isRejecting}
                                className={`px-3 py-1 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-accent text-sm font-medium transition-colors ${
                                  isUpdating || isAccepting || isRejecting
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'cursor-pointer'
                                }`}
                              >
                                {availableStatuses.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            )}

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
                const isAccepting = acceptingId === project.id;
                const isRejecting = rejectingId === project.id;
                const hasPhotos =
                  project.photos && Array.isArray(project.photos) && project.photos.length > 0;
                const firstPhoto = hasPhotos ? project.photos[0] : null;
                const photoCount = hasPhotos ? project.photos.length : 0;

                return (
                  <div key={project.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-semibold text-textMain">
                          {project.serviceCategory || 'Renovation Project'}
                        </h3>
                        <p className="text-xs text-textSecondary mt-1">
                          {clientName} - {propertyTitle}
                        </p>
                      </div>
                      <span className={getStatusBadgeClasses(project.status)}>
                        {project.status || 'Unknown'}
                      </span>
                    </div>

                    {project.detailedDescription && (
                      <div>
                        <p className="text-xs text-textSecondary mb-1">Description</p>
                        <p className="text-sm text-textMain">
                          {getDescriptionSnippet(project.detailedDescription)}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-textSecondary">Budget</p>
                        <p className="font-medium text-textMain">{formatBudget(project.budget)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-textSecondary">Preferred Date</p>
                        <p className="font-medium text-textMain">
                          {formatDate(project.preferredDate)}
                        </p>
                      </div>
                      {hasPhotos && (
                        <div className="col-span-2">
                          <p className="text-xs text-textSecondary mb-2">Photos</p>
                          <div className="flex items-center gap-2">
                            <img
                              src={firstPhoto}
                              alt="Project photo"
                                className="w-16 h-16 object-cover rounded border border-muted"
                              onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/64x64?text=No+Image';
                              }}
                            />
                            <span className="text-xs text-textSecondary">
                              {photoCount} photo{photoCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-muted space-y-2">
                      {(!project.providerId || project.status?.toLowerCase() === 'pending') && (
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            fullWidth
                            onClick={() => handleAcceptRequest(project.id)}
                            disabled={isAccepting || isRejecting || isUpdating}
                            loading={isAccepting}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            fullWidth
                            onClick={() => handleRejectRequest(project.id)}
                            disabled={isAccepting || isRejecting || isUpdating}
                            loading={isRejecting}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}

                      {project.providerId && (
                        <div>
                          <label className="block text-xs text-textSecondary mb-2">Update Status:</label>
                          <div className="flex items-center gap-2">
                            <select
                              value={project.status || 'Pending'}
                              onChange={(e) => handleStatusUpdate(project.id, e.target.value)}
                              disabled={isUpdating || isAccepting || isRejecting}
                              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-accent text-sm font-medium transition-colors"
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
                      )}
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

export default ProviderRenovationPanel;
