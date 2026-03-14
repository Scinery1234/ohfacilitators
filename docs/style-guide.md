# Style Guide - Your Place

## Design System

### Colors

#### Primary Palette (Burgundy)
- `primary-100`: `#fffbf2` - Cream/Off-white background
- `primary-200`: `#7b062b` - Main burgundy
- `primary-300`: `#4a031a` - Dark burgundy

#### Secondary Palette (Brown)
- `secondary-100`: `#9c744b` - Medium brown
- `secondary-200`: `#291909` - Dark brown/black

#### Usage
- Primary colors used for main brand elements, buttons, links
- Secondary colors for text, accents
- Cream background provides contrast and warmth

### Typography

#### Font Families
- **Logo**: `Chango` (cursive) - Used for "Your Place" brand name
- **Display/Headings**: `Inter` (sans-serif) - All headings (h1-h6)
- **Body**: `Inter` (sans-serif) - All body text

#### Font Sizes
- Uses Tailwind's default scale with custom adjustments
- Responsive sizing: `text-4xl sm:text-5xl md:text-7xl lg:text-9xl` for hero text

### Spacing

- Base unit: **4px** (Tailwind default)
- Common spacing scale:
  - `p-2` = 8px
  - `p-4` = 16px
  - `p-6` = 24px
  - `p-8` = 32px
  - `p-12` = 48px

### Components

#### Button
- Variants: `primary`, `secondary`, `danger`, `outline`
- States: default, hover, disabled, loading
- Focus: ring-2 with primary color
- Shadow: `shadow-lg shadow-primary-200/50` for primary buttons

#### Input
- Border: `border-gray-300` (default), `border-red-500` (error)
- Focus: `ring-2 ring-primary-200`
- Padding: `px-4 py-3`
- Rounded: `rounded-lg`

#### Card
- Background: `bg-primary-100`
- Shadow: `shadow-lg shadow-primary-200/50`
- Rounded: `rounded-lg`
- Padding: `p-6` (default, can be disabled)

#### Alert
- Types: `info`, `success`, `error`, `warning`
- Each type has matching background, border, and text colors
- Padding: `p-4`
- Rounded: `rounded-lg`

### Breakpoints (Responsive Design)

- **Mobile**: Default (< 640px)
- **sm**: 640px and up
- **md**: 768px and up (tablet)
- **lg**: 1024px and up (desktop)
- **xl**: 1280px and up (large desktop)

### Accessibility

- All interactive elements have visible focus states
- Focus rings use `ring-2` with primary color
- ARIA labels used where appropriate
- Semantic HTML structure
- Color contrast meets WCAG AA standards

### Common Patterns

#### Page Layout
```jsx
<div className="max-w-7xl mx-auto px-4 py-12">
  {/* Content */}
</div>
```

#### Section Spacing
- Between sections: `mb-8` or `space-y-8`
- Within sections: `space-y-4` or `space-y-6`

#### Button Groups
```jsx
<div className="flex flex-col sm:flex-row gap-4">
  {/* Buttons */}
</div>
```

### Shadows

- Card shadow: `shadow-lg shadow-primary-200/50`
- Button shadow (primary): `shadow-lg shadow-primary-200/50`
- Subtle elevation: `shadow-md`

### Transitions

- Color transitions: `transition-colors`
- All transitions: `transition-all`
- Hover effects: `hover:bg-*`, `hover:font-bold`
