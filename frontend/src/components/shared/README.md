# Shared Components Library

Phase 1 reusable components for the ASKA keyword research tool.

## Components

### Logo
Reusable ASKA logo component with emerald/green branding.

```tsx
import { Logo } from "@/components/Logo";

// Small logo with text
<Logo size="sm" showText={true} />

// Medium logo icon only
<Logo size="md" showText={false} />

// Large logo with text
<Logo size="lg" />
```

**Props:**
- `size?: "sm" | "md" | "lg"` - Logo size (default: "md")
- `showText?: boolean` - Show "ASKA" text (default: true)
- `className?: string` - Additional CSS classes

---

### TrendIndicator
Arrow indicator showing trend direction with semantic colors.

```tsx
import { TrendIndicator } from "@/components/shared";

<TrendIndicator trend="up" size="md" />
<TrendIndicator trend="down" size="sm" />
<TrendIndicator trend="stable" />
```

**Props:**
- `trend: "up" | "down" | "stable"` - Trend direction
- `size?: "sm" | "md"` - Icon size (default: "md")
- `className?: string` - Additional CSS classes

**Colors:**
- Up: Green (emerald-600/emerald-400)
- Down: Red (red-600/red-400)
- Stable: Gray (zinc-400/zinc-500)

---

### OpportunityScoreBadge
Score visualization badge with color-coded ranges (0-100).

```tsx
import { OpportunityScoreBadge } from "@/components/shared";

<OpportunityScoreBadge score={85} />  // High - Green
<OpportunityScoreBadge score={55} />  // Medium - Yellow
<OpportunityScoreBadge score={25} />  // Low - Red
```

**Props:**
- `score: number` - Opportunity score (0-100, auto-clamped)
- `className?: string` - Additional CSS classes

**Color Ranges:**
- High (70-100): Green badge
- Medium (40-69): Yellow/amber badge
- Low (0-39): Red badge

---

### UpdateFrequencyBadge
Status badge based on days since last update.

```tsx
import { UpdateFrequencyBadge } from "@/components/shared";

<UpdateFrequencyBadge daysSinceUpdate={15} />   // Active
<UpdateFrequencyBadge daysSinceUpdate={45} />   // Moderate
<UpdateFrequencyBadge daysSinceUpdate={120} />  // Stale
<UpdateFrequencyBadge daysSinceUpdate={null} /> // Unknown
```

**Props:**
- `daysSinceUpdate: number | null` - Days since last update
- `className?: string` - Additional CSS classes

**Status Ranges:**
- Active (<30 days): Green badge
- Moderate (30-90 days): Yellow/amber badge
- Stale (>90 days): Red badge
- Unknown (null): Gray badge

---

### ViewToggle
Segmented control for switching between table and grid views.

```tsx
import { ViewToggle } from "@/components/shared";
import { useState } from "react";

const [view, setView] = useState<"table" | "grid">("table");

<ViewToggle view={view} onChange={setView} />
```

**Props:**
- `view: "table" | "grid"` - Current view mode
- `onChange: (view: "table" | "grid") => void` - View change handler
- `className?: string` - Additional CSS classes

---

## Import Patterns

```tsx
// Import individual components
import { TrendIndicator } from "@/components/shared";
import { OpportunityScoreBadge } from "@/components/shared";

// Import multiple components
import {
  TrendIndicator,
  OpportunityScoreBadge,
  UpdateFrequencyBadge,
  ViewToggle
} from "@/components/shared";

// Import Logo (top-level component)
import { Logo } from "@/components/Logo";
```

## Design System

All components follow the Protocol design system used in this project:
- Emerald/green accent colors
- Tailwind CSS for styling
- Dark mode support via `dark:` variants
- Consistent rounded corners and spacing
- Accessible ARIA labels and semantic HTML
