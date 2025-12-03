import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hammer, Plus, Eye, Trash2, Edit, DollarSign, Calendar } from 'lucide-react';
import constructionRequestService from '../../../services/constructionRequestService';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';

const Construction = ({ user, onDataReload }) => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState(null);

  useEffect(() => {
    if (user) {
      loadRequests();
    }
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const constructionRequests = await constructionRequestService.getByUser(user.uid);
      setRequests(constructionRequests);
    } catch (error) {
      console.error('Error loading construction requests:', error);
      toast.error('Failed to load construction requests');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (request) => {
    setRequestToDelete(request);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!requestToDelete) return;
    setDeletingId(requestToDelete.id);
    try {
      await constructionRequestService.delete(requestToDelete.id);
      toast.success('Construction request deleted');
      setRequests((prev) => prev.filter((r) => r.id !== requestToDelete.id));
      setShowDeleteModal(false);
      setRequestToDelete(null);
      if (onDataReload) {
        onDataReload();
      }
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Failed to delete request');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusColor = (status) => {
    const statusMap = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      'in progress': 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
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
    if (!price) return 'Not set';
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
          <h1 className="text-3xl font-display font-bold text-textMain">Construction Requests</h1>
          <p className="text-textSecondary mt-2">Manage your construction service requests</p>
        </div>
        <Button onClick={() => navigate('/construction-request')} variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          New Request
        </Button>
      </div>

      {requests.length === 0 ? (
        <div className="bg-surface rounded-lg shadow-md p-12 text-center border border-muted">
          <Hammer className="w-16 h-16 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-textMain mb-2">No construction requests</h3>
          <p className="text-textSecondary mb-4">Start by creating a new construction request</p>
          <Button onClick={() => navigate('/construction-request')} variant="primary">
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
                      {request.projectType || 'Construction Project'}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
                      {request.status || 'pending'}
                    </span>
                  </div>

                  {request.description && (
                    <p className="text-textSecondary text-sm mb-3 line-clamp-2">{request.description}</p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {request.budget && (
                      <div className="flex items-center text-textSecondary text-sm">
                        <DollarSign className="w-4 h-4 mr-2" />
                        <span>Budget: {formatPrice(request.budget)}</span>
                      </div>
                    )}
                    {request.startDate && request.endDate && (
                      <div className="flex items-center text-textSecondary text-sm">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>
                          {formatDate(request.startDate)} - {formatDate(request.endDate)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center text-textSecondary text-sm">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>Requested: {formatDate(request.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/construction/${request.id}`)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  {request.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/construction-request?edit=${request.id}`)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(request)}
                        className="text-error hover:bg-error/10"
                        disabled={deletingId === request.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setRequestToDelete(null);
        }}
        title="Delete Construction Request"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-textMain">
            Are you sure you want to delete this construction request? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setRequestToDelete(null);
              }}
              disabled={deletingId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              loading={deletingId !== null}
              disabled={deletingId !== null}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Construction;

