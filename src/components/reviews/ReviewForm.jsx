import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import Button from './common/Button';
import LoadingSpinner from './common/LoadingSpinner';
import reviewsService from '../services/reviewsService';
import toast from 'react-hot-toast';

/**
 * ReviewForm Component
 * 
 * A reusable form component for submitting and editing reviews.
 * Used on PropertyDetailPage and Provider detail pages.
 * 
 * @param {string} targetId - ID of the property or provider being reviewed
 * @param {string} targetType - 'property', 'provider', 'construction', or 'renovation'
 * @param {string} authorId - ID of the user submitting the review (author)
 * @param {Object} existingReview - Existing review object if editing (optional)
 * @param {Function} onSuccess - Callback when review is submitted successfully
 * @param {Function} onCancel - Callback when form is cancelled
 */
const ReviewForm = ({
  targetId,
  targetType,
  authorId,
  existingReview = null,
  onSuccess,
  onCancel,
}) => {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [submitting, setSubmitting] = useState(false);
  const [checkingReview, setCheckingReview] = useState(true);
  const [hasExistingReview, setHasExistingReview] = useState(false);

  // Check for existing review on mount
  useEffect(() => {
    const checkExistingReview = async () => {
      if (!authorId || !targetId || existingReview) {
        setCheckingReview(false);
        return;
      }

      try {
        const review = await reviewsService.getUserReview(authorId, targetId, targetType);
        if (review) {
          setHasExistingReview(true);
          setRating(review.rating);
          setComment(review.comment);
        }
      } catch (error) {
        console.error('Error checking existing review:', error);
      } finally {
        setCheckingReview(false);
      }
    };

    checkExistingReview();
  }, [authorId, targetId, targetType, existingReview]);

  const handleRatingClick = (value) => {
    setRating(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!authorId) {
      toast.error('Please log in to submit a review.');
      return;
    }

    if (rating === 0) {
      toast.error('Please select a rating.');
      return;
    }

    if (!comment.trim()) {
      toast.error('Please enter a comment.');
      return;
    }

    if (comment.trim().length < 10) {
      toast.error('Comment must be at least 10 characters long.');
      return;
    }

    try {
      setSubmitting(true);

      if (existingReview || hasExistingReview) {
        // Update existing review
        const reviewId = existingReview?.id || (await reviewsService.getUserReview(authorId, targetId, targetType))?.id;
        if (reviewId) {
          await reviewsService.update(reviewId, rating, comment);
          toast.success('Review updated successfully!');
        }
      } else {
        // Create new review (will update if duplicate exists)
        await reviewsService.create(authorId, targetId, targetType, rating, comment);
        toast.success('Review submitted successfully!');
      }

      // Reset form
      setRating(0);
      setComment('');
      setHoveredRating(0);
      setHasExistingReview(true);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(error.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (interactive = true) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= (hoveredRating || rating);
          return (
            <Star
              key={star}
              className={`w-8 h-8 ${
                isFilled
                  ? 'fill-accent text-accent'
                  : 'fill-muted text-muted'
              } ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
              onClick={() => interactive && handleRatingClick(star)}
              onMouseEnter={() => interactive && setHoveredRating(star)}
              onMouseLeave={() => interactive && setHoveredRating(0)}
            />
          );
        })}
        {rating > 0 && (
          <span className="text-sm text-textSecondary ml-2">
            {rating} {rating === 1 ? 'star' : 'stars'}
          </span>
        )}
      </div>
    );
  };

  if (checkingReview) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="sm" />
        <span className="ml-2 text-textSecondary">Checking...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Rating Selection */}
      <div>
        <label className="block text-sm font-medium text-textSecondary mb-3">
          Your Rating (1-5 stars) <span className="text-error">*</span>
        </label>
        {renderStars()}
      </div>

      {/* Comment Textarea */}
      <div>
        <label className="block text-sm font-medium text-textSecondary mb-2">
          Your Review <span className="text-error">*</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={5}
          className="w-full px-4 py-3 border border-muted rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-accent transition-colors resize-none"
          placeholder="Share your experience..."
          disabled={submitting}
        />
        <p className="mt-1 text-xs text-textSecondary">
          {comment.length} / 10 characters minimum
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={submitting || rating === 0 || comment.trim().length < 10}
          className="bg-accent hover:bg-accent text-white border-accent"
          loading={submitting}
        >
          {existingReview || hasExistingReview ? 'Update Review' : 'Submit Review'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
        )}
      </div>

      {(existingReview || hasExistingReview) && (
        <p className="text-sm text-accent bg-accent p-3 rounded-lg">
          You're updating your existing review. This will replace your previous review.
        </p>
      )}
    </form>
  );
};

export default ReviewForm;

