import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import reviewsService from '../../services/reviewsService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { Star, User, Calendar, MessageSquare } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

const ReviewList = ({ targetId, targetType = 'construction' }) => {
  const { currentUser } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState({
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  });
  const [reviewerNames, setReviewerNames] = useState({});

  useEffect(() => {
    if (targetId) {
      loadReviews();
    }
  }, [targetId, targetType]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const [fetchedReviews, ratingData] = await Promise.all([
        reviewsService.getByTarget(targetId, targetType),
        reviewsService.getAverageRating(targetId, targetType),
      ]);

      // Load reviewer names
      const reviewerIds = [...new Set(fetchedReviews.map((r) => r.reviewerId))];
      const namePromises = reviewerIds.map(async (reviewerId) => {
        if (reviewerNames[reviewerId]) return null;
        try {
          const userDoc = await getDoc(doc(db, 'users', reviewerId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const name =
              userData.displayName ||
              userData.name ||
              userData.email?.split('@')[0] ||
              'Anonymous User';
            return { reviewerId, name };
          }
        } catch (error) {
          console.error(`Error loading reviewer ${reviewerId}:`, error);
        }
        return null;
      });

      const newNames = (await Promise.all(namePromises)).filter(Boolean);
      const updatedNames = { ...reviewerNames };
      newNames.forEach((item) => {
        if (item) updatedNames[item.reviewerId] = item.name;
      });
      setReviewerNames(updatedNames);

      // Add reviewer names to reviews
      const reviewsWithNames = fetchedReviews.map((review) => ({
        ...review,
        reviewerName: updatedNames[review.reviewerId] || 'Anonymous User',
      }));

      setReviews(reviewsWithNames);
      setAverageRating(ratingData.average || 0);
      setTotalReviews(ratingData.count || 0);

      // Calculate rating distribution
      const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      fetchedReviews.forEach((review) => {
        const rating = review.rating;
        if (rating >= 1 && rating <= 5) {
          distribution[rating] = (distribution[rating] || 0) + 1;
        }
      });
      setRatingDistribution(distribution);
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-accent fill-current' : 'text-muted'
        }`}
      />
    ));
  };

  const getRatingPercentage = (rating) => {
    if (totalReviews === 0) return 0;
    return Math.round((ratingDistribution[rating] / totalReviews) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
        <h2 className="text-2xl font-display font-bold text-textMain mb-4">Reviews & Ratings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Average Rating */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start mb-2">
              <span className="text-4xl font-bold text-textMain mr-2">
                {averageRating.toFixed(1)}
              </span>
              <div className="flex items-center">
                <Star className="w-6 h-6 text-accent fill-current" />
              </div>
            </div>
            <p className="text-textSecondary text-sm">
              Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
            </p>
          </div>

          {/* Rating Breakdown */}
          <div className="md:col-span-2">
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = ratingDistribution[rating] || 0;
                const percentage = getRatingPercentage(rating);
                return (
                  <div key={rating} className="flex items-center space-x-2">
                    <div className="flex items-center w-16">
                      <span className="text-sm text-textSecondary mr-1">{rating}</span>
                      <Star className="w-4 h-4 text-accent fill-current" />
                    </div>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className="bg-accent h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-textSecondary w-12 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="bg-surface rounded-base shadow-md p-12 border border-muted text-center">
          <MessageSquare className="w-16 h-16 text-textSecondary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-textMain mb-2">No reviews yet</h3>
          <p className="text-textSecondary">Be the first to leave a review!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-surface rounded-base shadow-md p-6 border border-muted"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-textMain">
                      {review.reviewerName || 'Anonymous User'}
                    </p>
                    <p className="text-xs text-textSecondary flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDate(review.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {renderStars(review.rating)}
                </div>
              </div>
              {review.comment && (
                <p className="text-textSecondary leading-relaxed mt-3">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewList;

