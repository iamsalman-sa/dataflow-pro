# Overview

This is a full-stack web application for transferring data between Google Sheets. It provides a user-friendly interface to select source and destination spreadsheets, filter data by date ranges, preview data before transfer, and execute copy/move operations with real-time progress tracking. The application features a modern dark theme with glassmorphism effects and comprehensive validation and error handling.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management with custom hooks for API interactions
- **UI Framework**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **Design System**: Dark theme with glassmorphism effects, gradient backgrounds, and smooth animations
- **Component Structure**: Modular component architecture with specialized components for spreadsheet operations (source selection, destination selection, data preview, progress tracking)

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **API Design**: RESTful API with structured error handling and request/response logging
- **Development Setup**: TypeScript with tsx for development server and esbuild for production builds
- **Data Simulation**: Google Apps Script service simulation for spreadsheet operations (ready for real Google Sheets API integration)

## Data Storage Solutions
- **ORM**: Drizzle ORM configured for PostgreSQL with type-safe schema definitions
- **Database**: PostgreSQL with Neon Database serverless integration
- **Schema**: Three main entities - spreadsheets, sheets, and transfers with proper relationships
- **Migrations**: Drizzle Kit for database schema management and migrations
- **Development Storage**: In-memory storage implementation for development/testing with sample data

## Authentication and Authorization
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple
- **Security**: CORS configuration and request validation using Zod schemas
- **API Protection**: Structured error handling with proper HTTP status codes

## External Dependencies
- **Google Sheets Integration**: Simulated Google Apps Script service (ready for Google Sheets API)
- **UI Components**: Comprehensive Radix UI component library for accessibility
- **Form Handling**: React Hook Form with Zod resolvers for validation
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **Development Tools**: Replit-specific plugins for development environment integration
- **Database**: Neon Database for serverless PostgreSQL hosting
- **Build Tools**: Vite for frontend bundling and esbuild for backend compilation