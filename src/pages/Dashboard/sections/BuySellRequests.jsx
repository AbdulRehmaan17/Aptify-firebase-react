import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, DollarSign, Clock, Eye, XCircle } from 'lucide-react';
import buySellRequestService from '../../../services/buySellRequestService';
import marketplaceService from '../../../services/marketplaceService';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';

const BuySellRequests = ({ user, onDataReload }) => {
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
      const buySellRequests = await buySellRequestService.getByUser(user.uid);
      // Fetch listing details for each request
      const requestsWithListings = await Promise.all(
        buySellRequests.map(async (req) => {
          try {
            const listing = await marketplaceService.getById(req.listingId || req.propertyId);
            return { ...req, listing };
          } catch (error) {
            console.error('Error fetching listing:', error);
            return { ...req, listing: null };
          }
        })
      );
      setRequests(requestsWithListings);
    } catch (error) {
      console.error('Error loading buy/sell requests:', error);
      toast.error('Failed to load buy/sell requests');
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
      await buySellRequestService.updateStatus(requestToCancel.id, 'cancelled');
      toast.success('Request cancelled');
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

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
    }).format(price);
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
          <h1 className="text-3xl font-display font-bold text-textMain">Buy/Sell Requests</h1>
          <p className="text-textSecondary mt-2">View and manage your buy/sell offers</p>
        </div>
        <Button onClick={() => navigate('/buy')} variant="primary">
          <ShoppingCart className="w-4 h-4 mr-2" />
          Browse Marketplace
        </Button>
      </div>

      {requests.length === 0 ? (
        <div className="bg-surface rounded-lg shadow-md p-12 text-center border border-muted">
          <ShoppingCart className="w-16 h-16 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-textMain mb-2">No buy/sell requests</h3>
          <p className="text-textSecondary mb-4">Start by browsing the marketplace</p>
          <Button onClick={() => navigate('/buy')} variant="primary">
            Browse Marketplace
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
                      {request.listing?.title || request.listing?.name || 'Listing Request'}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
                      {request.status || 'pending'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="flex items-center text-textSecondary text-sm">
                      <DollarSign className="w-4 h-4 mr-2" />
                      <span>Offer: {formatPrice(request.offerAmount || request.amount)}</span>
                    </div>
                    {request.listing && (
                      <div className="flex items-center text-textSecondary text-sm">
                        <DollarSign className="w-4 h-4 mr-2" />
                        <span>Listed: {formatPrice(request.listing.price)}</span>
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
                  {request.listing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/marketplace/${request.listing.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Listing
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
        title="Cancel Request"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-textMain">
            Are you sure you want to cancel this request? This action cannot be undone.
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

export default BuySellRequests;

