import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getProducts, getBrands, getCollections, deleteProduct } from '../firebase/firestore';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';

const ManageWatches = () => {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsData, brandsData, collectionsData] = await Promise.all([
          getProducts(),
          getBrands(),
          getCollections(),
        ]);
        setProducts(productsData);
        setBrands(brandsData);
        setCollections(collectionsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load watches.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this watch?')) {
      try {
        await deleteProduct(id);
        setProducts(products.filter((product) => product.id !== id));
        toast.success('Watch deleted successfully.');
      } catch (error) {
        console.error('Error deleting watch:', error);
        toast.error('Failed to delete watch.');
      }
    }
  };

  const getBrandName = (brandId) => {
    const brand = brands.find((b) => b.id === brandId);
    return brand ? brand.name : 'No Brand';
  };

  const getCollectionName = (collectionId) => {
    const collection = collections.find((c) => c.id === collectionId);
    return collection ? collection.name : 'No Collection';
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
          <h1 className="text-3xl font-display font-bold text-charcoal">Manage Watches</h1>
          <p className="text-lg text-textSecondary font-inter">Curate your luxury watch inventory</p>
        </div>
        <Link to="/admin/watches/add">
          <Button className="bg-luxury-gold text-charcoal hover:bg-accent">
            Add New Watch
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
                Collection
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-charcoal font-inter">
                  {product.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-charcoal font-inter">
                  {getBrandName(product.brandId)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-charcoal font-inter">
                  {getCollectionName(product.collectionId)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-charcoal font-inter">
                  ${product.price.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-charcoal font-inter">
                  {product.stock}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link
                    to={`/admin/watches/edit/${product.id}`}
                    className="text-accent hover:text-accent mr-4 font-inter"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(product.id)}
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

export default ManageWatches;
