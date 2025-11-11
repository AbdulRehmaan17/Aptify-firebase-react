import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Home, Calendar, DollarSign, FileText, Image as ImageIcon, AlertCircle, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';

/**
 * RentalRequestForm Component
 * 
 * Allows tenants to submit rental inquiries or requests to property owners.
 * Fetches available properties from Firestore and creates a new rental request.
 * Supports landlordId from query params or route state (optional).
 * Handles optional photo uploads to Firebase Storage.
 * Automatically creates "rentalRequests" collection if it doesn't exist.
 */
const RentalRequestForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user: contextUser, loading: authLoading } = useAuth();

  // Get currentUser from Firebase auth
  const currentUser = auth.currentUser || contextUser;

  // Form state
  const [formData, setFormData] = useState({
    propertyId: '',
    rentalDuration: '',
    budget: '',
    moveInDate: '',
    message: '',
    landlordId: '', // Will be set from query params, route state, or property ownerId
  });

  // UI state
  const [properties, setProperties] = useState([]);
  const [photos, setPhotos] = useState([]); // Array of File objects
  const [photoPreviews, setPhotoPreviews] = useState([]); // Array of preview URLs
  const [loading, setLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [fetchingProperties, setFetchingProperties] = useState(true);
  const [errors, setErrors] = useState({});

  // Rental duration options
  const rentalDurationOptions = [
    { value: '3 months', label: '3 months' },
    { value: '6 months', label: '6 months' },
    { value: '1 year', label: '1 year' },
    { value: '2 years', label: '2 years' },
    { value: 'Flexible', label: 'Flexible' },
  ];

  /**
   * Get landlordId from query params or route state
   * Priority: query params > route state > empty string
   */
  useEffect(() => {
    const landlordIdFromQuery = searchParams.get('landlordId');
    const landlordIdFromState = location.state?.landlordId;

    const landlordId = landlordIdFromQuery || landlordIdFromState || '';

    if (landlordId) {
      setFormData(prev => ({
        ...prev,
        landlordId: landlordId,
      }));
      console.log('Landlord ID set from:', landlordIdFromQuery ? 'query params' : 'route state', landlordId);
    }
  }, [searchParams, location.state]);

  /**
   * Fetch available properties from Firestore
   * Queries "properties" collection for properties available for rent
   * Filters by status 'published' and type 'rent' (or similar)
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
        console.log('Fetching available properties for rental...');

        // Query properties collection for available rental properties
        // Filter by status 'published' and type 'rent' or 'rental'
        const propertiesQuery = query(
          collection(db, 'properties'),
          where('status', '==', 'published')
        );

        const snapshot = await getDocs(propertiesQuery);
        const propertiesList = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
          // Filter client-side for rental properties (type includes 'rent' or 'rental')
          .filter(property => {
            const type = property.type?.toLowerCase() || '';
            return type.includes('rent') || type === 'rental';
          });

        setProperties(propertiesList);
        console.log(`Fetched ${propertiesList.length} available rental properties`);
      } catch (error) {
        console.error('Error fetching properties:', error);
        toast.error('Failed to load available properties. Please try again.');
        setProperties([]);
      } finally {
        setFetchingProperties(false);
      }
    };

    fetchProperties();
  }, [currentUser, authLoading]);

  /**
   * Update landlordId when property is selected
   * Fetches the property's ownerId and sets it as landlordId
   */
  useEffect(() => {
    const updateLandlordId = async () => {
      if (!formData.propertyId) {
        return;
      }

      try {
        const propertyRef = doc(db, 'properties', formData.propertyId);
        const propertySnap = await getDoc(propertyRef);

        if (propertySnap.exists()) {
          const propertyData = propertySnap.data();
          const ownerId = propertyData.ownerId;

          if (ownerId) {
            setFormData(prev => ({
              ...prev,
              landlordId: ownerId,
            }));
            console.log('Landlord ID updated from property:', ownerId);
          }
        }
      } catch (error) {
        console.error('Error fetching property owner:', error);
      }
    };

    updateLandlordId();
  }, [formData.propertyId]);

  /**
   * Handle form field changes
   * Updates formData state and clears field-specific errors
   */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
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

    files.forEach(file => {
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
      const newPreviews = validFiles.map(file => URL.createObjectURL(file));
      
      setPhotos(prev => [...prev, ...validFiles]);
      setPhotoPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  /**
   * Remove a photo from the selection
   */
  const handleRemovePhoto = (index) => {
    // Revoke preview URL to free memory
    URL.revokeObjectURL(photoPreviews[index]);
    
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Upload photos to Firebase Storage
   * Uploads to /rental_photos/{userId}/{timestamp}_{filename}
   * @returns {Promise<Array<string>>} - Array of download URLs
   */
  const uploadPhotos = async () => {
    if (photos.length === 0) {
      return [];
    }

    setUploadingPhotos(true);
    const uploadPromises = photos.map(async (file, index) => {
      try {
        // Create unique filename: timestamp_index_filename
        const timestamp = Date.now();
        const filename = `${timestamp}_${index}_${file.name}`;
        const storagePath = `rental_photos/${currentUser.uid}/${filename}`;
        
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

    // Property validation
    if (!formData.propertyId.trim()) {
      newErrors.propertyId = 'Please select a property';
    }

    // Rental Duration validation
    if (!formData.rentalDuration.trim()) {
      newErrors.rentalDuration = 'Rental duration is required';
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

    // Move-in Date validation (must be in the future)
    if (!formData.moveInDate.trim()) {
      newErrors.moveInDate = 'Move-in date is required';
    } else {
      const moveInDate = new Date(formData.moveInDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (moveInDate < today) {
        newErrors.moveInDate = 'Move-in date must be in the future';
      }
    }

    // Message validation (min 20 chars)
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 20) {
      newErrors.message = 'Message must be at least 20 characters';
    }

    // Photos are optional, no validation needed

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   * Validates form, uploads photos if present, creates rental request in Firestore,
   * shows success message, and navigates to dashboard
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if user is authenticated
    if (!currentUser || !currentUser.uid) {
      toast.error('Please log in to submit a rental request.');
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

      // Build rental request data object according to Firestore structure
      const rentalRequestData = {
        userId: currentUser.uid,
        propertyId: formData.propertyId,
        rentalDuration: formData.rentalDuration,
        budget: Number(formData.budget),
        moveInDate: formData.moveInDate,
        message: formData.message.trim(),
        status: 'Pending',
        createdAt: serverTimestamp(),
      };

      // Add landlordId if provided (optional field)
      if (formData.landlordId && formData.landlordId.trim()) {
        rentalRequestData.landlordId = formData.landlordId.trim();
      }

      // Add photos if uploaded (optional field)
      if (photoUrls.length > 0) {
        rentalRequestData.photos = photoUrls;
      }

      // Add document to Firestore "rentalRequests" collection
      const docRef = await addDoc(collection(db, 'rentalRequests'), rentalRequestData);
      console.log('Rental request created with ID:', docRef.id);

      // Show success message
      toast.success('Rental request submitted successfully!');

      // Navigate to rental dashboard
      navigate('/rental-dashboard');
    } catch (error) {
      console.error('Error submitting rental request:', error);
      toast.error('Failed to submit rental request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Loading state while fetching properties
  if (fetchingProperties) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading available properties...</p>
        </div>
      </div>
    );
  }

  // Empty state - no properties available
  if (properties.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-4">
              No Properties Available
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              There are currently no properties available for rent. Please check back later or browse our property listings.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="primary"
                onClick={() => navigate('/properties')}
                className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
              >
                Browse Properties
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
              >
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-2">
            Submit Rental Request
          </h1>
          <p className="text-lg text-gray-600">
            Fill out the form below to submit a rental inquiry to property owners.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 sm:p-8 space-y-6">
          {/* Property Selection */}
          <div>
            <label htmlFor="propertyId" className="block text-sm font-medium text-gray-700 mb-2">
              Select Property <span className="text-red-500">*</span>
            </label>
            <select
              id="propertyId"
              name="propertyId"
              value={formData.propertyId}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors ${
                errors.propertyId ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={loading}
            >
              <option value="">-- Select a property --</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.title || property.name || 'Untitled Property'} - {property.address?.city || 'Location not specified'}
                </option>
              ))}
            </select>
            {errors.propertyId && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.propertyId}
              </p>
            )}
          </div>

          {/* Rental Duration */}
          <div>
            <label htmlFor="rentalDuration" className="block text-sm font-medium text-gray-700 mb-2">
              Rental Duration <span className="text-red-500">*</span>
            </label>
            <select
              id="rentalDuration"
              name="rentalDuration"
              value={formData.rentalDuration}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors ${
                errors.rentalDuration ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={loading}
            >
              <option value="">-- Select duration --</option>
              {rentalDurationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.rentalDuration && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.rentalDuration}
              </p>
            )}
          </div>

          {/* Budget */}
          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
              Budget (PKR) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                id="budget"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                min="0"
                step="1000"
                placeholder="Enter your budget"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors ${
                  errors.budget ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              />
            </div>
            {errors.budget && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.budget}
              </p>
            )}
          </div>

          {/* Move-in Date */}
          <div>
            <label htmlFor="moveInDate" className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Move-in Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                id="moveInDate"
                name="moveInDate"
                value={formData.moveInDate}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors ${
                  errors.moveInDate ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              />
            </div>
            {errors.moveInDate && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.moveInDate}
              </p>
            )}
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={5}
              placeholder="Tell the property owner about yourself and your rental needs (minimum 20 characters)..."
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors resize-none ${
                errors.message ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            <p className="mt-1 text-sm text-gray-500">
              {formData.message.length} / 20 characters minimum
            </p>
            {errors.message && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.message}
              </p>
            )}
          </div>

          {/* Photos (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos (Optional)
            </label>
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="photos"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImageIcon className="w-10 h-10 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB each</p>
                  </div>
                  <input
                    id="photos"
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoChange}
                    disabled={loading}
                  />
                </label>
              </div>

              {/* Photo Previews */}
              {photoPreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={loading}
                      >
                        <AlertCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              type="submit"
              disabled={loading || uploadingPhotos}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500 py-3 text-lg font-semibold"
              loading={loading || uploadingPhotos}
            >
              {uploadingPhotos ? 'Uploading Photos...' : loading ? 'Submitting...' : 'Submit Rental Request'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/properties')}
              className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 py-3"
              disabled={loading || uploadingPhotos}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RentalRequestForm;


