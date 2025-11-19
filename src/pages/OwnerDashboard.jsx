import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import rentalRequestService from '../services/rentalRequestService';
import buySellRequestService from '../services/buySellRequestService';
import propertyService from '../services/propertyService';
import { Calendar, DollarSign, CheckCircle, XCircle, Clock, Home } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('rental'); // 'rental' or 'buySell'
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(''); // 'accept' or 'reject'
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [rentals, buySells, userProperties] = await Promise.all([
          rentalRequestService.getByOwner(user.uid),
          buySellRequestService.getByOwner(user.uid),
          propertyService.getByOwner(user.uid),
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
        await rentalRequestService.updateStatus(
          selectedRequest.id,
          actionType === 'accept' ? 'Accepted' : 'Rejected',
          propertyTitle,
          selectedRequest.userId
        );
      } else {
        await buySellRequestService.updateStatus(
          selectedRequest.id,
          actionType === 'accept' ? 'Accepted' : 'Rejected',
          propertyTitle,
          selectedRequest.userId
        );
      }

      toast.success(`Request ${actionType === 'accept' ? 'accepted' : 'rejected'} successfully!`);

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
      Pending: 'bg-yellow-100 text-yellow-800',
      Accepted: 'bg-green-100 text-green-800',
      Rejected: 'bg-red-100 text-red-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
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
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Owner Dashboard</h1>
          <p className="text-gray-600">Manage rental and purchase requests for your properties</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('rental')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'rental'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Rental Requests ({rentalRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('buySell')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'buySell'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <DollarSign className="w-4 h-4 inline mr-2" />
            Purchase Offers ({buySellRequests.length})
          </button>
        </div>

        {/* Requests List */}
        {currentRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No {activeTab === 'rental' ? 'rental' : 'purchase'} requests</h3>
            <p className="text-gray-600">
              You don't have any {activeTab === 'rental' ? 'rental' : 'purchase'} requests yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.property?.title || 'Property Not Found'}
                        </h3>
                        <p className="text-sm text-gray-500">
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
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>
                            {formatDate(request.startDate)} - {formatDate(request.endDate)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <div className="flex items-center text-lg font-semibold text-green-600">
                          <DollarSign className="w-5 h-5 mr-2" />
                          {formatPrice(request.offerAmount)}
                        </div>
                      </div>
                    )}

                    {request.message && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{request.message}</p>
                      </div>
                    )}

                    <div className="mt-4 text-xs text-gray-500">
                      Requested on: {formatDate(request.createdAt?.toDate?.() || request.createdAt)}
                    </div>
                  </div>

                  {request.status === 'Pending' && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                        onClick={() => handleAction(request, 'accept')}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        className="bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                        onClick={() => handleAction(request, 'reject')}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
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
        title={actionType === 'accept' ? 'Accept Request' : 'Reject Request'}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to {actionType} this {activeTab === 'rental' ? 'rental' : 'purchase'} request?
            {actionType === 'accept' && ' The user will be notified.'}
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
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }
              onClick={confirmAction}
              loading={processing}
              disabled={processing}
            >
              {actionType === 'accept' ? 'Accept' : 'Reject'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OwnerDashboard;

