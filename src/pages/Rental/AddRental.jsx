import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { uploadMultipleImages } from '../../firebase/storageFunctions';
import propertyService from '../../services/propertyService';
import { sendNotification } from '../../utils/notificationHelpers';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { MapPin, DollarSign, Home, FileText, Image as ImageIcon, X, Upload } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import LocationPicker from '../../components/maps/LocationPicker';
import toast from 'react-hot-toast';

const AddRental = () => {
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
    category: 'apartment',
    bedrooms: '',
    bathrooms: '',
    area: '',
    furnished: false,
    parking: false,
    available: true,
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
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [errors, setErrors] = useState({});

  // Load existing property if editing
  useEffect(() => {
    if (isEditMode && id) {
      loadProperty();
    }
  }, [id, isEditMode]);

  const loadProperty = async () => {
    try {
      setLoading(true);
      const property = await propertyService.getById(id, false);
      
      if (property.type !== 'rent') {
        toast.error('This is not a rental property');
        navigate('/rental/my-rentals');
        return;
      }

      if (property.ownerId !== currentUser?.uid) {
        toast.error('You do not have permission to edit this property');
        navigate('/rental/my-rentals');
        return;
      }

      setFormData({
        title: property.title || '',
        description: property.description || '',
        price: property.price?.toString() || '',
        location: property.address?.line1 || property.location || '',
        city: property.address?.city || property.city || '',
        category: property.category || 'apartment',
        bedrooms: property.bedrooms?.toString() || '',
        bathrooms: property.bathrooms?.toString() || '',
        area: property.areaSqFt?.toString() || property.area?.toString() || '',
        furnished: property.furnished || false,
        parking: property.parking || false,
        available: property.available !== false,
      });

      // Load location data if available
      if (property.location) {
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

      // Set existing images as previews
      const existingImages = property.photos || property.images || [];
      if (existingImages.length > 0) {
        setImagePreviews(existingImages);
      }
    } catch (error) {
      console.error('Error loading property:', error);
      toast.error('Failed to load property');
      navigate('/rental/my-rentals');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'apartment', label: 'Apartment' },
    { value: 'house', label: 'House' },
    { value: 'villa', label: 'Villa' },
    { value: 'studio', label: 'Studio' },
    { value: 'condo', label: 'Condo' },
    { value: 'townhouse', label: 'Townhouse' },
  ];

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate files
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

    // Limit total images to 10
    const remainingSlots = 10 - images.length;
    if (validFiles.length > remainingSlots) {
      toast.error(`You can only upload ${remainingSlots} more image(s)`);
      validFiles.splice(remainingSlots);
    }

    setImages((prev) => [...prev, ...validFiles]);

    // Create previews
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    // Check if it's a new image or existing preview
    const existingCount = imagePreviews.filter((img) => typeof img === 'string').length;
    
    if (index < existingCount) {
      // Remove existing image preview
      setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    } else {
      // Remove new image
      const newImageIndex = index - existingCount;
      setImages((prev) => prev.filter((_, i) => i !== newImageIndex));
      setImagePreviews((prev) => prev.filter((_, i) => i !== index));
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

    if (!validateForm()) {
      return;
    }

    if (!currentUser) {
      toast.error('Please log in to add a rental property');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      if (isEditMode) {
        // Update existing property
        let newImageUrls = [];
        
        // Upload new images if any
        if (images.length > 0) {
          toast.loading('Uploading new images...', { id: 'upload' });
          newImageUrls = await uploadMultipleImages(
            images,
            `properties/${currentUser.uid}/${Date.now()}`
          );
          toast.success('New images uploaded successfully', { id: 'upload' });
        }

        // Combine existing and new images
        const existingImages = imagePreviews.filter((img) => typeof img === 'string');
        const allImages = [...existingImages, ...newImageUrls];

        // Prepare update data
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
          available: formData.available,
          photos: allImages,
          coverImage: allImages[0] || null,
        };

        await propertyService.update(id, updateData, images);
        toast.success('Rental property updated successfully!');
        navigate(`/rental/${id}`);
      } else {
        // FIXED: Create new property - images are optional
        let imageUrls = [];
        if (images && images.length > 0) {
          try {
            toast.loading('Uploading images...', { id: 'upload' });
            imageUrls = await uploadMultipleImages(
              images,
              `properties/${currentUser.uid}/${Date.now()}`
            );
            if (imageUrls.length > 0) {
              toast.success('Images uploaded successfully', { id: 'upload' });
            } else {
              toast.dismiss('upload');
            }
          } catch (uploadError) {
            console.error('Error uploading images:', uploadError);
            toast.dismiss('upload');
            // Continue without images - form can still submit
            imageUrls = [];
          }
        } else {
          // No images provided - that's fine, use empty array
          imageUrls = [];
        }

        // Create property data
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
          type: 'rent',
          category: formData.category,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : 0,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : 0,
          areaSqFt: formData.area ? parseFloat(formData.area) : 0,
          furnished: formData.furnished,
          parking: formData.parking,
          available: formData.available,
          status: 'published',
          ownerId: currentUser.uid,
        };

        // Create property (images will be uploaded by propertyService)
        const propertyId = await propertyService.create(propertyData, images);
        
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
              message: `A user posted a rental property: ${formData.title.trim()}`,
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
            title: 'Rental Property Added',
            message: `Your rental property "${formData.title.trim()}" has been added successfully.`,
            type: 'success',
            meta: { propertyId }
          });
        } catch (notifError) {
          console.error('Error sending user notification:', notifError);
        }
        
        toast.success('Rental property added successfully!');
        navigate(`/rental/${propertyId}`);
      }
    } catch (error) {
      console.error('Error adding rental property:', error);
      toast.error(error.message || 'Failed to add rental property');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-textMain">
            {isEditMode ? 'Edit Rental Property' : 'Add Rental Property'}
          </h1>
          <p className="text-textSecondary mt-2">
            {isEditMode ? 'Update your rental property details' : 'List your property for rent'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface rounded-base shadow-md p-6 border border-muted">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-semibold text-textMain mb-4">Basic Information</h2>
              
              <div className="space-y-4">
                <Input
                  label="Property Title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  error={errors.title}
                  placeholder="e.g., Modern 2BR Apartment in Downtown"
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={5}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Price (per month)"
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

                  <Input
                    label="Category"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    required
                  >
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-muted rounded-base focus:border-primary focus:ring-primary"
                    >
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </Input>
                </div>
              </div>
            </div>

            {/* Location with Google Maps */}
            <div>
              <h2 className="text-xl font-semibold text-textMain mb-4">Location</h2>
              <LocationPicker
                location={locationData.lat && locationData.lng ? locationData : null}
                onLocationChange={(location) => {
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
                }}
                required={true}
                error={errors.location}
              />
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
                  placeholder="0"
                  min="0"
                />

                <Input
                  label="Bathrooms"
                  type="number"
                  value={formData.bathrooms}
                  onChange={(e) => handleInputChange('bathrooms', e.target.value)}
                  placeholder="0"
                  min="0"
                />

                <Input
                  label="Area (sq ft)"
                  type="number"
                  value={formData.area}
                  onChange={(e) => handleInputChange('area', e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="mt-4 space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.furnished}
                    onChange={(e) => handleInputChange('furnished', e.target.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary border-muted rounded"
                  />
                  <span className="text-sm text-textMain">Furnished</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.parking}
                    onChange={(e) => handleInputChange('parking', e.target.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary border-muted rounded"
                  />
                  <span className="text-sm text-textMain">Parking Available</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.available}
                    onChange={(e) => handleInputChange('available', e.target.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary border-muted rounded"
                  />
                  <span className="text-sm text-textMain">Available for Rent</span>
                </label>
              </div>
            </div>

            {/* Images */}
            <div>
              <h2 className="text-xl font-semibold text-textMain mb-4">Images</h2>
              
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
                onClick={() => navigate('/rental/my-rentals')}
              >
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                {isEditMode ? 'Update Rental Property' : 'Add Rental Property'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRental;

