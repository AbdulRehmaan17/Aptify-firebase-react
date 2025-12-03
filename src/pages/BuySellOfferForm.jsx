import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, FileText } from 'lucide-react';
import { collection, addDoc, getDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/notificationService';
import marketplaceService from '../services/marketplaceService';
import { useSubmitSuccess } from '../hooks/useNotifyAndRedirect';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import toast from 'react-hot-toast';

/**
 * BuySellOfferForm Component
 * Form to submit purchase offer for a property or marketplace listing
 */
const BuySellOfferForm = ({ propertyId, propertyTitle, propertyPrice, listingId, listingTitle, listingPrice, onSuccess, onCancel }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Standardized success handler
  const handleSuccess = useSubmitSuccess(
    'Purchase offer submitted successfully!',
    '/account',
    2000
  );
  
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

      let targetId, targetTitle, targetPrice, sellerId, isMarketplace = false;

      // Check if it's a marketplace listing or property
      if (listingId) {
        isMarketplace = true;
        targetId = listingId;
        targetTitle = listingTitle;
        targetPrice = listingPrice;
        
        const listing = await marketplaceService.getById(listingId, false);
        sellerId = listing.sellerId;
      } else if (propertyId) {
        targetId = propertyId;
        targetTitle = propertyTitle;
        targetPrice = propertyPrice;
        
        const propertyDoc = await getDoc(doc(db, 'properties', propertyId));
        if (!propertyDoc.exists()) {
          toast.error('Property not found');
          return;
        }
        const propertyData = propertyDoc.data();
        sellerId = propertyData.ownerId;
      } else {
        toast.error('No property or listing ID provided');
        return;
      }

      if (isMarketplace) {
        // Create offer in marketplace offers collection
        const offerId = await marketplaceService.createOffer({
          listingId: targetId,
          buyerId: user.uid,
          buyerName: user.displayName || user.name || user.email,
          offerAmount: Number(formData.offerAmount),
          message: formData.message.trim() || '',
        });

        // Notify seller
        if (sellerId && sellerId !== user.uid) {
          try {
            const offerAmount = new Intl.NumberFormat('en-PK', {
              style: 'currency',
              currency: 'PKR',
            }).format(formData.offerAmount);

            await notificationService.sendNotification(
              sellerId,
              'New Offer on Your Listing',
              `You have received a new offer of ${offerAmount} for "${targetTitle || 'your listing'}".`,
              'service-request',
              `/marketplace/${targetId}`
            );
          } catch (notifError) {
            console.error('Error notifying seller:', notifError);
          }
        }

        // Notify buyer (confirmation)
        try {
          await notificationService.sendNotification(
            user.uid,
            'Offer Submitted',
            `Your offer for "${targetTitle || 'the listing'}" has been submitted. The seller will review it soon.`,
            'service-request',
            '/my-account'
          );
        } catch (notifError) {
          console.error('Error creating client notification:', notifError);
        }
      } else {
        // Create buy/sell request for property (existing logic)
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
        const requestId = docRef.id;

        // Add initial update log
        try {
          const { addProjectUpdate } = await import('../utils/projectUpdates');
          await addProjectUpdate(
            'buySellRequests',
            requestId,
            'Pending',
            user.uid,
            'Purchase offer submitted'
          );
        } catch (updateError) {
          console.error('Error adding initial update log:', updateError);
          // Don't fail the request if update log fails
        }

        // Notify property owner
        if (sellerId && sellerId !== user.uid) {
          try {
            const offerAmount = new Intl.NumberFormat('en-PK', {
              style: 'currency',
              currency: 'PKR',
            }).format(formData.offerAmount);

            await notificationService.sendNotification(
              sellerId,
              'New Purchase Offer',
              `You have received a new purchase offer of ${offerAmount} for "${targetTitle || 'your property'}".`,
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
            `Your purchase offer for "${targetTitle || 'the property'}" has been submitted. The owner will review it soon.`,
            'service-request',
            '/my-account'
          );
        } catch (notifError) {
          console.error('Error creating client notification:', notifError);
        }
      }

      // Use standardized success handler
      handleSuccess();
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

  const displayPrice = listingPrice || propertyPrice;
  const displayTitle = listingTitle || propertyTitle;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {displayPrice && (
        <div className="p-3 bg-primary/10 rounded-lg">
          <p className="text-sm text-textSecondary">{listingId ? 'Listing' : 'Property'} Price:</p>
          <p className="text-lg font-semibold text-textMain">{formatPrice(displayPrice)}</p>
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
        {displayPrice && (
          <p className="mt-1 text-xs text-textSecondary">
            {formData.offerAmount
              ? `${((Number(formData.offerAmount) / displayPrice) * 100).toFixed(1)}% of asking price`
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


