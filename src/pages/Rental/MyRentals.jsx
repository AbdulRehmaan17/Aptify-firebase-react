import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import propertyService from '../../services/propertyService';
import { Plus, Edit2, Trash2, Eye, MapPin, DollarSign, Home, ToggleLeft, ToggleRight } from 'lucide-react';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { GridSkeleton, PropertyCardSkeleton } from '../../components/common/SkeletonLoader';
import { EmptyProperties } from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const MyRentals = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [rentals, setRentals] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, rentalId: null, rentalTitle: '' });
  const [updating, setUpdating] = useState({});

  useEffect(() => {
    if (!authLoading && currentUser) {
      loadRentals();
    } else if (!authLoading && !currentUser) {
      setLoading(false);
    }
  }, [authLoading, currentUser]);

  const loadRentals = () => {
    if (!currentUser || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const rentalsQuery = query(
        collection(db, 'properties'),
        where('ownerId', '==', currentUser.uid),
        where('type', '==', 'rent')
      );

      const unsubscribe = onSnapshot(
        rentalsQuery,
        (snapshot) => {
          const rentalsList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setRentals(rentalsList);
          setLoading(false);
        },
        (error) => {
          console.error('Error loading rentals:', error);
          toast.error('Failed to load rentals');
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up rentals listener:', error);
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.rentalId) return;

    try {
      setUpdating({ ...updating, [deleteModal.rentalId]: true });
      
      // Delete property document
      await deleteDoc(doc(db, 'properties', deleteModal.rentalId));
      
      // Optionally delete images from storage
      const rental = rentals.find((r) => r.id === deleteModal.rentalId);
      if (rental?.images && rental.images.length > 0) {
        // Note: You might want to delete images from storage here
        // This would require a deleteMultipleImages function
      }

      toast.success('Rental property deleted successfully');
      setDeleteModal({ isOpen: false, rentalId: null, rentalTitle: '' });
    } catch (error) {
      console.error('Error deleting rental:', error);
      toast.error('Failed to delete rental property');
    } finally {
      setUpdating({ ...updating, [deleteModal.rentalId]: false });
    }
  };

  const handleToggleAvailability = async (rentalId, currentStatus) => {
    try {
      setUpdating({ ...updating, [rentalId]: true });
      
      await updateDoc(doc(db, 'properties', rentalId), {
        available: !currentStatus,
        updatedAt: new Date(),
      });

      toast.success(`Property ${!currentStatus ? 'marked as available' : 'marked as unavailable'}`);
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability');
    } finally {
      setUpdating({ ...updating, [rentalId]: false });
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-8 bg-muted animate-pulse rounded-base w-64 mb-2" />
            <div className="h-4 bg-muted animate-pulse rounded-base w-48" />
          </div>
          <GridSkeleton count={6} ItemComponent={PropertyCardSkeleton} />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-textSecondary mb-4">Please log in to view your rentals</p>
          <Button onClick={() => navigate('/login')}>Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-textMain">My Rental Properties</h1>
            <p className="text-textSecondary mt-2">Manage your rental listings</p>
          </div>
          <Button onClick={() => navigate('/rental/add')} className="flex items-center w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add New Rental
          </Button>
        </div>

        {/* Rentals Grid */}
        {rentals.length === 0 ? (
          <EmptyProperties actionPath="/rental/add" actionLabel="Add Rental Property" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rentals.map((rental) => (
              <div
                key={rental.id}
                className="bg-surface rounded-base shadow-md overflow-hidden border border-muted hover:shadow-lg transition-shadow"
              >
                {/* Image */}
                {(rental.photos || rental.images || rental.coverImage) && (rental.photos?.[0] || rental.images?.[0] || rental.coverImage) ? (
                  <img
                    src={rental.photos?.[0] || rental.images?.[0] || rental.coverImage}
                    alt={rental.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-muted flex items-center justify-center">
                    <Home className="w-12 h-12 text-textSecondary" />
                  </div>
                )}

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-textMain line-clamp-1 flex-1">
                      {rental.title}
                    </h3>
                    <span
                      className={`ml-2 px-2 py-1 text-xs rounded-full ${
                        rental.available
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {rental.available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>

                  <p className="text-sm text-textSecondary mb-3 line-clamp-2">
                    {rental.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-textSecondary">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span className="line-clamp-1">
                        {rental.address?.line1 || rental.location}, {rental.address?.city || rental.city}
                      </span>
                    </div>
                    <div className="flex items-center text-lg font-bold text-primary">
                      <DollarSign className="w-4 h-4" />
                      {formatPrice(rental.price)}/month
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-muted">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleAvailability(rental.id, rental.available)}
                        disabled={updating[rental.id]}
                        className="text-textSecondary hover:text-primary transition-colors"
                        title={rental.available ? 'Mark as unavailable' : 'Mark as available'}
                      >
                        {rental.available ? (
                          <ToggleRight className="w-5 h-5" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/rental/${rental.id}`}
                        className="p-2 text-textSecondary hover:text-primary transition-colors"
                        title="View"
                      >
                        <Eye className="w-5 h-5" />
                      </Link>
                      <button
                        onClick={() => navigate(`/rental/edit/${rental.id}`)}
                        className="p-2 text-textSecondary hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteModal({
                            isOpen: true,
                            rentalId: rental.id,
                            rentalTitle: rental.title,
                          })
                        }
                        className="p-2 text-textSecondary hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, rentalId: null, rentalTitle: '' })}
          title="Delete Rental Property"
        >
          <div className="space-y-4">
            <p className="text-textMain">
              Are you sure you want to delete <strong>{deleteModal.rentalTitle}</strong>? This
              action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => setDeleteModal({ isOpen: false, rentalId: null, rentalTitle: '' })}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                loading={updating[deleteModal.rentalId]}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default MyRentals;

