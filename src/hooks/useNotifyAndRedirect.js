import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

/**
 * Hook for standardized success notification and redirect
 * @param {string} message - Success message to display
 * @param {string} redirectPath - Path to redirect to after delay
 * @param {number} delay - Delay in milliseconds before redirect (default: 2000)
 * @returns {Function} - Function to call on success
 */
export function useSubmitSuccess(message, redirectPath, delay = 2000) {
  const navigate = useNavigate();

  return useCallback(() => {
    // Show success toast
    toast.success(message, {
      duration: delay,
      position: 'top-right',
    });

    // Navigate after delay
    if (redirectPath) {
      setTimeout(() => {
        navigate(redirectPath);
      }, delay);
    }
  }, [message, redirectPath, delay, navigate]);
}
