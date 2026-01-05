import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { doc, onSnapshot, collection, query, orderBy, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Building2, Calendar, DollarSign, MapPin, Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft, MessageSquare } from 'lucide-react';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
// Chat helper imported dynamically in handleStartChat

/**
 * ConstructionProjectDetail Component
 * Client-facing detail page for construction projects
 */
const ConstructionProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    if (!id || !db) {
      setLoading(false);
      return;
    }

    const projectRef = doc(db, 'constructionProjects', id);

    const unsubscribe = onSnapshot(
      projectRef,
      async (snapshot) => {
        if (!snapshot.exists()) {
          toast.error('Project not found');
          navigate('/my-projects');
          return;
        }

        const projectData = { id: snapshot.id, ...snapshot.data() };
        
        // Verify ownership
        const userId = projectData.userId || projectData.clientId;
        if (userId !== currentUser?.uid) {
          toast.error('You do not have permission to view this project');
          navigate('/my-projects');
          return;
        }

        setProject(projectData);

        // Load project updates
        try {
          const updatesRef = collection(db, 'constructionProjects', id, 'projectUpdates');
          const updatesQuery = query(updatesRef, orderBy('createdAt', 'desc'));
          const updatesSnapshot = await getDocs(updatesQuery);
          setUpdates(updatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
          console.error('Error loading updates:', error);
        }

        setLoading(false);
      },
      (error) => {
        console.error('Error loading project:', error);
        toast.error('Failed to load project');
        navigate('/my-projects');
      }
    );

    return () => unsubscribe();
  }, [id, currentUser, navigate]);

  const handleStartChat = async () => {
    if (!project?.providerId) {
      toast.error('No provider assigned yet');
      return;
    }

    try {
      setStartingChat(true);
      
      // CRITICAL: providerId should be the provider's user UID
      // If it's stored as a document ID, we need to resolve it to get userId
      let providerUserId = project.providerId;
      
      // Check if providerId might be a document ID (not a UID)
      // Try to get the provider document to extract userId
      try {
        const providerDocRef = doc(db, 'constructionProviders', project.providerId);
        const providerDoc = await getDoc(providerDocRef);
        if (providerDoc.exists()) {
          const providerData = providerDoc.data();
          // Use userId from provider document if available
          if (providerData.userId) {
            providerUserId = providerData.userId;
            console.log('Resolved providerId to userId:', providerUserId);
          }
        }
      } catch (resolveError) {
        // If document doesn't exist or error, assume providerId is already a UID
        console.log('Using providerId as UID directly:', providerUserId);
      }
      
      // CRITICAL: Find or create chat between current user and provider
      // This queries for existing chats first, then creates if needed
      const { findOrCreateConversation } = await import('../../utils/chatHelpers');
      const chatId = await findOrCreateConversation(currentUser.uid, providerUserId);
      
      // Navigate to chat using chatId
      navigate(`/chat?chatId=${chatId}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error(error.message || 'Failed to start chat. Please try again.');
    } finally {
      setStartingChat(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date?.toDate ? date.toDate() : date?.toMillis ? new Date(date.toMillis()) : new Date(date);
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

  const getStatusColor = (status) => {
    const statusMap = {
      Pending: 'text-accent bg-accent/20',
      Accepted: 'text-primary bg-primary/20',
      'In Progress': 'text-primary bg-primary/20',
      Completed: 'text-green-600 bg-green-100',
      Rejected: 'text-red-600 bg-red-100',
      Cancelled: 'text-gray-600 bg-gray-100',
    };
    return statusMap[status] || 'text-gray-600 bg-gray-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-textSecondary mb-4">Project not found</p>
          <Button onClick={() => navigate('/my-projects')}>Back to My Projects</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/my-projects')}
          className="mb-6 flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Projects
        </Button>

        {/* Project Header */}
        <div className="bg-surface rounded-base shadow-md p-6 border border-muted mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-textMain mb-2">
                Construction Project
              </h1>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  project.status
                )}`}
              >
                {project.status === 'Completed' ? (
                  <CheckCircle className="w-4 h-4 mr-2" />
                ) : project.status === 'Rejected' ? (
                  <XCircle className="w-4 h-4 mr-2" />
                ) : (
                  <AlertCircle className="w-4 h-4 mr-2" />
                )}
                {project.status || 'Pending'}
              </span>
            </div>
            <p className="text-sm text-textSecondary">
              Project ID: {project.id.slice(0, 8)}
            </p>
          </div>

          {/* Project Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center text-sm text-textSecondary">
              <DollarSign className="w-4 h-4 mr-2" />
              <span>Budget: {formatPrice(project.budget)}</span>
            </div>
            {project.timeline && (
              <div className="flex items-center text-sm text-textSecondary">
                <Clock className="w-4 h-4 mr-2" />
                <span>Timeline: {project.timeline}</span>
              </div>
            )}
            {project.location && (
              <div className="flex items-center text-sm text-textSecondary">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{project.location}</span>
              </div>
            )}
            <div className="flex items-center text-sm text-textSecondary">
              <Calendar className="w-4 h-4 mr-2" />
              <span>Created: {formatDate(project.createdAt)}</span>
            </div>
          </div>

          {/* Description */}
          {(project.details || project.description) && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-textSecondary mb-2">Project Description</h3>
              <p className="text-textMain">{project.details || project.description}</p>
            </div>
          )}

          {/* Actions */}
          {project.providerId && (
            <div className="mt-4 pt-4 border-t border-muted">
              <Button
                variant="primary"
                onClick={handleStartChat}
                disabled={startingChat}
                className="flex items-center"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {startingChat ? 'Starting Chat...' : 'Message Provider'}
              </Button>
            </div>
          )}
        </div>

        {/* Project Updates */}
        {updates.length > 0 && (
          <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
            <h2 className="text-xl font-bold text-textMain mb-4">Project Updates</h2>
            <div className="space-y-4">
              {updates.map((update) => (
                <div key={update.id} className="border-l-4 border-primary pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-textMain">{update.status}</span>
                    <span className="text-xs text-textSecondary">{formatDate(update.createdAt)}</span>
                  </div>
                  {update.note && (
                    <p className="text-sm text-textSecondary">{update.note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConstructionProjectDetail;

