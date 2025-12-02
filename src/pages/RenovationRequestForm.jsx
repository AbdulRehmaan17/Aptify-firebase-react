import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/notificationService';
import {
  Wrench,
  Home,
  Calendar,
  DollarSign,
  FileText,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';

/**
 * RenovationRequestForm Component
 *
 * Allows property owners to submit renovation project requests.
 * Fetches user's properties from Firestore and creates a new renovation project.
 * Supports providerId from query params or route state (from RenovationList).
 * Handles optional photo uploads to Firebase Storage.
 * Automatically creates "renovationProjects" collection if it doesn't exist.
 */
const RenovationRequestForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user: contextUser, loading: authLoading } = useAuth();

  // Get currentUser from Firebase auth
  const currentUser = auth?.currentUser || contextUser;

  // Form state
  const [formData, setFormData] = useState({
    serviceCategory: '',
    propertyId: '',
    detailedDescription: '',
    budget: '',
    preferredDate: '',
    providerId: '', // Will be set from query params or route state
  });

  // UI state
  const [properties, setProperties] = useState([]);
  const [photos, setPhotos] = useState([]); // Array of File objects
  const [photoPreviews, setPhotoPreviews] = useState([]); // Array of preview URLs
  const [loading, setLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [fetchingProperties, setFetchingProperties] = useState(true);
  const [errors, setErrors] = useState({});

  // Service category options
  const serviceCategories = [
    { value: 'Painting', label: 'Painting' },
    { value: 'Plumbing', label: 'Plumbing' },
    { value: 'Electrical', label: 'Electrical' },
    { value: 'Flooring', label: 'Flooring' },
    { value: 'Carpentry', label: 'Carpentry' },
    { value: 'Full Renovation', label: 'Full Renovation' },
  ];

  /**
   * Get providerId from query params or route state
   * Priority: query params > route state > empty string
   */
  useEffect(() => {
    const providerIdFromQuery = searchParams.get('providerId');
    const providerIdFromState = location.state?.providerId;

    const providerId = providerIdFromQuery || providerIdFromState || '';

    if (providerId) {
      setFormData((prev) => ({
        ...prev,
        providerId: providerId,
      }));
      console.log(
        'Provider ID set from:',
        providerIdFromQuery ? 'query params' : 'route state',
        providerId
      );
    }
  }, [searchParams, location.state]);

  /**
   * Fetch user's properties from Firestore
   * Queries "properties" collection where ownerId == currentUser.uid
   */
  useEffect(() => {
    const fetchProperties = async () => {
      // Wait for auth to load
      if (authLoading) {
        return;
      }

      // Check if user is authenticated
      if (!currentUser || !currentUser.uid) {
        setFetchingProperties(false);
        return;
      }

      try {
        setFetchingProperties(true);
        console.log('Fetching properties for user:', currentUser.uid);

        // Query properties collection filtered by ownerId
        const propertiesQuery = query(
          collection(db, 'properties'),
          where('ownerId', '==', currentUser.uid)
        );

        const snapshot = await getDocs(propertiesQuery);
        const propertiesList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProperties(propertiesList);
        console.log(`Fetched ${propertiesList.length} properties for user ${currentUser.uid}`);
      } catch (error) {
        console.error('Error fetching properties:', error);
        toast.error('Failed to load your properties. Please try again.');
        setProperties([]);
      } finally {
        setFetchingProperties(false);
      }
    };

    fetchProperties();
  }, [currentUser, authLoading]);

  /**
   * Handle form field changes
   * Updates formData state and clears field-specific errors
   */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  /**
   * Handle photo file selection
   * Creates preview URLs and stores File objects
   */
  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);

    if (files.length === 0) return;

    // Validate file types and sizes
    const validFiles = [];
    const invalidFiles = [];

    files.forEach((file) => {
      // Check file type (images only)
      if (!file.type.startsWith('image/')) {
        invalidFiles.push(`${file.name} is not an image file`);
        return;
      }

      // Check file size (max 5MB per file)
      if (file.size > 5 * 1024 * 1024) {
        invalidFiles.push(`${file.name} is too large (max 5MB)`);
        return;
      }

      validFiles.push(file);
    });

    if (invalidFiles.length > 0) {
      toast.error(`Some files were rejected: ${invalidFiles.join(', ')}`);
    }

    if (validFiles.length > 0) {
      // Create preview URLs
      const newPreviews = validFiles.map((file) => URL.createObjectURL(file));

      setPhotos((prev) => [...prev, ...validFiles]);
      setPhotoPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  /**
   * Remove a photo from the selection
   */
  const handleRemovePhoto = (index) => {
    // Revoke preview URL to free memory
    URL.revokeObjectURL(photoPreviews[index]);

    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Upload photos to Firebase Storage
   * Uploads to /renovation_photos/{userId}/{timestamp}_{filename}
   * @returns {Promise<Array<string>>} - Array of download URLs
   */
  const uploadPhotos = async () => {
    if (photos.length === 0) {
      return [];
    }

    setUploadingPhotos(true);
    const uploadPromises = photos.map(async (file, index) => {
      try {
        // Create unique filename: timestamp_filename
        const timestamp = Date.now();
        const filename = `${timestamp}_${index}_${file.name}`;
        const storagePath = `renovation_photos/${currentUser.uid}/${filename}`;

        // Create storage reference
        const storageRef = ref(storage, storagePath);

        // Upload file
        await uploadBytes(storageRef, file);

        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);

        console.log(`Photo uploaded: ${filename} -> ${downloadURL}`);
        return downloadURL;
      } catch (error) {
        console.error(`Error uploading photo ${file.name}:`, error);
        throw new Error(`Failed to upload ${file.name}: ${error.message}`);
      }
    });

    try {
      const photoUrls = await Promise.all(uploadPromises);
      setUploadingPhotos(false);
      return photoUrls;
    } catch (error) {
      setUploadingPhotos(false);
      throw error;
    }
  };

  /**
   * Validate form fields
   * Returns true if valid, false otherwise
   * Sets errors state with validation messages
   */
  const validateForm = () => {
    const newErrors = {};

    // Service Category validation
    if (!formData.serviceCategory.trim()) {
      newErrors.serviceCategory = 'Service category is required';
    }

    // Property validation
    if (!formData.propertyId.trim()) {
      newErrors.propertyId = 'Please select a property';
    }

    // Detailed Description validation (min 20 chars)
    if (!formData.detailedDescription.trim()) {
      newErrors.detailedDescription = 'Detailed description is required';
    } else if (formData.detailedDescription.trim().length < 20) {
      newErrors.detailedDescription = 'Description must be at least 20 characters';
    }

    // Budget validation (must be numeric and > 0)
    if (!formData.budget.trim()) {
      newErrors.budget = 'Budget is required';
    } else {
      const budgetNum = Number(formData.budget);
      if (isNaN(budgetNum) || budgetNum <= 0) {
        newErrors.budget = 'Budget must be a valid positive number';
      }
    }

    // Preferred Date validation
    if (!formData.preferredDate.trim()) {
      newErrors.preferredDate = 'Preferred date is required';
    } else {
      const preferredDate = new Date(formData.preferredDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (preferredDate < today) {
        newErrors.preferredDate = 'Preferred date cannot be in the past';
      }
    }

    // Photos are optional, no validation needed

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   * Validates form, uploads photos if present, creates renovation project in Firestore,
   * shows success message, and navigates to dashboard
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if user is authenticated
    if (!currentUser || !currentUser.uid) {
      toast.error('Please log in to submit a renovation request.');
      navigate('/auth');
      return;
    }

    // Validate form
    if (!validateForm()) {
      toast.error('Please fix the errors in the form.');
      return;
    }

    try {
      setLoading(true);

      // Upload photos if present
      let photoUrls = [];
      if (photos.length > 0) {
        try {
          photoUrls = await uploadPhotos();
          console.log(`Uploaded ${photoUrls.length} photos`);
        } catch (uploadError) {
          console.error('Error uploading photos:', uploadError);
          toast.error('Failed to upload photos. Please try again.');
          setLoading(false);
          return;
        }
      }

      // Build project data object according to Firestore structure
      const projectData = {
        userId: currentUser.uid,
        propertyId: formData.propertyId,
        serviceCategory: formData.serviceCategory,
        detailedDescription: formData.detailedDescription.trim(),
        budget: Number(formData.budget),
        preferredDate: formData.preferredDate,
        status: 'Pending',
        createdAt: serverTimestamp(),
      };

      // Add providerId if provided (optional field)
      if (formData.providerId && formData.providerId.trim()) {
        projectData.providerId = formData.providerId.trim();
      }

      // Add photos array if photos were uploaded
      if (photoUrls.length > 0) {
        projectData.photos = photoUrls;
      }

      // Save to Firestore collection "renovationProjects"
      // Collection will be automatically created if it doesn't exist
      const docRef = await addDoc(collection(db, 'renovationProjects'), projectData);

      console.log('Renovation project created with ID:', docRef.id);
      console.log('Project data:', projectData);

      // Send notifications
      try {
        // Notify user (confirmation)
        await notificationService.sendNotification(
          currentUser.uid,
          'Renovation Request Submitted',
          `Your ${formData.serviceCategory} request has been submitted successfully. We'll notify you when a provider responds.`,
          'service-request',
          '/renovation-dashboard'
        );

        // Notify provider if one was selected
        if (formData.providerId && formData.providerId.trim()) {
          await notificationService.sendNotification(
            formData.providerId,
            'New Renovation Request',
            `You have received a new ${formData.serviceCategory} request. Check your dashboard for details.`,
            'service-request',
            '/renovator-dashboard'
          );
        } else {
          // Notify all approved renovation providers
          const providersQuery = query(
            collection(db, 'renovationProviders'),
            where('isApproved', '==', true)
          );
          const providersSnapshot = await getDocs(providersQuery);
          
          const notificationPromises = providersSnapshot.docs.map((providerDoc) => {
            const providerData = providerDoc.data();
            if (providerData.userId) {
              return notificationService.sendNotification(
                providerData.userId,
                'New Renovation Request Available',
                `A new ${formData.serviceCategory} request is available. Check available projects.`,
                'service-request',
                '/renovator-dashboard'
              );
            }
            return Promise.resolve();
          });
          
          await Promise.allSettled(notificationPromises);
        }
      } catch (notifError) {
        console.error('Error sending notifications:', notifError);
        // Don't fail the request if notifications fail
      }

      toast.success('Renovation request submitted successfully!');

      // Navigate to renovation dashboard
      navigate('/renovation-dashboard');
    } catch (error) {
      console.error('Error submitting renovation request:', error);

      // Handle specific Firestore errors
      if (error.code === 'permission-denied') {
        toast.error('Permission denied. Please check Firestore security rules.');
      } else {
        toast.error(error.message || 'Failed to submit renovation request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while checking auth or fetching properties
  if (authLoading || fetchingProperties) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser || !currentUser.uid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-textSecondary mb-4">Please log in to submit a renovation request.</p>
          <Button onClick={() => navigate('/auth')}>Log In</Button>
        </div>
      </div>
    );
  }

  // Empty state - no properties available
  if (properties.length === 0) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-surface rounded-base shadow-lg p-8 text-center">
            <h1 className="text-4xl font-display font-bold text-textMain mb-4">
              Submit Renovation Request
            </h1>
            <div className="mb-6">
              <p className="text-lg text-textSecondary mb-4">
                Add a property before requesting renovation services.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="primary" onClick={() => navigate('/post-property')}>
                Add Property
              </Button>
              <Button variant="outline" onClick={() => navigate('/properties')}>
                Browse Properties
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-background min-h-screen">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-textMain mb-2">
          Submit Renovation Request
        </h1>
        <p className="text-lg text-textSecondary">
          Fill out the form below to request renovation services for your property.
        </p>
      </div>

      {/* Form Container */}
      <div className="bg-surface rounded-base shadow-xl p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Service Category Field */}
          <div>
            <label
              htmlFor="serviceCategory"
              className="block text-sm font-medium text-textMain mb-2"
            >
              <Wrench className="w-4 h-4 inline mr-1" />
              Service Category <span className="text-error">*</span>
            </label>
            <select
              id="serviceCategory"
              name="serviceCategory"
              value={formData.serviceCategory}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-accent transition-colors ${
                errors.serviceCategory ? 'border-error' : 'border-muted'
              }`}
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

          {/* Property Field */}
          <div>
            <label htmlFor="propertyId" className="block text-sm font-medium text-textMain mb-2">
              <Home className="w-4 h-4 inline mr-1" />
              Property <span className="text-error">*</span>
            </label>
            {fetchingProperties ? (
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-textSecondary">Loading properties...</span>
              </div>
            ) : (
              <>
                <select
                  id="propertyId"
                  name="propertyId"
                  value={formData.propertyId}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-accent transition-colors ${
                    errors.propertyId ? 'border-error' : 'border-muted'
                  }`}
                >
                  <option value="">Select a property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.title || 'Untitled Property'} -{' '}
                      {property.address?.city || 'No city'}
                    </option>
                  ))}
                </select>
                {errors.propertyId && (
                  <p className="mt-1 text-sm text-error">{errors.propertyId}</p>
                )}
              </>
            )}
          </div>

          {/* Detailed Description Field */}
          <div>
            <label
              htmlFor="detailedDescription"
              className="block text-sm font-medium text-textMain mb-2"
            >
              <FileText className="w-4 h-4 inline mr-1" />
              Detailed Description <span className="text-error">*</span>
            </label>
            <textarea
              id="detailedDescription"
              name="detailedDescription"
              value={formData.detailedDescription}
              onChange={handleChange}
              rows={5}
              placeholder="Describe your renovation project in detail (minimum 20 characters)..."
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-accent transition-colors resize-none ${
                errors.detailedDescription ? 'border-error' : 'border-muted'
              }`}
            />
            <p className="mt-1 text-xs text-textSecondary">
              {formData.detailedDescription.length} / 20 characters minimum
            </p>
            {errors.detailedDescription && (
              <p className="mt-1 text-sm text-error">{errors.detailedDescription}</p>
            )}
          </div>

          {/* Budget Field */}
          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-textMain mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Budget (PKR) <span className="text-error">*</span>
            </label>
            <input
              type="number"
              id="budget"
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="Enter your budget"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-accent transition-colors ${
                errors.budget ? 'border-error' : 'border-muted'
              }`}
            />
            {errors.budget && <p className="mt-1 text-sm text-error">{errors.budget}</p>}
          </div>

          {/* Preferred Date Field */}
          <div>
            <label htmlFor="preferredDate" className="block text-sm font-medium text-textMain mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Preferred Date <span className="text-error">*</span>
            </label>
            <input
              type="date"
              id="preferredDate"
              name="preferredDate"
              value={formData.preferredDate}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]} // Prevent past dates
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-accent transition-colors ${
                errors.preferredDate ? 'border-error' : 'border-muted'
              }`}
            />
            {errors.preferredDate && (
              <p className="mt-1 text-sm text-error">{errors.preferredDate}</p>
            )}
          </div>

          {/* Photos Field (Optional) */}
          <div>
            <label htmlFor="photos" className="block text-sm font-medium text-textMain mb-2">
              <ImageIcon className="w-4 h-4 inline mr-1" />
              Photos <span className="text-textSecondary text-xs">(Optional)</span>
            </label>
            <input
              type="file"
              id="photos"
              name="photos"
              accept="image/*"
              multiple
              onChange={handlePhotoChange}
              className="w-full px-4 py-2 border border-muted rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-accent transition-colors"
            />
            <p className="mt-1 text-xs text-textSecondary">Upload multiple images (max 5MB per file)</p>

            {/* Photo Previews */}
            {photoPreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-muted"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-2 right-2 bg-error text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove photo"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Provider ID Info (if provided) */}
          {formData.providerId && (
            <div className="p-4 bg-accent border border-accent rounded-lg">
              <p className="text-sm text-accent">
                <strong>Provider Selected:</strong> A provider has been pre-selected for this
                request.
              </p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex-1"
              disabled={loading || uploadingPhotos}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading || uploadingPhotos}
              disabled={loading || uploadingPhotos || fetchingProperties}
              className="flex-1"
            >
              {uploadingPhotos
                ? 'Uploading Photos...'
                : loading
                  ? 'Submitting...'
                  : 'Submit Request'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RenovationRequestForm;
