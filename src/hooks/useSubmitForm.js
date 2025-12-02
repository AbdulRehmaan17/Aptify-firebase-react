import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/notificationService';
import { useSubmitSuccess } from './useNotifyAndRedirect';
import toast from 'react-hot-toast';

/**
 * useSubmitForm Hook
 * 
 * Standardized form submission hook with:
 * - Confirmation modal before submit
 * - Success modal after submit
 * - Toast notifications
 * - Auto-redirect to /account after 2s
 * - Loading states
 * - Notification creation
 * 
 * @param {string} collectionName - Firestore collection name (or null if using custom submit function)
 * @param {Object} options - Configuration options
 * @param {Function} options.submitFunction - Custom submit function (overrides default Firestore write)
 * @param {Function} options.prepareData - Function to prepare form data before submission
 * @param {string} options.successMessage - Success toast message
 * @param {string} options.notificationTitle - Notification title for user
 * @param {string} options.notificationMessage - Notification message for user
 * @param {string} options.notificationType - Notification type (default: 'success')
 * @param {string} options.redirectPath - Redirect path after success (default: '/account')
 * @param {number} options.redirectDelay - Delay before redirect in ms (default: 2000)
 * @param {Function} options.onSuccess - Optional callback after successful submission
 * @param {Function} options.onError - Optional error handler
 * @param {Function} options.createNotification - Optional function to create custom notifications
 * 
 * @returns {Object} - { handleSubmit, loading, showConfirm, setShowConfirm, showSuccess, setShowSuccess }
 */
export const useSubmitForm = (collectionName, options = {}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);

  const {
    submitFunction,
    prepareData,
    successMessage = 'Submitted successfully!',
    notificationTitle = 'Submission Successful',
    notificationMessage = 'Your submission has been received and will be processed soon.',
    notificationType = 'success',
    redirectPath = '/account',
    redirectDelay = 2000,
    onSuccess,
    onError,
    createNotification,
  } = options;

  // Auto-redirect when showSuccess is true
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        navigate(redirectPath);
      }, redirectDelay);

      return () => clearTimeout(timer);
    }
  }, [showSuccess, navigate, redirectPath, redirectDelay]);

  /**
   * Handle form submission
   * @param {Object} formData - Form data to submit
   * @param {Object} event - Optional form event
   */
  const handleSubmit = async (formData, event) => {
    if (event) {
      event.preventDefault();
    }

    if (!user) {
      toast.error('Please log in to submit this form.');
      navigate('/auth');
      return;
    }

    // Store form data and show confirmation modal
    setPendingFormData(formData);
    setShowConfirm(true);
  };

  /**
   * Confirm and actually submit the form
   */
  const confirmSubmit = async () => {
    if (!pendingFormData) {
      setShowConfirm(false);
      return;
    }

    try {
      setLoading(true);
      setShowConfirm(false);

      // Prepare data using custom function or default
      let dataToSubmit;
      if (prepareData) {
        dataToSubmit = await prepareData(pendingFormData, user);
      } else {
        dataToSubmit = {
          ...pendingFormData,
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
      }

      let docId;

      // Use custom submit function if provided, otherwise use default Firestore write
      if (submitFunction) {
        docId = await submitFunction(dataToSubmit, user);
      } else if (collectionName && db) {
        const docRef = await addDoc(collection(db, collectionName), dataToSubmit);
        docId = docRef.id;
      } else {
        throw new Error('Either collectionName or submitFunction must be provided');
      }

      // Create notification for user
      try {
        if (createNotification) {
          await createNotification(user.uid, docId, dataToSubmit);
        } else {
          await notificationService.create(
            user.uid,
            notificationTitle,
            notificationMessage,
            notificationType,
            redirectPath
          );
        }
      } catch (notifError) {
        console.error('Error creating notification:', notifError);
        // Don't fail the submission if notification fails
      }

      // Show success toast
      toast.success(successMessage);

      // Show success modal
      setShowSuccess(true);

      // Call optional success callback
      if (onSuccess) {
        await onSuccess(docId, dataToSubmit);
      }

      // Clear pending data
      setPendingFormData(null);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error(error.message || 'Failed to submit. Please try again.');

      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancel confirmation
   */
  const cancelSubmit = () => {
    setShowConfirm(false);
    setPendingFormData(null);
  };

  return {
    handleSubmit,
    confirmSubmit,
    cancelSubmit,
    loading,
    showConfirm,
    setShowConfirm,
    showSuccess,
    setShowSuccess,
  };
};

export default useSubmitForm;

