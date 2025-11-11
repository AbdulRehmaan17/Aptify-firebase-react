import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import propertyService from '../services/propertyService';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Home, MapPin, DollarSign, Bed, Bath, Square, Upload, CheckCircle } from 'lucide-react';

const PostPropertyPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Get type from query params, default to 'sale'
  const typeFromQuery = searchParams.get('type') || 'sale';
  const isRentalMode = typeFromQuery === 'rent';
  
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
        listingType: formData.type, // Add listingType field for filtering (matches type)
        ownerId: user.uid,
        ownerName: user.displayName || user.email,
        ownerPhone: user.phoneNumber || null,
        price: Number(formData.price),
        bedrooms: Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        areaSqFt: Number(formData.areaSqFt),
      };

      // Log property data for debugging
      console.log('Creating property with data:', {
        type: propertyData.type,
        listingType: propertyData.listingType,
        title: propertyData.title,
        status: propertyData.status || 'pending'
      });

      const propertyId = await propertyService.create(propertyData, images);
      
      console.log('Property created successfully with ID:', propertyId);
      console.log('Property type:', propertyData.type, 'listingType:', propertyData.listingType);

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <Home className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600 mb-6">Please log in to post a property.</p>
          <Button onClick={() => navigate('/auth')} variant="primary">
            Log In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header Section */}
      <section className="bg-white shadow-sm py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-3 text-gray-900">
            {isRentalMode ? 'List Your Property for Rent' : 'List Your Property'}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {isRentalMode 
              ? 'Reach thousands of potential renters. List your rental property today!'
              : 'Reach thousands of potential buyers and renters. List your property today!'
            }
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
            backgroundImage: 'url(https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop)'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/90 to-white/95"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <form onSubmit={handleSubmit} className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-6 sm:p-8 space-y-8 border border-gray-200">
            {/* Basic Information */}
            <div className="space-y-6 border-b border-gray-200 pb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Home className="w-6 h-6 text-yellow-600" />
                </div>
                <h2 className="text-2xl font-display font-bold text-gray-900">Basic Information</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Modern 2BR Apartment in Lahore"
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={5}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors resize-none ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Describe your property in detail..."
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Price (PKR) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors ${
                      errors.price ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="5000000"
                  />
                  {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    disabled={isRentalMode} // Lock to rent if coming from rental services
                    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors ${
                      isRentalMode ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="sale">For Sale</option>
                    <option value="rent">For Rent</option>
                    <option value="renovation">Renovation Service</option>
                  </select>
                  {isRentalMode && (
                    <p className="mt-1 text-sm text-blue-600">
                      Listing type is set to "For Rent" for rental properties
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-6 border-b border-gray-200 pb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <MapPin className="w-6 h-6 text-yellow-600" />
                </div>
                <h2 className="text-2xl font-display font-bold text-gray-900">Address</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address.line1"
                  value={formData.address.line1}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors ${
                    errors['address.line1'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="123 Main Street"
                />
                {errors['address.line1'] && <p className="text-red-500 text-sm mt-1">{errors['address.line1']}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors ${
                      errors['address.city'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Lahore"
                  />
                  {errors['address.city'] && <p className="text-red-500 text-sm mt-1">{errors['address.city']}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors"
                    placeholder="Punjab"
                  />
                </div>
              </div>
            </div>

            {/* Property Details */}
            <div className="space-y-6 border-b border-gray-200 pb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Square className="w-6 h-6 text-yellow-600" />
                </div>
                <h2 className="text-2xl font-display font-bold text-gray-900">Property Details</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Bed className="w-4 h-4 inline mr-1" />
                    Bedrooms <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="bedrooms"
                    value={formData.bedrooms}
                    onChange={handleChange}
                    min="0"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors ${
                      errors.bedrooms ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.bedrooms && <p className="text-red-500 text-sm mt-1">{errors.bedrooms}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Bath className="w-4 h-4 inline mr-1" />
                    Bathrooms <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="bathrooms"
                    value={formData.bathrooms}
                    onChange={handleChange}
                    min="0"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors ${
                      errors.bathrooms ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.bathrooms && <p className="text-red-500 text-sm mt-1">{errors.bathrooms}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Square className="w-4 h-4 inline mr-1" />
                    Area (sqft) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="areaSqFt"
                    value={formData.areaSqFt}
                    onChange={handleChange}
                    min="0"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors ${
                      errors.areaSqFt ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.areaSqFt && <p className="text-red-500 text-sm mt-1">{errors.areaSqFt}</p>}
                </div>
              </div>

              <div className="flex flex-wrap gap-6 p-4 bg-gray-50 rounded-lg">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="furnished"
                    checked={formData.furnished}
                    onChange={handleChange}
                      className="w-5 h-5 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Furnished</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="parking"
                    checked={formData.parking}
                    onChange={handleChange}
                      className="w-5 h-5 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Parking Available</span>
                </label>
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Amenities
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['AC', 'Heating', 'Gym', 'Pool', 'Elevator', 'Security', 'Balcony', 'Play Area'].map((amenity) => (
                    <label key={amenity} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg hover:bg-yellow-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        name="amenities"
                        value={amenity}
                        checked={formData.amenities.includes(amenity)}
                        onChange={handleChange}
                        className="w-4 h-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="space-y-4 border-b border-gray-200 pb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Upload className="w-6 h-6 text-yellow-600" />
                </div>
                <h2 className="text-2xl font-display font-bold text-gray-900">Property Images</h2>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Images (Max 10)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-yellow-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100 cursor-pointer"
                  />
                  {images.length > 0 && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-yellow-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">{images.length} image(s) selected</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500 py-3 text-lg font-semibold"
                loading={loading}
              >
                {loading ? 'Submitting...' : 'Submit Property'}
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
                className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 py-3"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
};

export default PostPropertyPage;

