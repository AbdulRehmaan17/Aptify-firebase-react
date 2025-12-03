import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, Eye, Trash2, XCircle } from 'lucide-react';
import rentalRequestService from '../../../services/rentalRequestService';
import propertyService from '../../../services/propertyService';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';

const RentalRequests = ({ user, onDataReload }) => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState(null);

  useEffect(() => {
    if (user) {
      loadRequests();
    }
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const rentalRequests = await rentalRequestService.getByUser(user.uid);
      // Fetch property details for each request
      const requestsWithProperties = await Promise.all(
        rentalRequests.map(async (req) => {
          try {
            const property = await propertyService.getById(req.propertyId, false);
            return { ...req, property };
          } catch (error) {
            console.error('Error fetching property:', error);
            return { ...req, property: null };
          }
        })
      );
      setRequests(requestsWithProperties);
    } catch (error) {
      console.error('Error loading rental requests:', error);
      toast.error('Failed to load rental requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (request) => {
    setRequestToCancel(request);
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (!requestToCancel) return;
    setCancellingId(requestToCancel.id);
    try {
      await rentalRequestService.updateStatus(requestToCancel.id, 'cancelled');
      toast.success('Rental request cancelled');
      setRequests((prev) =>
        prev.map((r) => (r.id === requestToCancel.id ? { ...r, status: 'cancelled' } : r))
      );
      setShowCancelModal(false);
      setRequestToCancel(null);
      if (onDataReload) {
        onDataReload();
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error('Failed to cancel request');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusColor = (status) => {
    const statusMap = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800',
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-textMain">Rental Requests</h1>
          <p className="text-textSecondary mt-2">View and manage your rental requests</p>
        </div>
        <Button onClick={() => navigate('/rental-services')} variant="primary">
          <Calendar className="w-4 h-4 mr-2" />
          New Request
        </Button>
      </div>

      {requests.length === 0 ? (
        <div className="bg-surface rounded-lg shadow-md p-12 text-center border border-muted">
          <Calendar className="w-16 h-16 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-textMain mb-2">No rental requests</h3>
          <p className="text-textSecondary mb-4">Start by creating a new rental request</p>
          <Button onClick={() => navigate('/rental-services')} variant="primary">
            Create Request
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
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

                  {request.property && (
                    <div className="flex items-center text-textSecondary text-sm mb-2">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>
                        {typeof request.property.address === 'string'
                          ? request.property.address
                          : request.property.address?.city || 'Location not specified'}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {request.startDate && request.endDate && (
                      <div className="flex items-center text-textSecondary text-sm">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>
                          {formatDate(request.startDate)} - {formatDate(request.endDate)}
                        </span>
                      </div>
                    )}
                    {request.duration && (
                      <div className="flex items-center text-textSecondary text-sm">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>Duration: {request.duration} month{request.duration !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    <div className="flex items-center text-textSecondary text-sm">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>Requested: {formatDate(request.createdAt)}</span>
                    </div>
                  </div>

                  {request.message && (
                    <p className="text-textSecondary text-sm mt-3 line-clamp-2">{request.message}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {request.property && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/properties/${request.property.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Property
                    </Button>
                  )}
                  {request.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancel(request)}
                      className="text-error hover:bg-error/10"
                      disabled={cancellingId === request.id}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setRequestToCancel(null);
        }}
        title="Cancel Rental Request"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-textMain">
            Are you sure you want to cancel this rental request? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelModal(false);
                setRequestToCancel(null);
              }}
              disabled={cancellingId !== null}
            >
              No, Keep It
            </Button>
            <Button
              variant="danger"
              onClick={confirmCancel}
              loading={cancellingId !== null}
              disabled={cancellingId !== null}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Yes, Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RentalRequests;

