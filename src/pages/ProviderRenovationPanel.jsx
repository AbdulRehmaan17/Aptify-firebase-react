import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import renovationRequestService from '../services/renovationRequestService';
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
  XCircle,
} from 'lucide-react';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import Modal from '../components/common/Modal';

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
  const [requests, setRequests] = useState([]);
  const [clientNames, setClientNames] = useState({}); // Cache client names by userId
  const [propertyNames, setPropertyNames] = useState({}); // Cache property titles by propertyId
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState({}); // Track which request is being updated
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null); // 'accept', 'reject', 'complete', 'inprogress'
  const [processing, setProcessing] = useState(false);
  const [progressNote, setProgressNote] = useState('');

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
   * Load renovation requests for provider
   */
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!currentUser || !currentUser.uid) {
      setLoading(false);
      setError('Please log in to view your renovation requests.');
      return;
    }

    const loadRequests = async () => {
      try {
        setLoading(true);
        setError(null);

        const providerId = currentUser.uid;
        const requestsList = await renovationRequestService.getByProvider(providerId);

        // Fetch client names and property titles
        const fetchPromises = requestsList.map(async (request) => {
          const clientNamePromise = request.userId
            ? fetchClientName(request.userId)
            : Promise.resolve('No Client');

          const propertyTitlePromise = request.propertyId
            ? fetchPropertyTitle(request.propertyId)
            : Promise.resolve('No Property');

          const [clientName, propertyTitle] = await Promise.all([
            clientNamePromise,
            propertyTitlePromise,
          ]);

          return { request, clientName, propertyTitle };
        });

        const results = await Promise.all(fetchPromises);

        // Update caches
        const newClientNames = {};
        const newPropertyNames = {};

        results.forEach(({ request, clientName, propertyTitle }) => {
          if (request.userId && clientName) {
            newClientNames[request.userId] = clientName;
          }
          if (request.propertyId && propertyTitle) {
            newPropertyNames[request.propertyId] = propertyTitle;
          }
        });

        setClientNames((prev) => ({ ...prev, ...newClientNames }));
        setPropertyNames((prev) => ({ ...prev, ...newPropertyNames }));
        setRequests(requestsList);
      } catch (err) {
        console.error('Error loading renovation requests:', err);
        setError(err.message || 'Failed to load renovation requests');
        toast.error('Failed to load renovation requests. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
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
   * Handle action (accept/reject/complete/update progress)
   */
  const handleAction = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setProgressNote('');
    setShowActionModal(true);
  };

  /**
   * Confirm action
   */
  const confirmAction = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);
      const providerId = currentUser.uid;

      if (actionType === 'accept') {
        await renovationRequestService.updateStatus(
          selectedRequest.id,
          'Accepted',
          providerId
        );
        toast.success('Request accepted successfully!');
      } else if (actionType === 'reject') {
        await renovationRequestService.updateStatus(
          selectedRequest.id,
          'Rejected',
          providerId
        );
        toast.success('Request rejected.');
      } else if (actionType === 'complete') {
        await renovationRequestService.updateStatus(
          selectedRequest.id,
          'Completed',
          providerId,
          progressNote || null
        );
        toast.success('Request marked as completed!');
      } else if (actionType === 'inprogress') {
        await renovationRequestService.updateStatus(
          selectedRequest.id,
          'In Progress',
          providerId,
          progressNote || null
        );
        toast.success('Request marked as in progress!');
      }

      // Reload requests
      const requestsList = await renovationRequestService.getByProvider(providerId);
      setRequests(requestsList);

      setShowActionModal(false);
      setSelectedRequest(null);
      setActionType(null);
      setProgressNote('');
    } catch (error) {
      console.error('Error updating request status:', error);
      toast.error(error.message || 'Failed to update request status.');
    } finally {
      setProcessing(false);
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
  if (error && requests.length === 0) {
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
        {requests.length === 0 ? (
          <div className="bg-surface rounded-base shadow-lg p-12 text-center">
            <Wrench className="w-16 h-16 mx-auto text-muted mb-4" />
            <h2 className="text-2xl font-bold text-textMain mb-2">No Requests Available</h2>
            <p className="text-textSecondary">No renovation requests available yet.</p>
          </div>
        ) : (
          /* Requests Table - Desktop View */
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
                  {requests.map((request) => {
                    const clientName = request.userId
                      ? clientNames[request.userId] || 'Loading...'
                      : 'No Client';

                    const propertyTitle = request.propertyId
                      ? propertyNames[request.propertyId] || 'Loading...'
                      : 'No Property';

                    const isPending = request.status === 'Pending' && !request.isAssigned;
                    const isAssigned = request.isAssigned || request.providerId === currentUser.uid;
                    const isUpdating = updatingStatus[request.id] || false;
                    const hasPhotos =
                      request.photos && Array.isArray(request.photos) && request.photos.length > 0;
                    const firstPhoto = hasPhotos ? request.photos[0] : null;
                    const photoCount = hasPhotos ? request.photos.length : 0;

                    return (
                      <tr key={request.id} className="hover:bg-background transition-colors">
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
                            {request.serviceCategory || 'Not specified'}
                          </div>
                        </td>

                        {/* Description Snippet */}
                        <td className="px-6 py-4">
                          <div
                            className="text-sm text-textSecondary max-w-xs truncate"
                            title={request.detailedDescription || request.description}
                          >
                            {getDescriptionSnippet(request.detailedDescription || request.description)}
                          </div>
                        </td>

                        {/* Budget */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-textMain">
                            <DollarSign className="w-4 h-4 mr-1 flex-shrink-0" />
                            {formatBudget(request.budget)}
                          </div>
                        </td>

                        {/* Preferred Date */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-textSecondary">
                            <Calendar className="w-4 h-4 mr-1 flex-shrink-0" />
                            {formatDate(request.preferredDate)}
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
                          <span className={getStatusBadgeClasses(request.status)}>
                            {request.status || 'Pending'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {isPending && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                                  onClick={() => handleAction(request, 'accept')}
                                  disabled={isUpdating}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Accept
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-error/10 text-error border-error/30 hover:bg-error/20"
                                  onClick={() => handleAction(request, 'reject')}
                                  disabled={isUpdating}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {isAssigned && request.status === 'Accepted' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-green-100 text-green-800 border-green-300 hover:bg-green-200"
                                onClick={() => handleAction(request, 'inprogress')}
                                disabled={isUpdating}
                              >
                                Start
                              </Button>
                            )}
                            {isAssigned && request.status === 'In Progress' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-green-100 text-green-800 border-green-300 hover:bg-green-200"
                                onClick={() => handleAction(request, 'complete')}
                                disabled={isUpdating}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Complete
                              </Button>
                            )}
                            {isUpdating && <LoadingSpinner size="sm" />}

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
              {requests.map((request) => {
                const clientName = request.userId
                  ? clientNames[request.userId] || 'Loading...'
                  : 'No Client';

                const propertyTitle = request.propertyId
                  ? propertyNames[request.propertyId] || 'Loading...'
                  : 'No Property';

                const isPending = request.status === 'Pending' && !request.isAssigned;
                const isAssigned = request.isAssigned || request.providerId === currentUser.uid;
                const isUpdating = updatingStatus[request.id] || false;
                const hasPhotos =
                  request.photos && Array.isArray(request.photos) && request.photos.length > 0;
                const firstPhoto = hasPhotos ? request.photos[0] : null;
                const photoCount = hasPhotos ? request.photos.length : 0;

                return (
                  <div key={request.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-semibold text-textMain">
                          {request.serviceCategory || 'Renovation Project'}
                        </h3>
                        <p className="text-xs text-textSecondary mt-1">
                          {clientName} - {propertyTitle}
                        </p>
                      </div>
                      <span className={getStatusBadgeClasses(request.status)}>
                        {request.status || 'Pending'}
                      </span>
                    </div>

                    {(request.detailedDescription || request.description) && (
                      <div>
                        <p className="text-xs text-textSecondary mb-1">Description</p>
                        <p className="text-sm text-textMain">
                          {getDescriptionSnippet(request.detailedDescription || request.description)}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-textSecondary">Budget</p>
                        <p className="font-medium text-textMain">{formatBudget(request.budget)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-textSecondary">Preferred Date</p>
                        <p className="font-medium text-textMain">
                          {formatDate(request.preferredDate)}
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
                      {isPending && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 bg-primary/10 text-primary border-primary/30"
                            onClick={() => handleAction(request, 'accept')}
                            disabled={isUpdating}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 bg-error/10 text-error border-error/30"
                            onClick={() => handleAction(request, 'reject')}
                            disabled={isUpdating}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                      {isAssigned && request.status === 'Accepted' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full bg-green-100 text-green-800"
                          onClick={() => handleAction(request, 'inprogress')}
                          disabled={isUpdating}
                        >
                          Start
                        </Button>
                      )}
                      {isAssigned && request.status === 'In Progress' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full bg-green-100 text-green-800"
                          onClick={() => handleAction(request, 'complete')}
                          disabled={isUpdating}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                      )}
                      {isUpdating && <LoadingSpinner size="sm" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Confirmation Modal */}
        <Modal
          isOpen={showActionModal}
          onClose={() => {
            setShowActionModal(false);
            setSelectedRequest(null);
            setActionType(null);
            setProgressNote('');
          }}
          title={
            actionType === 'accept'
              ? 'Accept Request'
              : actionType === 'reject'
              ? 'Reject Request'
              : actionType === 'complete'
              ? 'Mark Request as Completed'
              : 'Start Project'
          }
          size="md"
        >
          <div className="space-y-4">
            {(actionType === 'inprogress' || actionType === 'complete') && (
              <div>
                <label className="block text-sm font-medium text-textMain mb-2">
                  Progress Note (Optional)
                </label>
                <textarea
                  value={progressNote}
                  onChange={(e) => setProgressNote(e.target.value)}
                  rows={3}
                  placeholder="Add a note about the progress..."
                  className="w-full px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                />
              </div>
            )}
            <p className="text-textMain">
              Are you sure you want to{' '}
              {actionType === 'accept'
                ? 'accept'
                : actionType === 'reject'
                ? 'reject'
                : actionType === 'complete'
                ? 'mark as completed'
                : 'start'}{' '}
              this renovation request?
              {(actionType === 'accept' || actionType === 'complete') && ' The user will be notified.'}
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowActionModal(false);
                  setSelectedRequest(null);
                  setActionType(null);
                  setProgressNote('');
                }}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                className={
                  actionType === 'accept'
                    ? 'bg-primary hover:bg-primary/90 text-white'
                    : actionType === 'reject'
                    ? 'bg-error hover:bg-error text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }
                onClick={confirmAction}
                loading={processing}
                disabled={processing}
              >
                {actionType === 'accept'
                  ? 'Accept'
                  : actionType === 'reject'
                  ? 'Reject'
                  : actionType === 'complete'
                  ? 'Mark Completed'
                  : 'Start'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default ProviderRenovationPanel;
