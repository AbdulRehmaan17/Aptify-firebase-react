import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import notificationService from '../../services/notificationService';
import { uploadMultipleImages } from '../../firebase/storageFunctions';
import { useSubmitSuccess } from '../../hooks/useNotifyAndRedirect';
import { Wrench, MapPin, DollarSign, Calendar, FileText, Upload, X, Home } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const RequestRenovation = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const handleSuccess = useSubmitSuccess(
    'Renovation request submitted successfully!',
    '/account',
    2000
  );

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    serviceCategory: '',
    detailedDescription: '',
    budget: '',
    preferredDate: '',
    propertyId: '',
    propertyAddress: '',
    location: '',
    city: '',
  });
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [errors, setErrors] = useState({});

  const serviceCategories = [
    { value: 'kitchen', label: 'Kitchen Renovation' },
    { value: 'bathroom', label: 'Bathroom Renovation' },
    { value: 'living-room', label: 'Living Room' },
    { value: 'bedroom', label: 'Bedroom' },
    { value: 'painting', label: 'Painting' },
    { value: 'flooring', label: 'Flooring' },
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'roofing', label: 'Roofing' },
    { value: 'full-house', label: 'Full House Renovation' },
    { value: 'other', label: 'Other' },
  ];

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not a valid image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const remainingSlots = 10 - images.length;
    if (validFiles.length > remainingSlots) {
      toast.error(`You can only upload ${remainingSlots} more image(s)`);
      validFiles.splice(remainingSlots);
    }

    setImages((prev) => [...prev, ...validFiles]);

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.serviceCategory) {
      newErrors.serviceCategory = 'Service category is required';
    }

    if (!formData.detailedDescription.trim()) {
      newErrors.detailedDescription = 'Description is required';
    } else if (formData.detailedDescription.trim().length < 20) {
      newErrors.detailedDescription = 'Description must be at least 20 characters';
    }

    if (!formData.budget || parseFloat(formData.budget) <= 0) {
      newErrors.budget = 'Valid budget is required';
    }

    if (!formData.preferredDate) {
      newErrors.preferredDate = 'Preferred date is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!currentUser) {
      toast.error('Please log in to submit a renovation request');
      navigate('/login');
      return;
    }

    if (!db) {
      toast.error('Database not initialized');
      return;
    }

    setLoading(true);
    try {
      // Upload images if any
      let imageUrls = [];
      if (images.length > 0) {
        toast.loading('Uploading images...', { id: 'upload' });
        imageUrls = await uploadMultipleImages(
          images,
          `renovation/${currentUser.uid}/${Date.now()}`
        );
        toast.success('Images uploaded successfully', { id: 'upload' });
      }

      // Create renovation project request
      const projectData = {
        userId: currentUser.uid,
        clientId: currentUser.uid,
        serviceCategory: formData.serviceCategory,
        detailedDescription: formData.detailedDescription.trim(),
        description: formData.detailedDescription.trim(), // For backward compatibility
        budget: parseFloat(formData.budget),
        preferredDate: formData.preferredDate,
        propertyId: formData.propertyId || null,
        propertyAddress: formData.propertyAddress || formData.location,
        location: formData.location.trim(),
        city: formData.city.trim(),
        status: 'Pending',
        photos: imageUrls,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'renovationProjects'), projectData);
      const projectId = docRef.id;

      // Add initial update log
      try {
        const { addProjectUpdate } = await import('../../utils/projectUpdates');
        await addProjectUpdate(
          'renovationProjects',
          projectId,
          'Pending',
          currentUser.uid,
          'Request submitted'
        );
      } catch (updateError) {
        console.error('Error adding initial update log:', updateError);
        // Don't fail the request if update log fails
      }

      // Notify all renovation providers
      try {
        const providersQuery = query(
          collection(db, 'users'),
          where('role', 'in', ['renovator', 'provider'])
        );
        const providersSnapshot = await getDocs(providersQuery);
        
        const notificationPromises = providersSnapshot.docs.map((doc) => {
          const providerId = doc.id;
          return notificationService.create(
            providerId,
            'New Renovation Request',
            `A new renovation project request has been submitted: ${formData.serviceCategory}`,
            'service-request',
            `/renovation/provider-requests/${projectId}`
          );
        });

        await Promise.all(notificationPromises);
        toast.success(`Notified ${providersSnapshot.docs.length} provider(s)`);
      } catch (notifError) {
        console.error('Error notifying providers:', notifError);
      }

      // Notify user (confirmation)
      try {
        await notificationService.create(
          currentUser.uid,
          'Renovation Request Submitted',
          `Your renovation request has been submitted. Providers will review it soon.`,
          'success',
          `/renovation/my-renovations/${projectId}`
        );
      } catch (notifError) {
        console.error('Error sending user notification:', notifError);
      }

      // Use standardized success handler
      handleSuccess();
    } catch (error) {
      console.error('Error submitting renovation request:', error);
      toast.error(error.message || 'Failed to submit renovation request');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-textSecondary mb-4">Please log in to submit a renovation request</p>
          <Button onClick={() => navigate('/login')}>Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-textMain">Request Renovation Service</h1>
          <p className="text-textSecondary mt-2">Submit your renovation project requirements</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface rounded-base shadow-md p-6 border border-muted">
          <div className="space-y-6">
            {/* Service Category */}
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">
                Service Category <span className="text-error">*</span>
              </label>
              <select
                value={formData.serviceCategory}
                onChange={(e) => handleInputChange('serviceCategory', e.target.value)}
                className={`w-full px-3 py-2 border rounded-base focus:border-primary focus:ring-primary transition-colors ${
                  errors.serviceCategory ? 'border-error' : 'border-muted'
                }`}
                required
              >
                <option value="">Select service category</option>
                {serviceCategories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              {errors.serviceCategory && (
                <p className="mt-1 text-sm text-error">{errors.serviceCategory}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">
                Detailed Description <span className="text-error">*</span>
              </label>
              <textarea
                value={formData.detailedDescription}
                onChange={(e) => handleInputChange('detailedDescription', e.target.value)}
                rows={6}
                className={`w-full px-3 py-2 border rounded-base focus:border-primary focus:ring-primary transition-colors ${
                  errors.detailedDescription ? 'border-error' : 'border-muted'
                }`}
                placeholder="Describe your renovation project in detail..."
                required
              />
              {errors.detailedDescription && (
                <p className="mt-1 text-sm text-error">{errors.detailedDescription}</p>
              )}
            </div>

            {/* Budget and Preferred Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Budget (USD)"
                type="number"
                value={formData.budget}
                onChange={(e) => handleInputChange('budget', e.target.value)}
                error={errors.budget}
                leftIcon={<DollarSign className="w-4 h-4" />}
                placeholder="0.00"
                required
                min="0"
                step="0.01"
              />

              <Input
                label="Preferred Start Date"
                type="date"
                value={formData.preferredDate}
                onChange={(e) => handleInputChange('preferredDate', e.target.value)}
                error={errors.preferredDate}
                leftIcon={<Calendar className="w-4 h-4" />}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Location */}
            <div>
              <h2 className="text-xl font-semibold text-textMain mb-4">Project Location</h2>
              
              <div className="space-y-4">
                <Input
                  label="Address"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  error={errors.location}
                  leftIcon={<MapPin className="w-4 h-4" />}
                  placeholder="Street address"
                  required
                />

                <Input
                  label="City"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  error={errors.city}
                  placeholder="City name"
                  required
                />
              </div>
            </div>

            {/* Optional Property ID */}
            <Input
              label="Property ID (Optional)"
              value={formData.propertyId}
              onChange={(e) => handleInputChange('propertyId', e.target.value)}
              placeholder="If this is for an existing property"
            />

            {/* Images */}
            <div>
              <h2 className="text-xl font-semibold text-textMain mb-4">Project Images (Optional)</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-2">
                    Upload Images (Max 10, 5MB each)
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted rounded-base cursor-pointer hover:bg-background transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-textSecondary" />
                        <p className="mb-2 text-sm text-textSecondary">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-textSecondary">PNG, JPG, GIF up to 5MB</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        accept="image/*"
                        onChange={handleImageSelect}
                      />
                    </label>
                  </div>
                </div>

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-16 object-cover rounded-base"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/renovation')}
              >
                Cancel
              </Button>
              <Button type="submit" loading={loading} disabled={loading} size="lg">
                Submit Request
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestRenovation;

