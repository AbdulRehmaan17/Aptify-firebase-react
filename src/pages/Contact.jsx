
import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin } from 'lucide-react';

const Contact = () => {
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
          We're here to assist you with any inquiries about properties, renovation services, or construction projects. Reach out via email, phone, or visit our office.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Details */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-white shadow-xl rounded-xl p-8"
          >
            <h2 className="text-2xl font-display font-bold text-charcoal mb-6">
              Get in Touch
            </h2>
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
                    Aptify Real Estate Office<br />
                    Main Boulevard, Gulberg III<br />
                    Lahore, Punjab 54000<br />
                    Pakistan
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <p className="text-charcoal font-inter font-medium mb-2">Business Hours</p>
                <p className="text-gray-600 font-inter text-sm">
                  Monday - Friday: 9:00 AM - 6:00 PM<br />
                  Saturday: 10:00 AM - 4:00 PM<br />
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
            <h2 className="text-2xl font-display font-bold text-charcoal mb-6">
              Send a Message
            </h2>
            <p className="text-sm text-gray-600 font-inter mb-6">
              Have questions about properties, renovation services, or construction projects? Fill out the form below and we'll get back to you as soon as possible.
            </p>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-charcoal font-inter mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-inter bg-gray-100 cursor-not-allowed"
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal font-inter mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-inter bg-gray-100 cursor-not-allowed"
                  placeholder="your.email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal font-inter mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-inter bg-gray-100 cursor-not-allowed"
                  placeholder="+92 300 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal font-inter mb-2">
                  Subject *
                </label>
                <select
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-inter bg-gray-100 cursor-not-allowed"
                >
                  <option>Select a subject</option>
                  <option>Property Inquiry</option>
                  <option>Renovation Services</option>
                  <option>Construction Services</option>
                  <option>General Inquiry</option>
                  <option>Support</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal font-inter mb-2">
                  Message *
                </label>
                <textarea
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-inter bg-gray-100 cursor-not-allowed"
                  placeholder="Tell us about your inquiry or how we can help you..."
                  rows="4"
                />
              </div>
              <button
                disabled
                className="w-full bg-luxury-gold text-charcoal py-2 rounded-lg font-inter font-medium hover:bg-yellow-600 transition-all duration-300 opacity-50 cursor-not-allowed"
              >
                Send Message
              </button>
            </div>
          </motion.div>
        </div>

        {/* Map Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mt-12 bg-white shadow-xl rounded-xl p-8"
        >
          <h2 className="text-2xl font-display font-bold text-charcoal mb-6">
            Visit Us
          </h2>
          <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
            <p className="text-gray-600 font-inter">Map Placeholder - Gulberg III, Lahore, Pakistan</p>
          </div>
          <p className="text-sm text-gray-500 font-inter mt-4 text-center">
            We're located in the heart of Gulberg III, Lahore. Visit us during business hours or schedule an appointment.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Contact;