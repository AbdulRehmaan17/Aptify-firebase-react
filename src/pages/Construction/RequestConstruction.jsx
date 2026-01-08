import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc, serverTimestamp, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import notificationService from '../../services/notificationService';
import { uploadMultipleImages } from '../../firebase/storageFunctions';
import { useSubmitSuccess } from '../../hooks/useNotifyAndRedirect';
import { Hammer, MapPin, DollarSign, Calendar, FileText, Upload, X, Building2 } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const RequestConstruction = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const handleSuccess = useSubmitSuccess(
    'Construction request submitted successfully!',
    '/account',
    2000
  );

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    projectType: '',
    description: '',
    budget: '',
    timeline: '',
    propertyId: '',
    propertyAddress: '',
    location: '',
    city: '',
  });
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [errors, setErrors] = useState({});

  const projectTypes = [
    { value: 'house', label: 'House Construction' },
    { value: 'apartment', label: 'Apartment Building' },
    { value: 'commercial', label: 'Commercial Building' },
    { value: 'renovation', label: 'Renovation/Remodeling' },
    { value: 'extension', label: 'Extension/Addition' },
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

    if (!formData.projectType) {
      newErrors.projectType = 'Project type is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }

    if (!formData.budget || parseFloat(formData.budget) <= 0) {
      newErrors.budget = 'Valid budget is required';
    }

    if (!formData.timeline.trim()) {
      newErrors.timeline = 'Timeline is required';
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
      toast.error('Please log in to submit a construction request');
      navigate('/login');
      return;
    }

    if (!db) {
      toast.error('Database not initialized');
      return;
    }

    setLoading(true);
    let projectId = null;
    
    try {
      // Upload images if any (do this first before Firestore writes)
      let imageUrls = [];
      if (images.length > 0) {
        toast.loading('Uploading images...', { id: 'upload' });
        imageUrls = await uploadMultipleImages(
          images,
          `construction/${currentUser.uid}/${Date.now()}`
        );
        toast.success('Images uploaded successfully', { id: 'upload' });
      }

      // Prepare project data
      const projectData = {
        userId: currentUser.uid,
        clientId: currentUser.uid,
        projectType: formData.projectType,
        description: formData.description.trim(),
        details: formData.description.trim(), // For backward compatibility
        budget: parseFloat(formData.budget),
        timeline: formData.timeline.trim(),
        propertyId: formData.propertyId || null,
        propertyAddress: formData.propertyAddress || formData.location,
        location: formData.location.trim(),
        city: formData.city.trim(),
        status: 'Pending',
        photos: imageUrls,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // OPTIMIZED: Use batch write for project + update log (minimal Firestore writes)
      const batch = writeBatch(db);
      
      // Create project document reference
      const projectRef = doc(collection(db, 'constructionProjects'));
      batch.set(projectRef, projectData);
      projectId = projectRef.id;

      // Add initial update log in the same batch
      const updateRef = doc(collection(db, 'constructionProjects', projectId, 'projectUpdates'));
      batch.set(updateRef, {
        status: 'Pending',
        updatedBy: currentUser.uid,
        note: 'Request submitted',
        createdAt: serverTimestamp(),
      });

      // Commit batch write (single network call)
      await batch.commit();

      // OPTIMIZED: Show immediate UI feedback
      toast.success('Construction request submitted successfully!');
      
      // OPTIMIZED: Run notifications in parallel (non-blocking)
      Promise.allSettled([
        // Notify user (confirmation) - run in parallel
        notificationService.create(
          currentUser.uid,
          'Construction Request Submitted',
          `Your construction request has been submitted. Providers will review it soon.`,
          'success',
          `/construction/my-requests/${projectId}`
        ).catch((err) => console.error('Error sending user notification:', err)),

        // Notify providers - run in parallel (fire and forget)
        (async () => {
          try {
            const providersQuery = query(
              collection(db, 'users'),
              where('role', 'in', ['constructor', 'provider'])
            );
            const providersSnapshot = await getDocs(providersQuery);
            
            const notificationPromises = providersSnapshot.docs.map((providerDoc) => {
              const providerId = providerDoc.id;
              return notificationService.create(
                providerId,
                'New Construction Request',
                `A new construction project request has been submitted: ${formData.projectType}`,
                'service-request',
                `/construction/provider-requests/${projectId}`
              ).catch((err) => console.error(`Error notifying provider ${providerId}:`, err));
            });

            await Promise.allSettled(notificationPromises);
            console.log(`Notified ${providersSnapshot.docs.length} provider(s)`);
          } catch (notifError) {
            console.error('Error notifying providers:', notifError);
          }
        })(),
      ]).catch((err) => console.error('Error in notification batch:', err));

      // Use standardized success handler
      handleSuccess();
    } catch (error) {
      console.error('Error submitting construction request:', error);
      toast.error(error.message || 'Failed to submit construction request');
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
          <p className="text-textSecondary mb-4">Please log in to submit a construction request</p>
          <Button onClick={() => navigate('/login')}>Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-textMain">Request Construction Service</h1>
          <p className="text-textSecondary mt-2">Submit your construction project requirements</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface rounded-base shadow-md p-6 border border-muted">
          <div className="space-y-6">
            {/* Project Type */}
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">
                Project Type <span className="text-error">*</span>
              </label>
              <select
                value={formData.projectType}
                onChange={(e) => handleInputChange('projectType', e.target.value)}
                className={`w-full px-3 py-2 border rounded-base focus:border-primary focus:ring-primary transition-colors ${
                  errors.projectType ? 'border-error' : 'border-muted'
                }`}
                required
              >
                <option value="">Select project type</option>
                {projectTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.projectType && (
                <p className="mt-1 text-sm text-error">{errors.projectType}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">
                Project Description <span className="text-error">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={6}
                className={`w-full px-3 py-2 border rounded-base focus:border-primary focus:ring-primary transition-colors ${
                  errors.description ? 'border-error' : 'border-muted'
                }`}
                placeholder="Describe your construction project in detail..."
                required
              />
              {errors.description && (
                <p className="mt-1 text-sm text-error">{errors.description}</p>
              )}
            </div>

            {/* Budget and Timeline */}
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
                label="Timeline"
                value={formData.timeline}
                onChange={(e) => handleInputChange('timeline', e.target.value)}
                error={errors.timeline}
                leftIcon={<Calendar className="w-4 h-4" />}
                placeholder="e.g., 3 months, 6 weeks"
                required
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
                          className="w-full h-32 object-cover rounded-base"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-80 hover:opacity-100 transition-opacity shadow-md hover:shadow-lg z-10"
                          aria-label="Remove image"
                          title="Remove image"
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
                onClick={() => navigate('/construction')}
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

export default RequestConstruction;

