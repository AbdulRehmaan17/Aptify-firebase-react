import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import propertyService from '../../services/propertyService';
import { Plus, Edit2, Trash2, Eye, MapPin, DollarSign, Home, ToggleLeft, ToggleRight } from 'lucide-react';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';
import { ui } from '../../styles/ui';

const MyListings = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [listingToDelete, setListingToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState({});

  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate('/login');
      return;
    }

    if (currentUser && db) {
      setLoading(true);
      const q = query(
        collection(db, 'properties'),
        where('ownerId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetchedListings = snapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
            .filter(
              (listing) =>
                listing.type === 'buy' || listing.listingType === 'buy' ||
                listing.type === 'sell' || listing.listingType === 'sell'
            );
          setListings(fetchedListings);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching listings:', err);
          // Fallback without orderBy
          if (err.code === 'failed-precondition' || err.message?.includes('index')) {
            const fallbackQuery = query(
              collection(db, 'properties'),
              where('ownerId', '==', currentUser.uid)
            );
            const fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              (fallbackSnapshot) => {
                const fetchedListings = fallbackSnapshot.docs
                  .map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                  }))
                  .filter(
                    (listing) =>
                      listing.type === 'buy' || listing.listingType === 'buy' ||
                      listing.type === 'sell' || listing.listingType === 'sell'
                  )
                  .sort((a, b) => {
                    const aTime = a.createdAt?.toDate?.() || new Date(0);
                    const bTime = b.createdAt?.toDate?.() || new Date(0);
                    return bTime - aTime;
                  });
                setListings(fetchedListings);
                setLoading(false);
              },
              (fallbackError) => {
                console.error('Error fetching listings (fallback):', fallbackError);
                setError('Failed to load your listings.');
                toast.error('Failed to load listings.');
                setLoading(false);
              }
            );
            return () => fallbackUnsubscribe();
          } else {
            setError('Failed to load your listings.');
            toast.error('Failed to load listings.');
            setLoading(false);
          }
        }
      );

      return () => unsubscribe();
    }
  }, [authLoading, currentUser, navigate]);

  const handleDeleteClick = (listing) => {
    setListingToDelete(listing);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!listingToDelete) return;

    setDeleting(true);
    try {
      await propertyService.delete(listingToDelete.id);
      toast.success('Listing deleted successfully!');
      setShowDeleteModal(false);
      setListingToDelete(null);
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error(error.message || 'Failed to delete listing.');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleAvailability = async (listingId, currentStatus) => {
    setTogglingStatus((prev) => ({ ...prev, [listingId]: true }));
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await propertyService.updateStatus(listingId, newStatus);
      toast.success(`Listing marked as ${newStatus === 'active' ? 'available' : 'unavailable'}.`);
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast.error(error.message || 'Failed to toggle availability.');
    } finally {
      setTogglingStatus((prev) => ({ ...prev, [listingId]: false }));
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-display font-bold text-textMain">My Listings</h1>
          <Button onClick={() => navigate('/buy-sell/add')} className={ui.primaryButton}>
            <Plus className="w-5 h-5 mr-2" /> Add New Listing
          </Button>
        </div>

        {listings.length === 0 ? (
          <div className={`${ui.card} text-center py-12`}>
            <Home className="w-16 h-16 text-muted mx-auto mb-4" />
            <p className="text-textSecondary text-lg mb-4">You haven't created any listings yet.</p>
            <Button onClick={() => navigate('/buy-sell/add')} className={ui.primaryButton}>
              <Plus className="w-5 h-5 mr-2" /> Create Your First Listing
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <div key={listing.id} className={`${ui.card} flex flex-col`}>
                <div className="relative h-48 w-full mb-4 rounded-base overflow-hidden">
                  <img
                    src={listing.coverImage || listing.photos?.[0] || 'https://via.placeholder.com/400x250?text=No+Image'}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 flex space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      listing.status === 'active' ? 'bg-primary text-white' : 'bg-muted text-textSecondary'
                    }`}>
                      {listing.status === 'active' ? 'Available' : 'Unavailable'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      (listing.listingType || listing.type) === 'sell'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {(listing.listingType || listing.type) === 'sell' ? 'For Sale' : 'Want to Buy'}
                    </span>
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-textMain mb-2">{listing.title}</h2>
                <p className="text-textSecondary text-sm flex items-center mb-2">
                  <MapPin className="w-4 h-4 mr-1 text-muted" />{' '}
                  {listing.address?.city || listing.city}, {listing.address?.line1 || listing.location}
                </p>
                <p className="text-primary font-bold text-lg mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-1" /> {formatPrice(listing.price)}
                </p>
                <div className="flex-grow"></div>
                <div className="flex justify-between items-center mt-4">
                  <Link to={`/buy-sell/listing/${listing.id}`} className={ui.outlineButton}>
                    <Eye className="w-4 h-4 mr-2" /> View
                  </Link>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      onClick={() => handleToggleAvailability(listing.id, listing.status)}
                      loading={togglingStatus[listing.id]}
                      className="text-textSecondary hover:text-primary"
                    >
                      {listing.status === 'active' ? (
                        <ToggleLeft className="w-5 h-5" />
                      ) : (
                        <ToggleRight className="w-5 h-5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => navigate(`/buy-sell/edit/${listing.id}`)}
                      className="text-textSecondary hover:text-primary"
                    >
                      <Edit2 className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleDeleteClick(listing)}
                      className="text-error hover:bg-error/10"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Delete"
        description={`Are you sure you want to delete "${listingToDelete?.title}"? This action cannot be undone.`}
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>
              Delete
            </Button>
          </div>
        }
      />
    </div>
  );
};

export default MyListings;

