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

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (imagePreviews.length === 0) {
      newErrors.images = 'At least one image is required';
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
      toast.error('Please log in to add a listing');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      let finalImageUrls = [];

      if (isEditMode) {
        // Upload new images if any
        let newImageUrls = [];
        if (images.length > 0) {
          toast.loading('Uploading new images...', { id: 'upload' });
          newImageUrls = await uploadMultipleImages(
            images,
            `properties/${currentUser.uid}/${Date.now()}`
          );
          toast.success('New images uploaded successfully', { id: 'upload' });
        }

        const existingImagesKept = imagePreviews.filter((img) => typeof img === 'string');
        finalImageUrls = [...existingImagesKept, ...newImageUrls];

        const updateData = {
          title: formData.title.trim(),
          description: formData.description.trim(),
          price: parseFloat(formData.price),
          address: {
            line1: formData.location.trim(),
            city: formData.city.trim(),
            country: 'Pakistan',
          },
          category: formData.category,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : 0,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : 0,
          areaSqFt: formData.area ? parseFloat(formData.area) : 0,
          furnished: formData.furnished,
          parking: formData.parking,
          status: formData.available ? 'active' : 'inactive',
          photos: finalImageUrls,
          coverImage: finalImageUrls[0] || null,
          listingType: formData.listingType,
        };

        await propertyService.update(id, updateData);
        toast.success('Listing updated successfully!');
        navigate(`/buy-sell/listing/${id}`);
      } else {
        // Create new listing
        if (images.length > 0) {
          toast.loading('Uploading images...', { id: 'upload' });
          finalImageUrls = await uploadMultipleImages(
            images,
            `properties/${currentUser.uid}/${Date.now()}`
          );
          toast.success('Images uploaded successfully', { id: 'upload' });
        }

        const propertyData = {
          title: formData.title.trim(),
          description: formData.description.trim(),
          price: parseFloat(formData.price),
          address: {
            line1: formData.location.trim(),
            city: formData.city.trim(),
            country: 'Pakistan',
          },
          type: formData.listingType,
          listingType: formData.listingType,
          category: formData.category,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : 0,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : 0,
          areaSqFt: formData.area ? parseFloat(formData.area) : 0,
          furnished: formData.furnished,
          parking: formData.parking,
          status: formData.available ? 'active' : 'inactive',
          photos: finalImageUrls,
          coverImage: finalImageUrls[0] || null,
          ownerId: currentUser.uid,
          ownerName: currentUser.displayName || currentUser.email,
        };

        const propertyId = await propertyService.create(propertyData);
        
        // Notify admin about new property
        try {
          const adminQuery = query(
            collection(db, 'users'),
            where('role', '==', 'admin')
          );
          const adminSnapshot = await getDocs(adminQuery);
          
          const notificationPromises = adminSnapshot.docs.map((adminDoc) => {
            return sendNotification({
              userId: adminDoc.id,
              title: 'Property Posted',
              message: `A user posted a property: ${formData.title.trim()}`,
              type: 'system',
              meta: { propertyId, propertyTitle: formData.title.trim() }
            });
          });
          
          await Promise.all(notificationPromises);
        } catch (notifError) {
          console.error('Error notifying admin:', notifError);
        }
        
        // Notify user (confirmation)
        try {
          await sendNotification({
            userId: currentUser.uid,
            title: 'Listing Created',
            message: `Your listing "${formData.title.trim()}" has been created successfully.`,
            type: 'success',
            meta: { propertyId }
          });
        } catch (notifError) {
          console.error('Error sending user notification:', notifError);
        }
        
        toast.success('Listing created successfully!');
        navigate(`/buy-sell/listing/${propertyId}`);
      }
    } catch (error) {
      console.error('Error saving listing:', error);
      toast.error(error.message || 'Failed to save listing');
    } finally {
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

            {/* Location */}
            <div>
              <h2 className="text-xl font-semibold text-textMain mb-4">Location</h2>
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

