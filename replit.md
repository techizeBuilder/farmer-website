# Harvest Direct: Farm-to-Table E-commerce Platform

## Overview

Harvest Direct is a full-stack e-commerce application that connects consumers directly with traditional farmers, enabling them to purchase authentic, preservative-free products like coffee, spices, and grains. The platform focuses on showcasing the stories behind traditional farming methods and providing a seamless shopping experience. The application now includes SMS OTP verification for enhanced security during user registration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a client-server architecture:

1. **Frontend**: React-based SPA (Single Page Application) using modern UI components from shadcn/ui and styled with Tailwind CSS.

2. **Backend**: Express.js server handling API requests and serving the frontend.

3. **Data Layer**: Drizzle ORM with a PostgreSQL database (configured but not fully implemented).

4. **State Management**: Combination of React Query for server state and React Context for local state.

5. **Routing**: Uses Wouter for client-side routing.

The application is designed to be deployed on Replit with configurations for both development and production environments.

## Key Components

### Frontend

1. **Pages**:
   - Home (`client/src/pages/home.tsx`): Landing page showcasing featured products and farmers
   - Product Detail (`client/src/pages/product-detail.tsx`): Detailed view of a specific product
   - All Products (`client/src/pages/all-products.tsx`): Product catalog with filtering capabilities
   - All Farmers (`client/src/pages/all-farmers.tsx`): Directory of farmers with their stories
   - Checkout (`client/src/pages/checkout.tsx`): Order processing and payment

2. **Components**:
   - UI Components: Extensive collection of reusable UI components using shadcn
   - Cart: Shopping cart functionality with add/remove/update capabilities
   - ProductCard: Card displaying product information
   - FarmerCard: Card displaying farmer information
   - Layout: Common layout wrapper for consistent header and footer

3. **Context**:
   - CartContext (`client/src/context/CartContext.tsx`): Manages cart state and operations

### Backend

1. **API Routes** (`server/routes.ts`):
   - Product routes: CRUD operations for products
   - Farmer routes: Retrieve farmer information
   - Cart routes: Manage shopping cart actions

2. **Data Storage** (`server/storage.ts`):
   - In-memory storage implementation for development
   - Interface prepared for database integration

3. **Data Schemas** (`shared/schema.ts`):
   - Product schema
   - Farmer schema
   - Cart schema
   - Testimonial schema
   - Newsletter subscription schema

## Data Flow

1. **Product Browsing**:
   - Frontend makes API requests to fetch products/farmers
   - React Query caches the results
   - User interacts with products (filtering, viewing details)

2. **Shopping Cart**:
   - User adds items to cart
   - CartContext manages local cart state
   - Cart data is synchronized with server via API calls
   - Cart persists using session ID stored in localStorage

3. **Checkout Process**:
   - Form data validation using React Hook Form and Zod
   - Order submission via API
   - Success/failure handling

## External Dependencies

### Frontend
- React and React DOM for UI
- Tailwind CSS for styling
- shadcn/ui components (based on Radix UI)
- React Query for data fetching
- Wouter for routing
- Framer Motion for animations
- React Hook Form and Zod for form validation

### Backend
- Express.js for API server
- Drizzle ORM for database operations
- Vite for development and building

## Deployment Strategy

The application is configured for deployment on Replit:

1. **Development Mode**:
   - `npm run dev` starts both backend and frontend in development mode
   - Vite provides hot module reloading

2. **Production Mode**:
   - `npm run build` builds both frontend and backend
   - Frontend assets are built to `dist/public`
   - Backend is bundled to `dist/index.js`
   - `npm run start` serves the production build

3. **Database**:
   - Configured to use PostgreSQL, but currently using in-memory storage
   - Database URL is expected in environment variables

The deployment is configured via `.replit` file, which specifies the necessary Replit modules (Node.js, PostgreSQL) and deployment settings.

## Recent Changes

### SMS OTP Verification Implementation (July 2, 2025)

Added comprehensive SMS OTP verification system for enhanced security:

**Backend Implementation:**
- Created Twilio SMS service (`server/smsService.ts`) for sending and verifying OTP codes
- Added SMS verification database table for tracking OTP codes with expiration
- Updated user schema to include mobile number and mobile verification status
- Implemented OTP verification API endpoints (`/api/auth/send-otp`, `/api/auth/verify-otp`)
- Enhanced registration process to require mobile number and OTP verification

**Frontend Implementation:**
- Added mobile number field to registration form (positioned between email and password)
- Created reusable OTP input component (`client/src/components/ui/otp-input.tsx`)
- Enhanced registration flow with two-step process: form submission → OTP verification
- Added proper validation for 10-digit Indian mobile numbers (starting with 6-9)
- Implemented user-friendly OTP verification UI with resend functionality

**Security Features:**
- OTP codes expire after 10 minutes
- Mobile number format validation (Indian mobile numbers)
- Proper error handling for invalid/expired OTP codes
- Secure OTP generation and verification process

**External Dependencies:**
- Twilio API integration for SMS services
- Required environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER

### Password Change with SMS OTP Feature (July 2, 2025)

Added secure password change functionality to user profile section:

**Backend Implementation:**
- Created `/api/auth/change-password` endpoint with authentication required
- Integrated with existing SMS OTP verification system
- Added current password verification before allowing change
- Secure password hashing using bcrypt

**Frontend Implementation:**
- Enhanced profile page with dedicated password change card
- Two-step process: password form → SMS OTP verification
- Reusable OTP input component integration
- User-friendly interface with proper error handling and loading states
- Cancel functionality to abort password change process

**Security Features:**
- Current password verification required
- SMS OTP verification for additional security
- Proper error messaging for invalid attempts
- Secure password validation and confirmation matching