import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import reviewsService from '../../services/reviewsService';
import { Star, Send, X } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import toast from 'react-hot-toast';

const AddReview = ({ targetId, targetType = 'construction', onReviewAdded, existingReview }) => {
  const { currentUser, userProfile } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating || 0);
      setComment(existingReview.comment || '');
    }
  }, [existingReview]);

  const handleRatingClick = (value) => {
    setRating(value);
    if (errors.rating) {
      setErrors((prev) => ({ ...prev, rating: '' }));
    }
  };

  const handleCommentChange = (e) => {
    setComment(e.target.value);
    if (errors.comment) {
      setErrors((prev) => ({ ...prev, comment: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (rating === 0) {
      newErrors.rating = 'Please select a rating';
    }

    if (!comment.trim()) {
      newErrors.comment = 'Please write a review comment';
    } else if (comment.trim().length < 10) {
      newErrors.comment = 'Review comment must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      toast.error('Please log in to leave a review');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      if (existingReview) {
        // Update existing review
        await reviewsService.update(existingReview.id, rating, comment.trim());
        toast.success('Review updated successfully!');
      } else {
        // Create new review
        await reviewsService.create(
          currentUser.uid,
          targetId,
          targetType,
          rating,
          comment.trim()
        );
        toast.success('Review submitted successfully!');
      }

      // Reset form
      if (!existingReview) {
        setRating(0);
        setComment('');
      }

      // Notify parent component
      if (onReviewAdded) {
        onReviewAdded();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, i) => {
      const starValue = i + 1;
      const isFilled = starValue <= (hoveredRating || rating);
      
      return (
        <button
          key={i}
          type="button"
          onClick={() => handleRatingClick(starValue)}
          onMouseEnter={() => setHoveredRating(starValue)}
          onMouseLeave={() => setHoveredRating(0)}
          className="focus:outline-none transition-transform hover:scale-110"
        >
          <Star
            className={`w-8 h-8 ${
              isFilled ? 'text-accent fill-current' : 'text-muted'
            }`}
          />
        </button>
      );
    });
  };

  if (!currentUser) {
    return (
      <div className="bg-surface rounded-base shadow-md p-6 border border-muted text-center">
        <p className="text-textSecondary">Please log in to leave a review</p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
      <h3 className="text-xl font-semibold text-textMain mb-4">
        {existingReview ? 'Edit Your Review' : 'Write a Review'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rating Selection */}
        <div>
          <label className="block text-sm font-medium text-textSecondary mb-2">
            Rating <span className="text-error">*</span>
          </label>
          <div className="flex items-center space-x-2">
            {renderStars()}
            {rating > 0 && (
              <span className="text-sm text-textSecondary ml-2">
                {rating} {rating === 1 ? 'star' : 'stars'}
              </span>
            )}
          </div>
          {errors.rating && (
            <p className="mt-1 text-sm text-error">{errors.rating}</p>
          )}
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-textSecondary mb-1">
            Your Review <span className="text-error">*</span>
          </label>
          <textarea
            value={comment}
            onChange={handleCommentChange}
            rows={4}
            className={`w-full px-3 py-2 border rounded-base focus:border-primary focus:ring-primary transition-colors ${
              errors.comment ? 'border-error' : 'border-muted'
            }`}
            placeholder="Share your experience with this provider..."
            required
          />
          <p className="mt-1 text-xs text-textSecondary">
            {comment.length} / 10 characters minimum
          </p>
          {errors.comment && (
            <p className="mt-1 text-sm text-error">{errors.comment}</p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3">
          {existingReview && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setRating(existingReview.rating || 0);
                setComment(existingReview.comment || '');
                setErrors({});
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
          <Button type="submit" loading={submitting} className="flex items-center">
            <Send className="w-4 h-4 mr-2" />
            {existingReview ? 'Update Review' : 'Submit Review'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddReview;

