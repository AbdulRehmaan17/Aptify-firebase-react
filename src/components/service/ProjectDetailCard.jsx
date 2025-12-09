import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  getDoc,
  doc as docFn,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Wrench,
  DollarSign,
  Calendar,
  Clock,
  X,
  MessageSquare,
  User,
} from 'lucide-react';
import Button from '../common/Button';
import Modal from '../common/Modal';
import toast from 'react-hot-toast';
import notificationService from '../../services/notificationService';
import { getOrCreateChat } from '../../utils/chatHelpers';

/**
 * ProjectDetailCard Component
 * Displays a service project with status timeline and actions
 */
const ProjectDetailCard = ({ project, type = 'construction', onCancel }) => {
  const navigate = useNavigate();
  const [updates, setUpdates] = useState([]);
  const [loadingUpdates, setLoadingUpdates] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [providerName, setProviderName] = useState('Unknown Provider');

  const collectionName = type === 'construction' ? 'constructionProjects' : 'renovationProjects';
  const Icon = type === 'construction' ? Building2 : Wrench;

  // Fetch project updates
  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        setLoadingUpdates(true);
        const updatesRef = collection(db, collectionName, project.id, 'projectUpdates');
        const updatesQuery = query(updatesRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(updatesQuery);
        const updatesList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUpdates(updatesList);
      } catch (error) {
        console.error('Error fetching project updates:', error);
      } finally {
        setLoadingUpdates(false);
      }
    };

    if (project.id) {
      fetchUpdates();
    }
  }, [project.id, collectionName]);

  // Fetch provider name
  useEffect(() => {
    const fetchProviderName = async () => {
      if (project.providerId) {
        try {
          // First try to find provider by userId
          const providerQuery = query(
            collection(db, 'serviceProviders'),
            where('userId', '==', project.providerId)
          );
          const providerSnapshot = await getDocs(providerQuery);
          if (!providerSnapshot.empty) {
            const providerData = providerSnapshot.docs[0].data();
            setProviderName(providerData.name || 'Unknown Provider');
            return;
          }
          // If not found, try to get user name from users collection
          try {
            const userDocRef = docFn(db, 'users', project.providerId);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();
              setProviderName(userData.name || userData.displayName || 'Unknown Provider');
            }
          } catch (userError) {
            console.error('Error fetching user name:', userError);
          }
        } catch (error) {
          console.error('Error fetching provider name:', error);
        }
      }
    };

    fetchProviderName();
  }, [project.providerId]);

  const handleCancel = async () => {
    if (!project.id) return;

    try {
      setCanceling(true);
      const projectRef = doc(db, collectionName, project.id);
      await updateDoc(projectRef, {
        status: 'Cancelled',
        updatedAt: serverTimestamp(),
      });

      // Create project update
      const updatesRef = collection(db, collectionName, project.id, 'projectUpdates');
      await addDoc(updatesRef, {
        projectId: project.id, // Store projectId for collectionGroup queries
        status: 'Cancelled',
        updatedBy: project.userId || project.clientId,
        note: 'Request cancelled by client',
        createdAt: serverTimestamp(),
      });

      // Notify provider if assigned
      if (project.providerId) {
        try {
          await notificationService.sendNotification(
            project.providerId,
            'Project Cancelled',
            `A ${type} project has been cancelled by the client.`,
            'status-update',
            type === 'construction' ? '/constructor-dashboard' : '/renovator-dashboard'
          );
        } catch (notifError) {
          console.error('Error notifying provider:', notifError);
        }
      }

      toast.success('Project cancelled successfully');
      setShowCancelModal(false);
      if (onCancel) onCancel();
    } catch (error) {
      console.error('Error cancelling project:', error);
      toast.error('Failed to cancel project');
    } finally {
      setCanceling(false);
    }
  };

  const handleContactProvider = async () => {
    if (!project.providerId) {
      toast.error('No provider assigned to this project');
      return;
    }

    try {
      const chatId = await getOrCreateChat(project.userId || project.clientId, project.providerId);
      navigate(`/chats?chatId=${chatId}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to start chat');
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

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-primary/20 text-primary';
      case 'in progress':
      case 'inprogress':
        return 'bg-primary/10 text-primary';
      case 'accepted':
        return 'bg-accent/20 text-accent';
      case 'rejected':
      case 'cancelled':
        return 'bg-error/20 text-error';
      default:
        return 'bg-muted text-textMain';
    }
  };

  return (
    <>
      <div className="border border-muted rounded-lg p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-5 h-5 text-textSecondary" />
              <h3 className="font-semibold text-textMain">Project #{project.id.slice(0, 8)}</h3>
            </div>
            <div className="space-y-1 text-sm text-textSecondary">
              <p>
                <DollarSign className="w-4 h-4 inline mr-1" />
                Budget:{' '}
                {new Intl.NumberFormat('en-PK', {
                  style: 'currency',
                  currency: 'PKR',
                }).format(project.budget)}
              </p>
              {project.timeline && (
                <p>
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Timeline: {project.timeline}
                </p>
              )}
              {project.providerId && (
                <p>
                  <User className="w-4 h-4 inline mr-1" />
                  Provider: {providerName}
                </p>
              )}
            </div>
          </div>
          <span
            className={`px-3 py-1 text-xs font-medium rounded ${getStatusColor(project.status)}`}
          >
            {project.status || 'Pending'}
          </span>
        </div>

        {project.details || project.description ? (
          <p className="text-sm text-textMain mt-3 mb-4">
            {project.details || project.description}
          </p>
        ) : null}

        {/* Status Timeline */}
        {updates.length > 0 && (
          <div className="mt-4 pt-4 border-t border-muted">
            <h4 className="text-sm font-semibold text-textMain mb-3 flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Status Timeline
            </h4>
            <div className="space-y-2">
              {updates.map((update, index) => (
                <div key={update.id} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-base ${getStatusColor(update.status)}`}
                      >
                        {update.status}
                      </span>
                      <span className="text-xs text-textSecondary">
                        {formatDate(update.createdAt)}
                      </span>
                    </div>
                    {update.note && (
                      <p className="text-xs text-textSecondary mt-1">{update.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-muted">
          {project.providerId && (
            <Button variant="outline" size="sm" onClick={handleContactProvider} className="flex-1">
              <MessageSquare className="w-4 h-4 mr-1" />
              Contact Provider
            </Button>
          )}
          {(project.status === 'Pending' || !project.status) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCancelModal(true)}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel Request
            </Button>
          )}
        </div>

        <p className="text-xs text-textSecondary mt-3">Created: {formatDate(project.createdAt)}</p>
      </div>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Project Request"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-textMain">
            Are you sure you want to cancel this {type} project request? This action cannot be
            undone.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(false)}
              className="flex-1"
              disabled={canceling}
            >
              No, Keep It
            </Button>
            <Button
              variant="danger"
              onClick={handleCancel}
              className="flex-1"
              loading={canceling}
              disabled={canceling}
            >
              Yes, Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ProjectDetailCard;
