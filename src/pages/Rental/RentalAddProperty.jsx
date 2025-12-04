import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import propertyService from '../../services/propertyService';
import notificationService from '../../services/notificationService';
import { uploadImage } from '../../firebase/storageFunctions';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Home, MapPin, DollarSign, Bed, Bath, Square, Upload, X, Calendar } from 'lucide-react';

/**
 * RentalAddProperty Component
 * Form for listing a property for rent
 */
const RentalAddProperty = () => {
  const navigate = useNavigate();
  const { user, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    propertyType: '',
    location: '',
    city: '',
    state: '',
    price: '',
    area: '',
    bedrooms: '',
    bathrooms: '',
    amenities: [],
    contactPreference: 'phone',
    availability: 'immediate',
  });
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [amenityInput, setAmenityInput] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!user) {
      toast.error('Please sign in to list a property');
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 10) {
      toast.error('Maximum 10 images allowed');
      return;
    }

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });

    setImages((prev) => [...prev, ...files]);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const addAmenity = () => {
    if (amenityInput.trim() && !formData.amenities.includes(amenityInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        amenities: [...prev.amenities, amenityInput.trim()],
      }));
      setAmenityInput('');
    }
  };

  const removeAmenity = (amenity) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.filter((a) => a !== amenity),
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.propertyType) newErrors.propertyType = 'Property type is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.price) newErrors.price = 'Price is required';
    if (!formData.area) newErrors.area = 'Area is required';
    if (images.length === 0) newErrors.images = 'At least one image is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      // Upload images
      setUploadingImages(true);
      const imageUrls = [];
      for (const image of images) {
        const url = await uploadImage(image, `rental_properties/${user.uid}/`);
        imageUrls.push(url);
      }
      setUploadingImages(false);

      // Prepare property data
      const propertyData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: 'rent',
        listingType: 'rent',
        price: Number(formData.price),
        ownerId: user.uid,
        ownerName: currentUser?.displayName || user.email,
        ownerPhone: currentUser?.phoneNumber || null,
        address: {
          line1: formData.location.trim(),
          line2: '',
          city: formData.city.trim(),
          state: formData.state.trim() || null,
          country: 'Pakistan',
          postalCode: null,
        },
        location: formData.location.trim(),
        bedrooms: formData.bedrooms ? Number(formData.bedrooms) : 0,
        bathrooms: formData.bathrooms ? Number(formData.bathrooms) : 0,
        areaSqFt: Number(formData.area),
        amenities: formData.amenities,
        photos: imageUrls,
        coverImage: imageUrls[0] || null,
        status: 'available',
        contactPreference: formData.contactPreference,
        availability: formData.availability,
        createdAt: new Date(),
      };

      // Create property using propertyService
      const propertyId = await propertyService.create(propertyData, images);

      // Notify admin
      try {
        await notificationService.notifyAdminNewProperty(
          propertyId,
          propertyData.title,
          user.uid
        );
      } catch (notifError) {
        console.error('Error creating notification:', notifError);
      }

      // Notify user
      try {
        await notificationService.sendNotification(
          user.uid,
          'Rental Property Listed Successfully',
          `Your rental property "${propertyData.title}" has been submitted and is now available.`,
          'status-update',
          `/rental/property/${propertyId}`
        );
      } catch (notifError) {
        console.error('Error sending user notification:', notifError);
      }

      toast.success('Rental property listed successfully!');
      navigate('/dashboard?section=rental-listings');
    } catch (error) {
      console.error('Error listing rental property:', error);
      toast.error(error.message || 'Failed to list rental property');
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-textMain mb-2">
            List Property for Rent
          </h1>
          <p className="text-textSecondary">
            Fill out the form below to list your property for rent
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface rounded-lg shadow-md p-6 border border-muted space-y-6">
          {/* Title */}
          <Input
            label="Property Title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            error={errors.title}
            required
            leftIcon={<Home className="w-4 h-4" />}
            placeholder="e.g., Spacious 3-Bedroom Apartment in Downtown"
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              Description <span className="text-error">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={5}
              className="w-full px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary resize-none"
              placeholder="Describe your property in detail..."
              required
            />
            {errors.description && (
              <p className="mt-1 text-sm text-error">{errors.description}</p>
            )}
          </div>

          {/* Property Type */}
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              Property Type <span className="text-error">*</span>
            </label>
            <select
              name="propertyType"
              value={formData.propertyType}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary"
              required
            >
              <option value="">Select property type</option>
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="villa">Villa</option>
              <option value="studio">Studio</option>
              <option value="penthouse">Penthouse</option>
              <option value="commercial">Commercial</option>
            </select>
            {errors.propertyType && (
              <p className="mt-1 text-sm text-error">{errors.propertyType}</p>
            )}
          </div>

          {/* Location */}
          <Input
            label="Address/Location"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            error={errors.location}
            required
            leftIcon={<MapPin className="w-4 h-4" />}
            placeholder="Street address"
          />

          {/* City */}
          <Input
            label="City"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            error={errors.city}
            required
            placeholder="City name"
          />

          {/* State */}
          <Input
            label="State/Province"
            name="state"
            value={formData.state}
            onChange={handleInputChange}
            placeholder="State or province (optional)"
          />

          {/* Price */}
          <Input
            label="Price per Month (PKR)"
            name="price"
            type="number"
            value={formData.price}
            onChange={handleInputChange}
            error={errors.price}
            required
            leftIcon={<DollarSign className="w-4 h-4" />}
            placeholder="e.g., 50000"
            min="0"
          />

          {/* Area */}
          <Input
            label="Area (Square Feet)"
            name="area"
            type="number"
            value={formData.area}
            onChange={handleInputChange}
            error={errors.area}
            required
            leftIcon={<Square className="w-4 h-4" />}
            placeholder="e.g., 1200"
            min="0"
          />

          {/* Bedrooms & Bathrooms */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Bedrooms"
              name="bedrooms"
              type="number"
              value={formData.bedrooms}
              onChange={handleInputChange}
              leftIcon={<Bed className="w-4 h-4" />}
              placeholder="0"
              min="0"
            />
            <Input
              label="Bathrooms"
              name="bathrooms"
              type="number"
              value={formData.bathrooms}
              onChange={handleInputChange}
              leftIcon={<Bath className="w-4 h-4" />}
              placeholder="0"
              min="0"
            />
          </div>

          {/* Images Upload */}
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              Property Images <span className="text-error">*</span> (Max 10 images, 5MB each)
            </label>
            <div className="border-2 border-dashed border-muted rounded-base p-6 text-center">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-8 h-8 text-textSecondary mb-2" />
                <span className="text-textSecondary">Click to upload images</span>
              </label>
            </div>
            {errors.images && (
              <p className="mt-1 text-sm text-error">{errors.images}</p>
            )}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-4 gap-4 mt-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-base"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-error text-white rounded-full p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Amenities */}
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              Amenities
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={amenityInput}
                onChange={(e) => setAmenityInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addAmenity();
                  }
                }}
                placeholder="Add amenity (e.g., Parking, AC, WiFi)"
                className="flex-1 px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <Button type="button" variant="outline" onClick={addAmenity}>
                Add
              </Button>
            </div>
            {formData.amenities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    {amenity}
                    <button
                      type="button"
                      onClick={() => removeAmenity(amenity)}
                      className="hover:text-error"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Contact Preference */}
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              Contact Preference
            </label>
            <select
              name="contactPreference"
              value={formData.contactPreference}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="phone">Phone</option>
              <option value="email">Email</option>
              <option value="both">Both</option>
            </select>
          </div>

          {/* Availability */}
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              Availability
            </label>
            <select
              name="availability"
              value={formData.availability}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="immediate">Immediate</option>
              <option value="within-month">Within a Month</option>
              <option value="within-3-months">Within 3 Months</option>
              <option value="flexible">Flexible</option>
            </select>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/rental')}
              disabled={loading || uploadingImages}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading || uploadingImages}
              disabled={loading || uploadingImages}
              className="flex-1"
            >
              {uploadingImages ? 'Uploading Images...' : loading ? 'Submitting...' : 'List Property'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RentalAddProperty;

