import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  orderBy,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import notificationService from '../../services/notificationService';
import { getOrCreateChat } from '../../utils/chatHelpers';
import reviewsService from '../../services/reviewsService';
import {
  Wrench,
  Calendar,
  DollarSign,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  User,
  Eye,
  FileText,
  Star,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const ProviderRenovationRequests = () => {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [clientNames, setClientNames] = useState({});
  const [actionModal, setActionModal] = useState({ isOpen: false, request: null, action: '' });
  const [quoteModal, setQuoteModal] = useState({ isOpen: false, request: null });
  const [progressModal, setProgressModal] = useState({ isOpen: false, request: null });
  const [quoteAmount, setQuoteAmount] = useState('');
  const [progressNote, setProgressNote] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && currentUser) {
      loadRequests();
    } else if (!authLoading && !currentUser) {
      setLoading(false);
    }
  }, [authLoading, currentUser]);

  const loadRequests = () => {
    if (!currentUser || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get all pending requests (no providerId assigned)
      const requestsQuery = query(
        collection(db, 'renovationProjects'),
        where('status', '==', 'Pending'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        requestsQuery,
        async (snapshot) => {
          const requestsList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Filter out requests that already have a provider
          const availableRequests = requestsList.filter((req) => !req.providerId);

          // Load client names
          const clientIds = [...new Set(availableRequests.map((req) => req.userId || req.clientId))];
          const namePromises = clientIds.map(async (clientId) => {
            if (clientNames[clientId]) return null;
            try {
              const userDoc = await getDoc(doc(db, 'users', clientId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                const name =
                  userData.displayName ||
                  userData.name ||
                  userData.email?.split('@')[0] ||
                  'Unknown Client';
                return { clientId, name };
              }
            } catch (error) {
              console.error(`Error loading client ${clientId}:`, error);
            }
            return null;
          });

          const newNames = (await Promise.all(namePromises)).filter(Boolean);
          const updatedNames = { ...clientNames };
          newNames.forEach((item) => {
            if (item) updatedNames[item.clientId] = item.name;
          });
          setClientNames(updatedNames);

          setRequests(availableRequests);
          setLoading(false);
        },
        (error) => {
          console.error('Error loading requests:', error);
          // Fallback without orderBy
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            const fallbackQuery = query(
              collection(db, 'renovationProjects'),
              where('status', '==', 'Pending')
            );
            const fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              async (fallbackSnapshot) => {
                const requestsList = fallbackSnapshot.docs
                  .map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                  }))
                  .filter((req) => !req.providerId)
                  .sort((a, b) => {
                    const aTime = a.createdAt?.toDate?.() || new Date(0);
                    const bTime = b.createdAt?.toDate?.() || new Date(0);
                    return bTime - aTime;
                  });

                // Load client names
                const clientIds = [...new Set(requestsList.map((req) => req.userId || req.clientId))];
                const namePromises = clientIds.map(async (clientId) => {
                  if (clientNames[clientId]) return null;
                  try {
                    const userDoc = await getDoc(doc(db, 'users', clientId));
                    if (userDoc.exists()) {
                      const userData = userDoc.data();
                      const name =
                        userData.displayName ||
                        userData.name ||
                        userData.email?.split('@')[0] ||
                        'Unknown Client';
                      return { clientId, name };
                    }
                  } catch (error) {
                    console.error(`Error loading client ${clientId}:`, error);
                  }
                  return null;
                });

                const newNames = (await Promise.all(namePromises)).filter(Boolean);
                const updatedNames = { ...clientNames };
                newNames.forEach((item) => {
                  if (item) updatedNames[item.clientId] = item.name;
                });
                setClientNames(updatedNames);

                setRequests(requestsList);
                setLoading(false);
              },
              (fallbackError) => {
                console.error('Error loading requests (fallback):', fallbackError);
                toast.error('Failed to load requests');
                setLoading(false);
              }
            );
            return () => fallbackUnsubscribe();
          } else {
            toast.error('Failed to load requests');
            setLoading(false);
          }
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up requests listener:', error);
      setLoading(false);
    }
  };

  const handleAccept = (request) => {
    setActionModal({ isOpen: true, request, action: 'accept' });
  };

  const handleReject = (request) => {
    setActionModal({ isOpen: true, request, action: 'reject' });
  };

  const handleSubmitQuote = (request) => {
    setQuoteModal({ isOpen: true, request });
    setQuoteAmount('');
  };

  const handleUpdateProgress = (request) => {
    setProgressModal({ isOpen: true, request });
    setProgressNote('');
  };

  const confirmAction = async () => {
    if (!actionModal.request || !currentUser) return;

    setProcessing(true);
    try {
      const requestRef = doc(db, 'renovationProjects', actionModal.request.id);
      
      if (actionModal.action === 'accept') {
        // Accept request - assign provider and update status
        await updateDoc(requestRef, {
          providerId: currentUser.uid,
          status: 'Accepted',
          updatedAt: serverTimestamp(),
          acceptedAt: serverTimestamp(),
        });

        // Add update log
        try {
          const { addProjectUpdate } = await import('../../utils/projectUpdates');
          await addProjectUpdate(
            'renovationProjects',
            actionModal.request.id,
            'Accepted',
            currentUser.uid,
            'Provider accepted the request'
          );
        } catch (updateError) {
          console.error('Error adding update log:', updateError);
        }

        // Notify client
        await notificationService.create(
          actionModal.request.userId || actionModal.request.clientId,
          'Renovation Request Accepted',
          `Your renovation request has been accepted by a provider.`,
          'success',
          `/renovation/my-renovations/${actionModal.request.id}`
        );

        toast.success('Request accepted successfully!');
      } else if (actionModal.action === 'reject') {
        // Reject request - just update status (don't assign provider)
        await updateDoc(requestRef, {
          status: 'Rejected',
          updatedAt: serverTimestamp(),
          rejectedAt: serverTimestamp(),
        });

        // Add update log
        try {
          const { addProjectUpdate } = await import('../../utils/projectUpdates');
          await addProjectUpdate(
            'renovationProjects',
            actionModal.request.id,
            'Rejected',
            currentUser.uid,
            'Provider declined the request'
          );
        } catch (updateError) {
          console.error('Error adding update log:', updateError);
        }

        // Notify client
        await notificationService.create(
          actionModal.request.userId || actionModal.request.clientId,
          'Renovation Request Update',
          `A provider has declined your renovation request.`,
          'info',
          `/renovation/my-renovations/${actionModal.request.id}`
        );

        toast.success('Request declined');
      }

      setActionModal({ isOpen: false, request: null, action: '' });
    } catch (error) {
      console.error('Error processing request:', error);
      toast.error('Failed to process request');
    } finally {
      setProcessing(false);
    }
  };

  const submitQuote = async () => {
    if (!quoteModal.request || !quoteAmount || parseFloat(quoteAmount) <= 0) {
      toast.error('Please enter a valid quote amount');
      return;
    }

    setProcessing(true);
    try {
      const requestRef = doc(db, 'renovationProjects', quoteModal.request.id);
      await updateDoc(requestRef, {
        quote: parseFloat(quoteAmount),
        quoteProviderId: currentUser.uid,
        quoteSubmittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Notify client
      await notificationService.create(
        quoteModal.request.userId || quoteModal.request.clientId,
        'Quote Received',
        `A provider has submitted a quote for your renovation request: $${parseFloat(quoteAmount).toFixed(2)}`,
        'info',
        `/renovation/my-renovations/${quoteModal.request.id}`
      );

      toast.success('Quote submitted successfully!');
      setQuoteModal({ isOpen: false, request: null });
      setQuoteAmount('');
    } catch (error) {
      console.error('Error submitting quote:', error);
      toast.error('Failed to submit quote');
    } finally {
      setProcessing(false);
    }
  };

  const updateProgress = async () => {
    if (!progressModal.request || !progressNote.trim()) {
      toast.error('Please enter a progress note');
      return;
    }

    setProcessing(true);
    try {
      const requestRef = doc(db, 'renovationProjects', progressModal.request.id);
      const newStatus = progressModal.request.status === 'Accepted' ? 'In Progress' : progressModal.request.status;
      
      await updateDoc(requestRef, {
        status: newStatus,
        progressNotes: [...(progressModal.request.progressNotes || []), {
          note: progressNote.trim(),
          updatedBy: currentUser.uid,
          updatedAt: serverTimestamp(),
        }],
        updatedAt: serverTimestamp(),
        inProgressAt: progressModal.request.status === 'Accepted' ? serverTimestamp() : progressModal.request.inProgressAt,
      });

      // Notify client
      await notificationService.create(
        progressModal.request.userId || progressModal.request.clientId,
        'Progress Update',
        `Your renovation project has been updated: ${progressNote.trim().substring(0, 50)}...`,
        'info',
        `/renovation/my-renovations/${progressModal.request.id}`
      );

      toast.success('Progress updated successfully!');
      setProgressModal({ isOpen: false, request: null });
      setProgressNote('');
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Failed to update progress');
    } finally {
      setProcessing(false);
    }
  };

  const markCompleted = async (request) => {
    if (!window.confirm('Mark this project as completed?')) return;

    setProcessing(true);
    try {
      const requestRef = doc(db, 'renovationProjects', request.id);
      await updateDoc(requestRef, {
        status: 'Completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Notify client
      await notificationService.create(
        request.userId || request.clientId,
        'Project Completed',
        `Your renovation project has been marked as completed!`,
        'success',
        `/renovation/my-renovations/${request.id}`
      );

      toast.success('Project marked as completed!');
    } catch (error) {
      console.error('Error marking project as completed:', error);
      toast.error('Failed to mark project as completed');
    } finally {
      setProcessing(false);
    }
  };

  const handleStartChat = async (request) => {
    const clientId = request.userId || request.clientId;
    if (!clientId) {
      toast.error('Client information not available');
      return;
    }

    try {
      const chatId = await getOrCreateChat(currentUser.uid, clientId);
      navigate(`/chat?chatId=${chatId}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
    }
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-textSecondary mb-4">Please log in to view requests</p>
          <Button onClick={() => navigate('/login')}>Login</Button>
        </div>
      </div>
    );
  }

  const isProvider = userProfile?.role === 'constructor' || userProfile?.role === 'renovator' || userProfile?.role === 'provider';
  if (!isProvider) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-textSecondary mb-4">This page is only available for service providers</p>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-textMain">Renovation Requests</h1>
          <p className="text-textSecondary mt-2">Review and manage renovation project requests</p>
        </div>

        {/* Requests List */}
        {requests.length === 0 ? (
          <div className="bg-surface rounded-base shadow-md p-12 border border-muted text-center">
            <Wrench className="w-16 h-16 text-textSecondary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-textMain mb-2">No pending requests</h2>
            <p className="text-textSecondary">All renovation requests have been assigned or there are no new requests.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {requests.map((request) => {
              const clientId = request.userId || request.clientId;
              const clientName = clientNames[clientId] || 'Unknown Client';

              return (
                <div
                  key={request.id}
                  className="bg-surface rounded-base shadow-md p-6 border border-muted"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Request Info */}
                    <div className="lg:col-span-2">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-yellow-600 bg-yellow-100">
                              <AlertCircle className="w-4 h-4 mr-2" />
                              Pending
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-textMain mb-2 capitalize">
                            {request.serviceCategory || 'Renovation Project'}
                          </h3>
                          <p className="text-sm text-textSecondary line-clamp-3 mb-2">
                            {request.detailedDescription || request.description}
                          </p>
                          <div className="flex items-center text-sm text-textSecondary mb-2">
                            <User className="w-4 h-4 mr-2" />
                            <span>Client: {clientName}</span>
                          </div>
                          <div className="flex items-center text-sm text-textSecondary mb-2">
                            <MapPin className="w-4 h-4 mr-2" />
                            <span>
                              {request.location || request.propertyAddress}, {request.city || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Project Details */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-textSecondary mb-1">Budget</p>
                          <p className="text-sm font-medium text-textMain">
                            {formatPrice(request.budget)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-textSecondary mb-1">Preferred Date</p>
                          <p className="text-sm font-medium text-textMain">
                            {formatDate(request.preferredDate)}
                          </p>
                        </div>
                      </div>

                      {/* Images Preview */}
                      {request.photos && request.photos.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-textSecondary mb-2">Project Images</p>
                          <div className="flex space-x-2">
                            {request.photos.slice(0, 3).map((photo, index) => (
                              <img
                                key={index}
                                src={photo}
                                alt={`Project image ${index + 1}`}
                                className="w-16 h-16 object-cover rounded-base"
                              />
                            ))}
                            {request.photos.length > 3 && (
                              <div className="w-16 h-16 bg-muted rounded-base flex items-center justify-center text-xs text-textSecondary">
                                +{request.photos.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-textSecondary">
                        Requested: {formatDate(request.createdAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="lg:col-span-1">
                      <div className="bg-background rounded-base p-4 border border-muted sticky top-4">
                        <h4 className="text-sm font-semibold text-textMain mb-4">Actions</h4>
                        <div className="space-y-3">
                          <Button
                            fullWidth
                            onClick={() => handleAccept(request)}
                            className="flex items-center justify-center"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Accept Request
                          </Button>
                          <Button
                            variant="ghost"
                            fullWidth
                            onClick={() => handleReject(request)}
                            className="flex items-center justify-center"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Decline
                          </Button>
                          <Button
                            variant="ghost"
                            fullWidth
                            onClick={() => handleSubmitQuote(request)}
                            className="flex items-center justify-center"
                          >
                            <DollarSign className="w-4 h-4 mr-2" />
                            Submit Quote
                          </Button>
                          <Button
                            variant="ghost"
                            fullWidth
                            onClick={() => handleStartChat(request)}
                            className="flex items-center justify-center"
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Chat with Client
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Confirmation Modal */}
        <Modal
          isOpen={actionModal.isOpen}
          onClose={() => setActionModal({ isOpen: false, request: null, action: '' })}
          title={actionModal.action === 'accept' ? 'Accept Request' : 'Decline Request'}
        >
          <div className="space-y-4">
            <p className="text-textMain">
              Are you sure you want to {actionModal.action === 'accept' ? 'accept' : 'decline'} this
              renovation request?
            </p>
            {actionModal.action === 'accept' && (
              <p className="text-sm text-textSecondary">
                You will be assigned as the provider for this project and the client will be notified.
              </p>
            )}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => setActionModal({ isOpen: false, request: null, action: '' })}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmAction}
                loading={processing}
                variant={actionModal.action === 'accept' ? 'primary' : 'danger'}
              >
                {actionModal.action === 'accept' ? 'Accept' : 'Decline'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Quote Modal */}
        <Modal
          isOpen={quoteModal.isOpen}
          onClose={() => setQuoteModal({ isOpen: false, request: null })}
          title="Submit Quote"
        >
          <div className="space-y-4">
            <Input
              label="Quote Amount (USD)"
              type="number"
              value={quoteAmount}
              onChange={(e) => setQuoteAmount(e.target.value)}
              leftIcon={<DollarSign className="w-4 h-4" />}
              placeholder="0.00"
              required
              min="0"
              step="0.01"
            />
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => setQuoteModal({ isOpen: false, request: null })}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button onClick={submitQuote} loading={processing}>
                Submit Quote
              </Button>
            </div>
          </div>
        </Modal>

        {/* Progress Update Modal */}
        <Modal
          isOpen={progressModal.isOpen}
          onClose={() => setProgressModal({ isOpen: false, request: null })}
          title="Update Progress"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">
                Progress Note
              </label>
              <textarea
                value={progressNote}
                onChange={(e) => setProgressNote(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-muted rounded-base focus:border-primary focus:ring-primary transition-colors"
                placeholder="Describe the progress made on this project..."
                required
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => setProgressModal({ isOpen: false, request: null })}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button onClick={updateProgress} loading={processing}>
                Update Progress
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default ProviderRenovationRequests;

