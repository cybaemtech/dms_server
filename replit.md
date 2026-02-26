# Document Management System (DMS)

## Overview

This is an enterprise-grade Document Management System built to handle the complete lifecycle of controlled documents. The system manages document creation, approval workflows, issuance, and version control with full audit trails. It supports role-based access control with distinct interfaces for document creators, approvers, and issuers, ensuring proper document governance in corporate environments.

The application provides a structured workflow where documents move through creation → approval → issuance stages, with the ability to track revisions, manage department assignments, and maintain comprehensive document metadata including headers, footers, and control copy numbers.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### November 2025 - Replit Environment Setup
1. **Project Import Setup**:
   - Installed Node.js 20 runtime environment
   - Installed all npm dependencies (React, Vite, Express, TypeScript, shadcn/ui components)
   - Fixed missing document schema fields in JsonStorage (duePeriodYears, reasonForRevision, reviewDueDate)
   - Updated browserslist database to latest version
   
2. **Development Workflow Configuration**:
   - Set up workflow to run `npm run dev` on port 5000
   - Configured Vite dev server with `allowedHosts: true` for Replit proxy compatibility
   - Server binds to 0.0.0.0:5000 for proper external access
   - Development server serves both frontend (via Vite) and backend API (Express)

3. **Deployment Configuration**:
   - Configured autoscale deployment target for stateless operation
   - Build command: `npm run build` (compiles both frontend and backend)
   - Run command: `npm run start` (production-ready Express server)
   - Static files served from `dist/public` directory

4. **Data Initialization**:
   - JSON storage automatically creates `data.json` with sample data on first run
   - Pre-seeded with test users for each role (creator, approver, issuer, admin)
   - Pre-configured departments for document assignment

### November 2025 - Login & Document Enhancement
1. **Login Page Improvements**:
   - Redesigned login UI with modern, clean layout
   - Removed role dropdown - role is now automatically determined from user credentials
   - Added dark mode toggle in header
   - Updated demo credentials display to show actual system users
   - Implemented backend authentication endpoint (`POST /api/login`) for credential validation

2. **Document Header/Footer Auto-Extraction**:
   - Removed manual header/footer input fields from document creation form
   - Implemented automatic extraction from uploaded Word documents using `mammoth` library
   - Backend processes headers/footers during document upload via `pdfService.extractHeaderFooterFromWord`
   - Added informative message on form explaining auto-extraction feature

3. **PDF Viewing & Printing**:
   - Verified PDF viewing functionality with control copy tracking working correctly
   - Control copy footer includes: User ID, Control Copy Number, and Date
   - Print functionality logs all print events to audit trail

4. **Word Document View & Download Options**:
   - Added separate "View Word" and "Download as Word" menu options in DocumentTable dropdown
   - Both Approver and Issuer dashboards now support viewing Word documents in modal viewer
   - Both dashboards also support direct download of original Word files
   - Implemented handleViewWord and handleDownload handlers in both dashboard pages
   - Backend `/api/documents/:id/word` endpoint serves Word files with proper headers

5. **Puppeteer Configuration Enhancement**:
   - Enhanced Puppeteer launch arguments for better compatibility in cloud/containerized environments
   - Added args: `--disable-dev-shm-usage`, `--disable-accelerated-2d-canvas`, `--disable-gpu`, `--no-first-run`, `--no-zygote`, `--single-process`
   - Improved headless browser stability for PDF generation in Replit environment
   - All args designed to prevent common Chromium issues in sandboxed environments

6. **Document Review Reminder System**:
   - Added `duePeriodYears` and `reasonForRevision` fields to document schema
   - System automatically calculates `reviewDueDate` based on date of issue + due period in years
   - Created `/api/documents/due-for-review` endpoint to retrieve documents requiring review
   - Endpoint includes overdue documents and calculates days until due for urgency sorting
   - Built `ReviewReminders` component with three urgency levels:
     - Overdue (red badge): Documents past their review due date
     - Urgent (yellow badge): Documents due within 14 days
     - Normal (blue badge): Documents due within specified period (default 60 days)
   - Integrated review reminders into Creator dashboard for proactive document management
   - Component displays document name, number, department, and formatted due date with visual urgency indicators

## System Architecture

### Frontend Architecture

**Framework**: React 18+ with TypeScript using Vite as the build tool

**UI Component System**: shadcn/ui components built on Radix UI primitives, implementing a Material Design-inspired system as specified in design guidelines. The component library emphasizes clarity, consistent information architecture, and professional aesthetics suitable for enterprise environments.

**Design System**:
- Typography: Inter font family for primary text, Roboto Mono for document numbers and control copy numbers
- Spacing: Tailwind CSS utilities with primitives of 2, 4, 6, and 8
- Layout: Responsive design with max-width containers (7xl for main content, 2xl for forms)
- Color scheme: Neutral base with HSL color system supporting light/dark modes

**State Management**: 
- React Query (TanStack Query) for server state management and data fetching
- React Hook Form with Zod validation for form state
- Local component state with useState hooks for UI interactions

**Routing**: Wouter for lightweight client-side routing, handling navigation between login, creator dashboard, approver dashboard, issuer dashboard, and document creation pages

**Key UI Patterns**:
- Dashboard layouts with statistics cards, document tables, and activity feeds
- Modal dialogs for document viewing, editing, approval/decline workflows
- Status badges with color-coded visual indicators for document states
- Workflow progress visualization showing document lifecycle stages
- Notification system with toast messages and popup notifications

### Backend Architecture

**Runtime**: Node.js with Express.js framework

**Language**: TypeScript with ES modules

**API Design**: RESTful HTTP endpoints under `/api` namespace:
- `GET /api/documents` - Retrieve documents by status or user (with query parameters)
- `GET /api/documents/:id` - Retrieve single document with full details including related data
- Additional CRUD operations for documents, users, departments, and notifications

**Request Processing**:
- JSON body parsing with raw buffer capture for webhook verification
- URL-encoded form data support
- Request/response logging middleware with duration tracking
- Error handling with appropriate HTTP status codes

**Business Logic Layer**: Storage abstraction layer (`IStorage` interface) implemented by `JsonStorage` class, providing clean separation between HTTP handlers and data operations

### Data Storage

**Storage Type**: JSON file-based storage (`data.json`)

**Implementation**: Custom `JsonStorage` class with race condition protection through:
- Ready promise pattern ensuring data loads before any operation
- Write queue serializing all file writes to prevent concurrent overwrites
- In-memory data cache with automatic persistence to disk

**Data Collections**:

1. **Users**: Stores user credentials, roles (creator/approver/issuer), and full names. Includes pre-seeded accounts:
   - Creator: Priyanka.k@cybaemtech.com
   - Approver: approver@cybaem.com  
   - Issuer: issuer@cybaem.com

2. **Documents**: Core entity tracking document metadata including:
   - Document name, number (unique), and content
   - Status workflow (pending → approved/declined → issued)
   - Revision tracking with revision numbers and references to previous versions
   - Multi-stage timestamps (created, updated, approved, issued)
   - User references for preparer, approver, and issuer
   - Header/footer information for document formatting (auto-extracted from Word files)
   - Approval/decline remarks for audit trail
   - Review management: duePeriodYears (years until review), reasonForRevision, and auto-calculated reviewDueDate

3. **Departments**: Pre-seeded organizational units:
   - Engineering (ENG), Quality Assurance (QA), Operations (OPS), Finance (FIN), Human Resources (HR)

4. **Document-Departments**: Junction records enabling documents to be assigned to multiple departments

5. **Notifications**: User notifications for document workflow events (pending, approved, declined, issued)

**Key Design Decisions**:
- String-based IDs with timestamps for uniqueness
- Soft workflow states via status field rather than separate files
- Version history maintained through `previousVersionId` self-reference
- Timestamps for all significant workflow stages
- Separate remarks fields for approval and decline paths
- Atomic operations with serialized writes to prevent data loss

### Authentication & Authorization

**Current Implementation**: Simple role-based authentication with username/password stored in JSON file. Login page accepts role selection (Creator, Approver, Issuer, Recipient, Admin).

**Session Management**: In-memory sessions (no persistent storage required)

**Authorization Pattern**: Role-based access control where UI components and API endpoints filter data based on user role. Different dashboard views for each role type with appropriate document filtering.

### External Dependencies

**Third-Party Services**:
- Google Fonts CDN: Inter and Roboto Mono font families

**Key NPM Packages**:
- `fs/promises`: Native Node.js file system operations for JSON persistence
- `drizzle-orm` & `drizzle-kit`: TypeScript schema definitions (schemas defined but not actively used with JSON storage)
- `@tanstack/react-query`: Server state management and caching
- `react-hook-form` & `@hookform/resolvers`: Form handling with Zod schema validation
- `zod` & `drizzle-zod`: Runtime type validation and schema generation
- `date-fns`: Date manipulation and formatting utilities
- Radix UI components: Unstyled, accessible component primitives for dialogs, dropdowns, popovers, etc.
- `class-variance-authority` & `clsx` & `tailwind-merge`: Utility-first CSS class management
- `cmdk`: Command palette component
- `wouter`: Lightweight routing library

**Development Tools**:
- Vite: Fast build tool and dev server with HMR
- TypeScript: Static type checking
- Tailwind CSS: Utility-first CSS framework
- PostCSS with Autoprefixer: CSS processing
- esbuild: Server-side bundling for production

**Replit-Specific Integrations**:
- `@replit/vite-plugin-runtime-error-modal`: Development error overlay
- `@replit/vite-plugin-cartographer`: Development tooling (conditional)
- `@replit/vite-plugin-dev-banner`: Development banner (conditional)