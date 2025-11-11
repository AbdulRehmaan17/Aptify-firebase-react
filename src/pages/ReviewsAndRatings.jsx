import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, getDocs, serverTimestamp, orderBy } from 'firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Star, MessageSquare, User, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

/**
 * ReviewsAndRatings Component
 * 
 * Implements the Reviews & Ratings module for Aptify.
 * Allows users to submit reviews and ratings for properties or services.
 * Displays average rating and all reviews in real-time.
 * 
 * @param {string} targetId - The ID of the property or service being reviewed
 * @param {string} targetType - Either "property" or "service"
 */
const ReviewsAndRatings = ({ targetId, targetType = 'property' }) => {
  const { user: contextUser } = useAuth();
  const currentUser = auth.currentUser || contextUser;

  // State management
  const [reviews, setReviews] = useState([]);
  const [userNames, setUserNames] = useState({}); // Cache user names by reviewerId
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [checkingReview, setCheckingReview] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    rating: 0,
    comment: '',
  });
  const [hoveredRating, setHoveredRating] = useState(0);

  /**
   * Fetch user name from users collection
   * Caches the result to avoid repeated fetches
   * @param {string} userId - User document ID
   * @returns {Promise<string>} - User name or "Anonymous User"
   */
  const fetchUserName = async (userId) => {
    // Return cached name if available
    if (userNames[userId]) {
      return userNames[userId];
    }

    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const name = userData.displayName || userData.name || userData.email || 'Anonymous User';
        setUserNames(prev => ({ ...prev, [userId]: name }));
        return name;
      } else {
        // If user document doesn't exist, try to get from auth
        const name = 'Anonymous User';
        setUserNames(prev => ({ ...prev, [userId]: name }));
        return name;
      }
    } catch (error) {
      console.error('Error fetching user name:', error);
      const name = 'Anonymous User';
      setUserNames(prev => ({ ...prev, [userId]: name }));
      return name;
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
        const reviewsRef = collection(db, 'reviews');
        const q = query(
          reviewsRef,
          where('targetId', '==', targetId),
          where('targetType', '==', targetType),
          where('reviewerId', '==', currentUser.uid)
        );
        
        const querySnapshot = await getDocs(q);
        setHasReviewed(!querySnapshot.empty);
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

    // Reset state when targetId changes
    setLoading(true);
    setError(null);
    setReviews([]);

    let unsubscribe = null;
    let isMounted = true;

    const setupListener = () => {
      try {
        const reviewsRef = collection(db, 'reviews');
        
        // Try query with orderBy first (requires composite index)
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
                if (!userNames[reviewData.reviewerId]) {
                  const userName = await fetchUserName(reviewData.reviewerId);
                  reviewData.reviewerName = userName;
                } else {
                  reviewData.reviewerName = userNames[reviewData.reviewerId];
                }
                
                reviewsData.push(reviewData);
              }

              // Sort by createdAt if orderBy didn't work (client-side fallback)
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
              console.log('Composite index missing, falling back to query without orderBy');
              
              // Unsubscribe from the failed query first
              if (unsubscribe) {
                unsubscribe();
                unsubscribe = null;
              }
              
              try {
                // Fallback: query without orderBy
                const fallbackQuery = query(
                  reviewsRef,
                  where('targetId', '==', targetId),
                  where('targetType', '==', targetType)
                );

                unsubscribe = onSnapshot(
                  fallbackQuery,
                  async (snapshot) => {
                    if (!isMounted) return;
                    
                    try {
                      const reviewsData = [];
                      
                      for (const docSnap of snapshot.docs) {
                        const reviewData = { id: docSnap.id, ...docSnap.data() };
                        
                        // Fetch user name if not cached
                        if (!userNames[reviewData.reviewerId]) {
                          const userName = await fetchUserName(reviewData.reviewerId);
                          reviewData.reviewerName = userName;
                        } else {
                          reviewData.reviewerName = userNames[reviewData.reviewerId];
                        }
                        
                        reviewsData.push(reviewData);
                      }

                      // Client-side sort by createdAt
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
              } catch (fallbackSetupError) {
                console.error('Error setting up fallback query:', fallbackSetupError);
                if (isMounted) {
                  setError('Failed to load reviews. Please try again.');
                  setLoading(false);
                }
              }
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
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length).toFixed(1)
    : 0;

  /**
   * Handle rating click
   */
  const handleRatingClick = (rating) => {
    if (!currentUser || hasReviewed) return;
    setFormData(prev => ({ ...prev, rating }));
  };

  /**
   * Handle form input change
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

      const reviewData = {
        reviewerId: currentUser.uid,
        targetId: targetId,
        targetType: targetType,
        rating: formData.rating,
        comment: formData.comment.trim(),
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'reviews'), reviewData);

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
      toast.error('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
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
                isFilled
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-gray-300 text-gray-300'
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
          <span className="ml-3 text-gray-600">Loading reviews...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && reviews.length === 0) {
    return (
      <div className="py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      {/* Average Rating Section */}
      <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-6 mb-8 border border-yellow-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-500 rounded-full p-4">
              <Star className="w-8 h-8 text-white fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-3xl font-bold text-gray-900">{averageRating}</span>
                <div className="flex items-center">
                  {renderStars(parseFloat(averageRating), false, 'w-6 h-6')}
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </p>
            </div>
          </div>
          {reviews.length === 0 && currentUser && !hasReviewed && (
            <Button
              onClick={scrollToForm}
              className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
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
          className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200"
        >
          <div className="flex items-center gap-3 mb-6">
            <MessageSquare className="w-6 h-6 text-yellow-600" />
            <h3 className="text-xl font-display font-bold text-gray-900">
              Write a Review
            </h3>
          </div>

          {checkingReview ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="sm" />
              <span className="ml-2 text-gray-600">Checking...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Rating Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Your Rating <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {renderStars(0, true, 'w-8 h-8')}
                  {formData.rating > 0 && (
                    <span className="text-sm text-gray-600 ml-2">
                      {formData.rating} {formData.rating === 1 ? 'star' : 'stars'}
                    </span>
                  )}
                </div>
              </div>

              {/* Comment Textarea */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Review <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="comment"
                  value={formData.comment}
                  onChange={handleChange}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors resize-none"
                  placeholder="Share your experience with this property/service..."
                  disabled={submitting}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formData.comment.length} / 10 characters minimum
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={submitting || formData.rating === 0 || formData.comment.trim().length < 10}
                className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
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
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8 flex items-start">
          <CheckCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-800 mb-1">You've already reviewed this item</p>
            <p className="text-sm text-yellow-700">
              Thank you for your feedback! You can only submit one review per {targetType}.
            </p>
          </div>
        </div>
      )}

      {/* Not Logged In Message */}
      {!currentUser && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-8 text-center">
          <p className="text-gray-600 mb-3">
            Please log in to write a review
          </p>
          <Button
            onClick={() => window.location.href = '/auth'}
            className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
          >
            Log In
          </Button>
        </div>
      )}

      {/* Reviews List Section */}
      <div>
        <h3 className="text-2xl font-display font-bold text-gray-900 mb-6">
          Reviews ({reviews.length})
        </h3>

        {reviews.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center"
          >
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-xl font-semibold text-gray-900 mb-2">
              No reviews yet
            </h4>
            <p className="text-gray-600 mb-6">
              Be the first to share your experience!
            </p>
            {currentUser && !hasReviewed && (
              <Button
                onClick={scrollToForm}
                className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
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
                className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-yellow-100 rounded-full p-2">
                      <User className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {review.reviewerName || 'Anonymous User'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(review.rating || 0, false, 'w-4 h-4')}
                        <span className="text-sm text-gray-500">
                          {review.rating || 0} {review.rating === 1 ? 'star' : 'stars'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(review.createdAt)}</span>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {review.comment}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsAndRatings;

