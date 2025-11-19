import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getBrand, updateBrand } from '../firebase/firestore';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';

const EditBrandForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logoUrl: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetching(true);
        const brand = await getBrand(id);
        setFormData({
          name: brand.name || '',
          description: brand.description || '',
          logoUrl: brand.logoUrl || '',
        });
      } catch (error) {
        console.error('Error fetching brand:', error);
        toast.error('Failed to load brand.');
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImageChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const uploadImage = async () => {
    if (!imageFile) return formData.logoUrl;
    try {
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('upload_preset', 'brand_logos'); // Set in Cloudinary
      const response = await fetch('https://api.cloudinary.com/v1_1/dba3tysex/image/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload logo.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Brand name is required.');
      return;
    }

    setLoading(true);
    try {
      const logoUrl = await uploadImage();
      const brandData = { ...formData, logoUrl };
      await updateBrand(id, brandData);
      toast.success('Brand updated successfully!');
      navigate('/admin/brands');
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error(error.message || 'Failed to update brand.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-ivory"
    >
      <div className="bg-white shadow-xl rounded-xl p-8">
        <h1 className="text-3xl font-display font-bold text-charcoal mb-6">Edit Brand</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-charcoal font-inter mb-2">
              Brand Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold font-inter"
              placeholder="e.g., Rolex"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal font-inter mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold font-inter"
              placeholder="Describe the brand..."
              rows="4"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal font-inter mb-2">
              Brand Logo
            </label>
            {formData.logoUrl && (
              <img
                src={formData.logoUrl}
                alt="Preview"
                className="w-32 h-32 object-contain rounded-lg mb-4"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg font-inter"
            />
          </div>
          <div className="flex space-x-4">
            <Button
              type="submit"
              className="bg-luxury-gold text-charcoal hover:bg-yellow-600 flex-1"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Update Brand'}
            </Button>
            <Button
              type="button"
              className="bg-gray-200 text-charcoal hover:bg-gray-300 flex-1"
              onClick={() => navigate('/admin/brands')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default EditBrandForm;
