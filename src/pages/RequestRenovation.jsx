import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/notificationService';
import useSubmitForm from '../hooks/useSubmitForm';
import { Wrench, DollarSign, Calendar, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';

/**
 * RequestRenovation.jsx
 * Form to request renovation service from a provider
 */
const RequestRenovation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: contextUser, loading: authLoading } = useAuth();
  const currentUser = auth?.currentUser || contextUser;

  const [formData, setFormData] = useState({
    providerId: '',
    budget: '',
    timeline: '',
    description: '',
  });

  const [providers, setProviders] = useState([]);
  const [fetchingProviders, setFetchingProviders] = useState(true);
  const [errors, setErrors] = useState({});

  // Use standardized submit hook
  const {
    handleSubmit: handleSubmitForm,
    confirmSubmit,
    cancelSubmit,
    loading,
    showConfirm,
    showSuccess,
  } = useSubmitForm('renovationProjects', {
    submitFunction: async (data, user) => {
      const selectedProvider = providers.find((p) => p.id === data.providerId);

      const projectData = {
        clientId: user.uid,
        userId: user.uid,
        providerId: data.providerId,
        propertyId: null,
        details: data.description.trim(),
        description: data.description.trim(),
        budget: Number(data.budget),
        timeline: data.timeline.trim(),
        status: 'Pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'renovationProjects'), projectData);
      const projectId = docRef.id;

      // Create initial project update
      try {
        const updatesRef = collection(db, 'renovationProjects', projectId, 'projectUpdates');
        await addDoc(updatesRef, {
          status: 'Pending',
          updatedBy: user.uid,
          note: 'Request submitted',
          createdAt: serverTimestamp(),
        });
      } catch (updateError) {
        console.error('Error creating project update:', updateError);
      }

      // Notify provider
      if (selectedProvider?.userId) {
        try {
          await notificationService.sendNotification(
            selectedProvider.userId,
            'New Renovation Request',
            `You have received a new renovation request. Budget: ${new Intl.NumberFormat('en-PK', {
              style: 'currency',
              currency: 'PKR',
            }).format(data.budget)}`,
            'service-request',
            `/renovator-dashboard`
          );
        } catch (notifError) {
          console.error('Error creating notification:', notifError);
        }
      }

      return projectId;
    },
    successMessage: 'Renovation request submitted successfully!',
    notificationTitle: 'Renovation Request Submitted',
    notificationMessage: 'Your renovation request has been submitted successfully. The provider will review and respond soon.',
    notificationType: 'service-request',
    redirectPath: '/account',
  });

  // Get providerId from query params
  useEffect(() => {
    const providerIdFromQuery = searchParams.get('providerId');
    if (providerIdFromQuery) {
      setFormData((prev) => ({ ...prev, providerId: providerIdFromQuery }));
    }
  }, [searchParams]);

  // Fetch approved providers
  useEffect(() => {
    const fetchProviders = async () => {
      if (authLoading) return;

      try {
        setFetchingProviders(true);
        const providersQuery = query(
          collection(db, 'serviceProviders'),
          where('serviceType', '==', 'Renovation')
        );

        const snapshot = await getDocs(providersQuery);
        const providersList = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((provider) => provider.isApproved === true || provider.approved === true);

        setProviders(providersList);
      } catch (error) {
        console.error('Error fetching providers:', error);
        toast.error('Failed to load providers');
      } finally {
        setFetchingProviders(false);
      }
    };

    fetchProviders();
  }, [authLoading]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.providerId) {
      newErrors.providerId = 'Please select a provider';
    }

    if (!formData.budget || Number(formData.budget) <= 0) {
      newErrors.budget = 'Please enter a valid budget';
    }

    if (!formData.timeline) {
      newErrors.timeline = 'Please enter project timeline';
    }

    if (!formData.description || formData.description.trim().length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!currentUser || !currentUser.uid) {
      toast.error('Please log in to submit a renovation request');
      navigate('/auth');
      return;
    }

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    handleSubmitForm(formData, e);
  };

  if (authLoading || fetchingProviders) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-textSecondary mb-4">Please log in to submit a renovation request</p>
          <Button onClick={() => navigate('/auth')}>Log In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-textMain mb-2">
            Request Renovation Service
          </h1>
          <p className="text-lg text-textSecondary">
            Submit a request to a renovation provider for your project
          </p>
        </div>

        <div className="bg-surface rounded-base shadow-md p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Provider Selection */}
            <div>
              <label htmlFor="providerId" className="block text-sm font-medium text-textSecondary mb-2">
                <Wrench className="w-4 h-4 inline mr-1" />
                Select Provider <span className="text-error">*</span>
              </label>
              <select
                id="providerId"
                name="providerId"
                value={formData.providerId}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-base focus:ring-2 focus:ring-primary focus:border-primary ${
                  errors.providerId ? 'border-error' : 'border-muted'
                }`}
                disabled={loading}
              >
                <option value="">-- Select a provider --</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name} {provider.city ? `- ${provider.city}` : ''}
                  </option>
                ))}
              </select>
              {errors.providerId && (
                <p className="mt-1 text-sm text-error">{errors.providerId}</p>
              )}
            </div>

            {/* Budget */}
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-textSecondary mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Budget (PKR) <span className="text-error">*</span>
              </label>
              <input
                type="number"
                id="budget"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                min="0"
                step="1000"
                placeholder="Enter your budget"
                className={`w-full px-4 py-2 border rounded-base focus:ring-2 focus:ring-primary focus:border-primary ${
                  errors.budget ? 'border-error' : 'border-muted'
                }`}
                disabled={loading}
              />
              {errors.budget && <p className="mt-1 text-sm text-error">{errors.budget}</p>}
            </div>

            {/* Timeline */}
            <div>
              <label htmlFor="timeline" className="block text-sm font-medium text-textSecondary mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Project Timeline <span className="text-error">*</span>
              </label>
              <input
                type="text"
                id="timeline"
                name="timeline"
                value={formData.timeline}
                onChange={handleChange}
                placeholder="e.g., 3 months, 6 months, 1 year"
                className={`w-full px-4 py-2 border rounded-base focus:ring-2 focus:ring-primary focus:border-primary ${
                  errors.timeline ? 'border-error' : 'border-muted'
                }`}
                disabled={loading}
              />
              {errors.timeline && <p className="mt-1 text-sm text-error">{errors.timeline}</p>}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-textSecondary mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Project Description <span className="text-error">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={6}
                placeholder="Describe your renovation project in detail (minimum 20 characters)..."
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-primary resize-none ${
                  errors.description ? 'border-error' : 'border-muted'
                }`}
                disabled={loading}
              />
              <p className="mt-1 text-xs text-textSecondary">
                {formData.description.length} / 20 characters minimum
              </p>
              {errors.description && (
                <p className="mt-1 text-sm text-error">{errors.description}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/renovation-providers')}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" loading={loading} disabled={loading} className="flex-1">
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>

          {/* Confirmation Modal */}
          <Modal
            isOpen={showConfirm}
            onClose={cancelSubmit}
            title="Confirm Renovation Request"
            size="md"
          >
            <div className="space-y-4">
              <p className="text-textSecondary">
                Are you sure you want to submit this renovation request? The provider will be notified.
              </p>
              <div className="bg-background p-4 rounded-lg">
                <p className="text-sm text-textSecondary">
                  <strong>Provider:</strong>{' '}
                  {providers.find((p) => p.id === formData.providerId)?.name || 'N/A'}
                </p>
                <p className="text-sm text-textSecondary">
                  <strong>Budget:</strong>{' '}
                  {new Intl.NumberFormat('en-PK', {
                    style: 'currency',
                    currency: 'PKR',
                  }).format(formData.budget)}
                </p>
                <p className="text-sm text-textSecondary">
                  <strong>Timeline:</strong> {formData.timeline}
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={cancelSubmit} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={confirmSubmit} loading={loading} disabled={loading}>
                  Confirm & Submit
                </Button>
              </div>
            </div>
          </Modal>

          {/* Success Modal */}
          <Modal
            isOpen={showSuccess}
            onClose={() => {}}
            title="Request Submitted!"
            size="md"
          >
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-primary" />
                </div>
              </div>
              <p className="text-textSecondary">
                Your renovation request has been submitted successfully! The provider will review and respond soon.
              </p>
              <p className="text-sm text-textSecondary">
                Redirecting to your account...
              </p>
            </div>
          </Modal>
        </div>
      </div>
    </div>
  );
};

export default RequestRenovation;

