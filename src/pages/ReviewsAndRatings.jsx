import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import reviewsService from '../services/reviewsService';
import { Star, MessageSquare, User, Calendar, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import Modal from '../components/common/Modal';

/**
 * ReviewsAndRatings Component
 *
 * Implements the Reviews & Ratings module for Aptify.
 * Supports: Properties, Construction Providers, Renovation Providers
 *
 * @param {string} targetId - The ID of the property or service provider being reviewed
 * @param {string} targetType - 'property', 'construction', or 'renovation'
 */
const ReviewsAndRatings = ({ targetId, targetType = 'property' }) => {
  const { user: contextUser, currentUserRole } = useAuth();
  const currentUser = auth?.currentUser || contextUser;
  const isAdmin = currentUserRole === 'admin';

  // State management
  const [reviews, setReviews] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [checkingReview, setCheckingReview] = useState(true);
  const [deletingReviewId, setDeletingReviewId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    rating: 0,
    comment: '',
  });
  const [hoveredRating, setHoveredRating] = useState(0);

  /**
   * Fetch user name from users collection
   */
  const fetchUserName = async (userId) => {
    if (userNames[userId]) return userNames[userId];

    try {
      const { getDoc, doc: userDoc } = await import('firebase/firestore');
      const userRef = userDoc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const name = userData.displayName || userData.name || userData.email || 'Anonymous User';
        setUserNames((prev) => ({ ...prev, [userId]: name }));
        return name;
      }
      return 'Anonymous User';
    } catch (error) {
      console.error('Error fetching user name:', error);
      return 'Anonymous User';
    }
  };

  /**
   * Check if current user has already reviewed this item
   */
  useEffect(() => {
    const checkExistingReview = async () => {
      if (!currentUser || !targetId) {
        setCheckingReview(false);
        return;
      }

      try {
        const existingReview = await reviewsService.getUserReview(
          currentUser.uid,
          targetId,
          targetType
        );
        setHasReviewed(!!existingReview);
      } catch (error) {
        console.error('Error checking existing review:', error);
        setHasReviewed(false);
      } finally {
        setCheckingReview(false);
      }
    };

    checkExistingReview();
  }, [currentUser, targetId, targetType]);

  /**
   * Fetch reviews from Firestore with real-time updates
   */
  useEffect(() => {
    if (!targetId) {
      setLoading(false);
      setReviews([]);
      return;
    }

    setLoading(true);
    setError(null);
    setReviews([]);

    let unsubscribe = null;
    let isMounted = true;

    const setupListener = () => {
      try {
        const reviewsRef = collection(db, 'reviews');

        // Try query with orderBy first
        const q = query(
          reviewsRef,
          where('targetId', '==', targetId),
          where('targetType', '==', targetType),
          orderBy('createdAt', 'desc')
        );

        unsubscribe = onSnapshot(
          q,
          async (snapshot) => {
            if (!isMounted) return;

            try {
              const reviewsData = [];

              for (const docSnap of snapshot.docs) {
                const reviewData = { id: docSnap.id, ...docSnap.data() };

                // Fetch user name if not cached
                const authorId = reviewData.authorId || reviewData.reviewerId; // Support both for backward compatibility
                if (!userNames[authorId]) {
                  const userName = await fetchUserName(authorId);
                  reviewData.reviewerName = userName;
                } else {
                  reviewData.reviewerName = userNames[authorId];
                }

                reviewsData.push(reviewData);
              }

              // Client-side sort by createdAt (fallback)
              reviewsData.sort((a, b) => {
                const aTime = a.createdAt?.toDate?.() || new Date(0);
                const bTime = b.createdAt?.toDate?.() || new Date(0);
                return bTime - aTime; // Descending order
              });

              if (isMounted) {
                setReviews(reviewsData);
                setLoading(false);
              }
            } catch (processError) {
              console.error('Error processing reviews:', processError);
              if (isMounted) {
                setError('Failed to process reviews. Please try again.');
                setLoading(false);
              }
            }
          },
          (error) => {
            if (!isMounted) return;

            console.error('Error fetching reviews with orderBy:', error);

            // If index error, try without orderBy
            if (error.code === 'failed-precondition' || error.message?.includes('index')) {
              const fallbackQuery = query(
                reviewsRef,
                where('targetId', '==', targetId),
                where('targetType', '==', targetType)
              );

              if (unsubscribe) {
                unsubscribe();
                unsubscribe = null;
              }

              unsubscribe = onSnapshot(
                fallbackQuery,
                async (snapshot) => {
                  if (!isMounted) return;

                  try {
                    const reviewsData = [];

                    for (const docSnap of snapshot.docs) {
                      const reviewData = { id: docSnap.id, ...docSnap.data() };

                      const authorId = reviewData.authorId || reviewData.reviewerId; // Support both for backward compatibility
                      if (!userNames[authorId]) {
                        const userName = await fetchUserName(authorId);
                        reviewData.reviewerName = userName;
                      } else {
                        reviewData.reviewerName = userNames[authorId];
                      }

                      reviewsData.push(reviewData);
                    }

                    // Client-side sort
                    reviewsData.sort((a, b) => {
                      const aTime = a.createdAt?.toDate?.() || new Date(0);
                      const bTime = b.createdAt?.toDate?.() || new Date(0);
                      return bTime - aTime;
                    });

                    if (isMounted) {
                      setReviews(reviewsData);
                      setLoading(false);
                    }
                  } catch (processError) {
                    console.error('Error processing reviews (fallback):', processError);
                    if (isMounted) {
                      setError('Failed to process reviews. Please try again.');
                      setLoading(false);
                    }
                  }
                },
                (fallbackError) => {
                  console.error('Error fetching reviews (fallback):', fallbackError);
                  if (isMounted) {
                    setError('Failed to load reviews. Please try again.');
                    setLoading(false);
                  }
                }
              );
            } else {
              if (isMounted) {
                setError('Failed to load reviews. Please try again.');
                setLoading(false);
              }
            }
          }
        );
      } catch (error) {
        console.error('Error setting up reviews listener:', error);
        if (isMounted) {
          setError('Failed to load reviews. Please try again.');
          setLoading(false);
        }
      }
    };

    setupListener();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, targetType]);

  /**
   * Calculate average rating
   */
  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length).toFixed(1)
      : 0;

  /**
   * Handle rating click
   */
  const handleRatingClick = (rating) => {
    if (!currentUser || hasReviewed) return;
    setFormData((prev) => ({ ...prev, rating }));
  };

  /**
   * Handle form input change
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      toast.error('Please log in to submit a review.');
      return;
    }

    if (hasReviewed) {
      toast.error('You have already reviewed this item.');
      return;
    }

    // Validation
    if (formData.rating === 0) {
      toast.error('Please select a rating.');
      return;
    }

    if (!formData.comment.trim()) {
      toast.error('Please enter a comment.');
      return;
    }

    if (formData.comment.trim().length < 10) {
      toast.error('Comment must be at least 10 characters long.');
      return;
    }

    try {
      setSubmitting(true);

      await reviewsService.create(
        currentUser.uid,
        targetId,
        targetType,
        formData.rating,
        formData.comment
      );

      // Reset form
      setFormData({
        rating: 0,
        comment: '',
      });
      setHoveredRating(0);
      setHasReviewed(true);

      toast.success('Review submitted successfully!');
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(error.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handle delete review
   */
  const handleDeleteClick = (review) => {
    setReviewToDelete(review);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!reviewToDelete) return;

    try {
      setDeletingReviewId(reviewToDelete.id);
      await reviewsService.delete(reviewToDelete.id);
      toast.success('Review deleted successfully');
      setShowDeleteModal(false);
      setReviewToDelete(null);
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error(error.message || 'Failed to delete review');
    } finally {
      setDeletingReviewId(null);
    }
  };

  /**
   * Format timestamp to readable date
   */
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Date not available';

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return 'Date not available';
    }
  };

  /**
   * Render star rating display
   */
  const renderStars = (rating, interactive = false, size = 'w-5 h-5') => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = interactive
            ? star <= (hoveredRating || formData.rating)
            : star <= rating;

          return (
            <Star
              key={star}
              className={`${size} ${
                isFilled ? 'fill-accent text-accent' : 'fill-muted text-muted'
              } ${interactive && !hasReviewed ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
              onClick={() => interactive && handleRatingClick(star)}
              onMouseEnter={() => interactive && setHoveredRating(star)}
              onMouseLeave={() => interactive && setHoveredRating(0)}
            />
          );
        })}
      </div>
    );
  };

  /**
   * Scroll to review form
   */
  const scrollToForm = () => {
    const formElement = document.getElementById('review-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Loading state
  if (loading && reviews.length === 0) {
    return (
      <div className="py-8">
        <div className="flex items-center justify-center">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-textSecondary">Loading reviews...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && reviews.length === 0) {
    return (
      <div className="py-8">
        <div className="bg-error/10 border border-error/30 rounded-base p-6 text-center">
          <AlertCircle className="w-8 h-8 text-error mx-auto mb-2" />
          <p className="text-error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      {/* Average Rating Section */}
      <div className="bg-gradient-to-r from-accent/10 to-accent/5 rounded-base p-6 mb-8 border border-muted">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-accent rounded-full p-4">
              <Star className="w-8 h-8 text-white fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-3xl font-bold text-textMain">{averageRating}</span>
                <div className="flex items-center">
                  {renderStars(parseFloat(averageRating), false, 'w-6 h-6')}
                </div>
              </div>
              <p className="text-sm text-textSecondary">
                Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </p>
            </div>
          </div>
          {reviews.length === 0 && currentUser && !hasReviewed && (
            <Button
              onClick={scrollToForm}
              className="bg-accent hover:bg-accent text-white border-accent"
            >
              Be the First to Review
            </Button>
          )}
        </div>
      </div>

      {/* Review Form Section */}
      {currentUser && !hasReviewed && (
        <motion.div
          id="review-form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="card-base p-6 mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <MessageSquare className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-display font-bold text-textMain">Write a Review</h3>
          </div>

          {checkingReview ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="sm" />
              <span className="ml-2 text-textSecondary">Checking...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Rating Selection */}
              <div>
                <label className="block text-sm font-medium text-textMain mb-3">
                  Your Rating (1-5 stars) <span className="text-error">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {renderStars(0, true, 'w-8 h-8')}
                  {formData.rating > 0 && (
                    <span className="text-sm text-textSecondary ml-2">
                      {formData.rating} {formData.rating === 1 ? 'star' : 'stars'}
                    </span>
                  )}
                </div>
              </div>

              {/* Comment Textarea */}
              <div>
                <label className="block text-sm font-medium text-textMain mb-2">
                  Your Review <span className="text-error">*</span>
                </label>
                <textarea
                  name="comment"
                  value={formData.comment}
                  onChange={handleChange}
                  rows={5}
                  className="w-full px-4 py-3 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none"
                  placeholder="Share your experience..."
                  disabled={submitting}
                />
                <p className="mt-1 text-xs text-textSecondary">
                  {formData.comment.length} / 10 characters minimum
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={
                  submitting || formData.rating === 0 || formData.comment.trim().length < 10
                }
                className="bg-primary hover:bg-primaryDark text-white border-primary"
                loading={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </Button>
            </form>
          )}
        </motion.div>
      )}

      {/* Already Reviewed Message */}
      {currentUser && hasReviewed && (
        <div className="bg-accent border border-accent rounded-lg p-4 mb-8 flex items-start">
          <CheckCircle className="w-5 h-5 text-accent mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-accent mb-1">You've already reviewed this item</p>
            <p className="text-sm text-accent">
              Thank you for your feedback! You can only submit one review per {targetType}.
            </p>
          </div>
        </div>
      )}

      {/* Not Logged In Message */}
      {!currentUser && (
        <div className="bg-muted/30 border border-muted rounded-base p-4 mb-8 text-center">
          <p className="text-textSecondary mb-3">Please log in to write a review</p>
          <Button
            onClick={() => (window.location.href = '/auth')}
            className="bg-primary hover:bg-primaryDark text-white border-primary"
          >
            Log In
          </Button>
        </div>
      )}

      {/* Reviews List Section */}
      <div>
        <h3 className="text-2xl font-display font-bold text-textMain mb-6">
          Reviews ({reviews.length})
        </h3>

        {reviews.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-muted/30 border border-muted rounded-base p-12 text-center"
          >
            <MessageSquare className="w-16 h-16 text-muted mx-auto mb-4" />
            <h4 className="text-xl font-semibold text-textMain mb-2">No reviews yet</h4>
            <p className="text-textSecondary mb-6">Be the first to share your experience!</p>
            {currentUser && !hasReviewed && (
              <Button
                onClick={scrollToForm}
                className="bg-primary hover:bg-primaryDark text-white border-primary"
              >
                Write a Review
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-surface rounded-base shadow-md p-6 border border-muted hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="bg-accent/10 rounded-full p-2">
                      <User className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-textMain">
                        {review.reviewerName || 'Anonymous User'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(review.rating || 0, false, 'w-4 h-4')}
                        <span className="text-sm text-textSecondary">
                          {review.rating || 0} {review.rating === 1 ? 'star' : 'stars'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-textSecondary">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(review.createdAt)}</span>
                    </div>
                    {/* Admin Delete Button */}
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteClick(review)}
                        disabled={deletingReviewId === review.id}
                        className="p-2 text-error hover:bg-error/10 rounded-base transition-colors disabled:opacity-50"
                        title="Delete review (Admin only)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-textMain leading-relaxed whitespace-pre-wrap">{review.comment}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setReviewToDelete(null);
        }}
        title="Delete Review"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-textMain">
            Are you sure you want to delete this review? This action cannot be undone.
          </p>
          {reviewToDelete && (
            <div className="bg-muted/30 p-4 rounded-base">
              <p className="text-sm text-textSecondary mb-2">
                <strong>Rating:</strong> {reviewToDelete.rating} stars
              </p>
              <p className="text-sm text-textSecondary">
                <strong>Review:</strong> {reviewToDelete.comment.substring(0, 100)}
                {reviewToDelete.comment.length > 100 ? '...' : ''}
              </p>
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setReviewToDelete(null);
              }}
              disabled={deletingReviewId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              loading={deletingReviewId !== null}
              disabled={deletingReviewId !== null}
            >
              Delete Review
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ReviewsAndRatings;
