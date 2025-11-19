import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/notificationService';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

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
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      // Create support message
      const messageRef = await addDoc(collection(db, 'supportMessages'), {
        userId: user?.uid || null,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        status: 'open',
        priority: 'medium',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Notify all admins
      try {
        const adminsSnapshot = await getDocs(
          query(collection(db, 'users'), where('role', '==', 'admin'))
        );
        const adminPromises = adminsSnapshot.docs.map((adminDoc) =>
          notificationService.create(
            adminDoc.id,
            'New Support Message',
            `New support message from ${formData.name}: "${formData.subject}"`,
            'info',
            '/admin'
          )
        );
        await Promise.all(adminPromises);
      } catch (notifError) {
        console.error('Error notifying admins:', notifError);
        // Don't fail the form submission if notification fails
      }

      toast.success('Message sent successfully! We will get back to you soon.');
      setFormData({
        name: user?.displayName || user?.name || '',
        email: user?.email || '',
        phone: '',
        subject: '',
        message: '',
      });
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      console.error('Error submitting contact form:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-ivory py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-4xl sm:text-5xl font-display font-bold text-charcoal mb-8 text-center"
        >
          Contact Us
        </motion.h1>
        <p className="text-lg text-gray-600 font-inter mb-12 text-center max-w-3xl mx-auto">
          We're here to assist you with any inquiries about properties, renovation services, or
          construction projects. Reach out via email, phone, or visit our office.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Details */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-white shadow-xl rounded-xl p-8"
          >
            <h2 className="text-2xl font-display font-bold text-charcoal mb-6">Get in Touch</h2>
            <div className="space-y-6">
              <div className="flex items-center">
                <Mail className="w-6 h-6 text-luxury-gold mr-4" />
                <div>
                  <p className="text-charcoal font-inter font-medium">Email</p>
                  <a
                    href="mailto:info@aptify.com"
                    className="text-gray-600 font-inter hover:text-luxury-gold"
                  >
                    info@aptify.com
                  </a>
                  <br />
                  <a
                    href="mailto:contact@aptify.com"
                    className="text-gray-600 font-inter hover:text-luxury-gold text-sm"
                  >
                    contact@aptify.com
                  </a>
                </div>
              </div>
              <div className="flex items-center">
                <Phone className="w-6 h-6 text-luxury-gold mr-4" />
                <div>
                  <p className="text-charcoal font-inter font-medium">Phone</p>
                  <a
                    href="tel:+923001234567"
                    className="text-gray-600 font-inter hover:text-luxury-gold"
                  >
                    +92 300 123-4567
                  </a>
                  <br />
                  <a
                    href="tel:+92421234567"
                    className="text-gray-600 font-inter hover:text-luxury-gold text-sm"
                  >
                    +92 42 123-4567
                  </a>
                </div>
              </div>
              <div className="flex items-center">
                <MapPin className="w-6 h-6 text-luxury-gold mr-4" />
                <div>
                  <p className="text-charcoal font-inter font-medium">Office Address</p>
                  <p className="text-gray-600 font-inter">
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
              <div className="pt-4 border-t border-gray-200">
                <p className="text-charcoal font-inter font-medium mb-2">Business Hours</p>
                <p className="text-gray-600 font-inter text-sm">
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
            className="bg-white shadow-xl rounded-xl p-8"
          >
            <h2 className="text-2xl font-display font-bold text-charcoal mb-6">Send a Message</h2>
            <p className="text-sm text-gray-600 font-inter mb-6">
              Have questions about properties, renovation services, or construction projects? Fill
              out the form below and we'll get back to you as soon as possible.
            </p>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-charcoal font-inter mb-2">
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
                <label className="block text-sm font-medium text-charcoal font-inter mb-2">
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
                <label className="block text-sm font-medium text-charcoal font-inter mb-2">
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
                <label className="block text-sm font-medium text-charcoal font-inter mb-2">
                  Subject *
                </label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg font-inter ${
                    errors.subject
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold'
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
                  <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal font-inter mb-2">
                  Message *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg font-inter resize-none ${
                    errors.message
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold'
                  }`}
                  placeholder="Tell us about your inquiry or how we can help you..."
                  rows="4"
                  required
                />
                {errors.message && (
                  <p className="mt-1 text-sm text-red-600">{errors.message}</p>
                )}
              </div>
              <Button
                type="submit"
                loading={loading}
                disabled={loading}
                className="w-full bg-luxury-gold text-charcoal hover:bg-yellow-600"
              >
                Send Message
              </Button>
            </form>
          </motion.div>
        </div>

        {/* Map Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mt-12 bg-white shadow-xl rounded-xl p-8"
        >
          <h2 className="text-2xl font-display font-bold text-charcoal mb-6">Visit Us</h2>
          <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
            <p className="text-gray-600 font-inter">
              Map Placeholder - Gulberg III, Lahore, Pakistan
            </p>
          </div>
          <p className="text-sm text-gray-500 font-inter mt-4 text-center">
            We're located in the heart of Gulberg III, Lahore. Visit us during business hours or
            schedule an appointment.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Contact;
