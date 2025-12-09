import React from 'react';
import { Building2, Calendar, DollarSign, User, MapPin } from 'lucide-react';
import ProjectStatusBadge from './ProjectStatusBadge';

/**
 * ProjectCard Component
 * Displays a construction project in card format
 * Shows project title, client name, status, created date, and click handler
 * 
 * @param {Object} project - Project data object
 * @param {Function} onClick - Click handler function (optional)
 */
const ProjectCard = ({ project, onClick }) => {
  // Format budget/price for display
  const formatBudget = (amount) => {
    if (!amount && amount !== 0) return 'Not set';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date for display
  const formatDate = (dateValue) => {
    if (!dateValue) return 'Not set';
    try {
      if (dateValue.toDate) {
        // Firestore Timestamp
        return dateValue.toDate().toLocaleDateString('en-US', {
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
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Invalid date';
    }
  };

  // Get project title/description
  const getProjectTitle = () => {
    return (
      project.projectType ||
      project.description?.substring(0, 50) ||
      project.details?.substring(0, 50) ||
      'Construction Project'
    );
  };

  const getProjectDescription = () => {
    const desc = project.description || project.details || '';
    return desc.length > 100 ? desc.substring(0, 100) + '...' : desc;
  };

  // Get client name (from project data or placeholder)
  const getClientName = () => {
    return project.clientName || project.userName || 'Client';
  };

  return (
    <div
      className={`bg-surface rounded-lg border border-borderColor p-6 hover:shadow-lg transition-all duration-200 h-full flex flex-col ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      {/* Header with Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-textMain mb-2 line-clamp-2">
            {getProjectTitle()}
          </h3>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>

      {/* Client Name */}
      <div className="flex items-center text-sm text-textSecondary mb-3">
        <User className="w-4 h-4 mr-2 flex-shrink-0" />
        <span className="truncate">{getClientName()}</span>
      </div>

      {/* Description */}
      {getProjectDescription() && (
        <p className="text-textSecondary text-sm mb-4 line-clamp-2 flex-1">
          {getProjectDescription()}
        </p>
      )}

      {/* Project Details */}
      <div className="space-y-2 mt-auto">
        {project.budget && (
          <div className="flex items-center text-sm text-textSecondary">
            <DollarSign className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="font-medium text-textMain">{formatBudget(project.budget)}</span>
          </div>
        )}

        {project.startDate && (
          <div className="flex items-center text-sm text-textSecondary">
            <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>Start: {formatDate(project.startDate)}</span>
          </div>
        )}

        {project.endDate && (
          <div className="flex items-center text-sm text-textSecondary">
            <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>End: {formatDate(project.endDate)}</span>
          </div>
        )}

        {project.createdAt && (
          <div className="flex items-center text-xs text-textSecondary pt-2 border-t border-borderColor">
            <Calendar className="w-3 h-3 mr-2 flex-shrink-0" />
            <span>Created: {formatDate(project.createdAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectCard;
