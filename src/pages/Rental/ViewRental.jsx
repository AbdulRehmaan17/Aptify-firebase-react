import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import propertyService from '../../services/propertyService';
import { MapPin, DollarSign, Home, Bed, Bath, Square, Car, CheckCircle, XCircle, Edit2, ArrowLeft } from 'lucide-react';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const ViewRental = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [rental, setRental] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (id) {
      loadRental();
    }
  }, [id]);

  const loadRental = async () => {
    try {
      setLoading(true);
      const propertyData = await propertyService.getById(id, false);
      
      // Only show rental properties
      if (propertyData.type !== 'rent') {
        toast.error('This is not a rental property');
        navigate('/rental/my-rentals');
        return;
      }

      setRental(propertyData);
    } catch (error) {
      console.error('Error loading rental:', error);
      toast.error('Failed to load rental property');
      navigate('/rental/my-rentals');
    } finally {
      setLoading(false);
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

  if (!rental) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-textSecondary mb-4">Rental property not found</p>
          <Button onClick={() => navigate('/rental/my-rentals')}>Back to My Rentals</Button>
        </div>
      </div>
    );
  }

  const isOwner = currentUser && currentUser.uid === rental.ownerId;

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/rental/my-rentals')}
          className="mb-6 flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Rentals
        </Button>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-display font-bold text-textMain mb-2">{rental.title}</h1>
            <div className="flex items-center text-textSecondary">
              <MapPin className="w-4 h-4 mr-2" />
              <span>
                {rental.address?.line1 || rental.location}, {rental.address?.city || rental.city}
              </span>
            </div>
          </div>
          {isOwner && (
            <Button
              onClick={() => navigate(`/rental/edit/${rental.id}`)}
              className="flex items-center"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        {/* Images */}
        {(rental.photos || rental.images) && (rental.photos || rental.images).length > 0 && (
          <div className="mb-6">
            <div className="relative w-full h-96 rounded-base overflow-hidden mb-4">
              <img
                src={(rental.photos || rental.images)[selectedImageIndex]}
                alt={rental.title}
                className="w-full h-full object-cover"
              />
            </div>
            {(rental.photos || rental.images).length > 1 && (
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {(rental.photos || rental.images).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative h-20 rounded-base overflow-hidden border-2 transition-all ${
                      selectedImageIndex === index
                        ? 'border-primary'
                        : 'border-transparent hover:border-muted'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${rental.title} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
              <h2 className="text-xl font-semibold text-textMain mb-4">Description</h2>
              <p className="text-textSecondary whitespace-pre-line">{rental.description}</p>
            </div>

            {/* Property Details */}
            <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
              <h2 className="text-xl font-semibold text-textMain mb-4">Property Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(rental.bedrooms !== null && rental.bedrooms !== undefined && rental.bedrooms > 0) && (
                  <div className="flex items-center space-x-2">
                    <Bed className="w-5 h-5 text-textSecondary" />
                    <div>
                      <p className="text-sm text-textSecondary">Bedrooms</p>
                      <p className="text-lg font-semibold text-textMain">{rental.bedrooms}</p>
                    </div>
                  </div>
                )}

                {(rental.bathrooms !== null && rental.bathrooms !== undefined && rental.bathrooms > 0) && (
                  <div className="flex items-center space-x-2">
                    <Bath className="w-5 h-5 text-textSecondary" />
                    <div>
                      <p className="text-sm text-textSecondary">Bathrooms</p>
                      <p className="text-lg font-semibold text-textMain">{rental.bathrooms}</p>
                    </div>
                  </div>
                )}

                {(rental.areaSqFt || rental.area) && (
                  <div className="flex items-center space-x-2">
                    <Square className="w-5 h-5 text-textSecondary" />
                    <div>
                      <p className="text-sm text-textSecondary">Area</p>
                      <p className="text-lg font-semibold text-textMain">
                        {rental.areaSqFt || rental.area} sq ft
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Home className="w-5 h-5 text-textSecondary" />
                  <div>
                    <p className="text-sm text-textSecondary">Category</p>
                    <p className="text-lg font-semibold text-textMain capitalize">
                      {rental.category || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <div className="flex items-center space-x-2">
                  {rental.furnished ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-textSecondary" />
                  )}
                  <span className="text-textMain">Furnished</span>
                </div>
                <div className="flex items-center space-x-2">
                  {rental.parking ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-textSecondary" />
                  )}
                  <span className="text-textMain">Parking Available</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price Card */}
            <div className="bg-surface rounded-base shadow-md p-6 border border-muted sticky top-4">
              <div className="text-center mb-4">
                <p className="text-sm text-textSecondary mb-1">Monthly Rent</p>
                <p className="text-3xl font-bold text-primary">
                  {formatPrice(rental.price)}
                </p>
              </div>

              <div className="mb-4">
                <div
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    rental.available
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {rental.available ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Available
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Unavailable
                    </>
                  )}
                </div>
              </div>

              {isOwner && (
                <div className="space-y-2">
                  <Button
                    fullWidth
                    onClick={() => navigate(`/rental/edit/${rental.id}`)}
                    className="flex items-center justify-center"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Property
                  </Button>
                </div>
              )}
            </div>

            {/* Location Card */}
            <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
              <h3 className="text-lg font-semibold text-textMain mb-4">Location</h3>
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <MapPin className="w-5 h-5 text-textSecondary mt-0.5" />
                  <div>
                    <p className="text-textMain">{rental.address?.line1 || rental.location}</p>
                    <p className="text-textSecondary">{rental.address?.city || rental.city}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewRental;

