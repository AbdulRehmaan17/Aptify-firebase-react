import React from 'react';
import { Link } from 'react-router-dom';
import {
  Home,
  Building2,
  Wrench,
  FileText,
  MessageSquare,
  Bell,
  Search,
  Inbox,
  Package,
  Users,
  AlertCircle,
} from 'lucide-react';
import Button from './Button';

/**
 * EmptyState Component
 * Provides consistent empty state placeholders across the app
 */

const EmptyState = ({
  icon: Icon = Search,
  title = 'No items found',
  message = 'There are no items to display at the moment.',
  actionLabel,
  actionPath,
  actionOnClick,
  className = '',
}) => {
  return (
    <div className={`bg-surface rounded-base shadow-md p-12 border border-muted text-center ${className}`}>
      <Icon className="w-16 h-16 text-textSecondary mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-textMain mb-2">{title}</h2>
      <p className="text-textSecondary mb-6 max-w-md mx-auto">{message}</p>
      {actionLabel && actionPath && (
        <Link to={actionPath}>
          <Button>{actionLabel}</Button>
        </Link>
      )}
      {actionLabel && actionOnClick && !actionPath && (
        <Button onClick={actionOnClick}>{actionLabel}</Button>
      )}
    </div>
  );
};

// Pre-configured empty states
export const EmptyProperties = ({ actionPath = '/rental/add', actionLabel = 'Add Property' }) => {
  return (
    <EmptyState
      icon={Home}
      title="No properties found"
      message="Start by adding your first property listing."
      actionPath={actionPath}
      actionLabel={actionLabel}
    />
  );
};

export const EmptyListings = ({ actionPath = '/buy-sell/add', actionLabel = 'Add Listing' }) => {
  return (
    <EmptyState
      icon={Building2}
      title="No listings found"
      message="Be the first to add a property listing."
      actionPath={actionPath}
      actionLabel={actionLabel}
    />
  );
};

export const EmptyProviders = () => {
  return (
    <EmptyState
      icon={Wrench}
      title="No service providers found"
      message="No service providers are available at the moment."
    />
  );
};

export const EmptyRequests = () => {
  return (
    <EmptyState
      icon={FileText}
      title="No requests found"
      message="You haven't made any requests yet."
    />
  );
};

export const EmptyMessages = () => {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No messages"
      message="You don't have any messages yet."
    />
  );
};

export const EmptyNotifications = () => {
  return (
    <EmptyState
      icon={Bell}
      title="No notifications"
      message="You're all caught up! No new notifications."
    />
  );
};

export const EmptySearch = ({ searchQuery, onClear }) => {
  const message = searchQuery
    ? `No results found for "${searchQuery}". Try adjusting your search or filters.`
    : 'Start searching to find what you\'re looking for.';

  if (searchQuery && onClear) {
    return (
      <EmptyState
        icon={Search}
        title="No results found"
        message={message}
        actionLabel="Clear Search"
        actionOnClick={onClear}
      />
    );
  }

  return (
    <EmptyState
      icon={Search}
      title="No results found"
      message={message}
    />
  );
};

export const EmptyInbox = () => {
  return (
    <EmptyState
      icon={Inbox}
      title="Inbox is empty"
      message="You don't have any conversations yet."
    />
  );
};

export const EmptyBookings = () => {
  return (
    <EmptyState
      icon={Package}
      title="No bookings"
      message="You haven't made any bookings yet."
    />
  );
};

export const EmptyUsers = () => {
  return (
    <EmptyState
      icon={Users}
      title="No users found"
      message="No users match your search criteria."
    />
  );
};

export const EmptyError = ({ message = 'Something went wrong. Please try again later.' }) => {
  return (
    <EmptyState
      icon={AlertCircle}
      title="Error loading data"
      message={message}
    />
  );
};

export default EmptyState;
