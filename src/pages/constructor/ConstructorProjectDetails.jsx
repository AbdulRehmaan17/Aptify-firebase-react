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
import { db } from '../../firebase';
import { uploadMultipleImages } from '../../firebase/storageFunctions';
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
} from 'lucide-react';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ProjectTimeline from '../../components/constructor/ProjectTimeline';
import ProjectStatusBadge from '../../components/constructor/ProjectStatusBadge';
import { findOrCreateConversation } from '../../utils/chatHelpers';
import notificationService from '../../services/notificationService';
import toast from 'react-hot-toast';

/**
 * ConstructorProjectDetails Component
 * Detailed view of a single construction project
 * Shows project information, timeline, updates, and actions
 * Includes "Message Client" button to start/continue chat
 */
const ConstructorProjectDetails = () => {
  const { projectId } = useParams();
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
        const projectRef = doc(db, 'constructionProjects', projectId);
        
        // Setup real-time listener for project
        unsubscribeProjectRef.current = onSnapshot(
          projectRef,
          async (snapshot) => {
            if (!snapshot.exists()) {
              toast.error('Project not found');
              navigate('/constructor/projects');
              return;
            }

            const projectData = { id: snapshot.id, ...snapshot.data() };
            setProject(projectData);

            // Verify this project belongs to current constructor
            if (projectData.providerId !== currentUser.uid) {
              toast.error('You do not have access to this project');
              navigate('/constructor/projects');
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
        const updatesRef = collection(db, 'constructionProjects', projectId, 'projectUpdates');
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
            // FIXED: Handle permission errors gracefully
            if (error.code === 'permission-denied') {
              console.warn('Permission denied - user may not have access to project updates');
              setUpdates([]);
              return;
            }
            // If index error, try without orderBy
            if (error.code === 'failed-precondition' || error.message?.includes('index')) {
              const fallbackQuery = query(updatesRef);
              // FIXED: Store fallback unsubscribe in ref for proper cleanup
              unsubscribeUpdatesRef.current = onSnapshot(
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
                  setUpdates([]);
                }
              );
            } else {
              setUpdates([]);
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
  const handleStatusUpdate = async (newStatus) => {
    if (!project || !db || updatingStatus) return;

    try {
      setUpdatingStatus(true);
      const projectRef = doc(db, 'constructionProjects', projectId);
      await updateDoc(projectRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // Add project update
      const updatesRef = collection(db, 'constructionProjects', projectId, 'projectUpdates');
      await addDoc(updatesRef, {
        projectId,
        status: newStatus,
        updatedBy: currentUser.uid,
        note: `Status updated to ${newStatus}`,
        createdAt: serverTimestamp(),
      });

      // Notify client about status update
      const clientId = project.userId || project.clientId;
      if (clientId) {
        try {
          await notificationService.notifyClientStatusUpdate(
            clientId,
            projectId,
            newStatus,
            project.projectType || 'construction project'
          );
        } catch (notifError) {
          console.error('Error sending status update notification:', notifError);
        }
      }

      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
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
        // Upload to Cloudinary using storageFunctions
        const folder = `constructionProjects/${projectId}/updates`;
        imageUrls = await uploadMultipleImages(newUpdateImages, folder);
      }

      // Add update document
      const updatesRef = collection(db, 'constructionProjects', projectId, 'projectUpdates');
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
            project.projectType || 'construction project'
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
            <Button onClick={() => navigate('/constructor/projects')}>Back to Projects</Button>
          </div>
        </div>
      </div>
    );
  }

  const availableStatuses = getAvailableStatuses();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate('/constructor/projects')}
            icon={<ArrowLeft className="w-4 h-4" />}
            className="mb-4"
          >
            Back to Projects
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-textMain mb-2">
                {project.projectType || project.description?.substring(0, 50) || 'Construction Project'}
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
                icon={<MessageSquare className="w-4 h-4" />}
              >
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
                    Description
                  </label>
                  <p className="text-textMain whitespace-pre-wrap">
                    {project.description || project.details || 'No description provided'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Budget
                    </label>
                    <p className="text-textMain font-medium">{formatBudget(project.budget)}</p>
                  </div>

                  {project.startDate && (
                    <div>
                      <label className="block text-sm font-medium text-textSecondary mb-1">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Start Date
                      </label>
                      <p className="text-textMain">{formatDate(project.startDate)}</p>
                    </div>
                  )}

                  {project.endDate && (
                    <div>
                      <label className="block text-sm font-medium text-textSecondary mb-1">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        End Date
                      </label>
                      <p className="text-textMain">{formatDate(project.endDate)}</p>
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
                </div>
              </div>
            </div>

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
                      Update Note
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
                      icon={<Save className="w-4 h-4" />}
                    >
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
                icon={<Edit className="w-4 h-4" />}
                variant="outline"
              >
                Add Project Update
              </Button>
            )}
          </div>

          {/* Right Column - Client Info & Actions */}
          <div className="space-y-6">
            {/* Client Information */}
            <div className="bg-surface rounded-lg border border-borderColor p-6">
              <h2 className="text-xl font-semibold text-textMain mb-4">Client Information</h2>
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
                    icon={<MessageSquare className="w-4 h-4" />}
                    className="w-full mt-4"
                  >
                    {startingChat ? 'Opening...' : 'Message Client'}
                  </Button>
                </div>
              ) : (
                <p className="text-textSecondary">Loading client information...</p>
              )}
            </div>

            {/* Status Update */}
            <div className="bg-surface rounded-lg border border-borderColor p-6">
              <h2 className="text-xl font-semibold text-textMain mb-4">Update Status</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-2">
                    Current Status
                  </label>
                  <ProjectStatusBadge status={project.status} />
                </div>

                {availableStatuses.length > 0 ? (
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">
                      Change Status To
                    </label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleStatusUpdate(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      disabled={updatingStatus}
                      className="w-full px-4 py-2 border border-borderColor rounded-lg bg-background text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select new status...</option>
                      {availableStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="text-textSecondary text-sm">
                    Status cannot be changed from {project.status}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConstructorProjectDetails;
