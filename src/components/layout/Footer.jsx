import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import subscriptionService from '../../services/subscriptionService';
import toast from 'react-hot-toast';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    
    // PHASE 4: Validate input before submission
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    // PHASE 4: Set loading state
    setIsSubmitting(true);
    try {
      // PHASE 2: Pass source parameter to track subscription origin
      const result = await subscriptionService.subscribe(email, 'footer');
      
      if (result.success) {
        // PHASE 4: Show real success only after backend confirms
        toast.success(result.message || 'Successfully subscribed! Please check your email for confirmation.');
        setEmail('');
      } else {
        // PHASE 4: Handle specific error cases
        toast.error(result.message || 'Failed to subscribe');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      // PHASE 4: Handle network failures
      toast.error('Failed to subscribe. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-primaryDark text-white border-t border-muted p-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer */}
        <div className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="space-y-4">
              <Link to="/" className="flex items-center space-x-2">
                <Home className="w-8 h-8 text-primary" />
                <span className="text-2xl font-bold text-white">Aptify</span>
              </Link>
              <p className="text-white/80 text-sm leading-relaxed">
                Your trusted platform for property rental, purchase, and renovation services. Find
                your dream property with verified listings and expert support.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-white/80 hover:text-white transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="text-white/80 hover:text-white transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="text-white/80 hover:text-white transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="text-white/80 hover:text-white transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    to="/properties"
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    Browse Properties
                  </Link>
                </li>
                <li>
                  <Link
                    to="/services"
                    className="text-textSecondary hover:text-white transition-colors"
                  >
                    Renovation Services
                  </Link>
                </li>
                <li>
                  <Link
                    to="/post-property"
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    List Property
                  </Link>
                </li>
                <li>
                  <Link
                    to="/about"
                    className="text-textSecondary hover:text-white transition-colors"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="text-textSecondary hover:text-white transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Customer Service */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Services</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    to="/help"
                    className="text-textSecondary hover:text-white transition-colors"
                  >
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link
                    to="/services"
                    className="text-textSecondary hover:text-white transition-colors"
                  >
                    Renovation Services
                  </Link>
                </li>
                <li>
                  <Link
                    to="/property-guide"
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    Property Guide
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="text-textSecondary hover:text-white transition-colors">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="text-textSecondary hover:text-white transition-colors"
                  >
                    Contact Support
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Contact Info</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-white mt-0.5" />
                  <div className="text-white/80 text-sm">
                    <p>123 Property Avenue</p>
                    <p>Lahore, Pakistan 54000</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-white" />
                  <span className="text-white/80 text-sm">+92 (300) 123-4567</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-white" />
                  <span className="text-white/80 text-sm">info@aptify.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Newsletter */}
        <div className="py-8 border-t border-textMain">
          <div className="max-w-md mx-auto text-center lg:max-w-none lg:text-left">
            <h3 className="text-lg font-semibold mb-4 text-white">Subscribe to Our Newsletter</h3>
            <p className="text-white/80 text-sm mb-4">
              Get the latest updates on new property listings, renovation service offers, and real
              estate insights.
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto lg:mx-0">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 rounded-lg bg-surface/10 border border-white/20 text-white placeholder-white/60 focus:ring-2 focus:ring-white focus:border-transparent disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primaryDark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="py-6 border-t border-textMain">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-white/80 text-sm">© 2024 Aptify. All rights reserved.</div>
            <div className="flex space-x-6 text-sm">
              <Link to="/privacy" className="text-white/80 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-white/80 hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link to="/cookies" className="text-white/80 hover:text-white transition-colors">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
