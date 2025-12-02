import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Wrench, ArrowRight } from 'lucide-react';
import Button from '../../components/common/Button';

/**
 * ProviderOptions Component
 * 
 * Landing page where service providers choose between:
 * - Register as Constructor
 * - Register as Renovator
 */
const ProviderOptions = () => {
  const navigate = useNavigate();

  const options = [
    {
      id: 'constructor',
      title: 'Register as Constructor',
      description: 'Join our network of construction professionals. Offer services for new construction, extensions, remodeling, and finishing work.',
      icon: Building2,
      route: '/register-constructor',
      color: 'from-primary to-primaryDark',
      hoverColor: 'hover:from-primaryDark hover:to-primaryDark',
    },
    {
      id: 'renovator',
      title: 'Register as Renovator',
      description: 'Connect with homeowners seeking renovation services. Offer painting, plumbing, electrical, flooring, carpentry, and full renovation services.',
      icon: Wrench,
      route: '/register-renovator',
      color: 'from-primary to-primaryDark',
      hoverColor: 'hover:from-primaryDark hover:to-primaryDark',
    },
  ];

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-textMain mb-4">
            Become a Service Provider
          </h1>
          <p className="text-lg text-textSecondary max-w-2xl mx-auto">
            Join Aptify's network of trusted service providers and connect with customers looking for
            construction and renovation services.
          </p>
        </motion.div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {options.map((option, index) => {
            const Icon = option.icon;
            return (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="card-base shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300"
              >
                <div className={`bg-gradient-to-br ${option.color} ${option.hoverColor} p-8 text-white`}>
                  <div className="flex items-center justify-center mb-4">
                    <div className="bg-surface/20 rounded-full p-4">
                      <Icon className="w-12 h-12" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-display font-bold mb-3 text-center">{option.title}</h2>
                  <p className="text-white/90 text-center mb-6">{option.description}</p>
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => navigate(option.route)}
                    className="bg-surface text-textMain hover:bg-muted"
                  >
                    Register Now
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Benefits Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="card-base shadow-lg p-8"
        >
          <h3 className="text-2xl font-display font-bold text-textMain mb-6 text-center">
            Why Join Aptify?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-accent/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📈</span>
              </div>
              <h4 className="font-semibold text-textMain mb-2">Grow Your Business</h4>
              <p className="text-sm text-textSecondary">
                Connect with customers actively looking for your services
              </p>
            </div>
            <div className="text-center">
              <div className="bg-accent/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⭐</span>
              </div>
              <h4 className="font-semibold text-textMain mb-2">Build Your Reputation</h4>
              <p className="text-sm text-textSecondary">
                Earn reviews and ratings from satisfied customers
              </p>
            </div>
            <div className="text-center">
              <div className="bg-accent/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔒</span>
              </div>
              <h4 className="font-semibold text-textMain mb-2">Secure Platform</h4>
              <p className="text-sm text-textSecondary">
                Verified profiles and secure payment processing
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProviderOptions;

