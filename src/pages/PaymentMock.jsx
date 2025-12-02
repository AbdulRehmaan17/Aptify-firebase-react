import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, CheckCircle, XCircle, Loader, DollarSign, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import transactionService from '../services/transactionService';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import toast from 'react-hot-toast';

/**
 * PaymentMock Page
 * Mock payment processing page for testing transactions
 */
const PaymentMock = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'processing', 'success', 'failed'
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [transactionId, setTransactionId] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualSuccess, setManualSuccess] = useState(true);

  // Get params from URL
  const amount = searchParams.get('amount');
  const targetType = searchParams.get('targetType');
  const targetId = searchParams.get('targetId');
  const currency = searchParams.get('currency') || 'PKR';

  const [formData, setFormData] = useState({
    amount: amount || '',
    targetType: targetType || '',
    targetId: targetId || '',
    currency: currency || 'PKR',
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!user) {
      toast.error('Please log in to make a payment');
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.amount || Number(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }

    if (!formData.targetType) {
      newErrors.targetType = 'Target type is required';
    }

    if (!formData.targetId) {
      newErrors.targetId = 'Target ID is required';
    }

    if (!formData.cardNumber || formData.cardNumber.replace(/\s/g, '').length < 16) {
      newErrors.cardNumber = 'Please enter a valid card number';
    }

    if (!formData.cardName || formData.cardName.trim().length < 3) {
      newErrors.cardName = 'Please enter cardholder name';
    }

    if (!formData.expiryDate || !/^\d{2}\/\d{2}$/.test(formData.expiryDate)) {
      newErrors.expiryDate = 'Please enter a valid expiry date (MM/YY)';
    }

    if (!formData.cvv || formData.cvv.length < 3) {
      newErrors.cvv = 'Please enter a valid CVV';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const simulatePayment = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setProcessing(true);
    setPaymentStatus('processing');

    try {
      // Create pending transaction
      const txId = await transactionService.create(
        user.uid,
        formData.targetType,
        formData.targetId,
        Number(formData.amount),
        formData.currency,
        'pending'
      );

      setTransactionId(txId);

      // Simulate payment processing delay (2-4 seconds)
      const delay = 2000 + Math.random() * 2000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Determine success/failure
      let success;
      if (manualMode) {
        success = manualSuccess;
      } else {
        // 80% success rate for random mode
        success = Math.random() > 0.2;
      }

      if (success) {
        // Update transaction to success
        await transactionService.updateStatus(txId, 'success');

        // Update related request status
        await transactionService.updateRequestStatusOnPayment(
          formData.targetType,
          formData.targetId
        );

        setPaymentStatus('success');
        setShowSuccessModal(true);
        toast.success('Payment processed successfully!');
      } else {
        // Update transaction to failed
        await transactionService.updateStatus(txId, 'failed');
        setPaymentStatus('failed');
        setShowFailedModal(true);
        toast.error('Payment failed. Please try again.');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error(error.message || 'Failed to process payment');
      setPaymentStatus('failed');
      setShowFailedModal(true);
    } finally {
      setProcessing(false);
    }
  };

  const handleRetry = () => {
    setPaymentStatus(null);
    setShowFailedModal(false);
    setTransactionId(null);
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    navigate('/account');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-textMain mb-2">Mock Payment</h1>
          <p className="text-lg text-textSecondary">
            Simulate a payment transaction for testing purposes
          </p>
        </div>

        <div className="bg-surface rounded-lg shadow-lg p-6 sm:p-8">
          {/* Payment Mode Toggle */}
          <div className="mb-6 p-4 bg-background rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualMode}
                  onChange={(e) => setManualMode(e.target.checked)}
                  className="w-4 h-4 text-primary border-muted rounded focus:ring-primary"
                />
                <span className="text-sm font-medium text-textMain">Manual Mode</span>
              </label>
            </div>
            {manualMode && (
              <div className="mt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manualSuccess}
                    onChange={(e) => setManualSuccess(e.target.checked)}
                    className="w-4 h-4 text-primary border-muted rounded focus:ring-primary"
                  />
                  <span className="text-sm text-textMain">
                    Force Success (uncheck for failure)
                  </span>
                </label>
              </div>
            )}
            <p className="text-xs text-textSecondary mt-2">
              {manualMode
                ? 'Manual mode: You control success/failure'
                : 'Random mode: 80% success rate'}
            </p>
          </div>

          {/* Payment Details */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-textMain mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Amount <span className="text-error">*</span>
              </label>
              <div className="flex">
                <Input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  error={errors.amount}
                  disabled={processing}
                  className="flex-1"
                />
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  disabled={processing}
                  className="ml-2 px-4 py-2 border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="PKR">PKR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-textMain mb-2">
                  Target Type <span className="text-error">*</span>
                </label>
                <select
                  name="targetType"
                  value={formData.targetType}
                  onChange={handleChange}
                  disabled={processing || !!targetType}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                    errors.targetType ? 'border-error' : 'border-muted'
                  }`}
                >
                  <option value="">Select type</option>
                  <option value="construction">Construction</option>
                  <option value="renovation">Renovation</option>
                  <option value="rental">Rental</option>
                  <option value="buySell">Buy/Sell</option>
                  <option value="property">Property</option>
                </select>
                {errors.targetType && (
                  <p className="mt-1 text-sm text-error">{errors.targetType}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-textMain mb-2">
                  Target ID <span className="text-error">*</span>
                </label>
                <Input
                  type="text"
                  name="targetId"
                  value={formData.targetId}
                  onChange={handleChange}
                  placeholder="Request/Property ID"
                  error={errors.targetId}
                  disabled={processing || !!targetId}
                />
              </div>
            </div>

            <div className="border-t border-muted pt-6">
              <h3 className="text-lg font-semibold text-textMain mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Information
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-textMain mb-2">
                    Card Number <span className="text-error">*</span>
                  </label>
                  <Input
                    type="text"
                    name="cardNumber"
                    value={formData.cardNumber}
                    onChange={handleChange}
                    placeholder="1234 5678 9012 3456"
                    maxLength="19"
                    error={errors.cardNumber}
                    disabled={processing}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-textMain mb-2">
                    Cardholder Name <span className="text-error">*</span>
                  </label>
                  <Input
                    type="text"
                    name="cardName"
                    value={formData.cardName}
                    onChange={handleChange}
                    placeholder="John Doe"
                    error={errors.cardName}
                    disabled={processing}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">
                      Expiry Date <span className="text-error">*</span>
                    </label>
                    <Input
                      type="text"
                      name="expiryDate"
                      value={formData.expiryDate}
                      onChange={handleChange}
                      placeholder="MM/YY"
                      maxLength="5"
                      error={errors.expiryDate}
                      disabled={processing}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">
                      CVV <span className="text-error">*</span>
                    </label>
                    <Input
                      type="text"
                      name="cvv"
                      value={formData.cvv}
                      onChange={handleChange}
                      placeholder="123"
                      maxLength="4"
                      error={errors.cvv}
                      disabled={processing}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Processing Status */}
            {processing && (
              <div className="bg-primary border border-primary rounded-lg p-4 flex items-center gap-3">
                <Loader className="w-5 h-5 text-primary animate-spin" />
                <p className="text-primary font-medium">Processing payment...</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={processing}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={simulatePayment}
                disabled={processing}
                loading={processing}
                className="flex-1 bg-primary hover:bg-primary text-white"
              >
                {processing ? 'Processing...' : 'Process Payment'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={handleSuccessClose}
        title="Payment Successful!"
        size="md"
      >
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-primary" />
            </div>
          </div>
          <p className="text-textMain">
            Your payment of {new Intl.NumberFormat('en-PK', {
              style: 'currency',
              currency: formData.currency,
            }).format(formData.amount)}{' '}
            has been processed successfully!
          </p>
          {transactionId && (
            <p className="text-sm text-textSecondary">
              Transaction ID: <code className="bg-muted px-2 py-1 rounded">{transactionId}</code>
            </p>
          )}
          <p className="text-sm text-textSecondary">
            The related request has been updated to reflect the payment.
          </p>
          <Button onClick={handleSuccessClose} className="w-full">
            Go to My Account
          </Button>
        </div>
      </Modal>

      {/* Failed Modal */}
      <Modal
        isOpen={showFailedModal}
        onClose={handleRetry}
        title="Payment Failed"
        size="md"
      >
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-error rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-error" />
            </div>
          </div>
          <p className="text-textMain">
            Your payment could not be processed. Please check your payment details and try again.
          </p>
          {transactionId && (
            <p className="text-sm text-textSecondary">
              Transaction ID: <code className="bg-muted px-2 py-1 rounded">{transactionId}</code>
            </p>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleRetry} className="flex-1">
              Try Again
            </Button>
            <Button onClick={() => navigate('/account')} className="flex-1">
              Go to Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PaymentMock;

