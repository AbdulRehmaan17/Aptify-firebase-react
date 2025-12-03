import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, DollarSign, TrendingUp, CheckCircle, ArrowRight, Upload, X } from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { useAuth } from '../context/AuthContext';
import marketplaceService from '../services/marketplaceService';
import notificationService from '../services/notificationService';
import toast from 'react-hot-toast';
import Modal from '../components/common/Modal';

/**
 * SellPage Component
 *
 * Landing page for property sellers.
 * Provides information about selling properties and links to post property form.
 */
const SellPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showListingForm, setShowListingForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'electronics',
    location: '',
    city: '',
    condition: 'new',
  });
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const categories = [
    { value: 'electronics', label: 'Electronics' },
    { value: 'furniture', label: 'Furniture' },
    { value: 'vehicles', label: 'Vehicles' },
    { value: 'clothing', label: 'Clothing & Accessories' },
    { value: 'books', label: 'Books & Media' },
    { value: 'home', label: 'Home & Garden' },
    { value: 'sports', label: 'Sports & Outdoors' },
    { value: 'toys', label: 'Toys & Games' },
    { value: 'other', label: 'Other' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 10);
    setImages(files);
    
    const previews = files.map((file) => {
      if (file instanceof File) {
        return URL.createObjectURL(file);
      }
      return file;
    });
    setImagePreviews(previews);
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImages(newImages);
    setImagePreviews(newPreviews);
    
    if (imagePreviews[index] && imagePreviews[index].startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviews[index]);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.price || Number(formData.price) <= 0) newErrors.price = 'Valid price is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (images.length === 0) newErrors.images = 'At least one image is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to list an item');
      navigate('/auth');
      return;
    }

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      const listingData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: Number(formData.price),
        category: formData.category,
        location: formData.location.trim(),
        city: formData.city.trim(),
        condition: formData.condition,
        sellerId: user.uid,
        sellerName: user.displayName || user.name || user.email,
        sellerEmail: user.email,
        sellerPhone: user.phoneNumber || null,
        status: 'pending', // Admin will approve
      };

      const listingId = await marketplaceService.create(listingData, images);

      // Notify admins
      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const adminsQuery = query(
          collection(db, 'users'),
          where('role', 'in', ['admin', 'superadmin'])
        );
        const adminsSnapshot = await getDocs(adminsQuery);
        const adminPromises = adminsSnapshot.docs.map((adminDoc) =>
          notificationService.sendNotification(
            adminDoc.id,
            'New Marketplace Listing',
            `New marketplace item posted: "${formData.title.trim()}"`,
            'admin',
            `/admin?tab=marketplace&listingId=${listingId}`
          )
        );
        await Promise.all(adminPromises);
      } catch (notifError) {
        console.error('Error notifying admins:', notifError);
      }

      // Notify user
      await notificationService.sendNotification(
        user.uid,
        'Listing Submitted',
        `Your marketplace listing "${formData.title.trim()}" has been submitted and is pending admin approval.`,
        'info',
        '/buy'
      );

      toast.success('Listing submitted successfully!');
      setShowListingForm(false);
      setFormData({
        title: '',
        description: '',
        price: '',
        category: 'electronics',
        location: '',
        city: '',
        condition: 'new',
      });
      setImages([]);
      setImagePreviews([]);
    } catch (error) {
      console.error('Error submitting listing:', error);
      toast.error(error.message || 'Failed to submit listing');
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    'Wide exposure to potential buyers',
    'Professional property listing',
    'High-quality images and descriptions',
    'Easy property management',
    'Direct communication with buyers',
    'Secure transaction process',
  ];

  const steps = [
    {
      number: '1',
      title: 'Create Your Listing',
      description: 'Fill out the property form with all details and upload images.',
    },
    {
      number: '2',
      title: 'Get Verified',
      description: 'Our team reviews and verifies your property listing.',
    },
    {
      number: '3',
      title: 'Go Live',
      description: 'Your property is published and visible to all buyers.',
    },
    {
      number: '4',
      title: 'Connect with Buyers',
      description: 'Receive inquiries and communicate directly with interested buyers.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary to-primaryDark text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">
              Sell Your Property with Aptify
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto">
              Reach thousands of potential buyers and sell your property quickly and easily
            </p>
            {user ? (
              <Button size="lg" variant="secondary" onClick={() => setShowListingForm(true)}>
                List Your Item
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/auth">Sign Up to List Property</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-surface text-primary hover:bg-primary/10"
                  asChild
                >
                  <Link to="/auth">Sign In</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-textMain mb-4">
              Why Sell with Aptify?
            </h2>
            <p className="text-lg text-textSecondary max-w-2xl mx-auto">
              Get the best exposure for your property and connect with serious buyers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-surface rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
              >
                <CheckCircle className="w-6 h-6 text-primary mb-3" />
                <p className="text-lg font-medium text-textMain">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-16 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-textMain mb-4">
              How It Works
            </h2>
            <p className="text-lg text-textSecondary max-w-2xl mx-auto">
              Sell your property in four simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div
                key={index}
                className="bg-background rounded-lg p-6 text-center hover:shadow-lg transition-shadow duration-300"
              >
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-textMain mb-2">{step.title}</h3>
                <p className="text-textSecondary">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Ready to Sell Your Property?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of property owners who trust Aptify to sell their properties
          </p>
          {user ? (
            <Button size="lg" variant="secondary" onClick={() => setShowListingForm(true)}>
              List Your Item Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/auth">Sign Up Free</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-surface text-primary hover:bg-primary/10"
                asChild
              >
                <Link to="/contact">Contact Us</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Listing Form Modal */}
      <Modal
        isOpen={showListingForm}
        onClose={() => {
          setShowListingForm(false);
          setFormData({
            title: '',
            description: '',
            price: '',
            category: 'electronics',
            location: '',
            city: '',
            condition: 'new',
          });
          setImages([]);
          setImagePreviews([]);
          setErrors({});
        }}
        title="List Your Item"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Item Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g., iPhone 13 Pro Max 256GB"
            error={errors.title}
            required
          />

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              Description <span className="text-error">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className={`w-full px-4 py-2 border rounded-base focus:ring-2 focus:ring-primary focus:border-primary resize-none ${
                errors.description ? 'border-error' : 'border-muted'
              }`}
              placeholder="Describe your item in detail..."
              required
            />
            {errors.description && (
              <p className="mt-1 text-sm text-error">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Price (PKR)"
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="0"
              error={errors.price}
              required
              min="0"
            />

            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">
                Category <span className="text-error">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Street address"
              error={errors.location}
              required
            />

            <Input
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="City name"
              error={errors.city}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              Condition <span className="text-error">*</span>
            </label>
            <select
              name="condition"
              value={formData.condition}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary"
              required
            >
              <option value="new">New</option>
              <option value="used">Used - Like New</option>
              <option value="refurbished">Refurbished</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              Images <span className="text-error">*</span>
            </label>
            <div className="border-2 border-dashed border-muted rounded-base p-4">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="w-full text-sm text-textSecondary file:mr-4 file:py-2 file:px-4 file:rounded-base file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              />
              {errors.images && (
                <p className="mt-1 text-sm text-error">{errors.images}</p>
              )}
            </div>

            {imagePreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
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
                      className="absolute top-2 right-2 p-1 bg-error text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowListingForm(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading} disabled={loading} className="flex-1">
              Submit Listing
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SellPage;
