import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getBrands, deleteBrand } from '../firebase/firestore';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';

const ManageBrands = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const brandsData = await getBrands();
        setBrands(brandsData);
      } catch (error) {
        console.error('Error fetching brands:', error);
        toast.error('Failed to load brands.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this brand?')) {
      try {
        await deleteBrand(id);
        setBrands(brands.filter((brand) => brand.id !== id));
        toast.success('Brand deleted successfully.');
      } catch (error) {
        console.error('Error deleting brand:', error);
        toast.error('Failed to delete brand.');
      }
    }
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
          <h1 className="text-3xl font-display font-bold text-charcoal">Manage Brands</h1>
          <p className="text-lg text-textSecondary font-inter">Curate your luxury watch brands</p>
        </div>
        <Link to="/admin/brands/add">
          <Button className="bg-luxury-gold text-charcoal hover:bg-accent">
            Add New Brand
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
                Logo
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
            {brands.map((brand) => (
              <tr key={brand.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-charcoal font-inter">
                  {brand.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-charcoal">
                  {brand.logoUrl ? (
                    <img
                      src={brand.logoUrl}
                      alt={brand.name}
                      className="h-10 w-auto object-contain"
                    />
                  ) : (
                    'No Logo'
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-textSecondary font-inter">
                  {brand.description || 'No description'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link
                    to={`/admin/brands/edit/${brand.id}`}
                    className="text-accent hover:text-accent mr-4 font-inter"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(brand.id)}
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

export default ManageBrands;
