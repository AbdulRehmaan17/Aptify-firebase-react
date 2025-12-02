# Bulk Theme Replacement Guide

## Color Replacements Needed

### Background Colors
- `bg-gray-50` → `bg-bgBase`
- `bg-white` → `bg-card` (or keep `bg-white` if it's specifically white)
- `bg-gray-100` → `bg-muted`
- `bg-gray-200` → `bg-muted`
- `bg-gray-800` → `bg-primaryDark` (for dark backgrounds)

### Text Colors
- `text-gray-900` → `text-textMain`
- `text-gray-700` → `text-textSecondary`
- `text-gray-600` → `text-textSecondary`
- `text-gray-500` → `text-textSecondary`
- `text-gray-400` → `text-textSecondary`
- `text-gray-300` → `text-muted` (for icons)

### Border Colors
- `border-gray-200` → `border-muted`
- `border-gray-300` → `border-muted`
- `border-gray-700` → `border-muted`
- `border-gray-800` → `border-muted`

### Button/Accent Colors
- `bg-blue-500` → `bg-primary`
- `bg-blue-600` → `bg-primary`
- `bg-blue-400` → `bg-secondary`
- `text-blue-500` → `text-primary`
- `text-blue-600` → `text-primary`
- `hover:bg-blue-500` → `hover:bg-primary`
- `hover:bg-blue-600` → `hover:bg-primaryDark`
- `focus:ring-blue-500` → `focus:ring-primary`
- `focus:border-blue-500` → `focus:border-primary`

### Border Radius
- `rounded-xl` → `rounded-base` (for cards, modals)
- `rounded-2xl` → `rounded-lg` (for larger elements)
- Keep `rounded-lg` for standard elements

### Success/Error
- `bg-green-500` → `bg-success`
- `bg-red-500` → `bg-error`
- `text-green-600` → `text-success`
- `text-red-600` → `text-error`

### Chat Specific
- Chat sidebar: `bg-white border-r border-muted`
- Active conversation: `bg-bgBase border-l-4 border-primary`
- Sender bubble: `bg-primary text-white rounded-lg p-3 max-w-xs`
- Receiver bubble: `bg-muted text-textMain rounded-lg p-3 max-w-xs`

### Dashboard Cards
- `bg-card rounded-lg shadow-sm border border-muted p-5 hover:shadow-md transition`

### Forms
- Inputs: `border border-muted px-3 py-2 rounded-base focus:border-primary focus:ring-primary`
- Textareas: `border border-muted rounded-base p-3 focus:border-primary`
- Dropdowns: `border border-muted rounded-base p-2 bg-white focus:border-primary`

