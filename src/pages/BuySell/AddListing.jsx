import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { uploadMultipleImages, deleteImage } from '../../firebase/storageFunctions';
import propertyService from '../../services/propertyService';
import { sendNotification } from '../../utils/notificationHelpers';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { MapPin, DollarSign, Home, Bed, Bath, Square, Car, CheckCircle, XCircle, Upload, X, ArrowLeft } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import LocationPicker from '../../components/maps/LocationPicker';
import toast from 'react-hot-toast';

const AddListing = () => {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    location: '',
    city: '',
    category: 'house',
    bedrooms: '',
    bathrooms: '',
    area: '',
    furnished: false,
    parking: false,
    available: true,
    listingType: 'sell', // 'buy' or 'sell'
  });
  const [locationData, setLocationData] = useState({
    lat: null,
    lng: null,
    address: '',
    city: '',
    state: '',
    country: 'Pakistan',
    postalCode: '',
  });
  const [images, setImages] = useState([]); // New images to upload
  const [imagePreviews, setImagePreviews] = useState([]); // All image URLs/previews
  const [errors, setErrors] = useState({});

  const categories = [
    { value: 'house', label: 'House' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'villa', label: 'Villa' },
    { value: 'plot', label: 'Plot/Land' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'townhouse', label: 'Townhouse' },
  ];

  // Load existing property if editing
  useEffect(() => {
    if (isEditMode && id) {
      loadProperty();
    }
  }, [id, isEditMode, currentUser]);

  const loadProperty = async () => {
    try {
      setLoading(true);
      const property = await propertyService.getById(id, false);

      if (property.type !== 'buy' && property.listingType !== 'buy' && property.type !== 'sell' && property.listingType !== 'sell') {
        toast.error('This is not a buy/sell property');
        navigate('/buy-sell/marketplace');
        return;
      }

      if (property.ownerId !== currentUser?.uid) {
        toast.error('You do not have permission to edit this listing');
        navigate('/buy-sell/my-listings');
        return;
      }

      setFormData({
        title: property.title || '',
        description: property.description || '',
        price: property.price?.toString() || '',
        location: property.address?.line1 || '',
        city: property.address?.city || '',
        category: property.category || 'house',
        bedrooms: property.bedrooms?.toString() || '',
        bathrooms: property.bathrooms?.toString() || '',
        area: property.areaSqFt?.toString() || '',
        furnished: property.furnished || false,
        parking: property.parking || false,
        available: property.status === 'active',
        listingType: property.listingType || property.type || 'sell',
      });

      // Load location data if available
      if (property.location) {
        // Handle GeoPoint or object format
        const lat = property.location.latitude || property.location.lat || null;
        const lng = property.location.longitude || property.location.lng || null;
        
        if (lat && lng) {
          setLocationData({
            lat: lat,
            lng: lng,
            address: property.address?.line1 || '',
            city: property.address?.city || '',
            state: property.address?.state || '',
            country: property.address?.country || 'Pakistan',
            postalCode: property.address?.postalCode || '',
          });
        }
      }

      if (property.photos && property.photos.length > 0) {
        setImagePreviews(property.photos); // Existing image URLs
      }
    } catch (error) {
      console.error('Error loading property:', error);
      toast.error('Failed to load property');
      navigate('/buy-sell/my-listings');
    } finally {
      setLoading(false);
    }
  };

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

    const currentTotalImages = imagePreviews.length + images.length;
    const remainingSlots = 10 - currentTotalImages;
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

  const removeImage = async (indexToRemove) => {
    const imageToRemove = imagePreviews[indexToRemove];

    // If it's an existing image (string URL), attempt to delete from storage
    if (typeof imageToRemove === 'string' && isEditMode) {
      try {
        await deleteImage(imageToRemove);
        toast.success('Image deleted from storage.');
      } catch (error) {
        console.error('Error deleting image from storage:', error);
        toast.error('Failed to delete image from storage.');
      }
    }

    setImagePreviews((prev) => prev.filter((_, i) => i !== indexToRemove));

    const existingImageCount = imagePreviews.filter((img) => typeof img === 'string').length;
    if (indexToRemove >= existingImageCount) {
      const newImageIndex = indexToRemove - existingImageCount;
      setImages((prev) => prev.filter((_, i) => i !== newImageIndex));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Valid price is required';
    }

    // Validate location - allow manual address entry if Maps API is not available
    // Use consistent validation logic
    let hasApiKey = false;
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (apiKey && typeof apiKey === 'string') {
        const trimmed = apiKey.trim();
        hasApiKey = trimmed !== '' && trimmed !== 'YOUR_GOOGLE_MAPS_API_KEY' && trimmed.length >= 10;
      }
    } catch (e) {
      hasApiKey = false;
    }
    
    if (hasApiKey) {
      // If API key is configured, require coordinates
      if (!locationData.lat || !locationData.lng) {
        newErrors.location = 'Please select a location on the map';
      }
      if (!locationData.address || !locationData.address.trim()) {
        newErrors.location = 'Please search and select an address';
      }
    } else {
      // If no API key, allow manual address entry
      if (!formData.location || !formData.location.trim()) {
        newErrors.location = 'Please enter a property address';
      }
    }

    // FIXED: Images are now optional - removed required validation
    // Images can be empty, null, or undefined - form will still submit successfully

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // OPTIMIZED: Prevent duplicate submissions by checking loading state
    if (loading) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    if (!currentUser) {
      toast.error('Please log in to add a listing');
      navigate('/login');
      return;
    }

    setLoading(true);
    console.time('submit');
    try {
      if (isEditMode) {
        // Edit mode: Upload new images if any, then update
        let newImageUrls = [];
        if (images && images.length > 0) {
          try {
            toast.loading('Uploading new images...', { id: 'upload' });
            // OPTIMIZED: Upload images in parallel
            newImageUrls = await uploadMultipleImages(
              images,
              `properties/${currentUser.uid}/${Date.now()}`
            );
            if (newImageUrls.length > 0) {
              toast.success('New images uploaded successfully', { id: 'upload' });
            } else {
              toast.dismiss('upload');
            }
          } catch (uploadError) {
            console.error('Error uploading images:', uploadError);
            toast.dismiss('upload');
            toast.error('Failed to upload some images. Continuing with update...');
            newImageUrls = [];
          }
        }

        const existingImagesKept = (imagePreviews || []).filter((img) => typeof img === 'string');
        const finalImageUrls = [...existingImagesKept, ...newImageUrls];

        const updateData = {
          title: formData.title.trim(),
          description: formData.description.trim(),
          price: parseFloat(formData.price),
          address: {
            line1: locationData.address || formData.location.trim(),
            city: locationData.city || formData.city.trim(),
            state: locationData.state || null,
            country: locationData.country || 'Pakistan',
            postalCode: locationData.postalCode || null,
          },
          location: locationData.lat && locationData.lng ? {
            lat: locationData.lat,
            lng: locationData.lng,
            address: locationData.address,
          } : null,
          category: formData.category,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : 0,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : 0,
          areaSqFt: formData.area ? parseFloat(formData.area) : 0,
          furnished: formData.furnished,
          parking: formData.parking,
          status: 'published', // FIXED: Keep status as 'published' to match browse query filters
          photos: finalImageUrls,
          coverImage: finalImageUrls[0] || null,
          listingType: formData.listingType,
        };

        // CRITICAL PATH: Only await the Firestore write
        await propertyService.update(id, updateData);
        console.timeEnd('submit');
        
        // OPTIMIZED: Release UI immediately after Firestore write
        setLoading(false);
        toast.success('Listing updated successfully!');
        
        // OPTIMIZED: Non-blocking navigation with setTimeout
        setTimeout(() => {
          navigate(`/buy-sell/listing/${id}`);
        }, 300);
      } else {
        // OPTIMIZED: Create new listing - pass images to propertyService.create()
        // Images will be uploaded in parallel BEFORE document creation (single Firestore write)
        const propertyData = {
          title: formData.title.trim(),
          description: formData.description.trim(),
          price: parseFloat(formData.price),
          address: {
            line1: locationData.address || formData.location.trim(),
            city: locationData.city || formData.city.trim(),
            state: locationData.state || null,
            country: locationData.country || 'Pakistan',
            postalCode: locationData.postalCode || null,
          },
          location: locationData.lat && locationData.lng ? {
            lat: locationData.lat,
            lng: locationData.lng,
            address: locationData.address,
          } : null,
          type: formData.listingType,
          listingType: formData.listingType,
          category: formData.category,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : 0,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : 0,
          areaSqFt: formData.area ? parseFloat(formData.area) : 0,
          furnished: formData.furnished,
          parking: formData.parking,
          status: 'published', // FIXED: Set to 'published' to match browse query filters
          ownerId: currentUser.uid,
          ownerName: currentUser.displayName || currentUser.email,
        };

        // CRITICAL PATH: Only await the Firestore write
        // propertyService.create() will upload images in parallel BEFORE creating document
        const propertyId = await propertyService.create(propertyData, images);
        console.timeEnd('submit');
        
        // OPTIMIZED: Release UI immediately after Firestore write succeeds
        setLoading(false);
        toast.success('Property listed successfully!', {
          duration: 3000,
          icon: '✅',
        });
        
        // OPTIMIZED: Non-blocking navigation with setTimeout
        setTimeout(() => {
          navigate(`/buy-sell/listing/${propertyId}`);
        }, 300);
        
        // FIRE-AND-FORGET: Notify admin about new property (non-critical)
        // Do NOT await - let it run in background
        (async () => {
          try {
            const adminQuery = query(
              collection(db, 'users'),
              where('role', '==', 'admin')
            );
            const adminSnapshot = await getDocs(adminQuery);
            
            adminSnapshot.docs.forEach((adminDoc) => {
              sendNotification({
                userId: adminDoc.id,
                title: 'Property Posted',
                message: `A user posted a property: ${formData.title.trim()}`,
                type: 'system',
                meta: { propertyId, propertyTitle: formData.title.trim() }
              }).catch((notifError) => {
                console.error('Error notifying admin:', notifError);
              });
            });
          } catch (notifError) {
            console.error('Error fetching admins for notification:', notifError);
          }
        })();
        
        // FIRE-AND-FORGET: Notify user (confirmation) - non-critical
        sendNotification({
          userId: currentUser.uid,
          title: 'Listing Created',
          message: `Your listing "${formData.title.trim()}" has been created successfully.`,
          type: 'success',
          meta: { propertyId }
        }).catch((notifError) => {
          console.error('Error sending user notification:', notifError);
        });
      }
    } catch (error) {
      console.error('Error saving listing:', error);
      // OPTIMIZED: Show error popup instead of silent failure
      toast.error(error.message || 'Failed to save listing. Please try again.');
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(isEditMode ? '/buy-sell/my-listings' : '/buy-sell/marketplace')}
          className="mb-6 flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {isEditMode ? 'Back to My Listings' : 'Back to Marketplace'}
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-textMain">
            {isEditMode ? 'Edit Listing' : 'Add New Listing'}
          </h1>
          <p className="text-textSecondary mt-2">
            {isEditMode ? 'Update your property listing' : 'List your property for sale or purchase'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface rounded-base shadow-md p-6 border border-muted">
          <div className="space-y-6">
            {/* Listing Type */}
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">
                Listing Type <span className="text-error">*</span>
              </label>
              <select
                value={formData.listingType}
                onChange={(e) => handleInputChange('listingType', e.target.value)}
                className="w-full px-3 py-2 border border-muted rounded-base focus:border-primary focus:ring-primary transition-colors"
                required
                disabled={isEditMode}
              >
                <option value="sell">For Sale</option>
                <option value="buy">Want to Buy</option>
              </select>
            </div>

            {/* Title */}
            <Input
              label="Property Title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              error={errors.title}
              leftIcon={<Home className="w-4 h-4" />}
              placeholder="e.g., Beautiful 3-bedroom house in downtown"
              required
            />

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">
                Description <span className="text-error">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={6}
                className={`w-full px-3 py-2 border rounded-base focus:border-primary focus:ring-primary transition-colors ${
                  errors.description ? 'border-error' : 'border-muted'
                }`}
                placeholder="Describe your property in detail..."
                required
              />
              {errors.description && (
                <p className="mt-1 text-sm text-error">{errors.description}</p>
              )}
            </div>

            {/* Price and Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Price (USD)"
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                error={errors.price}
                leftIcon={<DollarSign className="w-4 h-4" />}
                placeholder="0.00"
                required
                min="0"
                step="0.01"
              />

              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">
                  Category <span className="text-error">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-muted rounded-base focus:border-primary focus:ring-primary transition-colors"
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location with Google Maps */}
            <div>
              <h2 className="text-xl font-semibold text-textMain mb-4">Location</h2>
              <div className="border border-muted rounded-lg p-4">
                <LocationPicker
                  location={locationData.lat && locationData.lng ? locationData : null}
                  onLocationChange={(location) => {
                    if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
                      setLocationData(location);
                      // Update form data for backward compatibility
                      setFormData((prev) => ({
                        ...prev,
                        location: location.address || prev.location,
                        city: location.city || prev.city,
                      }));
                      // Clear location error
                      if (errors.location) {
                        setErrors((prev) => ({ ...prev, location: '' }));
                      }
                    }
                  }}
                  required={true}
                  error={errors.location}
                />
              </div>
            </div>

            {/* Property Details */}
            <div>
              <h2 className="text-xl font-semibold text-textMain mb-4">Property Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Bedrooms"
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => handleInputChange('bedrooms', e.target.value)}
                  leftIcon={<Bed className="w-4 h-4" />}
                  placeholder="0"
                  min="0"
                />

                <Input
                  label="Bathrooms"
                  type="number"
                  value={formData.bathrooms}
                  onChange={(e) => handleInputChange('bathrooms', e.target.value)}
                  leftIcon={<Bath className="w-4 h-4" />}
                  placeholder="0"
                  min="0"
                />

                <Input
                  label="Area (sq ft)"
                  type="number"
                  value={formData.area}
                  onChange={(e) => handleInputChange('area', e.target.value)}
                  leftIcon={<Square className="w-4 h-4" />}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            {/* Features */}
            <div>
              <h2 className="text-xl font-semibold text-textMain mb-4">Features</h2>
              <div className="space-y-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.furnished}
                    onChange={(e) => handleInputChange('furnished', e.target.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary border-muted rounded"
                  />
                  <span className="text-textMain">Furnished</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.parking}
                    onChange={(e) => handleInputChange('parking', e.target.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary border-muted rounded"
                  />
                  <span className="text-textMain">Parking Available</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.available}
                    onChange={(e) => handleInputChange('available', e.target.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary border-muted rounded"
                  />
                  <span className="text-textMain">Available</span>
                </label>
              </div>
            </div>

            {/* Images */}
            <div>
              <h2 className="text-xl font-semibold text-textMain mb-4">
                Images <span className="text-error">*</span>
              </h2>
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
                  {errors.images && (
                    <p className="mt-1 text-sm text-error">{errors.images}</p>
                  )}
                </div>

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-48 object-cover rounded-base"
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
                onClick={() => navigate(isEditMode ? '/buy-sell/my-listings' : '/buy-sell/marketplace')}
              >
                Cancel
              </Button>
              <Button type="submit" loading={loading} size="lg">
                {isEditMode ? 'Update Listing' : 'Create Listing'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddListing;

