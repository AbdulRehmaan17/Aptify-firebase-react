import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getBrands, getCollections, getProduct, updateProduct } from '../firebase/firestore';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';

const EditWatchForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    brandId: '',
    collectionId: '',
    price: '',
    stock: '',
    description: '',
    imageUrl: '',
  });
  const [brands, setBrands] = useState([]);
  const [collections, setCollections] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetching(true);
        const [brandsData, collectionsData, product] = await Promise.all([
          getBrands(),
          getCollections(),
          getProduct(id),
        ]);
        setBrands(brandsData);
        setCollections(collectionsData);
        setFormData({
          name: product.name || '',
          brandId: product.brandId || '',
          collectionId: product.collectionId || '',
          price: product.price || '',
          stock: product.stock || '',
          description: product.description || '',
          imageUrl: product.imageUrl || '',
        });
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load watch data.');
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
    if (!imageFile) return formData.imageUrl;
    try {
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('upload_preset', 'watch_images'); // Set in Cloudinary
      const response = await fetch('https://api.cloudinary.com/v1_1/dba3tysex/image/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.name ||
      !formData.brandId ||
      !formData.collectionId ||
      !formData.price ||
      !formData.stock
    ) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const imageUrl = await uploadImage();
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        imageUrl,
      };
      await updateProduct(id, productData);
      toast.success('Watch updated successfully!');
      navigate('/admin/watches');
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error(error.message || 'Failed to update watch.');
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
        <h1 className="text-3xl font-display font-bold text-charcoal mb-6">Edit Watch</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-charcoal font-inter mb-2">
              Watch Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold font-inter"
              placeholder="e.g., Submariner Date"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal font-inter mb-2">
              Brand *
            </label>
            <select
              name="brandId"
              value={formData.brandId}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold font-inter"
              required
            >
              <option value="">Select a brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal font-inter mb-2">
              Collection *
            </label>
            <select
              name="collectionId"
              value={formData.collectionId}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold font-inter"
              required
            >
              <option value="">Select a collection</option>
              {collections
                .filter((c) => !formData.brandId || c.brandId === formData.brandId)
                .map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal font-inter mb-2">
              Price (USD) *
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold font-inter"
              placeholder="e.g., 9999.99"
              step="0.01"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal font-inter mb-2">
              Stock Quantity *
            </label>
            <input
              type="number"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold font-inter"
              placeholder="e.g., 10"
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
              placeholder="Describe the watch..."
              rows="4"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal font-inter mb-2">
              Watch Image
            </label>
            {formData.imageUrl && (
              <img
                src={formData.imageUrl}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-lg mb-4"
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
              {loading ? 'Saving...' : 'Update Watch'}
            </Button>
            <Button
              type="button"
              className="bg-gray-200 text-charcoal hover:bg-gray-300 flex-1"
              onClick={() => navigate('/admin/watches')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default EditWatchForm;
