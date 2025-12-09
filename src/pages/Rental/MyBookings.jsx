import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import propertyService from '../../services/propertyService';
import rentalRequestService from '../../services/rentalRequestService';
import {
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  ArrowRight,
} from 'lucide-react';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const MyBookings = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [propertyDetails, setPropertyDetails] = useState({});

  useEffect(() => {
    if (!authLoading && currentUser) {
      loadBookings();
    } else if (!authLoading && !currentUser) {
      setLoading(false);
    }
  }, [authLoading, currentUser]);

  const loadBookings = () => {
    if (!currentUser || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const bookingsQuery = query(
        collection(db, 'rentalRequests'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        bookingsQuery,
        async (snapshot) => {
          const bookingsList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Load property details for each booking
          const propertyPromises = bookingsList.map(async (booking) => {
            if (!propertyDetails[booking.propertyId]) {
              try {
                const property = await propertyService.getById(booking.propertyId, false);
                return { propertyId: booking.propertyId, property };
              } catch (error) {
                console.error(`Error loading property ${booking.propertyId}:`, error);
                return { propertyId: booking.propertyId, property: null };
              }
            }
            return null;
          });

          const newProperties = await Promise.all(propertyPromises);
          const updatedPropertyDetails = { ...propertyDetails };
          newProperties.forEach((item) => {
            if (item) {
              updatedPropertyDetails[item.propertyId] = item.property;
            }
          });
          setPropertyDetails(updatedPropertyDetails);

          setBookings(bookingsList);
          setLoading(false);
        },
        (error) => {
          console.error('Error loading bookings:', error);
          // Fallback without orderBy
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            const fallbackQuery = query(
              collection(db, 'rentalRequests'),
              where('userId', '==', currentUser.uid)
            );
            const fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              async (fallbackSnapshot) => {
                const bookingsList = fallbackSnapshot.docs
                  .map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                  }))
                  .sort((a, b) => {
                    const aTime = a.createdAt?.toDate?.() || new Date(0);
                    const bTime = b.createdAt?.toDate?.() || new Date(0);
                    return bTime - aTime;
                  });

                // Load property details
                const propertyPromises = bookingsList.map(async (booking) => {
                  if (!propertyDetails[booking.propertyId]) {
                    try {
                      const property = await propertyService.getById(booking.propertyId, false);
                      return { propertyId: booking.propertyId, property };
                    } catch (error) {
                      return { propertyId: booking.propertyId, property: null };
                    }
                  }
                  return null;
                });

                const newProperties = await Promise.all(propertyPromises);
                const updatedPropertyDetails = { ...propertyDetails };
                newProperties.forEach((item) => {
                  if (item) {
                    updatedPropertyDetails[item.propertyId] = item.property;
                  }
                });
                setPropertyDetails(updatedPropertyDetails);

                setBookings(bookingsList);
                setLoading(false);
              },
              (fallbackError) => {
                console.error('Error loading bookings (fallback):', fallbackError);
                toast.error('Failed to load bookings');
                setLoading(false);
              }
            );
            return () => fallbackUnsubscribe();
          } else {
            toast.error('Failed to load bookings');
            setLoading(false);
          }
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up bookings listener:', error);
      setLoading(false);
    }
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

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getStatusColor = (status) => {
    const statusMap = {
      Pending: 'text-accent bg-accent/20',
      Approved: 'text-primary bg-primary/20',
      Rejected: 'text-red-600 bg-red-100',
      Completed: 'text-primary bg-primary/20',
      Cancelled: 'text-gray-600 bg-gray-100',
    };
    return statusMap[status] || 'text-gray-600 bg-gray-100';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'Rejected':
        return <XCircle className="w-4 h-4" />;
      case 'Pending':
        return <Clock className="w-4 h-4" />;
      case 'Completed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusTimeline = (booking) => {
    const timeline = [];
    
    // Created
    timeline.push({
      status: 'Request Submitted',
      date: booking.createdAt,
      completed: true,
      icon: <CheckCircle className="w-4 h-4" />,
    });

    // Pending
    if (booking.status === 'Pending') {
      timeline.push({
        status: 'Awaiting Owner Response',
        date: null,
        completed: false,
        icon: <Clock className="w-4 h-4" />,
      });
    }

    // Approved/Rejected
    if (booking.status === 'Approved') {
      timeline.push({
        status: 'Request Approved',
        date: booking.updatedAt || booking.approvedAt,
        completed: true,
        icon: <CheckCircle className="w-4 h-4" />,
      });
    } else if (booking.status === 'Rejected') {
      timeline.push({
        status: 'Request Rejected',
        date: booking.updatedAt || booking.rejectedAt,
        completed: true,
        icon: <XCircle className="w-4 h-4" />,
      });
    }

    // Completed
    if (booking.status === 'Completed') {
      timeline.push({
        status: 'Rental Completed',
        date: booking.completedAt || booking.updatedAt,
        completed: true,
        icon: <CheckCircle className="w-4 h-4" />,
      });
    }

    return timeline;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-textSecondary mb-4">Please log in to view your bookings</p>
          <Button onClick={() => navigate('/login')}>Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-textMain">My Bookings</h1>
          <p className="text-textSecondary mt-2">View and manage your rental requests</p>
        </div>

        {/* Bookings List */}
        {bookings.length === 0 ? (
          <div className="bg-surface rounded-base shadow-md p-12 border border-muted text-center">
            <Calendar className="w-16 h-16 text-textSecondary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-textMain mb-2">No bookings yet</h2>
            <p className="text-textSecondary mb-6">Start by booking a rental property</p>
            <Button onClick={() => navigate('/properties?type=rent')}>
              Browse Rental Properties
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking) => {
              const property = propertyDetails[booking.propertyId];
              const timeline = getStatusTimeline(booking);

              return (
                <div
                  key={booking.id}
                  className="bg-surface rounded-base shadow-md p-6 border border-muted"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Property Info */}
                    <div className="lg:col-span-2">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                                booking.status
                              )}`}
                            >
                              {getStatusIcon(booking.status)}
                              <span className="ml-2">{booking.status}</span>
                            </span>
                          </div>
                          {property ? (
                            <>
                              <h3 className="text-lg font-semibold text-textMain mb-2">
                                {property.title}
                              </h3>
                              <div className="flex items-center text-sm text-textSecondary mb-2">
                                <MapPin className="w-4 h-4 mr-2" />
                                <span>
                                  {property.address?.line1 || property.location},{' '}
                                  {property.address?.city || property.city}
                                </span>
                              </div>
                            </>
                          ) : (
                            <p className="text-textSecondary">Property details loading...</p>
                          )}
                        </div>
                        <Link
                          to={`/rental/booking/${booking.id}`}
                          className="text-primary hover:text-primaryDark"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                      </div>

                      {/* Booking Dates */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-textSecondary mb-1">Start Date</p>
                          <p className="text-sm font-medium text-textMain flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            {formatDate(booking.startDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-textSecondary mb-1">End Date</p>
                          <p className="text-sm font-medium text-textMain flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            {formatDate(booking.endDate)}
                          </p>
                        </div>
                      </div>

                      {/* Cost */}
                      {booking.totalCost && (
                        <div className="mb-4">
                          <p className="text-xs text-textSecondary mb-1">Total Cost</p>
                          <p className="text-lg font-bold text-primary">
                            {formatPrice(booking.totalCost)}
                          </p>
                          {booking.useWallet && (
                            <p className="text-xs text-textSecondary mt-1">
                              Paid from wallet
                            </p>
                          )}
                        </div>
                      )}

                      {/* Message */}
                      {booking.message && (
                        <div className="mb-4">
                          <p className="text-xs text-textSecondary mb-1">Your Message</p>
                          <p className="text-sm text-textMain bg-background p-3 rounded-base">
                            {booking.message}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Status Timeline */}
                    <div>
                      <h4 className="text-sm font-semibold text-textMain mb-3">Status Timeline</h4>
                      <div className="space-y-3">
                        {timeline.map((item, index) => (
                          <div key={index} className="flex items-start space-x-3">
                            <div
                              className={`mt-0.5 ${
                                item.completed ? 'text-primary' : 'text-textSecondary'
                              }`}
                            >
                              {item.icon}
                            </div>
                            <div className="flex-1">
                              <p
                                className={`text-sm ${
                                  item.completed ? 'text-textMain' : 'text-textSecondary'
                                }`}
                              >
                                {item.status}
                              </p>
                              {item.date && (
                                <p className="text-xs text-textSecondary mt-1">
                                  {formatDate(item.date)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-4 border-t border-muted flex justify-end">
                    <Link
                      to={`/rental/booking/${booking.id}`}
                      className="text-sm text-primary hover:text-primaryDark flex items-center"
                    >
                      View Details <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;

