import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen, Calendar, MapPin, Clock, Eye } from 'lucide-react';
import rentalRequestService from '../../../services/rentalRequestService';
import propertyService from '../../../services/propertyService';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import Button from '../../../components/common/Button';

const MyBookings = ({ user }) => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  const loadBookings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const rentalRequests = await rentalRequestService.getByUser(user.uid);
      // Fetch property details for each booking
      const bookingsWithProperties = await Promise.all(
        rentalRequests.map(async (req) => {
          try {
            const property = await propertyService.getById(req.propertyId, false);
            return { ...req, property };
          } catch (error) {
            console.error('Error fetching property:', error);
            return { ...req, property: null };
          }
        })
      );
      setBookings(bookingsWithProperties);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const statusMap = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return statusMap[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-textMain">My Bookings</h1>
          <p className="text-textSecondary mt-2">View all your rental bookings</p>
        </div>
        <Button onClick={() => navigate('/rental-services')} variant="primary">
          <Calendar className="w-4 h-4 mr-2" />
          New Booking
        </Button>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-surface rounded-lg shadow-md p-12 text-center border border-muted">
          <BookOpen className="w-16 h-16 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-textMain mb-2">No bookings yet</h3>
          <p className="text-textSecondary mb-4">Start by creating a new rental booking</p>
          <Button onClick={() => navigate('/rental-services')} variant="primary">
            Create Booking
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-surface rounded-lg shadow-md p-6 border border-muted hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-textMain">
                      {booking.property?.title || 'Property Booking'}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(booking.status)}`}>
                      {booking.status || 'pending'}
                    </span>
                  </div>

                  {booking.property && (
                    <div className="flex items-center text-textSecondary text-sm mb-2">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>
                        {typeof booking.property.address === 'string'
                          ? booking.property.address
                          : booking.property.address?.city || 'Location not specified'}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {booking.startDate && booking.endDate && (
                      <div className="flex items-center text-textSecondary text-sm">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>
                          {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                        </span>
                      </div>
                    )}
                    {booking.duration && (
                      <div className="flex items-center text-textSecondary text-sm">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>Duration: {booking.duration} month{booking.duration !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    <div className="flex items-center text-textSecondary text-sm">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>Booked: {formatDate(booking.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {booking.property && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/properties/${booking.property.id}`)}
                    className="ml-4"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Property
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;

