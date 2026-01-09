/**
 * Centralized Route Constants
 * 
 * Single source of truth for all application routes.
 * Use these constants instead of hardcoded strings throughout the app.
 * 
 * @example
 * import { ROUTES } from './routes/routes';
 * <Link to={ROUTES.HOME}>Home</Link>
 * navigate(ROUTES.DASHBOARD);
 */

export const ROUTES = {
  // Public Routes
  HOME: '/',
  AUTH: '/auth',
  ABOUT: '/about',
  CONTACT: '/contact',
  
  // Properties
  PROPERTIES: '/properties',
  PROPERTY_DETAIL: '/properties/:id',
  POST_PROPERTY: '/post-property',
  
  // Rental Properties
  BROWSE_RENTALS: '/browse-rentals',
  RENT_LEGACY: '/rent', // Legacy route - redirects to BROWSE_RENTALS
  
  // Buy/Sell
  BUY_SELL: '/buy-sell',
  BUY: '/buy',
  SELL: '/sell',
  
  // Renovation
  RENOVATION: '/renovation',
  RENOVATION_SERVICES: '/services',
  RENOVATION_PROVIDERS: '/renovation-providers',
  RENOVATION_PROVIDER_DETAIL: '/renovation-provider/:id',
  RENOVATION_LIST: '/renovation-list',
  RENOVATION_REQUEST: '/renovation-request',
  REQUEST_RENOVATION: '/request-renovation',
  RENOVATION_DASHBOARD: '/renovation-dashboard',
  RENOVATION_PROJECT_DETAIL: '/renovation/my-renovations/:id',
  PROVIDER_RENOVATION: '/provider-renovation',
  REGISTER_RENOVATOR: '/register-renovator',
  
  // Construction
  CONSTRUCTION: '/construction',
  CONSTRUCTION_SERVICES: '/construction-services',
  CONSTRUCTION_PROVIDERS: '/construction-providers',
  CONSTRUCTION_PROVIDER_DETAIL: '/construction-provider/:id',
  CONSTRUCTION_LIST: '/construction-list',
  CONSTRUCTION_REQUEST: '/construction-request',
  REQUEST_CONSTRUCTION: '/request-construction',
  CONSTRUCTION_PROJECT_DETAIL: '/construction/project/:id',
  PROVIDER_CONSTRUCTION: '/provider-construction',
  REGISTER_CONSTRUCTOR: '/register-constructor',
  
  // Rental Services
  RENTAL_SERVICES: '/rental-services',
  RENTAL_REQUEST: '/rental-request',
  RENTAL_BOOKING: '/rental/booking/:id',
  
  // Providers
  PROVIDERS_LIST: '/providers-list',
  PROVIDERS: '/providers',
  
  // Authenticated Routes
  DASHBOARD: '/dashboard',
  MY_PROJECTS: '/my-projects',
  ACCOUNT: '/account',
  OWNER_DASHBOARD: '/owner-dashboard',
  PAYMENT_MOCK: '/payment-mock',
  
  // Notifications
  NOTIFICATIONS: '/notifications',
  NOTIFICATION_DETAIL: '/notifications/:notificationId',
  
  // Chat
  CHATS: '/chats',
  CHAT: '/chat',
  CHATBOT: '/chatbot',
  
  // Admin
  ADMIN: '/admin',
  
  // Constructor Routes
  CONSTRUCTOR_DASHBOARD: '/constructor/dashboard',
  CONSTRUCTOR_PROJECTS: '/constructor/projects',
  CONSTRUCTOR_PROJECT_DETAIL: '/constructor/projects/:id',
  CONSTRUCTOR_PROFILE: '/constructor/profile',
  
  // Renovator Routes
  RENOVATOR_DASHBOARD: '/renovator/dashboard',
  RENOVATOR_DASHBOARD_LEGACY: '/renovator-dashboard', // Legacy route - should redirect to RENOVATOR_DASHBOARD
  RENOVATOR_PROJECTS: '/renovator/projects',
  RENOVATOR_PROJECT_DETAIL: '/renovator/project/:id',
  RENOVATOR_PROFILE: '/renovator/profile',
  RENOVATOR_CHAT: '/renovator/chat',
  RENOVATOR_NOTIFICATIONS: '/renovator/notifications',
  RENOVATOR_PORTFOLIO: '/renovator/portfolio',
  
  // 404
  NOT_FOUND: '*',
};

/**
 * Helper function to generate dynamic routes with parameters
 * @param {string} route - Route pattern with :param
 * @param {Object} params - Parameters object
 * @returns {string} - Route with parameters replaced
 * 
 * @example
 * buildRoute(ROUTES.PROPERTY_DETAIL, { id: '123' }) // '/properties/123'
 */
export const buildRoute = (route, params = {}) => {
  let builtRoute = route;
  Object.keys(params).forEach((key) => {
    builtRoute = builtRoute.replace(`:${key}`, params[key]);
  });
  return builtRoute;
};

