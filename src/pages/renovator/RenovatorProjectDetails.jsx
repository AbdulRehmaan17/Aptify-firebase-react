import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  onSnapshot,
  orderBy,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  User,
  MapPin,
  Calendar,
  DollarSign,
  MessageSquare,
  Upload,
  X,
  ArrowLeft,
  Edit,
  Save,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Image as ImageIcon,
  PlayCircle,
} from 'lucide-react';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ProjectTimeline from '../../components/constructor/ProjectTimeline';
import ProjectStatusBadge from '../../components/constructor/ProjectStatusBadge';
import { findOrCreateConversation } from '../../utils/chatHelpers';
import notificationService from '../../services/notificationService';
import { uploadMultipleImages } from '../../firebase/storageFunctions';
import toast from 'react-hot-toast';

/**
 * RenovatorProjectDetails Component
 * Detailed view of a single renovation project for renovators
 * Shows project information, timeline, updates, and actions
 * Includes status update actions and "Message Client" button
 */
const RenovatorProjectDetails = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [property, setProperty] = useState(null);
  const [client, setClient] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [addingUpdate, setAddingUpdate] = useState(false);
  const [showAddUpdate, setShowAddUpdate] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [newUpdateNote, setNewUpdateNote] = useState('');
  const [newUpdateImages, setNewUpdateImages] = useState([]);
  const [newUpdateImagePreviews, setNewUpdateImagePreviews] = useState([]);
  const [startingChat, setStartingChat] = useState(false);

  // Use refs for cleanup
  const unsubscribeProjectRef = useRef(null);
  const unsubscribeUpdatesRef = useRef(null);

  // Fetch project data with real-time listener
  useEffect(() => {
    if (authLoading || !currentUser || !projectId || !db) {
      if (!authLoading && (!currentUser || !projectId)) {
        setLoading(false);
        if (!currentUser) {
          toast.error('Please log in to view project details.');
          navigate('/auth');
        }
      }
      return;
    }

    const fetchProject = async () => {
      try {
        setLoading(true);
        const projectRef = doc(db, 'renovationProjects', projectId);

        // Setup real-time listener for project
        unsubscribeProjectRef.current = onSnapshot(
          projectRef,
          async (snapshot) => {
            if (!snapshot.exists()) {
              toast.error('Project not found');
              navigate('/renovator/projects');
              return;
            }

            const projectData = { id: snapshot.id, ...snapshot.data() };
            setProject(projectData);

            // Verify this project belongs to current renovator
            if (projectData.providerId !== currentUser.uid) {
              toast.error('You do not have access to this project');
              navigate('/renovator/projects');
              return;
            }

            // Fetch property if propertyId exists
            if (projectData.propertyId) {
              try {
                const propertyRef = doc(db, 'properties', projectData.propertyId);
                const propertySnap = await getDoc(propertyRef);
                if (propertySnap.exists()) {
                  setProperty({ id: propertySnap.id, ...propertySnap.data() });
                }
              } catch (error) {
                console.error('Error fetching property:', error);
              }
            }

            // Fetch client info
            const clientId = projectData.userId || projectData.clientId;
            if (clientId) {
              try {
                const clientRef = doc(db, 'users', clientId);
                const clientSnap = await getDoc(clientRef);
                if (clientSnap.exists()) {
                  const clientData = clientSnap.data();
                  setClient({
                    id: clientSnap.id,
                    name:
                      clientData.displayName ||
                      clientData.name ||
                      clientData.fullName ||
                      clientData.email?.split('@')[0] ||
                      'Client',
                    email: clientData.email,
                    phone: clientData.phone || clientData.phoneNumber,
                  });
                } else {
                  setClient({
                    id: clientId,
                    name: 'Client',
                    email: null,
                    phone: null,
                  });
                }
              } catch (error) {
                console.error('Error fetching client:', error);
                setClient({
                  id: clientId,
                  name: 'Client',
                  email: null,
                  phone: null,
                });
              }
            }

            setLoading(false);
          },
          (error) => {
            console.error('Error in project snapshot:', error);
            toast.error('Failed to load project');
            setLoading(false);
          }
        );

        // Setup real-time listener for project updates
        const updatesRef = collection(db, 'renovationProjects', projectId, 'projectUpdates');
        const updatesQuery = query(updatesRef, orderBy('createdAt', 'desc'));

        unsubscribeUpdatesRef.current = onSnapshot(
          updatesQuery,
          (snapshot) => {
            const updatesList = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setUpdates(updatesList);
          },
          (error) => {
            console.error('Error in updates snapshot:', error);
            // If index error, try without orderBy
            if (error.code === 'failed-precondition' || error.message?.includes('index')) {
              const fallbackQuery = query(updatesRef);
              const fallbackUnsubscribe = onSnapshot(
                fallbackQuery,
                (fallbackSnapshot) => {
                  const updatesList = fallbackSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                  }));
                  // Sort client-side
                  updatesList.sort((a, b) => {
                    const aTime = a.createdAt?.toDate?.() || new Date(0);
                    const bTime = b.createdAt?.toDate?.() || new Date(0);
                    return bTime - aTime;
                  });
                  setUpdates(updatesList);
                },
                (fallbackError) => {
                  console.error('Error in fallback updates query:', fallbackError);
                }
              );
              // Store fallback unsubscribe in ref for cleanup
              unsubscribeUpdatesRef.current = fallbackUnsubscribe;
            }
          }
        );
      } catch (error) {
        console.error('Error setting up listeners:', error);
        toast.error('Failed to setup real-time listeners');
        setLoading(false);
      }
    };

    fetchProject();

    // Cleanup
    return () => {
      if (unsubscribeProjectRef.current) {
        unsubscribeProjectRef.current();
        unsubscribeProjectRef.current = null;
      }
      if (unsubscribeUpdatesRef.current) {
        unsubscribeUpdatesRef.current();
        unsubscribeUpdatesRef.current = null;
      }
    };
  }, [projectId, currentUser, authLoading, navigate]);

  // Handle status update
  const handleStatusUpdate = async (newStatus, reason = '') => {
    if (!project || !db || updatingStatus) return;

    try {
      setUpdatingStatus(true);
      const projectRef = doc(db, 'renovationProjects', projectId);
      await updateDoc(projectRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
        ...(reason && { rejectReason: reason }),
      });

      // Add project update
      const updatesRef = collection(db, 'renovationProjects', projectId, 'projectUpdates');
      await addDoc(updatesRef, {
        projectId,
        status: newStatus,
        updatedBy: currentUser.uid,
        note: reason || `Status updated to ${newStatus}`,
        createdAt: serverTimestamp(),
      });

      // Notify client about status update
      const clientId = project.userId || project.clientId;
      if (clientId) {
        try {
          await notificationService.notifyClientStatusUpdate(
            clientId,
            projectId,
            project.serviceCategory || 'Renovation Project',
            newStatus,
            '/account'
          );
        } catch (notifError) {
          console.error('Error sending status update notification:', notifError);
        }
      }

      toast.success(`Status updated to ${newStatus}`);
      setShowRejectModal(false);
      setRejectReason('');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle reject with reason
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    await handleStatusUpdate('Rejected', rejectReason.trim());
  };

  // Handle image upload for update
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max 5MB per file.`);
        return false;
      }
      return true;
    });

    setNewUpdateImages((prev) => [...prev, ...validFiles]);
    validFiles.forEach((file) => {
      setNewUpdateImagePreviews((prev) => [...prev, URL.createObjectURL(file)]);
    });
  };

  // Remove image from update
  const handleRemoveImage = (index) => {
    setNewUpdateImages((prev) => prev.filter((_, i) => i !== index));
    setNewUpdateImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Add new project update
  const handleAddUpdate = async () => {
    if (!project || !db || addingUpdate) return;

    if (!newUpdateNote.trim() && newUpdateImages.length === 0) {
      toast.error('Please add a note or image');
      return;
    }

    try {
      setAddingUpdate(true);

      // Upload images
      let imageUrls = [];
      if (newUpdateImages.length > 0) {
        const uploadedUrls = await uploadMultipleImages(
          newUpdateImages,
          `renovationProjects/${projectId}/updates/${currentUser.uid}`
        );
        imageUrls = uploadedUrls;
      }

      // Add update document
      const updatesRef = collection(db, 'renovationProjects', projectId, 'projectUpdates');
      await addDoc(updatesRef, {
        projectId,
        status: project.status,
        updatedBy: currentUser.uid,
        note: newUpdateNote.trim(),
        images: imageUrls,
        createdAt: serverTimestamp(),
      });

      // Notify client about new update
      const clientId = project.userId || project.clientId;
      if (clientId) {
        try {
          await notificationService.notifyClientNewUpdate(
            clientId,
            projectId,
            project.serviceCategory || 'Renovation Project',
            newUpdateNote.trim().substring(0, 50) + '...',
            '/account'
          );
        } catch (notifError) {
          console.error('Error sending update notification:', notifError);
        }
      }

      // Reset form
      setNewUpdateNote('');
      setNewUpdateImages([]);
      setNewUpdateImagePreviews([]);
      setShowAddUpdate(false);

      toast.success('Update added successfully');
    } catch (error) {
      console.error('Error adding update:', error);
      toast.error('Failed to add update');
    } finally {
      setAddingUpdate(false);
    }
  };

  // Handle message client button
  const handleMessageClient = async () => {
    if (!project || !currentUser || startingChat) return;

    const clientId = project.userId || project.clientId;
    if (!clientId) {
      toast.error('Client information not available');
      return;
    }

    try {
      setStartingChat(true);
      const chatId = await findOrCreateConversation(currentUser.uid, clientId);
      navigate(`/chat?chatId=${chatId}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat. Please try again.');
    } finally {
      setStartingChat(false);
    }
  };

  // Format date
  const formatDate = (dateValue) => {
    if (!dateValue) return 'Not set';
    try {
      if (dateValue.toDate) {
        return dateValue.toDate().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      return new Date(dateValue).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (err) {
      return 'Invalid date';
    }
  };

  // Format budget
  const formatBudget = (amount) => {
    if (!amount && amount !== 0) return 'Not set';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get available status transitions
  const getAvailableStatuses = () => {
    if (!project) return [];
    const currentStatus = project.status?.toLowerCase() || '';

    switch (currentStatus) {
      case 'pending':
        return ['In Progress'];
      case 'in progress':
      case 'inprogress':
        return ['Completed'];
      case 'completed':
        return []; // Locked
      case 'rejected':
      case 'cancelled':
        return []; // Locked
      default:
        return ['In Progress', 'Completed'];
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 mx-auto text-textSecondary mb-4" />
            <h2 className="text-2xl font-bold text-textMain mb-2">Project Not Found</h2>
            <p className="text-textSecondary mb-6">The project you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/renovator/projects')}>Back to Projects</Button>
          </div>
        </div>
      </div>
    );
  }

  const availableStatuses = getAvailableStatuses();
  const projectImages = project.photos || [];
  const projectDescription =
    project.detailedDescription || project.description || project.details || 'No description provided';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate('/renovator/projects')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-textMain mb-2">
                {project.serviceCategory || project.projectType || 'Renovation Project'}
              </h1>
              <div className="flex items-center gap-4">
                <ProjectStatusBadge status={project.status} />
                {project.createdAt && (
                  <span className="text-textSecondary text-sm">
                    Created: {formatDate(project.createdAt)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleMessageClient}
                disabled={startingChat}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                {startingChat ? 'Opening...' : 'Message Client'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Project Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Information */}
            <div className="bg-surface rounded-lg border border-borderColor p-6">
              <h2 className="text-xl font-semibold text-textMain mb-4">Project Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">
                    Requirements / Description
                  </label>
                  <p className="text-textMain whitespace-pre-wrap">{projectDescription}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Budget
                    </label>
                    <p className="text-textMain font-medium">{formatBudget(project.budget)}</p>
                  </div>

                  {project.preferredDate && (
                    <div>
                      <label className="block text-sm font-medium text-textSecondary mb-1">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Preferred Date
                      </label>
                      <p className="text-textMain">{formatDate(project.preferredDate)}</p>
                    </div>
                  )}

                  {project.location && (
                    <div>
                      <label className="block text-sm font-medium text-textSecondary mb-1">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        Location
                      </label>
                      <p className="text-textMain">{project.location}</p>
                    </div>
                  )}

                  {project.city && (
                    <div>
                      <label className="block text-sm font-medium text-textSecondary mb-1">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        City
                      </label>
                      <p className="text-textMain">{project.city}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Project Images */}
            {projectImages.length > 0 && (
              <div className="bg-surface rounded-lg border border-borderColor p-6">
                <h2 className="text-xl font-semibold text-textMain mb-4">Project Images</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {projectImages.map((imageUrl, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden border border-borderColor"
                    >
                      <img
                        src={imageUrl}
                        alt={`Project image ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/400?text=Image+Not+Found';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Property Information */}
            {property && (
              <div className="bg-surface rounded-lg border border-borderColor p-6">
                <h2 className="text-xl font-semibold text-textMain mb-4">Property Information</h2>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">
                      Property Title
                    </label>
                    <p className="text-textMain">{property.title || property.name || 'N/A'}</p>
                  </div>
                  {property.address && (
                    <div>
                      <label className="block text-sm font-medium text-textSecondary mb-1">
                        Address
                      </label>
                      <p className="text-textMain">
                        {typeof property.address === 'object'
                          ? `${property.address.line1 || ''}, ${property.address.city || ''}`
                          : property.address}
                      </p>
                    </div>
                  )}
                  {property.type && (
                    <div>
                      <label className="block text-sm font-medium text-textSecondary mb-1">
                        Property Type
                      </label>
                      <p className="text-textMain">{property.type}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Project Timeline */}
            <div className="bg-surface rounded-lg border border-borderColor p-6">
              <ProjectTimeline timeline={updates} />
            </div>

            {/* Add Update Section */}
            {showAddUpdate ? (
              <div className="bg-surface rounded-lg border border-borderColor p-6">
                <h2 className="text-xl font-semibold text-textMain mb-4">Add Project Update</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">
                      Update Message
                    </label>
                    <textarea
                      value={newUpdateNote}
                      onChange={(e) => setNewUpdateNote(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 border border-borderColor rounded-lg bg-background text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Describe the progress or changes..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">
                      Images (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                      id="update-images"
                    />
                    <label
                      htmlFor="update-images"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary/90"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Images
                    </label>
                    {newUpdateImagePreviews.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {newUpdateImagePreviews.map((preview, index) => (
                          <div
                            key={index}
                            className="relative aspect-square rounded-lg overflow-hidden border border-borderColor"
                          >
                            <img
                              src={preview}
                              alt={`Update ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="absolute top-2 right-2 bg-error text-white rounded-full p-1 hover:bg-error/80"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddUpdate}
                      disabled={addingUpdate}
                      className="flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {addingUpdate ? 'Adding...' : 'Add Update'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddUpdate(false);
                        setNewUpdateNote('');
                        setNewUpdateImages([]);
                        setNewUpdateImagePreviews([]);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => setShowAddUpdate(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Add Project Update
              </Button>
            )}
          </div>

          {/* Right Column - Client Info & Actions */}
          <div className="space-y-6">
            {/* Client Information */}
            <div className="bg-surface rounded-lg border border-borderColor p-6">
              <h2 className="text-xl font-semibold text-textMain mb-4">Customer Information</h2>
              {client ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-textSecondary" />
                    <span className="text-textMain font-medium">{client.name}</span>
                  </div>
                  {client.email && (
                    <div>
                      <label className="block text-sm font-medium text-textSecondary mb-1">
                        Email
                      </label>
                      <p className="text-textMain text-sm">{client.email}</p>
                    </div>
                  )}
                  {client.phone && (
                    <div>
                      <label className="block text-sm font-medium text-textSecondary mb-1">
                        Phone
                      </label>
                      <p className="text-textMain text-sm">{client.phone}</p>
                    </div>
                  )}
                  <Button
                    onClick={handleMessageClient}
                    disabled={startingChat}
                    variant="primary"
                    className="w-full mt-4 flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {startingChat ? 'Opening...' : 'Message Client'}
                  </Button>
                </div>
              ) : (
                <p className="text-textSecondary">Loading customer information...</p>
              )}
            </div>

            {/* Status Update Actions */}
            <div className="bg-surface rounded-lg border border-borderColor p-6">
              <h2 className="text-xl font-semibold text-textMain mb-4">Update Status</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-2">
                    Current Status
                  </label>
                  <ProjectStatusBadge status={project.status} />
                </div>

                {availableStatuses.length > 0 && (
                  <div className="space-y-2">
                    {availableStatuses.map((status) => (
                      <Button
                        key={status}
                        onClick={() => handleStatusUpdate(status)}
                        disabled={updatingStatus}
                        variant={status === 'Completed' ? 'primary' : 'secondary'}
                        className="w-full flex items-center justify-center gap-2"
                      >
                        {status === 'In Progress' && <PlayCircle className="w-4 h-4" />}
                        {status === 'Completed' && <CheckCircle className="w-4 h-4" />}
                        {status === 'In Progress' ? 'Start Project' : status}
                      </Button>
                    ))}
                  </div>
                )}

                {project.status?.toLowerCase() === 'pending' && (
                  <Button
                    onClick={() => setShowRejectModal(true)}
                    disabled={updatingStatus}
                    variant="danger"
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject Request
                  </Button>
                )}

                {(project.status?.toLowerCase() === 'completed' ||
                  project.status?.toLowerCase() === 'rejected') && (
                  <p className="text-textSecondary text-sm">
                    Status cannot be changed from {project.status}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-textMain mb-4">Reject Request</h3>
            <p className="text-textSecondary mb-4">Please provide a reason for rejecting this request:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-borderColor rounded-lg bg-background text-textMain focus:outline-none focus:ring-2 focus:ring-primary mb-4"
              placeholder="Enter rejection reason..."
            />
            <div className="flex gap-2">
              <Button
                onClick={handleReject}
                disabled={updatingStatus || !rejectReason.trim()}
                variant="danger"
                className="flex-1"
              >
                {updatingStatus ? 'Rejecting...' : 'Reject Request'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                disabled={updatingStatus}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RenovatorProjectDetails;
