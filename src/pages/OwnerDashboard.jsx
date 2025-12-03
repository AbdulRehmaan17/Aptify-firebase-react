import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import rentalRequestService from '../services/rentalRequestService';
import buySellRequestService from '../services/buySellRequestService';
import propertyService from '../services/propertyService';
import transactionService from '../services/transactionService';
import { getOrCreateChat } from '../utils/chatHelpers';
import { Calendar, DollarSign, CheckCircle, XCircle, Clock, Home, Edit, Trash2, Plus, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';

const OwnerDashboard = () => {
  const { user, currentUserRole } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rentalRequests, setRentalRequests] = useState([]);
  const [buySellRequests, setBuySellRequests] = useState([]);
  const [properties, setProperties] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('properties'); // 'properties', 'rental', 'buySell', or 'transactions'
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(''); // 'accept', 'reject', or 'complete'
  const [processing, setProcessing] = useState(false);
  const [showDeletePropertyModal, setShowDeletePropertyModal] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  const [deletingProperty, setDeletingProperty] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [rentals, buySells, userProperties, userTransactions] = await Promise.all([
          rentalRequestService.getByOwner(user.uid),
          buySellRequestService.getByOwner(user.uid),
          propertyService.getByOwner(user.uid),
          transactionService.getByUser(user.uid).catch(() => []),
        ]);

        // Fetch property details for each request
        const rentalsWithProperties = await Promise.all(
          rentals.map(async (request) => {
            try {
              const property = await propertyService.getById(request.propertyId, false);
              return { ...request, property };
            } catch (error) {
              console.error('Error fetching property:', error);
              return { ...request, property: null };
            }
          })
        );

        const buySellsWithProperties = await Promise.all(
          buySells.map(async (request) => {
            try {
              const property = await propertyService.getById(request.propertyId, false);
              return { ...request, property };
            } catch (error) {
              console.error('Error fetching property:', error);
              return { ...request, property: null };
            }
          })
        );

        setRentalRequests(rentalsWithProperties);
        setBuySellRequests(buySellsWithProperties);
        setProperties(userProperties);
        setTransactions(userTransactions);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  const handleAction = async (request, type) => {
    setSelectedRequest(request);
    setActionType(type);
    setShowActionModal(true);
  };

  const confirmAction = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);
      const propertyTitle = selectedRequest.property?.title || 'Property';

      if (activeTab === 'rental') {
        const newStatus = actionType === 'accept' ? 'Accepted' : actionType === 'reject' ? 'Rejected' : 'Completed';
        
        // Auto-create chat when accepting
        let chatId = null;
        if (actionType === 'accept') {
          try {
            chatId = await getOrCreateChat(user.uid, selectedRequest.userId);
            console.log('Chat created/retrieved for accepted request:', chatId);
          } catch (chatError) {
            console.error('Error creating chat on accept:', chatError);
            // Don't fail the accept action if chat creation fails
          }
        }
        
        await rentalRequestService.updateStatus(
          selectedRequest.id,
          newStatus,
          propertyTitle,
          selectedRequest.userId,
          chatId // Pass chatId to include in notification
        );
      } else {
        await buySellRequestService.updateStatus(
          selectedRequest.id,
          actionType === 'accept' ? 'Accepted' : 'Rejected',
          propertyTitle,
          selectedRequest.userId
        );
      }

      const actionMessages = {
        accept: 'accepted',
        reject: 'rejected',
        complete: 'marked as completed',
      };
      toast.success(`Request ${actionMessages[actionType] || 'updated'} successfully!`);

      // Refresh data
      const [rentals, buySells] = await Promise.all([
        rentalRequestService.getByOwner(user.uid),
        buySellRequestService.getByOwner(user.uid),
      ]);

      const rentalsWithProperties = await Promise.all(
        rentals.map(async (request) => {
          try {
            const property = await propertyService.getById(request.propertyId, false);
            return { ...request, property };
          } catch (error) {
            return { ...request, property: null };
          }
        })
      );

      const buySellsWithProperties = await Promise.all(
        buySells.map(async (request) => {
          try {
            const property = await propertyService.getById(request.propertyId, false);
            return { ...request, property };
          } catch (error) {
            return { ...request, property: null };
          }
        })
      );

      setRentalRequests(rentalsWithProperties);
      setBuySellRequests(buySellsWithProperties);
      setShowActionModal(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error processing request:', error);
      toast.error('Failed to process request');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getStatusBadge = (status) => {
    const badges = {
      Pending: 'bg-accent text-accent',
      Accepted: 'bg-primary/20 text-primary',
      Rejected: 'bg-error/20 text-error',
      Completed: 'bg-green-100 text-green-800',
    };
    return badges[status] || 'bg-muted text-textMain';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const currentRequests = activeTab === 'rental' ? rentalRequests : buySellRequests;

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-textMain mb-2">Owner Dashboard</h1>
          <p className="text-textSecondary">Manage rental and purchase requests for your properties</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-muted mb-6">
          <button
            onClick={() => setActiveTab('properties')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'properties'
                ? 'border-b-2 border-primary text-primary'
                : 'text-textSecondary hover:text-textMain'
            }`}
          >
            <Home className="w-4 h-4 inline mr-2" />
            My Properties ({properties.length})
          </button>
          <button
            onClick={() => setActiveTab('rental')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'rental'
                ? 'border-b-2 border-primary text-primary'
                : 'text-textSecondary hover:text-textMain'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Rental Requests ({rentalRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('buySell')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'buySell'
                ? 'border-b-2 border-primary text-primary'
                : 'text-textSecondary hover:text-textMain'
            }`}
          >
            <DollarSign className="w-4 h-4 inline mr-2" />
            Purchase Offers ({buySellRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'transactions'
                ? 'border-b-2 border-primary text-primary'
                : 'text-textSecondary hover:text-textMain'
            }`}
          >
            <CreditCard className="w-4 h-4 inline mr-2" />
            Transactions ({transactions.length})
          </button>
        </div>

        {/* Properties List */}
        {activeTab === 'properties' && (
          <>
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-textMain">My Properties</h2>
              <Button
                onClick={() => navigate('/post-property')}
                className="bg-primary hover:bg-primaryDark text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Property
              </Button>
            </div>
            {properties.length === 0 ? (
              <div className="bg-surface rounded-base shadow p-12 text-center">
                <Home className="w-16 h-16 text-muted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-textMain mb-2">No properties yet</h3>
                <p className="text-textSecondary mb-4">
                  Start by listing your first property.
                </p>
                <Button
                  onClick={() => navigate('/post-property')}
                  className="bg-primary hover:bg-primaryDark text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Property
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((property) => (
                  <div key={property.id} className="bg-surface rounded-base shadow-md overflow-hidden">
                    {property.coverImage || (property.photos && property.photos[0]) ? (
                      <img
                        src={property.coverImage || property.photos[0]}
                        alt={property.title}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-muted flex items-center justify-center">
                        <Home className="w-12 h-12 text-textSecondary" />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-textMain mb-2 truncate">
                        {property.title}
                      </h3>
                      <p className="text-primary font-bold mb-2">
                        {formatPrice(property.price)}
                      </p>
                      <p className="text-sm text-textSecondary mb-2">
                        {property.address?.city || 'N/A'}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-textSecondary mb-4">
                        <span>{property.bedrooms || 0} Beds</span>
                        <span>{property.bathrooms || 0} Baths</span>
                        <span>{property.areaSqFt || 0} sqft</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            property.status === 'published'
                              ? 'bg-primary/20 text-primary'
                              : property.status === 'pending'
                              ? 'bg-accent/20 text-accent'
                              : 'bg-muted text-textSecondary'
                          }`}
                        >
                          {property.status || 'pending'}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/post-property?edit=${property.id}`)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-error border-error hover:bg-error/10"
                            onClick={() => {
                              setPropertyToDelete(property);
                              setShowDeletePropertyModal(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Requests List */}
        {activeTab !== 'properties' && (
          <>
            {currentRequests.length === 0 ? (
              <div className="bg-surface rounded-base shadow p-12 text-center">
                <Home className="w-16 h-16 text-muted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-textMain mb-2">No {activeTab === 'rental' ? 'rental' : 'purchase'} requests</h3>
                <p className="text-textSecondary">
                  You don't have any {activeTab === 'rental' ? 'rental' : 'purchase'} requests yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentRequests.map((request) => (
              <div key={request.id} className="bg-surface rounded-base shadow-md p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-textMain">
                          {request.property?.title || 'Property Not Found'}
                        </h3>
                        <p className="text-sm text-textSecondary">
                          Request ID: {request.id.substring(0, 8)}...
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                          request.status
                        )}`}
                      >
                        {request.status}
                      </span>
                    </div>

                    {activeTab === 'rental' ? (
                      <div className="space-y-2 mt-4">
                        <div className="flex items-center text-sm text-textSecondary">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>
                            {formatDate(request.startDate)} - {formatDate(request.endDate)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <div className="flex items-center text-lg font-semibold text-primary">
                          <DollarSign className="w-5 h-5 mr-2" />
                          {formatPrice(request.offerAmount)}
                        </div>
                      </div>
                    )}

                    {request.message && (
                      <div className="mt-4 p-3 bg-background rounded-lg">
                        <p className="text-sm text-textMain">{request.message}</p>
                      </div>
                    )}

                    <div className="mt-4 text-xs text-textSecondary">
                      Requested on: {formatDate(request.createdAt?.toDate?.() || request.createdAt)}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const chatId = await getOrCreateChat(user.uid, request.userId);
                          navigate(`/chat?chatId=${chatId}`);
                        } catch (error) {
                          console.error('Error creating chat:', error);
                          toast.error('Failed to open chat');
                        }
                      }}
                      className="flex-1"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Chat
                    </Button>
                    {request.status === 'Pending' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                          onClick={() => handleAction(request, 'accept')}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-error/10 text-error border-error/30 hover:bg-error/20"
                          onClick={() => handleAction(request, 'reject')}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
                    {request.status === 'Accepted' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-green-100 text-green-800 border-green-300 hover:bg-green-200"
                        onClick={() => handleAction(request, 'complete')}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Completed
                      </Button>
                    )}
                  </div>
                </div>
              </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-textMain">Transactions</h2>
            {transactions.length === 0 ? (
              <div className="bg-surface rounded-base shadow p-12 text-center">
                <CreditCard className="w-16 h-16 text-muted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-textMain mb-2">No transactions yet</h3>
                <p className="text-textSecondary">Transactions will appear here once payments are made</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="bg-surface rounded-base shadow-md p-4 border border-muted">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-textMain capitalize">
                            {transaction.targetType || 'Transaction'}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              transaction.status === 'success'
                                ? 'bg-green-100 text-green-800'
                                : transaction.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {transaction.status}
                          </span>
                        </div>
                        <p className="text-lg font-bold text-primary mb-1">
                          {new Intl.NumberFormat('en-PK', {
                            style: 'currency',
                            currency: transaction.currency || 'PKR',
                            maximumFractionDigits: 0,
                          }).format(transaction.amount)}
                        </p>
                        <p className="text-xs text-textSecondary">
                          {transaction.createdAt?.toDate?.()?.toLocaleString() || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={showActionModal}
        onClose={() => {
          setShowActionModal(false);
          setSelectedRequest(null);
        }}
        title={
          actionType === 'accept'
            ? 'Accept Request'
            : actionType === 'reject'
            ? 'Reject Request'
            : 'Mark Request as Completed'
        }
        size="md"
      >
        <div className="space-y-4">
          <p className="text-textMain">
            Are you sure you want to{' '}
            {actionType === 'accept'
              ? 'accept'
              : actionType === 'reject'
              ? 'reject'
              : 'mark as completed'}{' '}
            this {activeTab === 'rental' ? 'rental' : 'purchase'} request?
            {(actionType === 'accept' || actionType === 'complete') && ' The user will be notified.'}
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowActionModal(false);
                setSelectedRequest(null);
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
                : 'Mark Completed'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Property Modal */}
      <Modal
        isOpen={showDeletePropertyModal}
        onClose={() => {
          setShowDeletePropertyModal(false);
          setPropertyToDelete(null);
        }}
        title="Delete Property"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-textMain">
            Are you sure you want to delete "{propertyToDelete?.title}"? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeletePropertyModal(false);
                setPropertyToDelete(null);
              }}
              disabled={deletingProperty}
            >
              Cancel
            </Button>
            <Button
              className="bg-error hover:bg-error text-white"
              onClick={async () => {
                if (!propertyToDelete) return;
                try {
                  setDeletingProperty(true);
                  await propertyService.delete(propertyToDelete.id);
                  toast.success('Property deleted successfully');
                  // Refresh properties list
                  const userProperties = await propertyService.getByOwner(user.uid);
                  setProperties(userProperties);
                  setShowDeletePropertyModal(false);
                  setPropertyToDelete(null);
                } catch (error) {
                  console.error('Error deleting property:', error);
                  toast.error('Failed to delete property');
                } finally {
                  setDeletingProperty(false);
                }
              }}
              loading={deletingProperty}
              disabled={deletingProperty}
            >
              Delete Property
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OwnerDashboard;

