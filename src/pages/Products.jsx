import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Grid, List, SortAsc } from 'lucide-react';
import { getProducts, getCategories } from '../firebase/firestore';
import ProductCard from '../components/product/ProductCard';
import ProductFilters from '../components/product/ProductFilters';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    category: [],
    brand: [],
    priceRange: [0, 50000],
    rating: 0,
    inStock: false,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const productsData = await getProducts();
        const categoriesData = await getCategories();

        // Validate and normalize products
        const normalizedProducts = productsData.map((product) => ({
          ...product,
          imageUrl: product.imageUrl,
        }));

        setProducts(normalizedProducts);
        setCategories(categoriesData.map((cat) => cat.name));

        // Extract unique brands from products
        const uniqueBrands = [...new Set(normalizedProducts.map((product) => product.brand))];
        setBrands(uniqueBrands);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load products. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters, sortBy]);

  const buildFirestoreFilters = () => {
    const firestoreFilters = {};

    if (filters.category.length > 0) {
      firestoreFilters.category = filters.category[0]; // Firestore 'in' queries are limited
    }

    if (filters.brand.length > 0) {
      firestoreFilters.brand = filters.brand[0];
    }

    if (filters.priceRange[1] < 50000) {
      firestoreFilters.maxPrice = filters.priceRange[1];
    }

    if (filters.inStock) {
      firestoreFilters.minStock = 1;
    }

    return firestoreFilters;
  };

  const getSortField = () => {
    switch (sortBy) {
      case 'price-low':
        return { field: 'price', direction: 'asc' };
      case 'price-high':
        return { field: 'price', direction: 'desc' };
      case 'rating':
        return { field: 'rating', direction: 'desc' };
      case 'name':
        return { field: 'name', direction: 'asc' };
      default:
        return { field: 'createdAt', direction: 'desc' };
    }
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    setSearchParams((prev) => ({
      ...Object.fromEntries(prev),
      sort: newSort,
    }));
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setSearchParams((prev) => ({
      ...Object.fromEntries(prev),
      ...newFilters,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-textMain mb-4">Luxury Watches</h1>
        <p className="text-lg text-textSecondary">
          Discover our complete collection of premium timepieces
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <ProductFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            categories={categories}
            brands={brands}
            isOpen={filtersOpen}
            onToggle={() => setFiltersOpen(!filtersOpen)}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-textSecondary">
                {products.length} product{products.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {/* Sort Dropdown */}
              <div className="flex items-center space-x-2">
                <SortAsc className="w-4 h-4 text-textSecondary" />
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="border border-muted rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-luxury-gold focus:border-transparent"
                >
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="name">Name A-Z</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center border border-muted rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p - 2 ${
                    viewMode === 'grid'
                      ? 'bg-luxury-gold text-luxury-black'
                      : 'text-textSecondary hover:bg-muted'
                  } `}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p - 2 ${
                    viewMode === 'list'
                      ? 'bg-luxury-gold text-luxury-black'
                      : 'text-textSecondary hover:bg-muted'
                  } `}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {products.length > 0 ? (
            <div
              className={`
              ${
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                  : 'space-y-4'
              }
            `}
            >
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-textSecondary mb-4">
                <Grid className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-textMain mb-2">No products found</h3>
              <p className="text-textSecondary mb-6">Try adjusting your filters or search criteria</p>
              <Button
                onClick={() =>
                  handleFiltersChange({
                    category: [],
                    brand: [],
                    priceRange: [0, 50000],
                    rating: 0,
                    inStock: false,
                  })
                }
                variant="outline"
              >
                Clear Filters
              </Button>
            </div>
          )}

          {/* Load More */}
          {products.length >= 20 && (
            <div className="text-center mt-12">
              <Button variant="outline" size="lg">
                Load More Products
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products;
