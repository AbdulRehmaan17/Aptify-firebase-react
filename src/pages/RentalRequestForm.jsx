import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, DollarSign, FileText, CheckCircle } from 'lucide-react';
import { getDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/notificationService';
import useSubmitForm from '../hooks/useSubmitForm';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';

/**
 * RentalRequestForm Component
 * Form to submit rental request for a property
 */
const RentalRequestForm = ({ propertyId, propertyTitle, onSuccess, onCancel }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    message: '',
  });
  const [errors, setErrors] = useState({});

  // Use standardized submit hook
  const {
    handleSubmit: handleSubmitForm,
    confirmSubmit,
    cancelSubmit,
    loading,
    showConfirm,
    showSuccess,
  } = useSubmitForm('rentalRequests', {
    prepareData: async (data, user) => {
      // Get property to find owner
      const propertyDoc = await getDoc(doc(db, 'properties', propertyId));
      if (!propertyDoc.exists()) {
        throw new Error('Property not found');
      }

      const propertyData = propertyDoc.data();
      const ownerId = propertyData.ownerId;

      const requestData = {
        userId: user.uid,
        propertyId: propertyId,
        startDate: data.startDate,
        endDate: data.endDate,
        message: data.message.trim() || '',
        status: 'Pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Notify property owner
      if (ownerId && ownerId !== user.uid) {
        try {
          await notificationService.sendNotification(
            ownerId,
            'New Rental Request',
            `You have received a new rental request for "${propertyTitle || 'your property'}".`,
            'service-request',
            `/properties/${propertyId}`
          );
        } catch (notifError) {
          console.error('Error notifying owner:', notifError);
        }
      }

      return requestData;
    },
    successMessage: 'Rental request submitted successfully!',
    notificationTitle: 'Rental Request Submitted',
    notificationMessage: `Your rental request for "${propertyTitle || 'the property'}" has been submitted. The owner will review it soon.`,
    notificationType: 'service-request',
    redirectPath: '/account',
    createNotification: async (userId, docId, data) => {
      await notificationService.sendNotification(
        userId,
        'Rental Request Submitted',
        `Your rental request for "${propertyTitle || 'the property'}" has been submitted. The owner will review it soon.`,
        'service-request',
        '/account'
      );
    },
    onSuccess: () => {
      if (onSuccess) {
        onSuccess();
      }
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    } else {
      const startDate = new Date(formData.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDate < today) {
        newErrors.startDate = 'Start date cannot be in the past';
      }
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    } else if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (endDate <= startDate) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    handleSubmitForm(formData, e);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-textSecondary mb-2">
          <Calendar className="w-4 h-4 inline mr-1" />
          Start Date <span className="text-error">*</span>
        </label>
        <Input
          type="date"
          name="startDate"
          value={formData.startDate}
          onChange={handleChange}
          min={new Date().toISOString().split('T')[0]}
          error={errors.startDate}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-textSecondary mb-2">
          <Calendar className="w-4 h-4 inline mr-1" />
          End Date <span className="text-error">*</span>
        </label>
        <Input
          type="date"
          name="endDate"
          value={formData.endDate}
          onChange={handleChange}
          min={formData.startDate || new Date().toISOString().split('T')[0]}
          error={errors.endDate}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-textSecondary mb-2">
          <FileText className="w-4 h-4 inline mr-1" />
          Message (Optional)
        </label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          rows={4}
          className="w-full px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary resize-none"
          placeholder="Add any additional information for the property owner..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" loading={loading} disabled={loading} className="flex-1">
          {loading ? 'Submitting...' : 'Submit Request'}
        </Button>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirm}
        onClose={cancelSubmit}
        title="Confirm Rental Request"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-textSecondary">
            Are you sure you want to submit this rental request? The property owner will be notified.
          </p>
          <div className="bg-muted p-4 rounded-base">
            <p className="text-sm text-textSecondary">
              <strong>Start Date:</strong> {formData.startDate}
            </p>
            <p className="text-sm text-textSecondary">
              <strong>End Date:</strong> {formData.endDate}
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={cancelSubmit} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={confirmSubmit} loading={loading} disabled={loading}>
              Confirm & Submit
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccess}
        onClose={() => {}}
        title="Request Submitted!"
        size="md"
      >
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-primary" />
            </div>
          </div>
          <p className="text-textSecondary">
            Your rental request has been submitted successfully! The property owner will review it soon.
          </p>
          <p className="text-sm text-textSecondary">
            Redirecting to your account...
          </p>
        </div>
      </Modal>
    </form>
  );
};

export default RentalRequestForm;
