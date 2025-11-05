import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import propertyService from '../services/propertyService';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';

const PostPropertyPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    type: 'sale', // sale, rent, renovation
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
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else if (name === 'amenities') {
      const amenityList = formData.amenities || [];
      if (checked) {
        setFormData(prev => ({
          ...prev,
          amenities: [...amenityList, value],
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          amenities: amenityList.filter(a => a !== value),
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 10);
    setImages(files);
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

    try {
      setLoading(true);

      const propertyData = {
        ...formData,
        ownerId: user.uid,
        ownerName: user.displayName || user.email,
        ownerPhone: user.phoneNumber || null,
        price: Number(formData.price),
        bedrooms: Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        areaSqFt: Number(formData.areaSqFt),
      };

      const propertyId = await propertyService.create(propertyData, images);

      toast.success('Property submitted successfully!');
      navigate(`/properties/${propertyId}`);
    } catch (error) {
      console.error('Error creating property:', error);
      toast.error(error.message || 'Failed to create property. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to post a property.</p>
          <Button onClick={() => navigate('/auth')}>Log In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-ivory min-h-screen">
      <h1 className="text-4xl font-display font-bold text-charcoal mb-8 text-center">
        List Your Property
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl p-8 space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-charcoal mb-4">Basic Information</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-luxury-gold focus:border-transparent ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Modern 2BR Apartment in Lahore"
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-luxury-gold focus:border-transparent ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Describe your property..."
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (PKR) *
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-luxury-gold focus:border-transparent ${
                  errors.price ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="5000000"
              />
              {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-luxury-gold focus:border-transparent"
              >
                <option value="sale">For Sale</option>
                <option value="rent">For Rent</option>
                <option value="renovation">Renovation Service</option>
              </select>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-charcoal mb-4">Address</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street Address *
            </label>
            <input
              type="text"
              name="address.line1"
              value={formData.address.line1}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-luxury-gold focus:border-transparent ${
                errors['address.line1'] ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="123 Main Street"
            />
            {errors['address.line1'] && <p className="text-red-500 text-sm mt-1">{errors['address.line1']}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City *
              </label>
              <input
                type="text"
                name="address.city"
                value={formData.address.city}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-luxury-gold focus:border-transparent ${
                  errors['address.city'] ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Lahore"
              />
              {errors['address.city'] && <p className="text-red-500 text-sm mt-1">{errors['address.city']}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                name="address.state"
                value={formData.address.state}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-luxury-gold focus:border-transparent"
                placeholder="Punjab"
              />
            </div>
          </div>
        </div>

        {/* Property Details */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-charcoal mb-4">Property Details</h2>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bedrooms *
              </label>
              <input
                type="number"
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleChange}
                min="0"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-luxury-gold focus:border-transparent ${
                  errors.bedrooms ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.bedrooms && <p className="text-red-500 text-sm mt-1">{errors.bedrooms}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bathrooms *
              </label>
              <input
                type="number"
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleChange}
                min="0"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-luxury-gold focus:border-transparent ${
                  errors.bathrooms ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.bathrooms && <p className="text-red-500 text-sm mt-1">{errors.bathrooms}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Area (sqft) *
              </label>
              <input
                type="number"
                name="areaSqFt"
                value={formData.areaSqFt}
                onChange={handleChange}
                min="0"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-luxury-gold focus:border-transparent ${
                  errors.areaSqFt ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.areaSqFt && <p className="text-red-500 text-sm mt-1">{errors.areaSqFt}</p>}
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="furnished"
                checked={formData.furnished}
                onChange={handleChange}
                className="w-4 h-4 text-luxury-gold focus:ring-luxury-gold border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Furnished</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="parking"
                checked={formData.parking}
                onChange={handleChange}
                className="w-4 h-4 text-luxury-gold focus:ring-luxury-gold border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Parking Available</span>
            </label>
          </div>

          {/* Amenities */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amenities
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['AC', 'Heating', 'Gym', 'Pool', 'Elevator', 'Security', 'Balcony', 'Play Area'].map((amenity) => (
                <label key={amenity} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="amenities"
                    value={amenity}
                    checked={formData.amenities.includes(amenity)}
                    onChange={handleChange}
                    className="w-4 h-4 text-luxury-gold focus:ring-luxury-gold border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{amenity}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Property Images (Max 10)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-luxury-gold focus:border-transparent"
          />
          {images.length > 0 && (
            <p className="text-sm text-gray-500 mt-2">{images.length} image(s) selected</p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex gap-4 pt-4">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 bg-luxury-gold text-charcoal hover:bg-yellow-600"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Submitting...
              </>
            ) : (
              'Submit Property'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/properties')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PostPropertyPage;

