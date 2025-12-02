import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getBrands, getCollection, addCollection, updateCollection } from '../firebase/firestore';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';

const AddCollectionForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    brandId: '',
    description: '',
  });
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetching(true);
        const brandsData = await getBrands();
        setBrands(brandsData);

        if (id) {
          const collection = await getCollection(id);
          setFormData({
            name: collection.name || '',
            brandId: collection.brandId || '',
            description: collection.description || '',
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data.');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.brandId) {
      toast.error('Name and brand are required.');
      return;
    }

    setLoading(true);
    try {
      if (id) {
        await updateCollection(id, formData);
        toast.success('Collection updated successfully!');
      } else {
        await addCollection(formData);
        toast.success('Collection added successfully!');
      }
      navigate('/admin/collections');
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error(error.message || 'Failed to save collection.');
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
      <div className="bg-surface shadow-xl rounded-lg p-8">
        <h1 className="text-3xl font-display font-bold text-charcoal mb-6">
          {id ? 'Edit Collection' : 'Add New Collection'}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-charcoal font-inter mb-2">
              Collection Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-muted rounded-lg focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold font-inter"
              placeholder="e.g., Submariner"
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
              className="w-full px-4 py-2 border border-muted rounded-lg focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold font-inter"
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
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-muted rounded-lg focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold font-inter"
              placeholder="Describe the collection..."
              rows="4"
            />
          </div>
          <div className="flex space-x-4">
            <Button
              type="submit"
              className="bg-luxury-gold text-charcoal hover:bg-accent flex-1"
              disabled={loading}
            >
              {loading ? 'Saving...' : id ? 'Update Collection' : 'Add Collection'}
            </Button>
            <Button
              type="button"
              className="bg-muted text-charcoal hover:bg-muted flex-1"
              onClick={() => navigate('/admin/collections')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default AddCollectionForm;
