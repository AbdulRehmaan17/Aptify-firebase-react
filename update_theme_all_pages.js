// Script to update all pages with new theme
// This is a reference - actual updates done via search_replace

const replacements = [
  { old: 'bg-gray-50', new: 'bg-bgBase' },
  { old: 'bg-white', new: 'bg-card' },
  { old: 'bg-gray-100', new: 'bg-muted' },
  { old: 'text-gray-900', new: 'text-textMain' },
  { old: 'text-gray-700', new: 'text-textSecondary' },
  { old: 'text-gray-600', new: 'text-textSecondary' },
  { old: 'text-gray-500', new: 'text-textSecondary' },
  { old: 'border-gray-200', new: 'border-borderColor' },
  { old: 'border-gray-300', new: 'border-borderColor' },
  { old: 'bg-blue-600', new: 'bg-primary' },
  { old: 'bg-blue-500', new: 'bg-primary' },
  { old: 'text-blue-600', new: 'text-primary' },
  { old: 'text-blue-500', new: 'text-primary' },
  { old: 'hover:bg-blue-700', new: 'hover:bg-primaryDark' },
  { old: 'hover:bg-blue-600', new: 'hover:bg-primaryDark' },
  { old: 'focus:ring-blue-500', new: 'focus:ring-primary' },
  { old: 'focus:ring-blue-600', new: 'focus:ring-primary' },
  { old: 'bg-luxury-gold', new: 'bg-primary' },
  { old: 'text-luxury-gold', new: 'text-primary' },
  { old: 'text-luxury-black', new: 'text-textMain' },
  { old: 'bg-luxury-cream', new: 'bg-bgBase' },
  { old: 'bg-luxury-black', new: 'bg-primaryDark' },
];

// Files to update (all pages except already updated ones)
const filesToUpdate = [
  'RequestConstruction.jsx',
  'RequestRenovation.jsx',
  'Contact.jsx',
  'RentalRequestForm.jsx',
  'PropertyDetailPage.jsx',
  'BuySellOfferForm.jsx',
  'UserChatsPage.jsx',
  'Chatbot.jsx',
  'PaymentMock.jsx',
  // ... more files
];

