import React, { useState, useEffect } from 'react';
import { Star, Trash2, Edit } from 'lucide-react';
import reviewsService from '../../../services/reviewsService';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';

const MyReviews = ({ user }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);

  useEffect(() => {
    if (user) {
      loadReviews();
    }
  }, [user]);

  const loadReviews = async () => {
    if (!user || !db) return;
    setLoading(true);
    try {
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('authorId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(reviewsQuery);
      const reviewsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReviews(reviewsList);
    } catch (error) {
      console.error('Error loading reviews:', error);
      // Fallback without orderBy
      try {
        const fallbackQuery = query(
          collection(db, 'reviews'),
          where('authorId', '==', user.uid)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const reviewsList = fallbackSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => {
            const aTime = a.createdAt?.toDate?.() || new Date(0);
            const bTime = b.createdAt?.toDate?.() || new Date(0);
            return bTime - aTime;
          });
        setReviews(reviewsList);
      } catch (fallbackError) {
        console.error('Error loading reviews (fallback):', fallbackError);
        toast.error('Failed to load reviews');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (review) => {
    setReviewToDelete(review);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!reviewToDelete) return;
    setDeletingId(reviewToDelete.id);
    try {
      await reviewsService.deleteReview(reviewToDelete.id);
      toast.success('Review deleted successfully');
      setReviews((prev) => prev.filter((r) => r.id !== reviewToDelete.id));
      setShowDeleteModal(false);
      setReviewToDelete(null);
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    } finally {
      setDeletingId(null);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-textMain">My Reviews</h1>
        <p className="text-textSecondary mt-2">Manage your reviews and ratings</p>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-surface rounded-lg shadow-md p-12 text-center border border-muted">
          <Star className="w-16 h-16 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-textMain mb-2">No reviews yet</h3>
          <p className="text-textSecondary">You haven't written any reviews yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-surface rounded-lg shadow-md p-6 border border-muted hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < review.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-textSecondary">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>
                  <p className="text-textMain mb-2">{review.comment || 'No comment'}</p>
                  <p className="text-sm text-textSecondary">
                    Review for: {review.targetType} (ID: {review.targetId?.substring(0, 8)}...)
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(review)}
                    className="text-error hover:bg-error/10"
                    disabled={deletingId === review.id}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setReviewToDelete(null);
              }}
              disabled={deletingId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              loading={deletingId !== null}
              disabled={deletingId !== null}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MyReviews;

