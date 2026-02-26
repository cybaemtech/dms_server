# Document Management System - Design Guidelines

## Design Approach

**Selected Framework**: Material Design-inspired system  
**Rationale**: Enterprise document management requires clarity, efficiency, and familiar patterns. Material Design's emphasis on structured hierarchy, clear component states, and form-friendly layouts perfectly suits this workflow-intensive application.

**Core Principles**:
- Clarity over creativity: Every element serves a functional purpose
- Consistent information architecture across all role-based dashboards
- Clear status indicators and workflow progression visualization
- Professional, trustworthy aesthetic appropriate for corporate environments

---

## Typography System

**Primary Font**: Inter (via Google Fonts CDN)  
**Secondary Font**: Roboto Mono (for document numbers, control copy numbers)

**Type Scale**:
- Page Headers: text-3xl font-semibold (30px)
- Section Headers: text-xl font-semibold (20px)
- Card Titles: text-lg font-medium (18px)
- Body Text: text-base font-normal (16px)
- Labels: text-sm font-medium (14px)
- Helper Text: text-xs font-normal (12px)
- Metadata/Timestamps: text-xs font-normal tracking-wide (12px)

**Line Heights**:
- Headers: leading-tight
- Body: leading-relaxed
- Forms: leading-normal

---

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, and 8  
**Common Usage**:
- Component padding: p-6
- Section spacing: mb-8, mt-8
- Card spacing: p-4
- Form field gaps: space-y-4
- Button padding: px-6 py-2
- Grid gaps: gap-6

**Container Strategy**:
- Main content area: max-w-7xl mx-auto
- Form containers: max-w-2xl
- Dashboard cards: Full width within grid system
- Modal dialogs: max-w-lg to max-w-3xl depending on content

**Grid Layouts**:
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Document lists: Single column with proper spacing
- Form layouts: grid-cols-1 md:grid-cols-2 gap-4 for multi-field forms

---

## Component Library

### Navigation & Layout

**Top Navigation Bar**:
- Full-width sticky header with shadow-sm
- Contains: Logo/brand, role indicator, notification bell icon, user profile dropdown
- Height: h-16
- Layout: flex items-center justify-between px-6

**Sidebar Navigation** (for role-specific dashboards):
- Fixed left sidebar: w-64
- Navigation items with icons (Heroicons) and labels
- Active state: Clear visual differentiation with border-l-4 and slightly elevated background
- Collapsible on mobile

**Breadcrumbs**:
- Always visible below header: text-sm with separator icons
- Shows: Dashboard > Document Name > Current Action

### Dashboard Components

**Statistics Cards**:
- Elevated card design with rounded-lg shadow-md
- Contains: Icon, metric number (large text-3xl font-bold), label, trend indicator
- Layout: grid display for multiple stats
- Padding: p-6

**Document List Cards**:
- Table-like structure within cards
- Columns: Document Name, Doc Number, Status, Date, Actions
- Alternating row backgrounds for readability
- Status badges with distinct visual states (Pending, Approved, Declined, Issued)

**Recent Activity Feed**:
- Chronological list with timeline visualization
- Each entry: Icon, action description, timestamp, user name
- Compact spacing: py-3 border-b

### Forms & Inputs

**Input Fields**:
- Label above input: text-sm font-medium mb-2
- Input styling: border rounded-md px-4 py-2 w-full focus:ring-2 focus:outline-none
- Required field indicator: Asterisk after label
- Helper text below input: text-xs mt-1

**File Upload Area**:
- Dashed border rounded-lg with hover state
- Center-aligned content: Upload icon, "Click to upload" text, file type specifications
- Drag-and-drop visual feedback
- Uploaded file preview with name and remove button

**Select Dropdowns**:
- Consistent with text inputs in height and styling
- Clear chevron icon indicator
- Multi-select with checkbox options when applicable

**Date Pickers**:
- Calendar icon prefix
- Input format clearly indicated (DD/MM/YYYY)

### Buttons & Actions

**Primary Action Button**:
- Prominent, elevated appearance with shadow-sm
- Padding: px-6 py-2.5
- Rounded: rounded-md
- Font: text-sm font-medium

**Secondary Button**:
- Outlined style with border-2
- Same dimensions as primary
- Less visual weight

**Icon Buttons**:
- Square or circular: h-10 w-10
- Icons from Heroicons (outline style)
- Used for: actions in tables, close buttons, menu toggles

**Button Groups**:
- Actions together with gap-4
- Primary action on right (approve, submit, issue)
- Secondary/cancel on left

### Document Workflow Components

**Status Badge**:
- Inline badge with rounded-full px-3 py-1
- Text: text-xs font-medium uppercase tracking-wide
- States: Pending, Approved, Declined, Issued, Revised

**Workflow Progress Indicator**:
- Horizontal stepper showing: Creator → Approver → Issuer → Issued
- Current step highlighted
- Completed steps with checkmark icon
- Minimal, clean design

**Document Preview Card**:
- Full-width card with shadow-md
- Header section with document metadata (name, number, dates)
- Body area for document content display
- Footer with action buttons and remarks section

**Remark/Comment Box**:
- Textarea with border rounded-md min-h-24
- Character counter if applicable
- Submit button aligned to right below textarea

### Modals & Overlays

**Approval/Decline Modal**:
- Centered overlay with backdrop blur
- Max-width: max-w-lg
- Header with close button (X icon)
- Content area with form fields
- Footer with action buttons (Cancel, Confirm)
- Padding: p-6

**Document Comparison View**:
- Split-screen layout (50/50 or side-by-side tabs)
- Headers indicating "Previous Version" and "Current Version"
- Synchronized scrolling if possible
- Differences highlighted

**Notification Popup**:
- Top-right fixed position
- Slide-in animation from right
- Compact design: p-4 rounded-md shadow-lg
- Icon, message, dismiss button
- Auto-dismiss after 5 seconds

### Tables & Data Display

**Document Log Table**:
- Full-width responsive table
- Header row with font-medium text-sm
- Sortable columns with arrow indicators
- Row hover state for interactivity
- Pagination controls below table
- Export to Excel button above table (right-aligned)

**Print Log Table**:
- Columns: User ID, Control Copy No., Document Name, Print Date, User Name
- Filter options above table
- Search functionality

### Access Control & Permissions

**Department Selection Grid**:
- Checkbox list in grid format: grid-cols-2 md:grid-cols-3
- Each item: Checkbox + Department name
- Select All / Deselect All options

**Control Copy Footer Template** (for PDF):
- Fixed bottom section showing: User ID, Control Copy No., Date
- Monospace font (Roboto Mono)
- Small text: text-xs
- Border-top separator

---

## Responsive Behavior

**Breakpoints**:
- Mobile: < 768px (single column, collapsible sidebar)
- Tablet: 768px - 1024px (2-column grids)
- Desktop: > 1024px (3-column grids, full sidebar)

**Mobile Adaptations**:
- Sidebar becomes drawer/hamburger menu
- Tables become card-based lists
- Multi-column grids collapse to single column
- Form fields stack vertically

---

## Icons & Visual Elements

**Icon Library**: Heroicons (outline style via CDN)

**Common Icons**:
- Document: DocumentTextIcon
- Upload: ArrowUpTrayIcon
- Approve: CheckCircleIcon
- Decline: XCircleIcon
- Notification: BellIcon
- User: UserCircleIcon
- Calendar: CalendarIcon
- Download/Print: ArrowDownTrayIcon, PrinterIcon
- Settings: CogIcon
- Log: ClipboardDocumentListIcon

**Icon Sizing**:
- Navigation: h-6 w-6
- Buttons: h-5 w-5
- Status indicators: h-4 w-4
- Large visual icons: h-12 w-12

---

## Images

**Not Applicable**: This is a utility-focused enterprise application. No hero images or decorative imagery required. All visuals should be functional (icons, document previews, user avatars).

---

## Accessibility

**Mandatory Standards**:
- All form inputs have associated labels with proper `for` attributes
- Focus states clearly visible with ring-2 or outline
- Sufficient contrast ratios throughout
- Keyboard navigation fully supported
- ARIA labels for icon-only buttons
- Screen reader-friendly status announcements
- Error states clearly indicated with text, not just visual treatment

**Form Validation**:
- Inline error messages below invalid fields
- Error summary at top of form if multiple errors
- Success confirmation messages after actions

---

## Page-Specific Layouts

**Login Page**:
- Centered card layout: max-w-md mx-auto
- Logo/brand at top
- Form fields stacked vertically
- Role selection if applicable
- Minimal, focused design

**Dashboard (All Roles)**:
- Top stats row with 3-4 metric cards
- Main content area with tabs or sections for: Pending Actions, Recent Documents, Activity Log
- Quick action buttons prominently placed

**Document Creation Page**:
- Two-column form on desktop (metadata fields left, upload area right)
- Single column on mobile
- Clear step progression if multi-step
- Save draft and submit buttons

**Review/Approval Page**:
- Document preview area (large, central)
- Sidebar with metadata and action buttons
- Remarks section below preview
- Previous version comparison link if revision

**Issued Documents View (Recipients)**:
- Grid or list view toggle
- Search and filter bar
- Document cards with: Name, number, issue date, view/print buttons
- PDF viewer in modal or new page

**Admin Panel**:
- Sidebar with: User Management, Role Management, Department Management, System Logs, Reports
- Data tables with CRUD operations
- Export functionality throughout

This design system ensures a professional, efficient, and user-friendly interface that supports the complex workflows of your DMS while maintaining consistency across all user roles.