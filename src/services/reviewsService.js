import {
  collection,
  query,
  where,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Reviews Service
 * Handles all review and rating operations
 */
class ReviewsService {
  /**
   * Create a review
   * @param {string} reviewerId - User ID of reviewer
   * @param {string} targetId - ID of property or service provider
   * @param {string} targetType - 'property', 'construction', or 'renovation'
   * @param {number} rating - Rating from 1-5
   * @param {string} comment - Review text
   * @returns {Promise<string>} - Review document ID
   */
  async create(reviewerId, targetId, targetType, rating, comment) {
    try {
      if (!reviewerId || !targetId || !targetType || !rating || !comment) {
        throw new Error('All fields are required');
      }

      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      if (comment.trim().length < 10) {
        throw new Error('Comment must be at least 10 characters');
      }

      // Check for duplicate review
      const existingReview = await this.getUserReview(reviewerId, targetId, targetType);
      if (existingReview) {
        throw new Error('You have already reviewed this item');
      }

      const reviewData = {
        reviewerId,
        targetId,
        targetType,
        rating: Number(rating),
        comment: comment.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'reviews'), reviewData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating review:', error);
      throw new Error(error.message || 'Failed to create review');
    }
  }

  /**
   * Get all reviews for a target
   * @param {string} targetId - ID of property or service provider
   * @param {string} targetType - 'property', 'construction', or 'renovation'
   * @returns {Promise<Array>} - Array of review documents
   */
  async getByTarget(targetId, targetType) {
    try {
      if (!targetId || !targetType) {
        throw new Error('targetId and targetType are required');
      }

      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('targetId', '==', targetId),
        where('targetType', '==', targetType),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(reviewsQuery);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      // If index error, try without orderBy
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        try {
          const reviewsQuery = query(
            collection(db, 'reviews'),
            where('targetId', '==', targetId),
            where('targetType', '==', targetType)
          );

          const snapshot = await getDocs(reviewsQuery);
          const reviews = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Sort client-side by createdAt
          reviews.sort((a, b) => {
            const aTime = a.createdAt?.toDate?.() || new Date(0);
            const bTime = b.createdAt?.toDate?.() || new Date(0);
            return bTime - aTime; // Descending
          });

          return reviews;
        } catch (fallbackError) {
          console.error('Error fetching reviews (fallback):', fallbackError);
          throw new Error('Failed to fetch reviews');
        }
      }
      console.error('Error fetching reviews:', error);
      throw new Error('Failed to fetch reviews');
    }
  }

  /**
   * Get user's review for a target
   * @param {string} reviewerId - User ID
   * @param {string} targetId - ID of property or service provider
   * @param {string} targetType - 'property', 'construction', or 'renovation'
   * @returns {Promise<Object|null>} - Review document or null
   */
  async getUserReview(reviewerId, targetId, targetType) {
    try {
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('reviewerId', '==', reviewerId),
        where('targetId', '==', targetId),
        where('targetType', '==', targetType)
      );

      const snapshot = await getDocs(reviewsQuery);
      if (snapshot.empty) return null;

      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data(),
      };
    } catch (error) {
      console.error('Error fetching user review:', error);
      return null;
    }
  }

  /**
   * Delete a review (admin or author only)
   * @param {string} reviewId - Review document ID
   * @returns {Promise<void>}
   */
  async delete(reviewId) {
    try {
      if (!reviewId) {
        throw new Error('Review ID is required');
      }

      await deleteDoc(doc(db, 'reviews', reviewId));
    } catch (error) {
      console.error('Error deleting review:', error);
      throw new Error(error.message || 'Failed to delete review');
    }
  }

  /**
   * Calculate average rating for a target
   * @param {string} targetId - ID of property or service provider
   * @param {string} targetType - 'property', 'construction', or 'renovation'
   * @returns {Promise<Object>} - { average: number, count: number }
   */
  async getAverageRating(targetId, targetType) {
    try {
      const reviews = await this.getByTarget(targetId, targetType);
      if (reviews.length === 0) {
        return { average: 0, count: 0 };
      }

      const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
      const average = sum / reviews.length;

      return {
        average: parseFloat(average.toFixed(1)),
        count: reviews.length,
      };
    } catch (error) {
      console.error('Error calculating average rating:', error);
      return { average: 0, count: 0 };
    }
  }
}

export default new ReviewsService();

