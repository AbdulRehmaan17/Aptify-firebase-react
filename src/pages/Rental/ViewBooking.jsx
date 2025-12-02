import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import propertyService from '../../services/propertyService';
import { Calendar, MapPin, DollarSign, Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft, User } from 'lucide-react';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const ViewBooking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [property, setProperty] = useState(null);

  useEffect(() => {
    if (id) {
      loadBooking();
    }
  }, [id]);

  const loadBooking = () => {
    if (!db || !id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const bookingRef = doc(db, 'rentalRequests', id);
      
      const unsubscribe = onSnapshot(
        bookingRef,
        async (snapshot) => {
          if (!snapshot.exists()) {
            toast.error('Booking not found');
            navigate('/rental/my-bookings');
            return;
          }

          const bookingData = { id: snapshot.id, ...snapshot.data() };
          setBooking(bookingData);

          // Verify ownership
          if (bookingData.userId !== currentUser?.uid) {
            toast.error('You do not have permission to view this booking');
            navigate('/rental/my-bookings');
            return;
          }

          // Load property details
          try {
            const propertyData = await propertyService.getById(bookingData.propertyId, false);
            setProperty(propertyData);
          } catch (error) {
            console.error('Error loading property:', error);
          }

          setLoading(false);
        },
        (error) => {
          console.error('Error loading booking:', error);
          toast.error('Failed to load booking');
          navigate('/rental/my-bookings');
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up booking listener:', error);
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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
      Pending: 'text-yellow-600 bg-yellow-100',
      Approved: 'text-green-600 bg-green-100',
      Rejected: 'text-red-600 bg-red-100',
      Completed: 'text-blue-600 bg-blue-100',
      Cancelled: 'text-gray-600 bg-gray-100',
    };
    return statusMap[status] || 'text-gray-600 bg-gray-100';
  };

  const getStatusTimeline = () => {
    if (!booking) return [];

    const timeline = [];
    
    // Created
    timeline.push({
      status: 'Request Submitted',
      date: booking.createdAt,
      completed: true,
      icon: <CheckCircle className="w-4 h-4" />,
      description: 'Your rental request has been submitted to the property owner.',
    });

    // Pending
    if (booking.status === 'Pending') {
      timeline.push({
        status: 'Awaiting Owner Response',
        date: null,
        completed: false,
        icon: <Clock className="w-4 h-4" />,
        description: 'The property owner is reviewing your request.',
      });
    }

    // Approved/Rejected
    if (booking.status === 'Approved') {
      timeline.push({
        status: 'Request Approved',
        date: booking.updatedAt || booking.approvedAt,
        completed: true,
        icon: <CheckCircle className="w-4 h-4" />,
        description: 'Your rental request has been approved! You can proceed with the rental.',
      });
    } else if (booking.status === 'Rejected') {
      timeline.push({
        status: 'Request Rejected',
        date: booking.updatedAt || booking.rejectedAt,
        completed: true,
        icon: <XCircle className="w-4 h-4" />,
        description: booking.rejectionReason || 'Your rental request was not approved.',
      });
    }

    // Completed
    if (booking.status === 'Completed') {
      timeline.push({
        status: 'Rental Completed',
        date: booking.completedAt || booking.updatedAt,
        completed: true,
        icon: <CheckCircle className="w-4 h-4" />,
        description: 'The rental period has been completed.',
      });
    }

    return timeline;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-textSecondary mb-4">Booking not found</p>
          <Button onClick={() => navigate('/rental/my-bookings')}>Back to My Bookings</Button>
        </div>
      </div>
    );
  }

  const timeline = getStatusTimeline();

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/rental/my-bookings')}
          className="mb-6 flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Bookings
        </Button>

        {/* Booking Header */}
        <div className="bg-surface rounded-base shadow-md p-6 border border-muted mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-textMain mb-2">
                Booking Details
              </h1>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  booking.status
                )}`}
              >
                {booking.status === 'Approved' ? (
                  <CheckCircle className="w-4 h-4 mr-2" />
                ) : booking.status === 'Rejected' ? (
                  <XCircle className="w-4 h-4 mr-2" />
                ) : (
                  <Clock className="w-4 h-4 mr-2" />
                )}
                {booking.status}
              </span>
            </div>
            <p className="text-sm text-textSecondary">
              Request ID: {booking.id.slice(0, 8)}
            </p>
          </div>

          {/* Property Info */}
          {property && (
            <div className="border-t border-muted pt-4 mt-4">
              <h2 className="text-lg font-semibold text-textMain mb-3">Property Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-textMain">{property.title}</p>
                  <p className="text-sm text-textSecondary flex items-center mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    {property.address?.line1 || property.location}, {property.address?.city || property.city}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-textSecondary">Monthly Rent</p>
                  <p className="text-lg font-bold text-primary">
                    {formatPrice(property.price)}/month
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Booking Dates */}
            <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
              <h2 className="text-xl font-semibold text-textMain mb-4">Rental Period</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-textSecondary mb-2">Start Date</p>
                  <div className="flex items-center text-textMain">
                    <Calendar className="w-5 h-5 mr-2 text-primary" />
                    <span className="font-medium">{formatDate(booking.startDate)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-textSecondary mb-2">End Date</p>
                  <div className="flex items-center text-textMain">
                    <Calendar className="w-5 h-5 mr-2 text-primary" />
                    <span className="font-medium">{formatDate(booking.endDate)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Message */}
            {booking.message && (
              <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
                <h2 className="text-xl font-semibold text-textMain mb-4">Your Message</h2>
                <p className="text-textSecondary whitespace-pre-line">{booking.message}</p>
              </div>
            )}

            {/* Payment Info */}
            {booking.totalCost && (
              <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
                <h2 className="text-xl font-semibold text-textMain mb-4">Payment Information</h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Total Cost</span>
                    <span className="text-lg font-bold text-primary">
                      {formatPrice(booking.totalCost)}
                    </span>
                  </div>
                  {booking.useWallet && (
                    <div className="flex justify-between text-sm">
                      <span className="text-textSecondary">Payment Method</span>
                      <span className="text-textMain">Wallet Payment</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Status Timeline Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-surface rounded-base shadow-md p-6 border border-muted sticky top-4">
              <h2 className="text-xl font-semibold text-textMain mb-4">Status Timeline</h2>
              <div className="space-y-4">
                {timeline.map((item, index) => (
                  <div key={index} className="relative">
                    {index < timeline.length - 1 && (
                      <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-muted" />
                    )}
                    <div className="flex items-start space-x-3">
                      <div
                        className={`relative z-10 ${
                          item.completed ? 'text-green-500' : 'text-textSecondary'
                        }`}
                      >
                        {item.icon}
                      </div>
                      <div className="flex-1">
                        <p
                          className={`text-sm font-medium ${
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
                        {item.description && (
                          <p className="text-xs text-textSecondary mt-2">{item.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewBooking;

