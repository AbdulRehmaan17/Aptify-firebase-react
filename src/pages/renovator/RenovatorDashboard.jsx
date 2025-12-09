import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/common/Button';
import {
  LayoutDashboard,
  Building2,
  Settings,
  Bell,
  MessageSquare,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  FileText,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * RenovatorDashboard Component
 * Main dashboard for renovation service providers
 * Displays overview, statistics, and quick actions
 * Uses real-time Firestore listeners for renovationProjects
 */
const RenovatorDashboard = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    pending: 0,
  });

  // Refs for cleanup
  const unsubscribeRef = useRef(null);
  const fallbackUnsubscribeRef = useRef(null);

  // Fetch renovation projects with real-time listener
  useEffect(() => {
    if (authLoading) return;

    if (!currentUser || !currentUser.uid || !db) {
      setLoading(false);
      if (!authLoading && !currentUser) {
        toast.error('Please log in to view your dashboard.');
        navigate('/auth');
      }
      return;
    }

    const providerId = currentUser.uid;
    console.log('Setting up real-time listener for renovator projects, providerId:', providerId);

    setLoading(true);

    try {
      // Create query filtered by providerId and ordered by createdAt
      const projectsQuery = query(
        collection(db, 'renovationProjects'),
        where('providerId', '==', providerId),
        orderBy('createdAt', 'desc')
      );

      // Setup real-time listener using onSnapshot
      unsubscribeRef.current = onSnapshot(
        projectsQuery,
        (snapshot) => {
          console.log(`Received ${snapshot.docs.length} renovation projects from snapshot`);

          const projectsList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setProjects(projectsList);
          calculateStats(projectsList);
          setLoading(false);
        },
        (error) => {
          console.error('Error in onSnapshot:', error);

          // Handle index errors with fallback query
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            console.log('Index not found, using fallback query without orderBy');
            const fallbackQuery = query(
              collection(db, 'renovationProjects'),
              where('providerId', '==', providerId)
            );

            fallbackUnsubscribeRef.current = onSnapshot(
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
                calculateStats(projectsList);
                setLoading(false);
              },
              (fallbackError) => {
                console.error('Error in fallback query:', fallbackError);
                setProjects([]);
                calculateStats([]);
                setLoading(false);
                if (fallbackError.code === 'permission-denied') {
                  toast.error('Permission denied. Please check Firestore security rules.');
                } else {
                  toast.error('Failed to load renovation projects.');
                }
              }
            );
          } else {
            if (error.code === 'permission-denied') {
              toast.error('Permission denied. Please check Firestore security rules.');
            } else if (error.code === 'not-found' || error.message?.includes('not found')) {
              console.log('Collection does not exist yet. Showing empty state.');
              setProjects([]);
              calculateStats([]);
              setLoading(false);
            } else {
              toast.error('Failed to load renovation projects.');
              setProjects([]);
              calculateStats([]);
              setLoading(false);
            }
          }
        }
      );

      // Cleanup function
      return () => {
        console.log('Unsubscribing from renovation projects listener');
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
        if (fallbackUnsubscribeRef.current) {
          console.log('Unsubscribing from fallback renovation projects listener');
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

  // Calculate statistics from projects
  const calculateStats = (projectsList) => {
    const statsData = {
      total: projectsList.length,
      inProgress: projectsList.filter(
        (p) => p.status?.toLowerCase() === 'in progress' || p.status?.toLowerCase() === 'inprogress'
      ).length,
      completed: projectsList.filter((p) => p.status?.toLowerCase() === 'completed').length,
      pending: projectsList.filter((p) => p.status?.toLowerCase() === 'pending').length,
    };
    setStats(statsData);
  };

  // Get status badge classes
  const getStatusBadgeClasses = (status) => {
    const statusLower = status?.toLowerCase() || '';
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-semibold';

    switch (statusLower) {
      case 'pending':
        return `${baseClasses} bg-accent/20 text-accent border border-accent/30`;
      case 'in progress':
      case 'inprogress':
        return `${baseClasses} bg-primary/20 text-primary border border-primary/30`;
      case 'completed':
        return `${baseClasses} bg-primary/20 text-primary border border-primary/30`;
      case 'cancelled':
      case 'canceled':
        return `${baseClasses} bg-red-100 text-red-800 border border-red-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-300`;
    }
  };

  // Format status for display
  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    const statusLower = status.toLowerCase();
    if (statusLower === 'inprogress') return 'In Progress';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Format budget
  const formatBudget = (budget) => {
    if (!budget) return 'N/A';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(budget);
  };

  // Get recent projects (last 5)
  const recentProjects = projects.slice(0, 5);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-textMain mb-2">Renovator Dashboard</h1>
          <p className="text-textSecondary">Welcome back! Here's an overview of your renovation projects.</p>
        </div>

        {/* Navigation Menu */}
        <div className="mb-8 bg-surface rounded-lg border border-borderColor p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/renovator/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              to="/renovator/projects"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface text-textMain hover:bg-muted border border-borderColor transition-colors"
            >
              <Building2 className="w-4 h-4" />
              My Renovation Projects
            </Link>
            <Link
              to="/renovator/profile"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface text-textMain hover:bg-muted border border-borderColor transition-colors"
            >
              <Settings className="w-4 h-4" />
              Profile
            </Link>
            <Link
              to="/renovator/notifications"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface text-textMain hover:bg-muted border border-borderColor transition-colors"
            >
              <Bell className="w-4 h-4" />
              Notifications
            </Link>
            <Link
              to="/renovator/chat"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface text-textMain hover:bg-muted border border-borderColor transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Messages
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Requests */}
          <div className="bg-surface rounded-lg border border-borderColor p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-textSecondary mb-1">Total Requests</p>
                <p className="text-3xl font-bold text-textMain">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          {/* In Progress */}
          <div className="bg-surface rounded-lg border border-borderColor p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-textSecondary mb-1">In Progress</p>
                <p className="text-3xl font-bold text-primary">{stats.inProgress}</p>
              </div>
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          {/* Completed */}
          <div className="bg-surface rounded-lg border border-borderColor p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-textSecondary mb-1">Completed</p>
                <p className="text-3xl font-bold text-primary">{stats.completed}</p>
              </div>
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="bg-surface rounded-lg border border-borderColor p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-textSecondary mb-1">Pending</p>
                <p className="text-3xl font-bold text-accent">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-accent" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Panel */}
        <div className="bg-surface rounded-lg border border-borderColor p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-textMain flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recent Activity
            </h2>
            {projects.length > 0 && (
              <Link
                to="/renovator/projects"
                className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-textSecondary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-textMain mb-2">No Renovation Projects Yet</h3>
              <p className="text-textSecondary mb-6">
                You haven't been assigned any renovation projects yet. Check back later or contact support.
              </p>
            </div>
          ) : recentProjects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-textSecondary">No recent projects to display.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="border border-borderColor rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/renovator/project/${project.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-textMain">
                          {project.serviceCategory || project.projectType || 'Renovation Project'}
                        </h3>
                        <span className={getStatusBadgeClasses(project.status)}>
                          {formatStatus(project.status)}
                        </span>
                      </div>
                      <p className="text-textSecondary text-sm mb-3 line-clamp-2">
                        {project.detailedDescription ||
                          project.description ||
                          project.details ||
                          'No description available'}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-textSecondary">
                        {project.budget && (
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-textMain">Budget:</span>
                            {formatBudget(project.budget)}
                          </span>
                        )}
                        {project.createdAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Created: {formatDate(project.createdAt)}
                          </span>
                        )}
                        {project.preferredDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Preferred: {formatDate(project.preferredDate)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-textSecondary ml-4 flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {projects.length > 0 && (
          <div className="mt-8 bg-surface rounded-lg border border-borderColor p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-textMain mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate('/renovator/projects')} variant="primary">
                View All Projects
              </Button>
              <Button onClick={() => navigate('/renovator/profile')} variant="outline">
                Update Profile
              </Button>
              <Button onClick={() => navigate('/renovator/notifications')} variant="outline">
                View Notifications
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RenovatorDashboard;
