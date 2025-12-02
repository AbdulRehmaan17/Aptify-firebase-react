import {
  collection,
  query,
  where,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  orderBy,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

/**
 * Reviews Service
 * Handles all review and rating operations
 */
class ReviewsService {
  /**
   * Create a review
   * @param {string} authorId - User ID of reviewer (author)
   * @param {string} targetId - ID of property or service provider
   * @param {string} targetType - 'property' or 'provider' (maps 'construction'/'renovation' to 'provider')
   * @param {number} rating - Rating from 1-5
   * @param {string} comment - Review text
   * @returns {Promise<string>} - Review document ID
   */
  async create(authorId, targetId, targetType, rating, comment) {
    try {
      if (!authorId || !targetId || !targetType || !rating || !comment) {
        throw new Error('All fields are required');
      }

      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      if (comment.trim().length < 10) {
        throw new Error('Comment must be at least 10 characters');
      }

      // Map construction/renovation to provider for reviews collection
      const normalizedTargetType = targetType === 'construction' || targetType === 'renovation' ? 'provider' : targetType;

      // Check for duplicate review - if exists, update it instead
      const existingReview = await this.getUserReview(authorId, targetId, normalizedTargetType);
      if (existingReview) {
        // Update existing review instead of creating new one
        return await this.update(existingReview.id, rating, comment);
      }

      const reviewData = {
        authorId,
        targetId,
        targetType: normalizedTargetType,
        rating: Number(rating),
        comment: comment.trim(),
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'reviews'), reviewData);
      
      // Recalculate and update average rating for the target
      await this.updateAverageRating(targetId, normalizedTargetType);
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating review:', error);
      throw new Error(error.message || 'Failed to create review');
    }
  }

  /**
   * Get all reviews for a target
   * @param {string} targetId - ID of property or service provider
   * @param {string} targetType - 'property', 'provider', 'construction', or 'renovation' (maps to 'provider')
   * @returns {Promise<Array>} - Array of review documents
   */
  async getByTarget(targetId, targetType) {
    try {
      if (!targetId || !targetType) {
        throw new Error('targetId and targetType are required');
      }

      // Map construction/renovation to provider for reviews collection
      const normalizedTargetType = targetType === 'construction' || targetType === 'renovation' ? 'provider' : targetType;

      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('targetId', '==', targetId),
        where('targetType', '==', normalizedTargetType),
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
          // Map construction/renovation to provider for reviews collection
          const normalizedTargetType = targetType === 'construction' || targetType === 'renovation' ? 'provider' : targetType;

          const reviewsQuery = query(
            collection(db, 'reviews'),
            where('targetId', '==', targetId),
            where('targetType', '==', normalizedTargetType)
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
   * @param {string} authorId - User ID (author)
   * @param {string} targetId - ID of property or service provider
   * @param {string} targetType - 'property', 'provider', 'construction', or 'renovation' (maps to 'provider')
   * @returns {Promise<Object|null>} - Review document or null
   */
  async getUserReview(authorId, targetId, targetType) {
    try {
      // Map construction/renovation to provider for reviews collection
      const normalizedTargetType = targetType === 'construction' || targetType === 'renovation' ? 'provider' : targetType;

      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('authorId', '==', authorId),
        where('targetId', '==', targetId),
        where('targetType', '==', normalizedTargetType)
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

      // Get review data before deleting to know which target to update
      const reviewRef = doc(db, 'reviews', reviewId);
      const reviewDoc = await getDoc(reviewRef);
      let targetId = null;
      let targetType = null;

      if (reviewDoc.exists()) {
        const reviewData = reviewDoc.data();
        targetId = reviewData.targetId;
        targetType = reviewData.targetType;
      }

      await deleteDoc(reviewRef);

      // Recalculate and update average rating for the target
      if (targetId && targetType) {
        await this.updateAverageRating(targetId, targetType);
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      throw new Error(error.message || 'Failed to delete review');
    }
  }

  /**
   * Update a review
   * @param {string} reviewId - Review document ID
   * @param {number} rating - Updated rating (1-5)
   * @param {string} comment - Updated comment
   * @returns {Promise<void>}
   */
  async update(reviewId, rating, comment) {
    try {
      if (!reviewId) {
        throw new Error('Review ID is required');
      }

      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      if (comment.trim().length < 10) {
        throw new Error('Comment must be at least 10 characters');
      }

      const reviewRef = doc(db, 'reviews', reviewId);
      const reviewDoc = await getDoc(reviewRef);
      
      if (!reviewDoc.exists()) {
        throw new Error('Review not found');
      }

      const reviewData = reviewDoc.data();
      const targetId = reviewData.targetId;
      const targetType = reviewData.targetType; // Already normalized in collection

      await updateDoc(reviewRef, {
        rating: Number(rating),
        comment: comment.trim(),
        updatedAt: serverTimestamp(),
      });

      // Recalculate and update average rating for the target
      await this.updateAverageRating(targetId, targetType);
    } catch (error) {
      console.error('Error updating review:', error);
      throw new Error(error.message || 'Failed to update review');
    }
  }

  /**
   * Calculate average rating for a target
   * @param {string} targetId - ID of property or service provider
   * @param {string} targetType - 'property', 'provider', 'construction', or 'renovation' (maps to 'provider')
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

  /**
   * Update average rating for a target (property or service provider)
   * @param {string} targetId - ID of property or service provider
   * @param {string} targetType - 'property' or 'provider' (normalized)
   * @returns {Promise<void>}
   */
  async updateAverageRating(targetId, targetType) {
    try {
      if (!targetId || !targetType) {
        throw new Error('targetId and targetType are required');
      }

      // Calculate average rating (using normalized targetType)
      const { average, count } = await this.getAverageRating(targetId, targetType);

      // Update the target document based on type
      if (targetType === 'property') {
        const propertyRef = doc(db, 'properties', targetId);
        await updateDoc(propertyRef, {
          averageRating: average,
          totalReviews: count,
          updatedAt: serverTimestamp(),
        });
      } else if (targetType === 'provider') {
        const providerRef = doc(db, 'serviceProviders', targetId);
        await updateDoc(providerRef, {
          averageRating: average,
          totalReviews: count,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error updating average rating:', error);
      // Don't throw error - this is a background update
    }
  }
}

export default new ReviewsService();

