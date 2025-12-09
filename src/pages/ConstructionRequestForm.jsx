import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/notificationService';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';

/**
 * ConstructionRequestForm Component
 *
 * Allows property owners to submit construction project requests.
 * Fetches user's properties from Firestore and creates a new construction project.
 * Supports providerId from query params or route state (from ConstructionList).
 * Automatically creates "constructionProjects" collection if it doesn't exist.
 */
const ConstructionRequestForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user: contextUser, loading: authLoading } = useAuth();

  // Get currentUser from Firebase auth
  const currentUser = auth?.currentUser || contextUser;

  // Form state
  const [formData, setFormData] = useState({
    projectType: '',
    propertyId: '',
    description: '',
    budget: '',
    startDate: '',
    endDate: '',
    providerId: '', // Will be set from query params or route state
  });

  // UI state
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingProperties, setFetchingProperties] = useState(true);
  const [errors, setErrors] = useState({});
  
  // Check if "New Construction" is selected
  const isNewConstruction = formData.projectType === 'New Construction';

  // Project type options
  const projectTypes = [
    { value: 'New Construction', label: 'New Construction' },
    { value: 'Extension', label: 'Extension' },
    { value: 'Remodeling', label: 'Remodeling' },
  ];

  /**
   * Get providerId from query params or route state
   * Priority: query params > route state > empty string
   */
  useEffect(() => {
    const providerIdFromQuery = searchParams.get('providerId');
    const providerIdFromState = location.state?.providerId;

    const providerId = providerIdFromQuery || providerIdFromState || '';

    if (providerId) {
      setFormData((prev) => ({
        ...prev,
        providerId: providerId,
      }));
      console.log(
        'Provider ID set from:',
        providerIdFromQuery ? 'query params' : 'route state',
        providerId
      );
    }
  }, [searchParams, location.state]);

  /**
   * Fetch user's properties from Firestore
   * Queries "properties" collection where ownerId == currentUser.uid
   */
  useEffect(() => {
    const fetchProperties = async () => {
      // Wait for auth to load
      if (authLoading) {
        return;
      }

      // Check if user is authenticated
      if (!currentUser || !currentUser.uid) {
        setFetchingProperties(false);
        return;
      }

      try {
        setFetchingProperties(true);
        console.log('Fetching properties for user:', currentUser.uid);

        // Query properties collection filtered by ownerId
        const propertiesQuery = query(
          collection(db, 'properties'),
          where('ownerId', '==', currentUser.uid)
        );

        const snapshot = await getDocs(propertiesQuery);
        const propertiesList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProperties(propertiesList);
        console.log(`Fetched ${propertiesList.length} properties for user ${currentUser.uid}`);
      } catch (error) {
        console.error('Error fetching properties:', error);
        toast.error('Failed to load your properties. Please try again.');
        setProperties([]);
      } finally {
        setFetchingProperties(false);
      }
    };

    fetchProperties();
  }, [currentUser, authLoading]);

  /**
   * Handle form field changes
   * Updates formData state and clears field-specific errors
   */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };
      
      // If switching to "New Construction", clear propertyId
      if (name === 'projectType' && value === 'New Construction') {
        updated.propertyId = '';
      }
      
      return updated;
    });

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Clear propertyId error when switching to New Construction
    if (name === 'projectType' && value === 'New Construction' && errors.propertyId) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.propertyId;
        return newErrors;
      });
    }

    // Clear endDate error if startDate changes
    if (name === 'startDate' && errors.endDate) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.endDate;
        return newErrors;
      });
    }
  };

  /**
   * Validate form fields
   * Returns true if valid, false otherwise
   * Sets errors state with validation messages
   */
  const validateForm = () => {
    const newErrors = {};

    // Project Type validation
    if (!formData.projectType.trim()) {
      newErrors.projectType = 'Project type is required';
    }

    // Property validation - only required if NOT "New Construction"
    if (!isNewConstruction && !formData.propertyId.trim()) {
      newErrors.propertyId = 'Please select a property';
    }

    // Description validation (min 20 chars)
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }

    // Budget validation (must be numeric and > 0)
    if (!formData.budget.trim()) {
      newErrors.budget = 'Budget is required';
    } else {
      const budgetNum = Number(formData.budget);
      if (isNaN(budgetNum) || budgetNum <= 0) {
        newErrors.budget = 'Budget must be a valid positive number';
      }
    }

    // Start Date validation
    if (!formData.startDate.trim()) {
      newErrors.startDate = 'Start date is required';
    }

    // End Date validation (must be >= start date)
    if (!formData.endDate.trim()) {
      newErrors.endDate = 'End date is required';
    } else if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);

      if (endDate < startDate) {
        newErrors.endDate = 'End date must be on or after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   * Validates form, creates construction project in Firestore,
   * shows success message, and navigates to dashboard
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if user is authenticated
    if (!currentUser || !currentUser.uid) {
      toast.error('Please log in to submit a construction request.');
      navigate('/auth');
      return;
    }

    // Validate form
    if (!validateForm()) {
      toast.error('Please fix the errors in the form.');
      return;
    }

    try {
      setLoading(true);

      // Build project data object according to Firestore structure
      const projectData = {
        userId: currentUser.uid,
        propertyId: isNewConstruction ? null : formData.propertyId,
        projectType: formData.projectType,
        description: formData.description.trim(),
        budget: Number(formData.budget),
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: 'Pending',
        createdAt: serverTimestamp(),
      };

      // Add providerId if provided (optional field)
      if (formData.providerId && formData.providerId.trim()) {
        projectData.providerId = formData.providerId.trim();
      }

      // Save to Firestore collection "constructionProjects"
      // Collection will be automatically created if it doesn't exist
      const docRef = await addDoc(collection(db, 'constructionProjects'), projectData);

      console.log('Construction project created with ID:', docRef.id);
      console.log('Project data:', projectData);

      // Send notifications
      try {
        // Notify user (confirmation)
        await notificationService.sendNotification(
          currentUser.uid,
          'Construction Request Submitted',
          `Your ${formData.projectType} request has been submitted successfully. We'll notify you when a provider responds.`,
          'service-request',
          '/construction-dashboard'
        );

        // Notify provider if one was selected
        if (formData.providerId && formData.providerId.trim()) {
          await notificationService.notifyProviderNewRequest(
            formData.providerId,
            docRef.id,
            formData.projectType,
            Number(formData.budget)
          );
        } else {
          // Notify all approved construction providers
          const providersQuery = query(
            collection(db, 'serviceProviders'),
            where('serviceType', '==', 'Construction'),
            where('isApproved', '==', true)
          );
          const providersSnapshot = await getDocs(providersQuery);
          
          const notificationPromises = providersSnapshot.docs.map((providerDoc) => {
            const providerData = providerDoc.data();
            if (providerData.userId) {
              return notificationService.sendNotification(
                providerData.userId,
                'New Construction Request Available',
                `A new ${formData.projectType} request is available. Check available projects.`,
                'service-request',
                '/constructor-dashboard'
              );
            }
            return Promise.resolve();
          });
          
          await Promise.allSettled(notificationPromises);
        }
      } catch (notifError) {
        console.error('Error sending notifications:', notifError);
        // Don't fail the request if notifications fail
      }

      toast.success('Construction request submitted successfully!');

      // Navigate to construction dashboard
      navigate('/construction-dashboard');
    } catch (error) {
      console.error('Error submitting construction request:', error);

      // Handle specific Firestore errors
      if (error.code === 'permission-denied') {
        toast.error('Permission denied. Please check Firestore security rules.');
      } else {
        toast.error(error.message || 'Failed to submit construction request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while checking auth or fetching properties
  if (authLoading || fetchingProperties) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser || !currentUser.uid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-textSecondary mb-4">Please log in to submit a construction request.</p>
          <Button onClick={() => navigate('/auth')}>Log In</Button>
        </div>
      </div>
    );
  }

  // Empty state - no properties available (only show if NOT "New Construction")
  // Note: This check is now conditional - users can submit "New Construction" without properties
  // But we'll still show this message if they select other types and have no properties
  // We'll handle this in the form itself with conditional rendering

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-background min-h-screen">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-textMain mb-2">
          Submit Construction Request
        </h1>
        <p className="text-lg text-textSecondary">
          Fill out the form below to request construction services for your property.
        </p>
      </div>

      {/* Form Container */}
      <div className="bg-surface rounded-base shadow-xl p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Type Field */}
          <div>
            <label htmlFor="projectType" className="block text-sm font-medium text-textMain mb-2">
              Project Type <span className="text-error">*</span>
            </label>
            <select
              id="projectType"
              name="projectType"
              value={formData.projectType}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-muted transition-colors ${
                errors.projectType ? 'border-error' : 'border-muted'
              }`}
            >
              <option value="">Select project type</option>
              {projectTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.projectType && (
              <p className="mt-1 text-sm text-error">{errors.projectType}</p>
            )}
          </div>

          {/* Property Field - Only show if NOT "New Construction" */}
          {!isNewConstruction && (
            <div>
              <label htmlFor="propertyId" className="block text-sm font-medium text-textMain mb-2">
                Property <span className="text-error">*</span>
              </label>
              {fetchingProperties ? (
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-textSecondary">Loading properties...</span>
                </div>
              ) : properties.length === 0 ? (
                <div className="p-4 bg-accent/10 border border-accent/20 rounded-base">
                  <p className="text-sm text-textMain mb-3">
                    You don't have any properties yet. Please add a property before submitting a
                    construction request for {formData.projectType || 'this project type'}.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => navigate('/post-property')}
                    >
                      Add Property
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/properties')}
                    >
                      Browse Properties
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <select
                    id="propertyId"
                    name="propertyId"
                    value={formData.propertyId}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-muted transition-colors ${
                      errors.propertyId ? 'border-error' : 'border-muted'
                    }`}
                  >
                    <option value="">Select a property</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.title || 'Untitled Property'} -{' '}
                        {property.address?.city || 'No city'}
                      </option>
                    ))}
                  </select>
                  {errors.propertyId && (
                    <p className="mt-1 text-sm text-error">{errors.propertyId}</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Info message for New Construction */}
          {isNewConstruction && (
            <div className="p-4 bg-primary border border-primary rounded-lg">
              <p className="text-sm text-primary">
                <strong>New Construction:</strong> No existing property selection is required for new
                construction projects.
              </p>
            </div>
          )}

          {/* Description Field */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-textMain mb-2">
              Description <span className="text-error">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              placeholder="Describe your construction project in detail (minimum 20 characters)..."
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-muted transition-colors resize-none ${
                errors.description ? 'border-error' : 'border-muted'
              }`}
            />
            <p className="mt-1 text-xs text-textSecondary">
              {formData.description.length} / 20 characters minimum
            </p>
            {errors.description && (
              <p className="mt-1 text-sm text-error">{errors.description}</p>
            )}
          </div>

          {/* Budget Field */}
          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-textMain mb-2">
              Budget (PKR) <span className="text-error">*</span>
            </label>
            <input
              type="number"
              id="budget"
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="Enter your budget"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-muted transition-colors ${
                errors.budget ? 'border-error' : 'border-muted'
              }`}
            />
            {errors.budget && <p className="mt-1 text-sm text-error">{errors.budget}</p>}
          </div>

          {/* Date Fields Container */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Start Date Field */}
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-textMain mb-2">
                Start Date <span className="text-error">*</span>
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]} // Prevent past dates
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-muted transition-colors ${
                  errors.startDate ? 'border-error' : 'border-muted'
                }`}
              />
              {errors.startDate && <p className="mt-1 text-sm text-error">{errors.startDate}</p>}
            </div>

            {/* End Date Field */}
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-textMain mb-2">
                End Date <span className="text-error">*</span>
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                min={formData.startDate || new Date().toISOString().split('T')[0]} // Must be >= start date
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-muted transition-colors ${
                  errors.endDate ? 'border-error' : 'border-muted'
                }`}
              />
              {errors.endDate && <p className="mt-1 text-sm text-error">{errors.endDate}</p>}
            </div>
          </div>

          {/* Provider ID Info (if provided) */}
          {formData.providerId && (
            <div className="p-4 bg-muted border border-muted rounded-lg">
              <p className="text-sm text-textSecondary">
                <strong>Provider Selected:</strong> A provider has been pre-selected for this
                request.
              </p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={loading || fetchingProperties}
              className="flex-1"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConstructionRequestForm;
