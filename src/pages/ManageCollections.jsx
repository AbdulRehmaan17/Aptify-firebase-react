import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getCollections, getBrands, deleteCollection } from '../firebase/firestore';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';

const ManageCollections = () => {
  const [collections, setCollections] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [collectionsData, brandsData] = await Promise.all([getCollections(), getBrands()]);
        setCollections(collectionsData);
        setBrands(brandsData);
      } catch (error) {
        console.error('Error fetching collections:', error);
        toast.error('Failed to load collections.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this collection?')) {
      try {
        await deleteCollection(id);
        setCollections(collections.filter((collection) => collection.id !== id));
        toast.success('Collection deleted successfully.');
      } catch (error) {
        console.error('Error deleting collection:', error);
        toast.error('Failed to delete collection.');
      }
    }
  };

  const getBrandName = (brandId) => {
    const brand = brands.find((b) => b.id === brandId);
    return brand ? brand.name : 'No Brand';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-ivory"
    >
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-charcoal">Manage Collections</h1>
          <p className="text-lg text-textSecondary font-inter">Organize your watch collections</p>
        </div>
        <Link to="/admin/collections/add">
          <Button className="bg-luxury-gold text-charcoal hover:bg-accent">
            Add New Collection
          </Button>
        </Link>
      </div>
      <div className="bg-surface shadow-xl rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-luxury-gold bg-opacity-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider">
                Brand
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {collections.map((collection) => (
              <tr key={collection.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-charcoal font-inter">
                  {collection.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-charcoal font-inter">
                  {getBrandName(collection.brandId)}
                </td>
                <td className="px-6 py-4 text-sm text-textSecondary font-inter">
                  {collection.description || 'No description'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link
                    to={`/admin/collections/edit/${collection.id}`}
                    className="text-accent hover:text-accent mr-4 font-inter"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(collection.id)}
                    className="text-error hover:text-error font-inter"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default ManageCollections;
