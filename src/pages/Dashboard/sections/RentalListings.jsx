import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Calendar, CheckCircle, XCircle, MessageSquare, Eye, Trash2 } from 'lucide-react';
import propertyService from '../../../services/propertyService';
import rentalRequestService from '../../../services/rentalRequestService';
import { getOrCreateChat } from '../../../utils/chatHelpers';
import notificationService from '../../../services/notificationService';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';

/**
 * RentalListings Component
 * Shows rental properties listed by the current user and their incoming requests
 */
const RentalListings = ({ user, onDataReload }) => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load user's rental properties
      const allProperties = await propertyService.getByOwner(user.uid);
      const rentalProperties = allProperties.filter(
        (p) => p.type?.toLowerCase() === 'rent' || p.listingType?.toLowerCase() === 'rent'
      );
      setProperties(rentalProperties);

      // Load incoming requests for these properties
      const allRequests = await rentalRequestService.getByOwner(user.uid);
      setRequests(allRequests);
    } catch (error) {
      console.error('Error loading rental data:', error);
      toast.error('Failed to load rental data');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = (request, type) => {
    setSelectedRequest(request);
    setActionType(type);
    setShowActionModal(true);
  };

  const confirmAction = async () => {
    if (!selectedRequest || !actionType) return;

    setActionLoading(selectedRequest.id);
    try {
      let chatId = null;

      // Create chat if accepting
      if (actionType === 'accept') {
        try {
          chatId = await getOrCreateChat(selectedRequest.userId, user.uid);
        } catch (chatError) {
          console.error('Error creating chat:', chatError);
        }
      }

      // Update request status
      const statusMap = {
        accept: 'Accepted',
        reject: 'Rejected',
        complete: 'Completed',
      };
      const newStatus = statusMap[actionType];

      // AUTO-FIX: Use requesterId if available, fallback to userId
      const requesterId = selectedRequest.requesterId || selectedRequest.userId;
      if (!requesterId) {
        throw new Error('Cannot identify requester');
      }

      await rentalRequestService.updateStatus(
        selectedRequest.id,
        newStatus,
        selectedRequest.property?.title || 'Property',
        requesterId,
        chatId
      );

      toast.success(`Request ${actionType === 'accept' ? 'accepted' : actionType === 'reject' ? 'rejected' : 'completed'} successfully`);
      
      // Reload data
      await loadData();
      
      setShowActionModal(false);
      setSelectedRequest(null);
      setActionType(null);
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleChat = async (request) => {
    // AUTO-FIX: Validate request and user before creating chat, use requesterId if available
    const requesterId = request?.requesterId || request?.userId;
    if (!request || !requesterId || !user || !user.uid) {
      console.error('[RentalListings] Cannot open chat: missing user data');
      toast.error('Unable to open chat. Please try again.');
      return;
    }
    try {
      const chatId = await getOrCreateChat(requesterId, user.uid);
      navigate(`/chat?chatId=${chatId}`);
    } catch (error) {
      console.error('[RentalListings] Error opening chat:', error);
      toast.error('Failed to open chat');
    }
  };

  const getStatusColor = (status) => {
    const statusMap = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
    };
    return statusMap[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-textMain">My Rental Listings</h1>
          <p className="text-textSecondary mt-2">Manage your rental properties and incoming requests</p>
        </div>
        <Button onClick={() => navigate('/rental/add')} variant="primary">
          <Home className="w-4 h-4 mr-2" />
          List New Property
        </Button>
      </div>

      {/* My Rental Properties */}
      <section>
        <h2 className="text-2xl font-semibold text-textMain mb-4">My Rental Properties</h2>
        {properties.length === 0 ? (
          <div className="bg-surface rounded-lg shadow-md p-12 text-center border border-muted">
            <Home className="w-16 h-16 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-textMain mb-2">No rental properties listed</h3>
            <p className="text-textSecondary mb-4">Start by listing your first property for rent</p>
            <Button onClick={() => navigate('/rental/add')} variant="primary">
              List Property
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {properties.map((property) => {
              const propertyRequests = requests.filter((r) => r.propertyId === property.id);
              return (
                <div
                  key={property.id}
                  className="bg-surface rounded-lg shadow-md p-6 border border-muted hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-textMain mb-2">{property.title}</h3>
                      <p className="text-textSecondary text-sm mb-2">{property.description?.substring(0, 100)}...</p>
                      <div className="flex items-center text-textSecondary text-sm">
                        <span className="font-medium text-textMain">
                          PKR {property.price?.toLocaleString()}/month
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      property.status === 'available' ? 'bg-green-100 text-green-800' :
                      property.status === 'rented' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {property.status || 'available'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/properties/${property.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <span className="text-sm text-textSecondary">
                      {propertyRequests.length} request{propertyRequests.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Incoming Requests */}
      <section>
        <h2 className="text-2xl font-semibold text-textMain mb-4">Incoming Rental Requests</h2>
        {requests.length === 0 ? (
          <div className="bg-surface rounded-lg shadow-md p-12 text-center border border-muted">
            <Calendar className="w-16 h-16 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-textMain mb-2">No rental requests yet</h3>
            <p className="text-textSecondary">Requests for your rental properties will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              // AUTO-FIX: Validate request before rendering
              if (!request || !request.id) {
                console.warn('[RentalListings] Invalid request in list:', request);
                return null;
              }
              // AUTO-FIX: Return JSX - semicolon required after return statement
              return (
                <div
                  key={request.id}
                  className="bg-surface rounded-lg shadow-md p-6 border border-muted hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-textMain">
                          {request.property?.title || 'Property Request'}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
                          {request.status || 'pending'}
                        </span>
                      </div>

                      {request.startDate && request.endDate && (
                        <div className="flex items-center text-textSecondary text-sm mb-2">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>
                            {formatDate(request.startDate)} - {formatDate(request.endDate)}
                          </span>
                        </div>
                      )}

                      {request.message && (
                        <p className="text-textSecondary text-sm mb-2">{request.message}</p>
                      )}

                      <div className="flex items-center text-textSecondary text-sm">
                        <span>Requested: {formatDate(request.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {(request.status === 'Pending' || request.status === 'pending') && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRequestAction(request, 'accept')}
                            className="text-green-600 hover:bg-green-50"
                            disabled={actionLoading === request.id}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRequestAction(request, 'reject')}
                            className="text-red-600 hover:bg-red-50"
                            disabled={actionLoading === request.id}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {(request.status === 'Accepted' || request.status === 'accepted') && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleChat(request)}
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Chat
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRequestAction(request, 'complete')}
                            className="text-blue-600 hover:bg-blue-50"
                            disabled={actionLoading === request.id}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark Complete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={showActionModal}
        onClose={() => {
          setShowActionModal(false);
          setSelectedRequest(null);
          setActionType(null);
        }}
        title={`${actionType === 'accept' ? 'Accept' : actionType === 'reject' ? 'Reject' : 'Complete'} Rental Request`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-textMain">
            Are you sure you want to {actionType === 'accept' ? 'accept' : actionType === 'reject' ? 'reject' : 'mark as complete'} this rental request?
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowActionModal(false);
                setSelectedRequest(null);
                setActionType(null);
              }}
              disabled={actionLoading !== null}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === 'accept' ? 'primary' : actionType === 'reject' ? 'danger' : 'primary'}
              onClick={confirmAction}
              loading={actionLoading !== null}
              disabled={actionLoading !== null}
            >
              {actionType === 'accept' ? 'Accept' : actionType === 'reject' ? 'Reject' : 'Complete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RentalListings;

