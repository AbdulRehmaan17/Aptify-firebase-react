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
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/notificationService';
import {
  Building2,
  Calendar,
  DollarSign,
  MapPin,
  User,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  MessageSquare,
  Star,
  Clock,
} from 'lucide-react';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import Modal from '../components/common/Modal';

/**
 * ConstructorDashboard.jsx
 * Provider dashboard for managing construction projects
 */
const ConstructorDashboard = () => {
  const navigate = useNavigate();
  const { user: contextUser, loading: authLoading } = useAuth();
  const currentUser = auth?.currentUser || contextUser;

  const [projects, setProjects] = useState([]);
  const [clientNames, setClientNames] = useState({});
  const [propertyNames, setPropertyNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState({});
  const [selectedProject, setSelectedProject] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(''); // 'accept', 'reject', 'updateStatus'
  const [newStatus, setNewStatus] = useState('');
  const [ratings, setRatings] = useState([]);

  // Fetch client name
  const fetchClientName = async (userId) => {
    if (clientNames[userId]) return clientNames[userId];

    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const name = userSnap.data().name || userSnap.data().displayName || 'Unknown Client';
        setClientNames((prev) => ({ ...prev, [userId]: name }));
        return name;
      }
      return 'Unknown Client';
    } catch (err) {
      console.error('Error fetching client name:', err);
      return 'Unknown Client';
    }
  };

  // Fetch property name
  const fetchPropertyName = async (propertyId) => {
    if (propertyNames[propertyId]) return propertyNames[propertyId];

    try {
      const propertyRef = doc(db, 'properties', propertyId);
      const propertySnap = await getDoc(propertyRef);
      if (propertySnap.exists()) {
        const name = propertySnap.data().title || 'Unknown Property';
        setPropertyNames((prev) => ({ ...prev, [propertyId]: name }));
        return name;
      }
      return 'Unknown Property';
    } catch (err) {
      console.error('Error fetching property name:', err);
      return 'Unknown Property';
    }
  };

  // Fetch ratings for provider
  useEffect(() => {
    const fetchRatings = async () => {
      if (!currentUser || !currentUser.uid) return;

      try {
        const reviewsQ = query(
          collection(db, 'reviews'),
          where('targetType', '==', 'service'),
          where('targetId', '==', currentUser.uid)
        );
        const reviewsSnapshot = await getDocs(reviewsQ);
        const reviewsList = reviewsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRatings(reviewsList);
      } catch (error) {
        console.error('Error fetching ratings:', error);
      }
    };

    fetchRatings();
  }, [currentUser]);

  // Setup real-time listener for projects
  useEffect(() => {
    if (authLoading) return;

    if (!currentUser || !currentUser.uid) {
      setLoading(false);
      setError('Please log in to view your dashboard');
      return;
    }

    const providerId = currentUser.uid;
    console.log('Setting up real-time listener for provider:', providerId);

    try {
      setLoading(true);
      setError(null);

      const projectsQuery = query(
        collection(db, 'constructionProjects'),
        where('providerId', '==', providerId)
      );

      const unsubscribe = onSnapshot(
        projectsQuery,
        async (snapshot) => {
          console.log(`Received ${snapshot.docs.length} projects from snapshot`);

          if (snapshot.empty) {
            setProjects([]);
            setLoading(false);
            return;
          }

          const projectsList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Fetch client names and property names
          const fetchPromises = projectsList.map(async (project) => {
            const clientNamePromise = project.userId
              ? fetchClientName(project.userId)
              : Promise.resolve('No Client');
            const propertyTitlePromise = project.propertyId
              ? fetchPropertyName(project.propertyId)
              : Promise.resolve('No Property');

            const [clientName, propertyTitle] = await Promise.all([
              clientNamePromise,
              propertyTitlePromise,
            ]);

            return { project, clientName, propertyTitle };
          });

          const results = await Promise.all(fetchPromises);

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
          console.error('Error in onSnapshot:', err);
          if (err.code === 'permission-denied') {
            setError('Permission denied. Please check Firestore security rules.');
            toast.error('Permission denied. Please contact administrator.');
          } else {
            setError(err.message || 'Failed to load construction projects');
            toast.error('Failed to load construction projects. Please try again.');
          }
          setLoading(false);
        }
      );

      return () => {
        console.log('Unsubscribing from construction projects listener');
        unsubscribe();
      };
    } catch (err) {
      console.error('Error setting up listener:', err);
      setError(err.message || 'Failed to setup real-time listener');
      toast.error('Failed to setup real-time listener.');
      setLoading(false);
    }
  }, [currentUser, authLoading]);

  const handleAccept = async (project) => {
    setSelectedProject(project);
    setActionType('accept');
    setShowActionModal(true);
  };

  const handleReject = async (project) => {
    setSelectedProject(project);
    setActionType('reject');
    setShowActionModal(true);
  };

  const handleUpdateStatus = (project) => {
    setSelectedProject(project);
    setActionType('updateStatus');
    setNewStatus(project.status || 'Pending');
    setShowActionModal(true);
  };

  const confirmAction = async () => {
    if (!selectedProject) return;

    try {
      const projectRef = doc(db, 'constructionProjects', selectedProject.id);
      const clientName = clientNames[selectedProject.userId] || 'Client';

      if (actionType === 'accept') {
        await updateDoc(projectRef, {
          status: 'Accepted',
          updatedAt: serverTimestamp(),
        });

        // Notify user
        try {
          await notificationService.create(
            selectedProject.userId,
            'Construction Request Accepted',
            `Your construction request has been accepted by the provider!`,
            'success',
            `/construction-dashboard`
          );
        } catch (notifError) {
          console.error('Error creating notification:', notifError);
        }

        toast.success('Request accepted! Client has been notified.');
      } else if (actionType === 'reject') {
        await updateDoc(projectRef, {
          status: 'Rejected',
          updatedAt: serverTimestamp(),
        });

        // Notify user
        try {
          await notificationService.create(
            selectedProject.userId,
            'Construction Request Rejected',
            `Your construction request has been rejected by the provider.`,
            'info',
            `/construction-dashboard`
          );
        } catch (notifError) {
          console.error('Error creating notification:', notifError);
        }

        toast.success('Request rejected. Client has been notified.');
      } else if (actionType === 'updateStatus') {
        await updateDoc(projectRef, {
          status: newStatus,
          updatedAt: serverTimestamp(),
        });

        // Notify user if status changed to completed
        if (newStatus === 'Completed') {
          try {
            await notificationService.create(
              selectedProject.userId,
              'Construction Project Completed',
              `Your construction project has been marked as completed!`,
              'success',
              `/construction-dashboard`
            );
          } catch (notifError) {
            console.error('Error creating notification:', notifError);
          }
        }

        toast.success('Project status updated successfully!');
      }

      setShowActionModal(false);
      setSelectedProject(null);
    } catch (error) {
      console.error('Error processing action:', error);
      toast.error('Failed to process action');
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'Not set';
    try {
      if (dateValue.seconds) {
        return new Date(dateValue.seconds * 1000).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      if (typeof dateValue === 'string') {
        return new Date(dateValue).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      return 'Invalid date';
    } catch {
      return 'Invalid date';
    }
  };

  const formatBudget = (amount) => {
    if (!amount && amount !== 0) return 'Not set';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const badges = {
      Pending: 'bg-yellow-100 text-yellow-800',
      Accepted: 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-slate-100 text-slate-800',
      Completed: 'bg-green-100 text-green-800',
      Rejected: 'bg-red-100 text-red-800',
      Cancelled: 'bg-gray-100 text-gray-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getAverageRating = () => {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, rating) => acc + (rating.rating || 0), 0);
    return sum / ratings.length;
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please log in to view your dashboard</p>
          <Button onClick={() => navigate('/auth')}>Log In</Button>
        </div>
      </div>
    );
  }

  const pendingProjects = projects.filter((p) => p.status === 'Pending');
  const activeProjects = projects.filter(
    (p) => p.status === 'Accepted' || p.status === 'In Progress'
  );
  const completedProjects = projects.filter((p) => p.status === 'Completed');

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">
            Constructor Dashboard
          </h1>
          <p className="text-lg text-gray-600">Manage your construction projects and requests</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingProjects.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-blue-600">{activeProjects.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Rating</p>
                <p className="text-2xl font-bold text-green-600">
                  {getAverageRating().toFixed(1)} / 5.0
                </p>
              </div>
              <Star className="w-8 h-8 text-yellow-500 fill-current" />
            </div>
          </div>
        </div>

        {/* Projects List */}
        {projects.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Projects Assigned</h2>
            <p className="text-gray-600 mb-6">
              You don't have any construction projects assigned yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => {
              const clientName = clientNames[project.userId] || 'Loading...';
              const propertyName = propertyNames[project.propertyId] || 'Loading...';

              return (
                <div key={project.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-1">
                            {propertyName}
                          </h3>
                          <p className="text-sm text-gray-600">Client: {clientName}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                            project.status
                          )}`}
                        >
                          {project.status || 'Pending'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center text-gray-600">
                          <DollarSign className="w-4 h-4 mr-2" />
                          <span className="text-sm">
                            <strong>Budget:</strong> {formatBudget(project.budget)}
                          </span>
                        </div>
                        {project.timeline && (
                          <div className="flex items-center text-gray-600">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span className="text-sm">
                              <strong>Timeline:</strong> {project.timeline}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center text-gray-600">
                          <Clock className="w-4 h-4 mr-2" />
                          <span className="text-sm">
                            <strong>Created:</strong> {formatDate(project.createdAt)}
                          </span>
                        </div>
                      </div>

                      {project.description && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <strong>Description:</strong> {project.description}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 lg:w-48">
                      {project.status === 'Pending' && (
                        <>
                          <Button
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                            onClick={() => handleAccept(project)}
                            disabled={updatingStatus[project.id]}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            className="bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                            onClick={() => handleReject(project)}
                            disabled={updatingStatus[project.id]}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      )}

                      {(project.status === 'Accepted' ||
                        project.status === 'In Progress' ||
                        project.status === 'Completed') && (
                        <Button
                          variant="outline"
                          onClick={() => handleUpdateStatus(project)}
                          disabled={updatingStatus[project.id]}
                        >
                          Update Status
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => {
                          navigate(`/chat?project=${project.id}&client=${project.userId}`);
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Chat with Client
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Ratings Section */}
        {ratings.length > 0 && (
          <div className="mt-12 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Star className="w-6 h-6 mr-2 text-yellow-500 fill-current" />
              Ratings & Reviews
            </h2>
            <div className="space-y-4">
              {ratings.map((rating) => (
                <div key={rating.id} className="border-b border-gray-200 pb-4 last:border-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${
                            star <= (rating.rating || 0)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        {rating.rating || 0} / 5
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDate(rating.createdAt)}
                    </span>
                  </div>
                  {rating.comment && (
                    <p className="text-sm text-gray-600 mt-2">{rating.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Modal */}
      <Modal
        isOpen={showActionModal}
        onClose={() => {
          setShowActionModal(false);
          setSelectedProject(null);
          setActionType('');
          setNewStatus('');
        }}
        title={
          actionType === 'accept'
            ? 'Accept Project'
            : actionType === 'reject'
              ? 'Reject Project'
              : 'Update Project Status'
        }
        size="md"
      >
        <div className="space-y-4">
          {actionType === 'updateStatus' ? (
            <>
              <p className="text-gray-700">Select new status for this project:</p>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Rejected">Rejected</option>
              </select>
            </>
          ) : (
            <p className="text-gray-700">
              Are you sure you want to {actionType} this construction project? The client will be
              notified.
            </p>
          )}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowActionModal(false);
                setSelectedProject(null);
                setActionType('');
                setNewStatus('');
              }}
            >
              Cancel
            </Button>
            <Button
              className={
                actionType === 'accept'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : actionType === 'reject'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
              onClick={confirmAction}
            >
              {actionType === 'accept'
                ? 'Accept'
                : actionType === 'reject'
                  ? 'Reject'
                  : 'Update Status'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ConstructorDashboard;

