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
  addDoc,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/notificationService';
import { getOrCreateChat } from '../utils/chatHelpers';
import {
  Building2,
  Wrench,
  Calendar,
  DollarSign,
  User,
  FileText,
  CheckCircle,
  X,
  MessageSquare,
  Star,
  Clock,
  Play,
  Upload,
  Eye,
  TrendingUp,
} from 'lucide-react';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import toast from 'react-hot-toast';

/**
 * ProviderDashboard.jsx
 * Shared provider dashboard for managing construction and renovation projects
 * @param {string} serviceType - 'Construction' or 'Renovation'
 */
const ProviderDashboard = ({ serviceType = 'Construction' }) => {
  const navigate = useNavigate();
  const { user: contextUser, loading: authLoading } = useAuth();
  const currentUser = auth?.currentUser || contextUser;

  const [activeTab, setActiveTab] = useState('assigned');
  const [providerProfile, setProviderProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // Assigned Projects State
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [assignedLoading, setAssignedLoading] = useState(false);

  // New Requests State
  const [newRequests, setNewRequests] = useState([]);
  const [newRequestsLoading, setNewRequestsLoading] = useState(false);

  // Client/Property Names Cache
  const [clientNames, setClientNames] = useState({});
  const [propertyNames, setPropertyNames] = useState({});

  // Selected Project for Detail View
  const [selectedProject, setSelectedProject] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(''); // 'accept', 'reject', 'start', 'complete'
  const [actionNote, setActionNote] = useState('');
  const [deliverables, setDeliverables] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Earnings State
  const [earnings, setEarnings] = useState(0);
  const [earningsLoading, setEarningsLoading] = useState(false);

  // Reviews State
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const Icon = serviceType === 'Construction' ? Building2 : Wrench;
  const collectionName = serviceType === 'Construction' ? 'constructionProjects' : 'renovationProjects';

  // Check provider authorization
  useEffect(() => {
    const checkAuthorization = async () => {
      if (authLoading || !currentUser) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Find provider document for current user
        const providersQuery = query(
          collection(db, 'serviceProviders'),
          where('userId', '==', currentUser.uid),
          where('serviceType', '==', serviceType)
        );
        const snapshot = await getDocs(providersQuery);

        if (snapshot.empty) {
          toast.error(`You are not registered as a ${serviceType} provider.`);
          navigate('/');
          return;
        }

        const providerData = snapshot.docs[0].data();
        if (!providerData.isApproved && !providerData.approved) {
          toast.error(`Your ${serviceType} provider application is pending approval.`);
          navigate('/');
          return;
        }

        setProviderProfile({
          id: snapshot.docs[0].id,
          ...providerData,
        });
        setAuthorized(true);
      } catch (error) {
        console.error('Error checking authorization:', error);
        toast.error('Failed to verify provider status');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    checkAuthorization();
  }, [currentUser, authLoading, serviceType, navigate]);

  // Fetch client name
  const fetchClientName = async (userId) => {
    if (!userId) return 'Unknown Client';
    if (clientNames[userId]) return clientNames[userId];

    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const name = userData.name || userData.displayName || userData.email || 'Unknown Client';
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
    if (!propertyId) return null;
    if (propertyNames[propertyId]) return propertyNames[propertyId];

    try {
      const propertyRef = doc(db, 'properties', propertyId);
      const propertySnap = await getDoc(propertyRef);
      if (propertySnap.exists()) {
        const name = propertySnap.data().title || 'Unknown Property';
        setPropertyNames((prev) => ({ ...prev, [propertyId]: name }));
        return name;
      }
      return null;
    } catch (err) {
      console.error('Error fetching property name:', err);
      return null;
    }
  };

  // Fetch assigned projects (real-time)
  useEffect(() => {
    if (!authorized || !currentUser || activeTab !== 'assigned') return;

    setAssignedLoading(true);
    try {
      const assignedQuery = query(
        collection(db, collectionName),
        where('providerId', '==', currentUser.uid),
        orderBy('updatedAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        assignedQuery,
        async (snapshot) => {
          const projects = [];
          for (const docSnap of snapshot.docs) {
            const projectData = { id: docSnap.id, ...docSnap.data() };
            const clientId = projectData.userId || projectData.clientId;
            if (clientId) {
              projectData.clientName = await fetchClientName(clientId);
            }
            if (projectData.propertyId) {
              projectData.propertyName = await fetchPropertyName(projectData.propertyId);
            }
            projects.push(projectData);
          }
          setAssignedProjects(projects);
          setAssignedLoading(false);
        },
        (error) => {
          console.error('Error fetching assigned projects:', error);
          // Fallback without orderBy
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            const fallbackQuery = query(
              collection(db, collectionName),
              where('providerId', '==', currentUser.uid)
            );
            const fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              async (fallbackSnapshot) => {
                const fallbackProjects = [];
                for (const docSnap of fallbackSnapshot.docs) {
                  const projectData = { id: docSnap.id, ...docSnap.data() };
                  const clientId = projectData.userId || projectData.clientId;
                  if (clientId) {
                    projectData.clientName = await fetchClientName(clientId);
                  }
                  if (projectData.propertyId) {
                    projectData.propertyName = await fetchPropertyName(projectData.propertyId);
                  }
                  fallbackProjects.push(projectData);
                }
                fallbackProjects.sort((a, b) => {
                  const aTime = a.updatedAt?.toDate?.() || new Date(0);
                  const bTime = b.updatedAt?.toDate?.() || new Date(0);
                  return bTime - aTime;
                });
                setAssignedProjects(fallbackProjects);
                setAssignedLoading(false);
              },
              (fallbackError) => {
                console.error('Error fetching assigned projects (fallback):', fallbackError);
                setAssignedLoading(false);
              }
            );
            return () => fallbackUnsubscribe();
          } else {
            setAssignedLoading(false);
          }
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up assigned projects listener:', error);
      setAssignedLoading(false);
    }
  }, [authorized, currentUser, activeTab, collectionName]);

  // Fetch new requests (real-time)
  useEffect(() => {
    if (!authorized || !currentUser || activeTab !== 'requests') return;

    setNewRequestsLoading(true);
    try {
      const requestsQuery = query(
        collection(db, collectionName),
        where('status', '==', 'Pending'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        requestsQuery,
        async (snapshot) => {
          const requests = [];
          for (const docSnap of snapshot.docs) {
            const requestData = { id: docSnap.id, ...docSnap.data() };
            // Only show requests without providerId or targeted to this provider
            if (!requestData.providerId || requestData.providerId === currentUser.uid) {
              const clientId = requestData.userId || requestData.clientId;
              if (clientId) {
                requestData.clientName = await fetchClientName(clientId);
              }
              if (requestData.propertyId) {
                requestData.propertyName = await fetchPropertyName(requestData.propertyId);
              }
              requests.push(requestData);
            }
          }
          setNewRequests(requests);
          setNewRequestsLoading(false);
        },
        (error) => {
          console.error('Error fetching new requests:', error);
          // Fallback without orderBy
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            const fallbackQuery = query(
              collection(db, collectionName),
              where('status', '==', 'Pending')
            );
            const fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              async (fallbackSnapshot) => {
                const fallbackRequests = [];
                for (const docSnap of fallbackSnapshot.docs) {
                  const requestData = { id: docSnap.id, ...docSnap.data() };
                  if (!requestData.providerId || requestData.providerId === currentUser.uid) {
                    const clientId = requestData.userId || requestData.clientId;
                    if (clientId) {
                      requestData.clientName = await fetchClientName(clientId);
                    }
                    if (requestData.propertyId) {
                      requestData.propertyName = await fetchPropertyName(requestData.propertyId);
                    }
                    fallbackRequests.push(requestData);
                  }
                }
                fallbackRequests.sort((a, b) => {
                  const aTime = a.createdAt?.toDate?.() || new Date(0);
                  const bTime = b.createdAt?.toDate?.() || new Date(0);
                  return bTime - aTime;
                });
                setNewRequests(fallbackRequests);
                setNewRequestsLoading(false);
              },
              (fallbackError) => {
                console.error('Error fetching new requests (fallback):', fallbackError);
                setNewRequestsLoading(false);
              }
            );
            return () => fallbackUnsubscribe();
          } else {
            setNewRequestsLoading(false);
          }
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up new requests listener:', error);
      setNewRequestsLoading(false);
    }
  }, [authorized, currentUser, activeTab, collectionName]);

  // Fetch earnings
  useEffect(() => {
    if (!authorized || !currentUser || activeTab !== 'earnings') return;

    const fetchEarnings = async () => {
      setEarningsLoading(true);
      try {
        const projectsQuery = query(
          collection(db, collectionName),
          where('providerId', '==', currentUser.uid),
          where('status', 'in', ['Accepted', 'InProgress', 'Completed'])
        );
        const snapshot = await getDocs(projectsQuery);
        let total = 0;
        snapshot.docs.forEach((docSnap) => {
          const project = docSnap.data();
          if (project.budget && typeof project.budget === 'number') {
            total += project.budget;
          }
        });
        setEarnings(total);
      } catch (error) {
        console.error('Error fetching earnings:', error);
        // Fallback: fetch all and filter client-side
        try {
          const fallbackQuery = query(
            collection(db, collectionName),
            where('providerId', '==', currentUser.uid)
          );
          const fallbackSnapshot = await getDocs(fallbackQuery);
          let total = 0;
          fallbackSnapshot.docs.forEach((docSnap) => {
            const project = docSnap.data();
            if (
              project.budget &&
              typeof project.budget === 'number' &&
              ['Accepted', 'InProgress', 'Completed'].includes(project.status)
            ) {
              total += project.budget;
            }
          });
          setEarnings(total);
        } catch (fallbackError) {
          console.error('Error fetching earnings (fallback):', fallbackError);
        }
      } finally {
        setEarningsLoading(false);
      }
    };

    fetchEarnings();
  }, [authorized, currentUser, activeTab, collectionName]);

  // Fetch reviews
  useEffect(() => {
    if (!authorized || !currentUser || activeTab !== 'reviews') return;

    const fetchReviews = async () => {
      setReviewsLoading(true);
      try {
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('providerId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(reviewsQuery);
        const reviewsList = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setReviews(reviewsList);
      } catch (error) {
        console.error('Error fetching reviews:', error);
        // Fallback without orderBy
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
          try {
            const fallbackQuery = query(
              collection(db, 'reviews'),
              where('providerId', '==', currentUser.uid)
            );
            const fallbackSnapshot = await getDocs(fallbackQuery);
            const fallbackReviews = fallbackSnapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            }));
            fallbackReviews.sort((a, b) => {
              const aTime = a.createdAt?.toDate?.() || new Date(0);
              const bTime = b.createdAt?.toDate?.() || new Date(0);
              return bTime - aTime;
            });
            setReviews(fallbackReviews);
          } catch (fallbackError) {
            console.error('Error fetching reviews (fallback):', fallbackError);
          }
        }
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, [authorized, currentUser, activeTab]);

  // Handle project actions
  const handleAccept = (project) => {
    setSelectedProject(project);
    setActionType('accept');
    setActionNote('');
    setShowActionModal(true);
  };

  const handleReject = (project) => {
    setSelectedProject(project);
    setActionType('reject');
    setActionNote('');
    setShowActionModal(true);
  };

  const handleStart = (project) => {
    setSelectedProject(project);
    setActionType('start');
    setActionNote('');
    setShowActionModal(true);
  };

  const handleComplete = (project) => {
    setSelectedProject(project);
    setActionType('complete');
    setActionNote('');
    setDeliverables([]);
    setShowActionModal(true);
  };

  const handleViewDetails = async (project) => {
    setSelectedProject(project);
    // Fetch additional details if needed
    setShowDetailModal(true);
  };

  const handleContactClient = async (project) => {
    const clientId = project.userId || project.clientId;
    if (!clientId) {
      toast.error('Client information not available');
      return;
    }

    try {
      const chatId = await getOrCreateChat(currentUser.uid, clientId);
      navigate(`/chats?chatId=${chatId}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to start chat');
    }
  };

  const confirmAction = async () => {
    if (!selectedProject) return;

    try {
      setUploading(true);
      const projectRef = doc(db, collectionName, selectedProject.id);
      const clientId = selectedProject.userId || selectedProject.clientId;
      let statusToSet = '';
      let noteText = '';

      if (actionType === 'accept') {
        statusToSet = 'Accepted';
        noteText = actionNote || 'Request accepted by provider';
        await updateDoc(projectRef, {
          providerId: currentUser.uid,
          status: statusToSet,
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Create project update
        const updatesRef = collection(db, collectionName, selectedProject.id, 'projectUpdates');
        await addDoc(updatesRef, {
          status: statusToSet,
          updatedBy: currentUser.uid,
          note: noteText,
          createdAt: serverTimestamp(),
        });

        // Notify client
        if (clientId) {
          await notificationService.sendNotification(
            clientId,
            `${serviceType} Request Accepted`,
            `Your ${serviceType.toLowerCase()} request has been accepted by the provider!`,
            'status-update',
            '/my-account'
          );
        }

        toast.success('Request accepted! Client has been notified.');
      } else if (actionType === 'reject') {
        statusToSet = 'Rejected';
        noteText = actionNote || 'Request rejected by provider';
        await updateDoc(projectRef, {
          status: statusToSet,
          updatedAt: serverTimestamp(),
        });

        // Create project update
        const updatesRef = collection(db, collectionName, selectedProject.id, 'projectUpdates');
        await addDoc(updatesRef, {
          status: statusToSet,
          updatedBy: currentUser.uid,
          note: noteText,
          createdAt: serverTimestamp(),
        });

        // Notify client
        if (clientId) {
          await notificationService.sendNotification(
            clientId,
            `${serviceType} Request Rejected`,
            `Your ${serviceType.toLowerCase()} request has been rejected by the provider.`,
            'status-update',
            '/my-account'
          );
        }

        toast.success('Request rejected. Client has been notified.');
      } else if (actionType === 'start') {
        statusToSet = 'InProgress';
        noteText = actionNote || 'Project started';
        await updateDoc(projectRef, {
          status: statusToSet,
          updatedAt: serverTimestamp(),
        });

        // Create project update
        const updatesRef = collection(db, collectionName, selectedProject.id, 'projectUpdates');
        await addDoc(updatesRef, {
          status: statusToSet,
          updatedBy: currentUser.uid,
          note: noteText,
          createdAt: serverTimestamp(),
        });

        // Notify client
        if (clientId) {
          await notificationService.sendNotification(
            clientId,
            `${serviceType} Project Started`,
            `Your ${serviceType.toLowerCase()} project has been started!`,
            'status-update',
            '/my-account'
          );
        }

        toast.success('Project started! Client has been notified.');
      } else if (actionType === 'complete') {
        statusToSet = 'Completed';
        noteText = actionNote || 'Project completed';

        // Upload deliverables if any
        let deliverableUrls = [];
        if (deliverables.length > 0) {
          for (const file of deliverables) {
            try {
              const storageRef = ref(
                storage,
                `providers/${currentUser.uid}/deliverables/${selectedProject.id}/${Date.now()}_${file.name}`
              );
              await uploadBytes(storageRef, file);
              const url = await getDownloadURL(storageRef);
              deliverableUrls.push({
                name: file.name,
                url: url,
                type: file.type,
                size: file.size,
              });
            } catch (uploadError) {
              console.error('Error uploading deliverable:', uploadError);
              toast.error(`Failed to upload ${file.name}`);
            }
          }
        }

        await updateDoc(projectRef, {
          status: statusToSet,
          completedAt: serverTimestamp(),
          deliverables: deliverableUrls,
          updatedAt: serverTimestamp(),
        });

        // Create project update
        const updatesRef = collection(db, collectionName, selectedProject.id, 'projectUpdates');
        await addDoc(updatesRef, {
          status: statusToSet,
          updatedBy: currentUser.uid,
          note: noteText,
          deliverables: deliverableUrls,
          createdAt: serverTimestamp(),
        });

        // Notify client
        if (clientId) {
          await notificationService.sendNotification(
            clientId,
            `${serviceType} Project Completed`,
            `Your ${serviceType.toLowerCase()} project has been completed! ${deliverableUrls.length > 0 ? 'Deliverables are available.' : ''}`,
            'status-update',
            '/my-account'
          );
        }

        toast.success('Project completed! Client has been notified.');
      }

      setShowActionModal(false);
      setSelectedProject(null);
      setActionNote('');
      setDeliverables([]);
    } catch (error) {
      console.error('Error processing action:', error);
      toast.error('Failed to process action');
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  const getStatusBadge = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'completed') {
      return 'bg-primary/20 text-primary';
    } else if (statusLower === 'inprogress' || statusLower === 'in progress') {
      return 'bg-primary/10 text-primary';
    } else if (statusLower === 'accepted') {
      return 'bg-accent/20 text-accent';
    } else if (statusLower === 'rejected' || statusLower === 'cancelled') {
      return 'bg-error/20 text-error';
    }
    return 'bg-muted text-textMain';
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!authorized || !providerProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-textSecondary mb-4">Access denied. You must be an approved provider.</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'assigned', label: 'Assigned Projects', icon: Icon },
    { key: 'requests', label: 'New Requests', icon: Clock },
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'earnings', label: 'Earnings', icon: TrendingUp },
    { key: 'reviews', label: 'Reviews', icon: Star },
  ];

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-textMain flex items-center gap-2">
            <Icon className="w-8 h-8" />
            {serviceType} Provider Dashboard
          </h1>
          <p className="text-textSecondary mt-2">Welcome, {providerProfile.name || 'Provider'}</p>
        </div>

        {/* Tabs */}
        <div className="bg-surface rounded-base shadow-sm border border-muted mb-6">
          <div className="flex border-b border-muted overflow-x-auto">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors ${
                    activeTab === tab.key
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-textSecondary hover:text-textMain'
                  }`}
                >
                  <TabIcon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Assigned Projects Tab */}
            {activeTab === 'assigned' && (
              <div>
                <h2 className="text-xl font-semibold text-textMain mb-4">Assigned Projects</h2>
                {assignedLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="md" />
                  </div>
                ) : assignedProjects.length === 0 ? (
                  <div className="text-center py-12">
                    <Icon className="w-16 h-16 text-muted mx-auto mb-4" />
                    <p className="text-textSecondary">No assigned projects yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignedProjects.map((project) => (
                      <div
                        key={project.id}
                        className="border border-muted rounded-base p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-textMain">
                                Project #{project.id.slice(0, 8)}
                              </h3>
                              <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(project.status)}`}>
                                {project.status || 'Pending'}
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-textSecondary">
                              <p>
                                <User className="w-4 h-4 inline mr-1" />
                                Client: {project.clientName || 'Unknown'}
                              </p>
                              {project.propertyName && (
                                <p>
                                  <Building2 className="w-4 h-4 inline mr-1" />
                                  Property: {project.propertyName}
                                </p>
                              )}
                              <p>
                                <DollarSign className="w-4 h-4 inline mr-1" />
                                Budget: {new Intl.NumberFormat('en-PK', {
                                  style: 'currency',
                                  currency: 'PKR',
                                }).format(project.budget || 0)}
                              </p>
                              {project.timeline && (
                                <p>
                                  <Calendar className="w-4 h-4 inline mr-1" />
                                  Timeline: {project.timeline}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        {project.details || project.description ? (
                          <p className="text-sm text-textMain mt-2 mb-3 line-clamp-2">
                            {project.details || project.description}
                          </p>
                        ) : null}
                        <div className="flex gap-2 mt-4 pt-4 border-t border-muted">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(project)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleContactClient(project)}
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Contact Client
                          </Button>
                          {project.status === 'Accepted' && (
                            <Button
                              size="sm"
                              onClick={() => handleStart(project)}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Start Project
                            </Button>
                          )}
                          {project.status === 'InProgress' && (
                            <Button
                              size="sm"
                              onClick={() => handleComplete(project)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* New Requests Tab */}
            {activeTab === 'requests' && (
              <div>
                <h2 className="text-xl font-semibold text-textMain mb-4">New Requests</h2>
                {newRequestsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="md" />
                  </div>
                ) : newRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-16 h-16 text-muted mx-auto mb-4" />
                    <p className="text-textSecondary">No new requests available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {newRequests.map((request) => (
                      <div
                        key={request.id}
                        className="border border-muted rounded-base p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-textMain">
                                Request #{request.id.slice(0, 8)}
                              </h3>
                              <span className="px-2 py-1 text-xs font-medium rounded bg-muted text-textMain">
                                Pending
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-textSecondary">
                              <p>
                                <User className="w-4 h-4 inline mr-1" />
                                Client: {request.clientName || 'Unknown'}
                              </p>
                              {request.propertyName && (
                                <p>
                                  <Building2 className="w-4 h-4 inline mr-1" />
                                  Property: {request.propertyName}
                                </p>
                              )}
                              <p>
                                <DollarSign className="w-4 h-4 inline mr-1" />
                                Budget: {new Intl.NumberFormat('en-PK', {
                                  style: 'currency',
                                  currency: 'PKR',
                                }).format(request.budget || 0)}
                              </p>
                              {request.timeline && (
                                <p>
                                  <Calendar className="w-4 h-4 inline mr-1" />
                                  Timeline: {request.timeline}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        {request.details || request.description ? (
                          <p className="text-sm text-textMain mt-2 mb-3 line-clamp-2">
                            {request.details || request.description}
                          </p>
                        ) : null}
                        <div className="flex gap-2 mt-4 pt-4 border-t border-muted">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(request)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAccept(request)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleReject(request)}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-xl font-semibold text-textMain mb-4">Provider Profile</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-1">Name</label>
                    <p className="text-textMain">{providerProfile.name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-1">Service Type</label>
                    <p className="text-textMain">{providerProfile.serviceType || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-1">City</label>
                    <p className="text-textMain">{providerProfile.city || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-1">Status</label>
                    <span className="px-2 py-1 text-xs font-medium rounded bg-primary/20 text-primary">
                      Approved
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Earnings Tab */}
            {activeTab === 'earnings' && (
              <div>
                <h2 className="text-xl font-semibold text-textMain mb-4">Earnings</h2>
                {earningsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="md" />
                  </div>
                ) : (
                  <div className="bg-primary/10 rounded-base p-6 text-center">
                    <TrendingUp className="w-12 h-12 text-primary mx-auto mb-4" />
                    <p className="text-sm text-textSecondary mb-2">Total Earnings</p>
                    <p className="text-3xl font-bold text-textMain">
                      {new Intl.NumberFormat('en-PK', {
                        style: 'currency',
                        currency: 'PKR',
                      }).format(earnings)}
                    </p>
                    <p className="text-xs text-textSecondary mt-2">
                      From accepted, in-progress, and completed projects
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div>
                <h2 className="text-xl font-semibold text-textMain mb-4">Reviews</h2>
                {reviewsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="md" />
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-12">
                    <Star className="w-16 h-16 text-muted mx-auto mb-4" />
                    <p className="text-textSecondary">No reviews yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border border-muted rounded-base p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-accent fill-accent" />
                            <span className="font-semibold text-textMain">{review.rating}/5</span>
                          </div>
                          <span className="text-xs text-textSecondary">{formatDate(review.createdAt)}</span>
                        </div>
                        {review.comment && (
                          <p className="text-textMain mt-2">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedProject(null);
        }}
        title="Project Details"
        size="lg"
      >
        {selectedProject && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-textMain mb-1">Status</label>
              <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(selectedProject.status)}`}>
                {selectedProject.status || 'Pending'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-textMain mb-1">Client</label>
              <p className="text-textMain">{selectedProject.clientName || 'Unknown'}</p>
            </div>
            {selectedProject.propertyName && (
              <div>
                <label className="block text-sm font-medium text-textMain mb-1">Property</label>
                <p className="text-textMain">{selectedProject.propertyName}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-textMain mb-1">Budget</label>
              <p className="text-textMain">
                {new Intl.NumberFormat('en-PK', {
                  style: 'currency',
                  currency: 'PKR',
                }).format(selectedProject.budget || 0)}
              </p>
            </div>
            {selectedProject.timeline && (
              <div>
                <label className="block text-sm font-medium text-textMain mb-1">Timeline</label>
                <p className="text-textMain">{selectedProject.timeline}</p>
              </div>
            )}
            {(selectedProject.details || selectedProject.description) && (
              <div>
                <label className="block text-sm font-medium text-textMain mb-1">Description</label>
                <p className="text-textMain whitespace-pre-wrap">
                  {selectedProject.details || selectedProject.description}
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-textMain mb-1">Created</label>
              <p className="text-textMain">{formatDate(selectedProject.createdAt)}</p>
            </div>
            <div className="flex gap-2 pt-4 border-t border-muted">
              <Button
                variant="outline"
                onClick={() => handleContactClient(selectedProject)}
                className="flex-1"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Contact Client
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Action Modal */}
      <Modal
        isOpen={showActionModal}
        onClose={() => {
          setShowActionModal(false);
          setSelectedProject(null);
          setActionNote('');
          setDeliverables([]);
        }}
        title={
          actionType === 'accept'
            ? 'Accept Request'
            : actionType === 'reject'
              ? 'Reject Request'
              : actionType === 'start'
                ? 'Start Project'
                : 'Complete Project'
        }
        size="md"
      >
        <div className="space-y-4">
          {actionType === 'complete' && (
            <div>
              <label className="block text-sm font-medium text-textMain mb-2">
                Deliverables (Optional)
              </label>
              <input
                type="file"
                multiple
                onChange={(e) => setDeliverables(Array.from(e.target.files))}
                className="w-full px-4 py-2 border border-muted rounded-lg"
              />
              <p className="text-xs text-textSecondary mt-1">
                Upload project deliverables (photos, documents, etc.)
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-textMain mb-2">Note (Optional)</label>
            <textarea
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-muted rounded-lg resize-none"
              placeholder="Add a note about this action..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowActionModal(false);
                setActionNote('');
                setDeliverables([]);
              }}
              className="flex-1"
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              className="flex-1"
              loading={uploading}
              disabled={uploading}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProviderDashboard;

