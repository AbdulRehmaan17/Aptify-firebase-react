import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, FileText } from 'lucide-react';
import { collection, addDoc, getDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/notificationService';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import toast from 'react-hot-toast';

/**
 * BuySellOfferForm Component
 * Form to submit purchase offer for a property
 */
const BuySellOfferForm = ({ propertyId, propertyTitle, propertyPrice, onSuccess, onCancel }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    offerAmount: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.offerAmount || Number(formData.offerAmount) <= 0) {
      newErrors.offerAmount = 'Please enter a valid offer amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please log in to submit a purchase offer');
      navigate('/auth');
      return;
    }

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      setLoading(true);

      // Get property to find owner
      const propertyDoc = await getDoc(doc(db, 'properties', propertyId));
      if (!propertyDoc.exists()) {
        toast.error('Property not found');
        return;
      }

      const propertyData = propertyDoc.data();
      const ownerId = propertyData.ownerId;

      // Create buy/sell request
      const requestData = {
        userId: user.uid,
        propertyId: propertyId,
        offerAmount: Number(formData.offerAmount),
        message: formData.message.trim() || '',
        status: 'Pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'buySellRequests'), requestData);

      // Notify property owner
      if (ownerId && ownerId !== user.uid) {
        try {
          const offerAmount = new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
          }).format(formData.offerAmount);

          await notificationService.sendNotification(
            ownerId,
            'New Purchase Offer',
            `You have received a new purchase offer of ${offerAmount} for "${propertyTitle || 'your property'}".`,
            'service-request',
            `/properties/${propertyId}`
          );
        } catch (notifError) {
          console.error('Error notifying owner:', notifError);
        }
      }

      // Notify user (confirmation)
      try {
        await notificationService.sendNotification(
          user.uid,
          'Purchase Offer Submitted',
          `Your purchase offer for "${propertyTitle || 'the property'}" has been submitted. The owner will review it soon.`,
          'service-request',
          '/account'
        );
      } catch (notifError) {
        console.error('Error creating client notification:', notifError);
      }

      toast.success('Purchase offer submitted successfully!');
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error submitting purchase offer:', error);
      toast.error('Failed to submit purchase offer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
    }).format(price);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {propertyPrice && (
        <div className="p-3 bg-primary/10 rounded-lg">
          <p className="text-sm text-textSecondary">Property Price:</p>
          <p className="text-lg font-semibold text-textMain">{formatPrice(propertyPrice)}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-textSecondary mb-2">
          <DollarSign className="w-4 h-4 inline mr-1" />
          Offer Amount (PKR) <span className="text-error">*</span>
        </label>
        <Input
          type="number"
          name="offerAmount"
          value={formData.offerAmount}
          onChange={handleChange}
          min="0"
          step="1000"
          placeholder="Enter your offer amount"
          error={errors.offerAmount}
          required
        />
        {propertyPrice && (
          <p className="mt-1 text-xs text-textSecondary">
            {formData.offerAmount
              ? `${((Number(formData.offerAmount) / propertyPrice) * 100).toFixed(1)}% of asking price`
              : ''}
          </p>
        )}
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
          Submit Offer
        </Button>
      </div>
    </form>
  );
};

export default BuySellOfferForm;


