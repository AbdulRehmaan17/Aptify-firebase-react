# Bulk Theme Update - Remaining Pages

## Quick Update Commands

For each remaining page file, apply these replacements:

```bash
# Background colors
bg-gray-50 → bg-bgBase
bg-white → bg-card
bg-gray-100 → bg-muted

# Text colors
text-gray-900 → text-textMain
text-gray-700 → text-textSecondary
text-gray-600 → text-textSecondary
text-gray-500 → text-textSecondary

# Border colors
border-gray-200 → border-borderColor
border-gray-300 → border-borderColor

# Button/Accent colors
bg-blue-600 → bg-primary
bg-blue-500 → bg-primary
text-blue-600 → text-primary
text-blue-500 → text-primary
hover:bg-blue-700 → hover:bg-primaryDark
hover:bg-blue-600 → hover:bg-primaryDark
focus:ring-blue-500 → focus:ring-primary
focus:ring-blue-600 → focus:ring-primary

# Legacy luxury colors
bg-luxury-gold → bg-primary
text-luxury-gold → text-primary
text-luxury-black → text-textMain
bg-luxury-cream → bg-bgBase
bg-luxury-black → bg-primaryDark
hover:text-luxury-gold → hover:text-primary

# Yellow/Orange accents (for landing pages - keep or change to primary)
bg-yellow-500 → bg-primary (or keep for specific branding)
text-yellow-600 → text-primary (or keep)
```

## Remaining Files to Update

Based on grep results, these files still need updates:
- ProviderDashboard.jsx
- ProviderRenovationPanel.jsx
- BuySellOfferForm.jsx
- RenovationProviderDetail.jsx
- ConstructionProviderDetail.jsx
- RenovationRequestForm.jsx
- ConstructionRequestForm.jsx
- RegisterConstructor.jsx
- RegisterRenovator.jsx
- NotificationsPage.jsx
- ReviewsAndRatings.jsx
- RenovationProviders.jsx
- ConstructionProviders.jsx
- And all other dashboard/provider pages

## Automated Update Script

Use search_replace with replace_all=true for each file:

1. Update background colors
2. Update text colors
3. Update border colors
4. Update button colors
5. Update legacy luxury colors

