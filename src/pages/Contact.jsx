import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, CheckCircle } from 'lucide-react';
import { collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/notificationService';
import useSubmitForm from '../hooks/useSubmitForm';
import { useSubmitSuccess } from '../hooks/useNotifyAndRedirect';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';

const Contact = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.displayName || user?.name || '',
    email: user?.email || '',
    phone: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState({});

  // Standardized success handler
  const handleSubmitSuccess = useSubmitSuccess(
    'Message sent successfully! We will get back to you soon.',
    '/',
    1500
  );

  // Use standardized submit hook
  const {
    handleSubmit: handleSubmitForm,
    confirmSubmit,
    cancelSubmit,
    loading,
    showConfirm,
    showSuccess,
  } = useSubmitForm('supportMessages', {
    prepareData: async (data, user) => {
      // Notify all admins
      try {
        const adminsSnapshot = await getDocs(
          query(collection(db, 'users'), where('role', '==', 'admin'))
        );
        const adminPromises = adminsSnapshot.docs.map((adminDoc) =>
          notificationService.create(
            adminDoc.id,
            'New Support Message',
            `New support message from ${data.name}: "${data.subject}"`,
            'info',
            '/admin'
          )
        );
        await Promise.all(adminPromises);
      } catch (notifError) {
        console.error('Error notifying admins:', notifError);
        // Don't fail the form submission if notification fails
      }

      return {
        userId: user?.uid || null,
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim() || null,
        subject: data.subject.trim(),
        message: data.message.trim(),
        status: 'open',
        priority: 'medium',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
    },
    successMessage: 'Message sent successfully! We will get back to you soon.',
    notificationTitle: 'Message Sent',
    notificationMessage: 'Your message has been received. We will get back to you soon.',
    notificationType: 'info',
    redirectPath: null, // Handled by useSubmitSuccess
    redirectDelay: 1500,
    onSuccess: () => {
      // Use standardized success handler
      handleSubmitSuccess();
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
    if (!formData.message.trim()) newErrors.message = 'Message is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    handleSubmitForm(formData, e);
  };

  // Reset form after success
  React.useEffect(() => {
    if (showSuccess) {
      setFormData({
        name: user?.displayName || user?.name || '',
        email: user?.email || '',
        phone: '',
        subject: '',
        message: '',
      });
    }
  }, [showSuccess, user]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-4xl sm:text-5xl font-bold text-textMain mb-8 text-center"
        >
          Contact Us
        </motion.h1>
        <p className="text-lg text-textSecondary font-inter mb-12 text-center max-w-3xl mx-auto">
          We're here to assist you with any inquiries about properties, renovation services, or
          construction projects. Reach out via email, phone, or visit our office.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Details */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-surface shadow-md rounded-base p-8"
          >
            <h2 className="text-2xl font-bold text-textMain mb-6">Get in Touch</h2>
            <div className="space-y-6">
              <div className="flex items-center">
                <Mail className="w-6 h-6 text-primary mr-4" />
                <div>
                  <p className="text-textMain font-medium">Email</p>
                  <a
                    href="mailto:info@aptify.com"
                    className="text-textSecondary font-inter hover:text-primary"
                  >
                    info@aptify.com
                  </a>
                  <br />
                  <a
                    href="mailto:contact@aptify.com"
                    className="text-textSecondary font-inter hover:text-primary text-sm"
                  >
                    contact@aptify.com
                  </a>
                </div>
              </div>
              <div className="flex items-center">
                <Phone className="w-6 h-6 text-primary mr-4" />
                <div>
                  <p className="text-textMain font-medium">Phone</p>
                  <a
                    href="tel:+923001234567"
                    className="text-textSecondary font-inter hover:text-primary"
                  >
                    +92 300 123-4567
                  </a>
                  <br />
                  <a
                    href="tel:+92421234567"
                    className="text-textSecondary font-inter hover:text-primary text-sm"
                  >
                    +92 42 123-4567
                  </a>
                </div>
              </div>
              <div className="flex items-center">
                <MapPin className="w-6 h-6 text-primary mr-4" />
                <div>
                  <p className="text-textMain font-medium">Office Address</p>
                  <p className="text-textSecondary font-inter">
                    Aptify Real Estate Office
                    <br />
                    Main Boulevard, Gulberg III
                    <br />
                    Lahore, Punjab 54000
                    <br />
                    Pakistan
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-muted">
                <p className="text-textMain font-medium mb-2">Business Hours</p>
                <p className="text-textSecondary font-inter text-sm">
                  Monday - Friday: 9:00 AM - 6:00 PM
                  <br />
                  Saturday: 10:00 AM - 4:00 PM
                  <br />
                  Sunday: Closed
                </p>
              </div>
            </div>
          </motion.div>

          {/* Contact Form (Styled, Non-functional) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-surface shadow-md rounded-base p-8"
          >
            <h2 className="text-2xl font-bold text-textMain mb-6">Send a Message</h2>
            <p className="text-sm text-textSecondary font-inter mb-6">
              Have questions about properties, renovation services, or construction projects? Fill
              out the form below and we'll get back to you as soon as possible.
            </p>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">
                  Full Name *
                </label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                  error={errors.name}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">
                  Email Address *
                </label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  required
                  error={errors.email}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+92 300 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">
                  Subject *
                </label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg font-inter ${
                    errors.subject
                      ? 'border-error focus:ring-red-500 focus:border-error'
                      : 'border-muted focus:ring-2 focus:ring-primary focus:border-primary'
                  }`}
                  required
                >
                  <option value="">Select a subject</option>
                  <option value="Property Inquiry">Property Inquiry</option>
                  <option value="Renovation Services">Renovation Services</option>
                  <option value="Construction Services">Construction Services</option>
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Support">Support</option>
                </select>
                {errors.subject && (
                  <p className="mt-1 text-sm text-error">{errors.subject}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">
                  Message *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg font-inter resize-none ${
                    errors.message
                      ? 'border-error focus:ring-red-500 focus:border-error'
                      : 'border-muted focus:ring-2 focus:ring-primary focus:border-primary'
                  }`}
                  placeholder="Tell us about your inquiry or how we can help you..."
                  rows="4"
                  required
                />
                {errors.message && (
                  <p className="mt-1 text-sm text-error">{errors.message}</p>
                )}
              </div>
              <Button
                type="submit"
                loading={loading}
                disabled={loading}
                className="w-full bg-primary text-white hover:bg-primaryDark"
              >
                {loading ? 'Submitting...' : 'Send Message'}
              </Button>
            </form>

            {/* Confirmation Modal */}
            <Modal
              isOpen={showConfirm}
              onClose={cancelSubmit}
              title="Confirm Message"
              size="md"
            >
              <div className="space-y-4">
                <p className="text-textMain">
                  Are you sure you want to send this message? Our team will get back to you soon.
                </p>
                <div className="bg-muted p-4 rounded-base">
                  <p className="text-sm text-textSecondary">
                    <strong>Subject:</strong> {formData.subject}
                  </p>
                  <p className="text-sm text-textSecondary mt-2">
                    <strong>Message:</strong> {formData.message.substring(0, 100)}
                    {formData.message.length > 100 ? '...' : ''}
                  </p>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={cancelSubmit} disabled={loading}>
                    Cancel
                  </Button>
                  <Button onClick={confirmSubmit} loading={loading} disabled={loading}>
                    Confirm & Send
                  </Button>
                </div>
              </div>
            </Modal>

            {/* Success Modal */}
            <Modal
              isOpen={showSuccess}
              onClose={() => {}}
              title="Message Sent!"
              size="md"
            >
              <div className="space-y-4 text-center">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-primary" />
                  </div>
                </div>
                <p className="text-textMain">
                  Your message has been sent successfully! We will get back to you soon.
                </p>
                <p className="text-sm text-textSecondary">
                  Redirecting to home...
                </p>
              </div>
            </Modal>
          </motion.div>
        </div>

        {/* Map Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mt-12 bg-surface shadow-md rounded-base p-8"
        >
          <h2 className="text-2xl font-display font-bold text-charcoal mb-6">Visit Us</h2>
          <div className="w-full h-64 bg-muted rounded-base flex items-center justify-center">
            <p className="text-textSecondary font-inter">
              Map Placeholder - Gulberg III, Lahore, Pakistan
            </p>
          </div>
                <p className="text-sm text-textSecondary mt-4 text-center">
            We're located in the heart of Gulberg III, Lahore. Visit us during business hours or
            schedule an appointment.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Contact;
