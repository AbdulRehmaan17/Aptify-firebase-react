import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import propertyService from '../services/propertyService';
import notificationService from '../services/notificationService';
import useSubmitForm from '../hooks/useSubmitForm';
import { useSubmitSuccess } from '../hooks/useNotifyAndRedirect';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import { Home, MapPin, DollarSign, Bed, Bath, Square, Upload, CheckCircle, X } from 'lucide-react';

const PostPropertyPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [createdPropertyId, setCreatedPropertyId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingProperty, setLoadingProperty] = useState(false);
  
  // Standardized success handler
  const handleSubmitSuccess = useSubmitSuccess(
    'Property submitted successfully!',
    '/account',
    2000
  );

  // Use standardized submit hook (only for create mode, edit mode uses direct update)
  const {
    handleSubmit: handleSubmitForm,
    confirmSubmit,
    cancelSubmit,
    loading,
    showConfirm,
    setShowConfirm,
    showSuccess,
    setShowSuccess,
  } = useSubmitForm(null, {
    submitFunction: async (data, user) => {
      // Extract images from data if present
      const { images: formImages, ...formDataWithoutImages } = data;
      const imagesToUse = formImages || images;

      const propertyData = {
        ...formDataWithoutImages,
        listingType: formDataWithoutImages.type,
        ownerId: user.uid,
        ownerName: user.displayName || user.email,
        ownerPhone: user.phoneNumber || null,
        price: Number(formDataWithoutImages.price),
        bedrooms: Number(formDataWithoutImages.bedrooms),
        bathrooms: Number(formDataWithoutImages.bathrooms),
        areaSqFt: Number(formDataWithoutImages.areaSqFt),
      };

      const propertyId = await propertyService.create(propertyData, imagesToUse);

      // Notify admin about new property
      try {
        await notificationService.notifyAdminNewProperty(
          propertyId,
          propertyData.title,
          user.uid
        );
      } catch (notifError) {
        console.error('Error creating notification:', notifError);
      }

      // Notify user (confirmation)
      try {
        await notificationService.sendNotification(
          user.uid,
          'Property Listed Successfully',
          `Your property "${propertyData.title}" has been submitted and is pending admin approval.`,
          'status-update',
          `/properties/${propertyId}`
        );
      } catch (notifError) {
        console.error('Error sending user notification:', notifError);
      }

      setCreatedPropertyId(propertyId);
      
      // Use standardized success handler
      handleSubmitSuccess();
      
      return propertyId;
    },
    successMessage: 'Property submitted successfully!',
    notificationTitle: 'Property Listed Successfully',
    notificationMessage: 'Your property has been submitted and is pending admin approval.',
    notificationType: 'status-update',
    redirectPath: null, // Handled by useSubmitSuccess
  });

  // Get type from query params, default to 'sale'
  const typeFromQuery = searchParams.get('type') || 'sale';
  const isRentalMode = typeFromQuery === 'rent';
  const isBuySellMode = typeFromQuery === 'sale' || !searchParams.get('type'); // Buy/sell mode when type=sale or no type param
  const editId = searchParams.get('edit');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    type: typeFromQuery, // sale, rent, renovation - set from query params
    address: {
      line1: '',
      city: '',
      state: '',
      country: 'Pakistan',
      postalCode: '',
    },
    bedrooms: '',
    bathrooms: '',
    areaSqFt: '',
    furnished: false,
    parking: false,
    amenities: [],
  });
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [errors, setErrors] = useState({});

  // Ensure type is 'sale' when in buy/sell mode
  useEffect(() => {
    if (isBuySellMode && formData.type !== 'sale') {
      setFormData((prev) => ({ ...prev, type: 'sale' }));
    }
  }, [isBuySellMode, formData.type]);

  // Load property data if in edit mode
  useEffect(() => {
    const loadPropertyForEdit = async () => {
      if (!editId || !user) return;

      try {
        setLoadingProperty(true);
        setIsEditMode(true);
        const propertyData = await propertyService.getById(editId, false);

        // Check if user owns this property
        if (propertyData.ownerId !== user.uid) {
          toast.error('You do not have permission to edit this property');
          navigate('/properties');
          return;
        }

        // Populate form with existing data
        setFormData({
          title: propertyData.title || '',
          description: propertyData.description || '',
          price: propertyData.price?.toString() || '',
          type: propertyData.type || 'sale',
          address: {
            line1: propertyData.address?.line1 || '',
            city: propertyData.address?.city || '',
            state: propertyData.address?.state || '',
            country: propertyData.address?.country || 'Pakistan',
            postalCode: propertyData.address?.postalCode || '',
          },
          bedrooms: propertyData.bedrooms?.toString() || '',
          bathrooms: propertyData.bathrooms?.toString() || '',
          areaSqFt: propertyData.areaSqFt?.toString() || '',
          furnished: propertyData.furnished || false,
          parking: propertyData.parking || false,
          amenities: propertyData.amenities || [],
        });
        
        // Load existing images as previews
        if (propertyData.photos && propertyData.photos.length > 0) {
          setImagePreviews(propertyData.photos);
        }
      } catch (error) {
        console.error('Error loading property for edit:', error);
        toast.error('Failed to load property data');
        navigate('/properties');
      } finally {
        setLoadingProperty(false);
      }
    };

    loadPropertyForEdit();
  }, [editId, user, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else if (name === 'amenities') {
      const amenityList = formData.amenities || [];
      if (checked) {
        setFormData((prev) => ({
          ...prev,
          amenities: [...amenityList, value],
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          amenities: amenityList.filter((a) => a !== value),
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 10);
    setImages(files);
    
    // Create previews
    const previews = files.map((file) => {
      if (file instanceof File) {
        return URL.createObjectURL(file);
      }
      return file; // If it's already a URL string
    });
    setImagePreviews(previews);
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImages(newImages);
    setImagePreviews(newPreviews);
    
    // Revoke object URL to free memory
    if (imagePreviews[index] && imagePreviews[index].startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviews[index]);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.price || Number(formData.price) <= 0) {
      newErrors.price = 'Valid price is required';
    }

    if (!formData.address.line1.trim()) {
      newErrors['address.line1'] = 'Address is required';
    }

    if (!formData.address.city.trim()) {
      newErrors['address.city'] = 'City is required';
    }

    if (!formData.bedrooms || Number(formData.bedrooms) < 0) {
      newErrors.bedrooms = 'Valid number of bedrooms is required';
    }

    if (!formData.bathrooms || Number(formData.bathrooms) < 0) {
      newErrors.bathrooms = 'Valid number of bathrooms is required';
    }

    if (!formData.areaSqFt || Number(formData.areaSqFt) <= 0) {
      newErrors.areaSqFt = 'Valid area is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please log in to post a property.');
      navigate('/auth');
      return;
    }

    if (!validateForm()) {
      toast.error('Please fix the errors in the form.');
      return;
    }

    // Handle edit mode separately (no confirmation modal for edits)
    if (isEditMode && editId) {
      try {
        const propertyData = {
          ...formData,
          listingType: formData.type,
          ownerId: user.uid,
          ownerName: user.displayName || user.email,
          ownerPhone: user.phoneNumber || null,
          price: Number(formData.price),
          bedrooms: Number(formData.bedrooms),
          bathrooms: Number(formData.bathrooms),
          areaSqFt: Number(formData.areaSqFt),
        };

        await propertyService.update(editId, propertyData, images);
        toast.success('Property updated successfully!');
        navigate('/account');
      } catch (error) {
        console.error('Error updating property:', error);
        toast.error(error.message || 'Failed to update property. Please try again.');
      }
      return;
    }

    // For new properties, use the hook with confirmation
    handleSubmitForm({ ...formData, images }, e);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <Home className="w-16 h-16 mx-auto text-muted mb-4" />
          <h2 className="text-2xl font-bold text-textMain mb-2">Authentication Required</h2>
          <p className="text-textSecondary mb-6">Please log in to post a property.</p>
          <Button onClick={() => navigate('/auth')} variant="primary">
            Log In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Simple Header Section */}
      <section className="bg-surface shadow-sm py-8 border-b border-muted">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-3 text-textMain">
              {isEditMode
                ? 'Edit Property'
                : isRentalMode
                  ? 'List Your Property for Rent'
                  : isBuySellMode
                    ? 'List Your Property for Sale'
                    : 'List Your Property'}
            </h1>
            <p className="text-lg text-textSecondary max-w-2xl mx-auto">
              {isRentalMode
                ? 'Reach thousands of potential renters. List your rental property today!'
                : isBuySellMode
                  ? 'Reach thousands of potential buyers. List your property for sale today!'
                : 'Reach thousands of potential buyers and renters. List your property today!'}
            </p>
          </div>
        </div>
      </section>

      {/* Form Section with Background Image */}
      <section className="relative py-12 md:py-16 min-h-screen">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
          style={{
            backgroundImage:
              'url(https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/90 to-white/95"></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <form
            onSubmit={handleSubmit}
            className="bg-surface/95 backdrop-blur-sm rounded-base shadow-lg p-6 sm:p-8 space-y-8 border border-muted"
          >
            {/* Basic Information */}
            <div className="space-y-6 border-b border-muted pb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-accent/10 rounded-base">
                  <Home className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-2xl font-display font-bold text-textMain">Basic Information</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">
                  Property Title <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-accent transition-colors ${
                    errors.title ? 'border-error' : 'border-muted'
                  }`}
                  placeholder="e.g., Modern 2BR Apartment in Lahore"
                />
                {errors.title && <p className="text-error text-sm mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">
                  Description <span className="text-error">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={5}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-accent transition-colors resize-none ${
                    errors.description ? 'border-error' : 'border-muted'
                  }`}
                  placeholder="Describe your property in detail..."
                />
                {errors.description && (
                  <p className="text-error text-sm mt-1">{errors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Price (PKR) <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-accent transition-colors ${
                      errors.price ? 'border-error' : 'border-muted'
                    }`}
                    placeholder="5000000"
                  />
                  {errors.price && <p className="text-error text-sm mt-1">{errors.price}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-2">
                    Property Type <span className="text-error">*</span>
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    disabled={isRentalMode || isBuySellMode} // Lock to rent if coming from rental services, or to sale if coming from buy/sell
                    className={`w-full px-4 py-3 border border-muted rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-accent transition-colors ${
                      isRentalMode || isBuySellMode ? 'bg-muted cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="sale">For Sale</option>
                    {!isBuySellMode && <option value="rent">For Rent</option>}
                    {!isBuySellMode && <option value="renovation">Renovation Service</option>}
                  </select>
                  {isRentalMode && (
                    <p className="mt-1 text-sm text-primary">
                      Listing type is set to "For Rent" for rental properties
                    </p>
                  )}
                  {isBuySellMode && !isRentalMode && (
                    <p className="mt-1 text-sm text-primary">
                      Listing type is set to "For Sale" for buy/sell properties
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-6 border-b border-muted pb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-accent rounded-lg">
                  <MapPin className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-2xl font-display font-bold text-textMain">Address</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">
                  Street Address <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  name="address.line1"
                  value={formData.address.line1}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-accent transition-colors ${
                    errors['address.line1'] ? 'border-error' : 'border-muted'
                  }`}
                  placeholder="123 Main Street"
                />
                {errors['address.line1'] && (
                  <p className="text-error text-sm mt-1">{errors['address.line1']}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-2">
                    City <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-accent transition-colors ${
                      errors['address.city'] ? 'border-error' : 'border-muted'
                    }`}
                    placeholder="Lahore"
                  />
                  {errors['address.city'] && (
                    <p className="text-error text-sm mt-1">{errors['address.city']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-2">State</label>
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-muted rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-accent transition-colors"
                    placeholder="Punjab"
                  />
                </div>
              </div>
            </div>

            {/* Property Details */}
            <div className="space-y-6 border-b border-muted pb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-accent rounded-lg">
                  <Square className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-2xl font-display font-bold text-textMain">Property Details</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-2">
                    <Bed className="w-4 h-4 inline mr-1" />
                    Bedrooms <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    name="bedrooms"
                    value={formData.bedrooms}
                    onChange={handleChange}
                    min="0"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-accent transition-colors ${
                      errors.bedrooms ? 'border-error' : 'border-muted'
                    }`}
                  />
                  {errors.bedrooms && (
                    <p className="text-error text-sm mt-1">{errors.bedrooms}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-2">
                    <Bath className="w-4 h-4 inline mr-1" />
                    Bathrooms <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    name="bathrooms"
                    value={formData.bathrooms}
                    onChange={handleChange}
                    min="0"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-accent transition-colors ${
                      errors.bathrooms ? 'border-error' : 'border-muted'
                    }`}
                  />
                  {errors.bathrooms && (
                    <p className="text-error text-sm mt-1">{errors.bathrooms}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-2">
                    <Square className="w-4 h-4 inline mr-1" />
                    Area (sqft) <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    name="areaSqFt"
                    value={formData.areaSqFt}
                    onChange={handleChange}
                    min="0"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-accent transition-colors ${
                      errors.areaSqFt ? 'border-error' : 'border-muted'
                    }`}
                  />
                  {errors.areaSqFt && (
                    <p className="text-error text-sm mt-1">{errors.areaSqFt}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-6 p-4 bg-background rounded-lg">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="furnished"
                    checked={formData.furnished}
                    onChange={handleChange}
                    className="w-5 h-5 text-accent focus:ring-accent border-muted rounded"
                  />
                  <span className="text-sm font-medium text-textSecondary">Furnished</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="parking"
                    checked={formData.parking}
                    onChange={handleChange}
                    className="w-5 h-5 text-accent focus:ring-accent border-muted rounded"
                  />
                  <span className="text-sm font-medium text-textSecondary">Parking Available</span>
                </label>
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-3">Amenities</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    'AC',
                    'Heating',
                    'Gym',
                    'Pool',
                    'Elevator',
                    'Security',
                    'Balcony',
                    'Play Area',
                  ].map((amenity) => (
                    <label
                      key={amenity}
                      className="flex items-center space-x-2 p-2 bg-background rounded-base hover:bg-accent/10 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        name="amenities"
                        value={amenity}
                        checked={formData.amenities.includes(amenity)}
                        onChange={handleChange}
                        className="w-4 h-4 text-accent focus:ring-accent border-muted rounded"
                      />
                      <span className="text-sm text-textSecondary">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="space-y-4 border-b border-muted pb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-accent rounded-lg">
                  <Upload className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-2xl font-display font-bold text-textMain">Property Images</h2>
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">
                  Upload Images (Max 10)
                </label>
                <div className="border-2 border-dashed border-muted rounded-lg p-6 hover:border-accent transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="w-full text-sm text-textSecondary file:mr-4 file:py-2 file:px-4 file:rounded-base file:border-0 file:text-sm file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer"
                  />
                  {images.length > 0 && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-accent">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">{images.length} image(s) selected</span>
                    </div>
                  )}
                </div>
                
                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden border-2 border-muted">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 p-1 bg-error text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error/90"
                          aria-label="Remove image"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                type="submit"
                disabled={loading || loadingProperty}
                className="flex-1 bg-primary hover:bg-primaryDark text-white border-primary py-3 text-lg font-semibold"
                loading={loading || loadingProperty}
              >
                {loading || loadingProperty
                  ? isEditMode
                    ? 'Updating...'
                    : 'Submitting...'
                  : isEditMode
                    ? 'Update Property'
                    : 'Submit Property'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // Navigate back based on where user came from
                  if (isRentalMode) {
                    navigate('/browse-rentals');
                  } else {
                    navigate('/properties');
                  }
                }}
                className="border-primary text-primary hover:bg-primary/10 py-3"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirm}
        onClose={cancelSubmit}
        title="Confirm Property Submission"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-textSecondary">
            Are you sure you want to submit this property? It will be reviewed by our admin team before being published.
          </p>
          <div className="bg-background p-4 rounded-lg">
            <p className="text-sm text-textSecondary">
              <strong>Title:</strong> {formData.title}
            </p>
            <p className="text-sm text-textSecondary">
              <strong>Type:</strong> {formData.type}
            </p>
            <p className="text-sm text-textSecondary">
              <strong>Price:</strong> {new Intl.NumberFormat('en-PK', {
                style: 'currency',
                currency: 'PKR',
              }).format(formData.price)}
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={cancelSubmit} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={confirmSubmit} loading={loading} disabled={loading}>
              Confirm & Submit
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccess}
        onClose={() => {}}
        title="Property Submitted!"
        size="md"
      >
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-primary" />
            </div>
          </div>
          <p className="text-textSecondary">
            Your property has been submitted and is pending admin approval. You will be notified once it is approved.
          </p>
          <p className="text-sm text-textSecondary">
            Redirecting to your account...
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default PostPropertyPage;
