import React from 'react';
import { Calendar, User, Image as ImageIcon } from 'lucide-react';

/**
 * ProjectTimeline Component
 * Visual timeline showing project milestones and updates
 * Displays chronological events and status changes
 * List of projectUpdates sorted by createdAt desc
 * Shows timestamp + update text + images
 * 
 * @param {Array} timeline - Array of timeline events (projectUpdates)
 */
const ProjectTimeline = ({ timeline = [] }) => {
  // Format date for display
  const formatDate = (dateValue) => {
    if (!dateValue) return 'Date not available';
    try {
      if (dateValue.toDate) {
        // Firestore Timestamp
        const date = dateValue.toDate();
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      if (typeof dateValue === 'string') {
        const date = new Date(dateValue);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      return 'Invalid date';
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Invalid date';
    }
  };

  // Get status badge color
  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || '';
    switch (statusLower) {
      case 'pending':
        return 'text-accent bg-accent/20 border-accent/30';
      case 'in progress':
      case 'inprogress':
        return 'text-primary bg-primary/20 border-primary/30';
      case 'completed':
        return 'text-primary bg-primary/20 border-primary/30';
      default:
        return 'text-gray-800 bg-gray-100 border-gray-300';
    }
  };

  // Sort timeline by createdAt descending (newest first)
  const sortedTimeline = [...timeline].sort((a, b) => {
    const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
    const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
    return bTime - aTime; // Descending order
  });

  if (sortedTimeline.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-textMain mb-4">Project Timeline</h3>
        <div className="text-center py-8 bg-surface rounded-lg border border-borderColor">
          <Calendar className="w-12 h-12 mx-auto text-textSecondary mb-3" />
          <p className="text-textSecondary text-sm italic">No timeline events yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-textMain mb-4">Project Timeline</h3>
      <div className="space-y-4">
        {sortedTimeline.map((update, index) => (
          <div
            key={update.id || index}
            className="bg-surface rounded-lg border border-borderColor p-4 hover:shadow-md transition-shadow"
          >
            {/* Timeline Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-textSecondary" />
                <span className="text-sm text-textSecondary">
                  {formatDate(update.createdAt)}
                </span>
              </div>
              {update.status && (
                <span
                  className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                    update.status
                  )}`}
                >
                  {update.status}
                </span>
              )}
            </div>

            {/* Update Text */}
            {update.note && (
              <p className="text-textMain text-sm mb-3 whitespace-pre-wrap">
                {update.note}
              </p>
            )}

            {/* Update Images */}
            {update.images && Array.isArray(update.images) && update.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                {update.images.map((imageUrl, imgIndex) => (
                  <div
                    key={imgIndex}
                    className="relative aspect-square rounded-lg overflow-hidden border border-borderColor"
                  >
                    <img
                      src={imageUrl}
                      alt={`Update ${index + 1} - Image ${imgIndex + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/300?text=Image+Not+Found';
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Updated By */}
            {update.updatedBy && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-borderColor">
                <User className="w-3 h-3 text-textSecondary" />
                <span className="text-xs text-textSecondary">
                  Updated by: {update.updatedByName || 'Provider'}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectTimeline;
