import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import propertyService from '../../services/propertyService';
import rentalRequestService from '../../services/rentalRequestService';
import notificationService from '../../services/notificationService';
import transactionService from '../../services/transactionService';
import { Calendar, DollarSign, MapPin, Home, Bed, Bath, Square, Car, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const BookRental = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [property, setProperty] = useState(null);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);

  useEffect(() => {
    if (id) {
      loadProperty();
      loadWalletBalance();
    }
  }, [id]);

  const loadProperty = async () => {
    try {
      setLoading(true);
      const propertyData = await propertyService.getById(id, false);
      
      if (propertyData.type !== 'rent' && propertyData.listingType !== 'rent') {
        toast.error('This is not a rental property');
        navigate('/properties');
        return;
      }

      if (!propertyData.available) {
        toast.error('This property is currently unavailable');
        navigate('/properties');
        return;
      }

      setProperty(propertyData);
    } catch (error) {
      console.error('Error loading property:', error);
      toast.error('Failed to load property');
      navigate('/properties');
    } finally {
      setLoading(false);
    }
  };

  const loadWalletBalance = async () => {
    try {
      if (userProfile?.walletBalance !== undefined) {
        setWalletBalance(userProfile.walletBalance);
      } else {
        // Try to get from user profile
        setWalletBalance(0);
      }
    } catch (error) {
      console.error('Error loading wallet balance:', error);
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
    } else if (formData.startDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (endDate <= startDate) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    if (useWallet) {
      const totalCost = calculateTotalCost();
      if (walletBalance < totalCost) {
        newErrors.wallet = 'Insufficient wallet balance';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateTotalCost = () => {
    if (!property || !formData.startDate || !formData.endDate) return 0;
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Calculate months (approximate)
    const months = diffDays / 30;
    return property.price * Math.max(1, Math.ceil(months));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!currentUser) {
      toast.error('Please log in to book a rental');
      navigate('/login');
      return;
    }

    if (currentUser.uid === property.ownerId) {
      toast.error('You cannot book your own property');
      return;
    }

    setSubmitting(true);
    try {
      const totalCost = calculateTotalCost();

      // Create rental request
      const requestData = {
        userId: currentUser.uid,
        propertyId: id,
        startDate: formData.startDate,
        endDate: formData.endDate,
        message: formData.message.trim() || '',
        status: 'Pending',
        totalCost: totalCost,
        useWallet: useWallet,
      };

      const requestId = await rentalRequestService.create(requestData);

      // Add initial update log
      try {
        const { addProjectUpdate } = await import('../../utils/projectUpdates');
        await addProjectUpdate(
          'rentalRequests',
          requestId,
          'Pending',
          currentUser.uid,
          'Rental request submitted'
        );
      } catch (updateError) {
        console.error('Error adding initial update log:', updateError);
        // Don't fail the request if update log fails
      }

      // Deduct from wallet if enabled
      if (useWallet && walletBalance >= totalCost) {
        try {
          await transactionService.create(
            currentUser.uid,
            'rental',
            requestId,
            totalCost,
            'USD',
            'pending'
          );
          
          // Update wallet balance in user profile
          // This would typically be done through a service
          toast.success(`$${totalCost.toFixed(2)} deducted from wallet`);
        } catch (walletError) {
          console.error('Error processing wallet payment:', walletError);
          toast.error('Failed to process wallet payment');
        }
      }

      // Notify property owner
      try {
        await notificationService.create(
          property.ownerId,
          'New Rental Request',
          `${currentUser.displayName || currentUser.email} has requested to rent "${property.title}"`,
          'service-request',
          `/rental-requests/${requestId}`
        );
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }

      toast.success('Rental request submitted successfully!');
      navigate(`/rental/booking/${requestId}`);
    } catch (error) {
      console.error('Error creating rental request:', error);
      toast.error(error.message || 'Failed to submit rental request');
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-textSecondary mb-4">Property not found</p>
          <Button onClick={() => navigate('/properties')}>Back to Properties</Button>
        </div>
      </div>
    );
  }

  const totalCost = calculateTotalCost();
  const canUseWallet = useWallet && walletBalance >= totalCost;

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(`/properties/${id}`)}
          className="mb-6 flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Property
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Property Summary */}
          <div className="lg:col-span-2">
            <div className="bg-surface rounded-base shadow-md p-6 border border-muted mb-6">
              <h2 className="text-xl font-semibold text-textMain mb-4">Property Details</h2>
              
              {(property.photos || property.images || property.coverImage) && (
                <img
                  src={property.photos?.[0] || property.images?.[0] || property.coverImage}
                  alt={property.title}
                  className="w-full h-48 object-cover rounded-base mb-4"
                />
              )}

              <h3 className="text-lg font-semibold text-textMain mb-2">{property.title}</h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-textSecondary">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>
                    {property.address?.line1 || property.location}, {property.address?.city || property.city}
                  </span>
                </div>
                <div className="flex items-center text-lg font-bold text-primary">
                  <DollarSign className="w-5 h-5" />
                  {formatPrice(property.price)}/month
                </div>
              </div>

              {property.bedrooms && (
                <div className="flex items-center space-x-4 text-sm text-textSecondary">
                  {property.bedrooms > 0 && (
                    <span className="flex items-center">
                      <Bed className="w-4 h-4 mr-1" />
                      {property.bedrooms} Bed
                    </span>
                  )}
                  {property.bathrooms > 0 && (
                    <span className="flex items-center">
                      <Bath className="w-4 h-4 mr-1" />
                      {property.bathrooms} Bath
                    </span>
                  )}
                  {property.areaSqFt && (
                    <span className="flex items-center">
                      <Square className="w-4 h-4 mr-1" />
                      {property.areaSqFt} sq ft
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-1">
            <div className="bg-surface rounded-base shadow-md p-6 border border-muted sticky top-4">
              <h2 className="text-xl font-semibold text-textMain mb-4">Book This Property</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Start Date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => {
                    setFormData({ ...formData, startDate: e.target.value });
                    if (errors.startDate) setErrors({ ...errors, startDate: '' });
                  }}
                  error={errors.startDate}
                  leftIcon={<Calendar className="w-4 h-4" />}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />

                <Input
                  label="End Date"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => {
                    setFormData({ ...formData, endDate: e.target.value });
                    if (errors.endDate) setErrors({ ...errors, endDate: '' });
                  }}
                  error={errors.endDate}
                  leftIcon={<Calendar className="w-4 h-4" />}
                  required
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                />

                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">
                    Message to Owner (Optional)
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-muted rounded-base focus:border-primary focus:ring-primary transition-colors"
                    placeholder="Tell the owner about your rental needs..."
                  />
                </div>

                {/* Cost Summary */}
                {formData.startDate && formData.endDate && (
                  <div className="bg-background rounded-base p-4 border border-muted">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-textSecondary">Monthly Rent</span>
                      <span className="text-sm font-medium text-textMain">
                        {formatPrice(property.price)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-textSecondary">Estimated Total</span>
                      <span className="text-lg font-bold text-primary">
                        {formatPrice(totalCost)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Wallet Payment Option */}
                {walletBalance > 0 && totalCost > 0 && (
                  <div className="border border-muted rounded-base p-4">
                    <label className="flex items-center space-x-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={useWallet}
                        onChange={(e) => {
                          setUseWallet(e.target.checked);
                          if (errors.wallet) setErrors({ ...errors, wallet: '' });
                        }}
                        className="w-4 h-4 text-primary focus:ring-primary border-muted rounded"
                      />
                      <span className="text-sm font-medium text-textMain">
                        Pay from Wallet
                      </span>
                    </label>
                    <p className="text-xs text-textSecondary">
                      Wallet Balance: {formatPrice(walletBalance)}
                    </p>
                    {useWallet && !canUseWallet && (
                      <p className="text-xs text-error mt-1">
                        Insufficient balance
                      </p>
                    )}
                    {errors.wallet && (
                      <p className="text-xs text-error mt-1">{errors.wallet}</p>
                    )}
                  </div>
                )}

                <Button type="submit" loading={submitting} fullWidth size="lg">
                  Submit Booking Request
                </Button>

                <p className="text-xs text-textSecondary text-center">
                  The property owner will review your request and respond soon.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookRental;

