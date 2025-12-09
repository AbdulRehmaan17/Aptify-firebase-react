import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import ProjectCard from '../../components/constructor/ProjectCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/common/Button';
import { Filter, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * ConstructorProjects Component
 * Lists all construction projects assigned to the constructor
 * Shows project cards with status, timeline, and actions
 * Uses real-time onSnapshot listener with proper cleanup
 */
const ConstructorProjects = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'Pending', 'In Progress', 'Completed'
  
  // Use refs to store unsubscribe functions for cleanup
  const unsubscribeRef = useRef(null);
  const fallbackUnsubscribeRef = useRef(null);

  // Fetch projects with real-time listener
  useEffect(() => {
    // Wait for auth to load
    if (authLoading) {
      return;
    }

    // Check if user is authenticated
    if (!currentUser || !currentUser.uid) {
      setLoading(false);
      toast.error('Please log in to view your projects.');
      navigate('/auth');
      return;
    }

    const providerId = currentUser.uid;
    console.log('Setting up real-time listener for constructor projects, providerId:', providerId);

    if (!db) {
      console.error('Firestore db is not initialized');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Create query filtered by providerId and ordered by createdAt
      const projectsQuery = query(
        collection(db, 'constructionProjects'),
        where('providerId', '==', providerId),
        orderBy('createdAt', 'desc')
      );

      // Setup real-time listener using onSnapshot
      const unsubscribe = onSnapshot(
        projectsQuery,
        (snapshot) => {
          console.log(`Received ${snapshot.docs.length} construction projects from snapshot`);

          // Handle empty collection gracefully
          if (snapshot.empty) {
            console.log('No construction projects assigned to constructor');
            setProjects([]);
            setFilteredProjects([]);
            setLoading(false);
            return;
          }

          // Map documents to array with id
          const projectsList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setProjects(projectsList);
          setLoading(false);
        },
        (error) => {
          // Error callback for onSnapshot
          console.error('Error in onSnapshot:', error);

          // Handle index errors with fallback query
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            console.log('Index not found, using fallback query without orderBy');
            const fallbackQuery = query(
              collection(db, 'constructionProjects'),
              where('providerId', '==', providerId)
            );

            const fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              (snapshot) => {
                const projectsList = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));

                // Sort client-side by createdAt
                projectsList.sort((a, b) => {
                  const aTime = a.createdAt?.toDate?.() || new Date(0);
                  const bTime = b.createdAt?.toDate?.() || new Date(0);
                  return bTime - aTime;
                });

                setProjects(projectsList);
                setLoading(false);
              },
              (fallbackError) => {
                console.error('Error in fallback query:', fallbackError);
                setProjects([]);
                setFilteredProjects([]);
                setLoading(false);
                toast.error('Failed to load projects. Please try again.');
              }
            );

            // Store fallback unsubscribe in ref for cleanup
            fallbackUnsubscribeRef.current = fallbackUnsubscribe;
          } else {
            // Handle other errors
            if (error.code === 'permission-denied') {
              toast.error('Permission denied. Please check Firestore security rules.');
            } else if (error.code === 'not-found' || error.message?.includes('not found')) {
              // Collection doesn't exist - this is okay, show empty state
              console.log('Collection does not exist yet. Showing empty state.');
              setProjects([]);
              setFilteredProjects([]);
              setLoading(false);
            } else {
              toast.error('Failed to load construction projects. Please try again.');
              setProjects([]);
              setFilteredProjects([]);
              setLoading(false);
            }
          }
        }
      );

      // Store main unsubscribe in ref
      unsubscribeRef.current = unsubscribe;

      // Cleanup function to unsubscribe from all listeners
      return () => {
        console.log('Unsubscribing from construction projects listener');
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
        if (fallbackUnsubscribeRef.current) {
          console.log('Unsubscribing from fallback construction projects listener');
          fallbackUnsubscribeRef.current();
          fallbackUnsubscribeRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error setting up listener:', error);
      setLoading(false);
      toast.error('Failed to setup real-time listener.');
    }
  }, [currentUser, authLoading, navigate]);

  // Apply status filter when projects or filter changes
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredProjects(projects);
    } else {
      const filtered = projects.filter(
        (project) => project.status?.toLowerCase() === statusFilter.toLowerCase()
      );
      setFilteredProjects(filtered);
    }
  }, [projects, statusFilter]);

  // Handle project card click - navigate to project details
  const handleProjectClick = (projectId) => {
    navigate(`/constructor/projects/${projectId}`);
  };

  // Get status counts for summary
  const getStatusCounts = () => {
    return {
      all: projects.length,
      pending: projects.filter((p) => p.status?.toLowerCase() === 'pending').length,
      inProgress: projects.filter(
        (p) => p.status?.toLowerCase() === 'in progress' || p.status?.toLowerCase() === 'inprogress'
      ).length,
      completed: projects.filter((p) => p.status?.toLowerCase() === 'completed').length,
    };
  };

  const statusCounts = getStatusCounts();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-textMain mb-2">My Construction Projects</h1>
              <p className="text-textSecondary">
                Manage and track all your assigned construction projects
              </p>
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-textSecondary" />
            <span className="text-sm font-medium text-textSecondary">Filter by Status:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-textSecondary hover:bg-muted'
              }`}
            >
              All ({statusCounts.all})
            </button>
            <button
              onClick={() => setStatusFilter('Pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'Pending'
                  ? 'bg-accent/20 text-accent border border-accent'
                  : 'bg-surface text-textSecondary hover:bg-muted'
              }`}
            >
              Pending ({statusCounts.pending})
            </button>
            <button
              onClick={() => setStatusFilter('In Progress')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'In Progress'
                  ? 'bg-muted text-textMain border border-borderColor'
                  : 'bg-surface text-textSecondary hover:bg-muted'
              }`}
            >
              In Progress ({statusCounts.inProgress})
            </button>
            <button
              onClick={() => setStatusFilter('Completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'Completed'
                  ? 'bg-primary/20 text-primary border border-primary'
                  : 'bg-surface text-textSecondary hover:bg-muted'
              }`}
            >
              Completed ({statusCounts.completed})
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => handleProjectClick(project.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-surface rounded-lg border border-borderColor">
            <Building2 className="w-16 h-16 mx-auto text-textSecondary mb-4" />
            <h3 className="text-xl font-semibold text-textMain mb-2">
              {statusFilter === 'all' ? 'No Projects Found' : `No ${statusFilter} Projects`}
            </h3>
            <p className="text-textSecondary mb-6">
              {statusFilter === 'all'
                ? "You don't have any construction projects assigned yet."
                : `You don't have any projects with status "${statusFilter}".`}
            </p>
            {statusFilter !== 'all' && (
              <Button
                variant="outline"
                onClick={() => setStatusFilter('all')}
              >
                View All Projects
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConstructorProjects;
