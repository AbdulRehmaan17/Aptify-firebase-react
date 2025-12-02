# Bulk Replacement Patterns for Premium Teal Theme

## Common Patterns to Replace Across All Files

### Text Colors
- `text-gray-500` → `text-textSecondary`
- `text-gray-600` → `text-textSecondary`
- `text-gray-700` → `text-textSecondary`
- `text-gray-800` → `text-textMain`
- `text-gray-900` → `text-textMain`
- `text-gray-400` → `text-textSecondary` or `text-muted`
- `text-gray-300` → `text-muted`
- `text-blue-500` → `text-primary`
- `text-blue-600` → `text-primary`
- `text-blue-700` → `text-primary`
- `text-yellow-600` → `text-accent`
- `text-yellow-400` → `text-accent`
- `text-green-600` → `text-success`
- `text-purple-600` → `text-accent` or `text-primary`
- `text-orange-600` → `text-accent`
- `text-pink-600` → `text-primary`
- `text-teal-600` → `text-primary`
- `text-slate-700` → `text-textMain`

### Background Colors
- `bg-gray-50` → `bg-bgBase`
- `bg-gray-100` → `bg-muted`
- `bg-gray-200` → `bg-muted`
- `bg-white` → `bg-card` (for cards/containers)
- `bg-blue-50` → `bg-primary/10`
- `bg-blue-100` → `bg-primary/10`
- `bg-blue-500` → `bg-primary`
- `bg-blue-600` → `bg-primaryDark`
- `bg-yellow-50` → `bg-accent/10`
- `bg-yellow-100` → `bg-accent/10`
- `bg-yellow-500` → `bg-accent`
- `bg-green-50` → `bg-success/10`
- `bg-green-100` → `bg-success/10`
- `bg-purple-100` → `bg-accent/20` or `bg-primary/10`
- `bg-orange-50` → `bg-accent/10`
- `bg-orange-100` → `bg-accent/10`
- `bg-pink-50` → `bg-primary/10`
- `bg-teal-50` → `bg-primary/10`
- `bg-teal-100` → `bg-primary/10`
- `bg-slate-100` → `bg-muted`

### Border Colors
- `border-gray-200` → `border-muted`
- `border-gray-300` → `border-muted`
- `border-blue-200` → `border-primary/20`
- `border-blue-300` → `border-primary/30`
- `border-blue-500` → `border-primary`
- `border-yellow-200` → `border-accent/20`
- `border-yellow-300` → `border-accent/30`
- `border-green-200` → `border-success/20`
- `border-green-300` → `border-success/30`
- `border-purple-300` → `border-accent/30` or `border-primary/30`
- `border-orange-300` → `border-accent/30`
- `border-teal-100` → `border-primary/20`
- `border-teal-200` → `border-primary/20`

### Dividers
- `divide-gray-200` → `divide-muted`
- `divide-y divide-gray-200` → `divide-y divide-muted`

### Border Radius
- `rounded-xl` → `rounded-base` (for cards, modals, containers)
- `rounded-2xl` → `rounded-lg` (for larger elements)

### Focus Rings
- `focus:ring-blue-500` → `focus:ring-primary`
- `focus:ring-yellow-500` → `focus:ring-accent`
- `focus:ring-green-500` → `focus:ring-success`
- `focus:ring-purple-500` → `focus:ring-primary` or `focus:ring-accent`
- `focus:border-blue-500` → `focus:border-primary`
- `focus:border-yellow-500` → `focus:border-accent`

### Hover States
- `hover:bg-gray-100` → `hover:bg-muted`
- `hover:bg-gray-50` → `hover:bg-bgBase`
- `hover:bg-blue-50` → `hover:bg-primary/10`
- `hover:bg-yellow-50` → `hover:bg-accent/10`
- `hover:text-blue-600` → `hover:text-primary`
- `hover:text-blue-800` → `hover:text-primaryDark`
- `hover:text-yellow-600` → `hover:text-accent`
- `hover:bg-teal-50` → `hover:bg-primary/10`

### Status Badges
- `bg-yellow-100 text-yellow-800` → `bg-accent/20 text-accent`
- `bg-green-100 text-green-800` → `bg-success/20 text-success`
- `bg-red-100 text-red-800` → `bg-error/20 text-error`
- `bg-gray-100 text-gray-800` → `bg-muted text-textMain`
- `bg-blue-100 text-blue-800` → `bg-primary/20 text-primary`
- `bg-purple-100 text-purple-800` → `bg-accent/20 text-accent`

### Icon Colors
- Icons with `text-gray-400` → `text-muted`
- Icons with `text-gray-500` → `text-textSecondary`
- Icons with `text-blue-500` → `text-primary`
- Icons with `text-yellow-600` → `text-accent`

## Files Still Needing Updates

Based on grep results, these files still have old color classes:
- ConstructionDashboard.jsx
- RenovationDashboard.jsx
- ConstructionList.jsx
- RenovationList.jsx
- Construction.jsx
- Renovation.jsx
- BuyPage.jsx
- SellPage.jsx
- RentPage.jsx
- RenovationServicesPage.jsx
- OwnerDashboard.jsx
- ConstructionProviders.jsx
- RenovationProviders.jsx
- ConstructionRequestForm.jsx
- RenovationRequestForm.jsx
- ProviderRenovationPanel.jsx
- ConstructionProviderDetail.jsx
- RenovationProviderDetail.jsx
- RegisterRenovator.jsx
- RegisterConstructor.jsx
- ReviewsAndRatings.jsx
- NotificationsPage.jsx
- ProviderDashboard.jsx
- Chatbot.jsx
- ConstructionServicesPage.jsx
- RentalServicesPage.jsx
- BuySellLanding.jsx
- PaymentMock.jsx
- And many more...

## Next Steps

Continue applying these replacements systematically to all remaining files.

