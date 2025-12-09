import React from 'react';

/**
 * ProjectStatusBadge Component
 * Displays the current status of a construction project
 * Uses color-coded badges for different statuses
 * 
 * @param {string} status - Project status (e.g., 'pending', 'in-progress', 'completed')
 */
const ProjectStatusBadge = ({ status }) => {
  // Get status badge styling based on status
  // Pending → yellow, In Progress → blue, Completed → green
  const getStatusBadgeClasses = (status) => {
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-semibold border';
    const statusLower = status?.toLowerCase() || '';

    switch (statusLower) {
      case 'pending':
        return `${baseClasses} bg-accent/20 text-accent border-accent/30`;
      case 'in progress':
      case 'inprogress':
        return `${baseClasses} bg-primary/20 text-primary border-primary/30`;
      case 'completed':
        return `${baseClasses} bg-primary/20 text-primary border-primary/30`;
      case 'cancelled':
      case 'canceled':
        return `${baseClasses} bg-red-100 text-red-800 border-red-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 border-gray-300`;
    }
  };

  // Format status for display
  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    const statusLower = status.toLowerCase();
    if (statusLower === 'inprogress') return 'In Progress';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  return (
    <span className={getStatusBadgeClasses(status)}>
      {formatStatus(status)}
    </span>
  );
};

export default ProjectStatusBadge;
