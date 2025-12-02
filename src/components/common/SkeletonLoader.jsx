import React from 'react';

/**
 * SkeletonLoader Component
 * Provides skeleton loading states for better UX
 */

// Basic skeleton box
export const SkeletonBox = ({ className = '', width, height }) => {
  return (
    <div
      className={`bg-muted animate-pulse rounded-base ${className}`}
      style={{
        width: width || '100%',
        height: height || '1rem',
      }}
    />
  );
};

// Property card skeleton
export const PropertyCardSkeleton = () => {
  return (
    <div className="bg-surface rounded-base shadow-md overflow-hidden border border-muted">
      <SkeletonBox height="200px" className="w-full" />
      <div className="p-4 space-y-3">
        <SkeletonBox height="24px" width="80%" />
        <SkeletonBox height="16px" width="60%" />
        <SkeletonBox height="20px" width="40%" />
        <div className="flex gap-4">
          <SkeletonBox height="16px" width="60px" />
          <SkeletonBox height="16px" width="60px" />
          <SkeletonBox height="16px" width="80px" />
        </div>
      </div>
    </div>
  );
};

// Provider card skeleton
export const ProviderCardSkeleton = () => {
  return (
    <div className="bg-surface rounded-base shadow-md border border-muted p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 space-y-2">
          <SkeletonBox height="24px" width="70%" />
          <SkeletonBox height="16px" width="50%" />
        </div>
        <SkeletonBox height="32px" width="60px" className="rounded-base" />
      </div>
      <SkeletonBox height="16px" width="100%" className="mb-2" />
      <SkeletonBox height="16px" width="80%" className="mb-4" />
      <div className="flex gap-2 mb-4">
        <SkeletonBox height="24px" width="80px" className="rounded-base" />
        <SkeletonBox height="24px" width="80px" className="rounded-base" />
        <SkeletonBox height="24px" width="80px" className="rounded-base" />
      </div>
      <SkeletonBox height="40px" width="100%" className="rounded-base" />
    </div>
  );
};

// List item skeleton
export const ListItemSkeleton = () => {
  return (
    <div className="bg-surface rounded-base border border-muted p-4 flex items-center gap-4">
      <SkeletonBox height="60px" width="60px" className="rounded-base" />
      <div className="flex-1 space-y-2">
        <SkeletonBox height="20px" width="60%" />
        <SkeletonBox height="16px" width="40%" />
      </div>
      <SkeletonBox height="36px" width="100px" className="rounded-base" />
    </div>
  );
};

// Table row skeleton
export const TableRowSkeleton = ({ columns = 4 }) => {
  return (
    <tr className="border-b border-muted">
      {Array.from({ length: columns }).map((_, idx) => (
        <td key={idx} className="p-4">
          <SkeletonBox height="16px" width="80%" />
        </td>
      ))}
    </tr>
  );
};

// Form skeleton
export const FormSkeleton = () => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SkeletonBox height="16px" width="100px" />
        <SkeletonBox height="40px" width="100%" className="rounded-base" />
      </div>
      <div className="space-y-2">
        <SkeletonBox height="16px" width="100px" />
        <SkeletonBox height="100px" width="100%" className="rounded-base" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <SkeletonBox height="16px" width="80px" />
          <SkeletonBox height="40px" width="100%" className="rounded-base" />
        </div>
        <div className="space-y-2">
          <SkeletonBox height="16px" width="80px" />
          <SkeletonBox height="40px" width="100%" className="rounded-base" />
        </div>
      </div>
      <SkeletonBox height="44px" width="150px" className="rounded-base" />
    </div>
  );
};

// Grid skeleton (for multiple items)
export const GridSkeleton = ({ count = 6, ItemComponent = PropertyCardSkeleton }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <ItemComponent key={idx} />
      ))}
    </div>
  );
};

// Dashboard stats skeleton
export const StatsSkeleton = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="bg-surface rounded-base border border-muted p-6">
          <SkeletonBox height="16px" width="60%" className="mb-2" />
          <SkeletonBox height="32px" width="40%" />
        </div>
      ))}
    </div>
  );
};

export default SkeletonBox;



