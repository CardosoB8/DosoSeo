# Replit.md - Guia Essencial para Apostas Online

## Overview

This is a React-based web application focused on providing an essential guide for online betting and crash games with a responsible gambling approach. The application features a Portuguese-language interface with a professional landing page design, built using modern web technologies including React, TypeScript, and Tailwind CSS.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with custom styling via shadcn/ui

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple

### Project Structure
- **Monorepo Layout**: Single repository containing both client and server code
- **Client**: React application in `/client` directory
- **Server**: Express.js API in `/server` directory
- **Shared**: Common schemas and types in `/shared` directory

## Key Components

### Frontend Components
1. **Home Page** (`client/src/pages/home.tsx`): Main landing page with animated sections and Portuguese content about responsible gambling
2. **UI Library**: Complete shadcn/ui component suite including buttons, cards, dialogs, forms, and navigation components
3. **Responsive Design**: Mobile-first approach with Tailwind CSS
4. **Animations**: Intersection Observer-based scroll animations

### Backend Components
1. **Express Server** (`server/index.ts`): Main application server with middleware setup
2. **Storage Interface** (`server/storage.ts`): Abstracted data access layer with in-memory implementation
3. **Route Handler** (`server/routes.ts`): API route definitions (currently minimal)
4. **Vite Integration** (`server/vite.ts`): Development server setup with HMR support

### Database Schema
- **Users Table**: Basic user management with username/password authentication
- **Drizzle ORM**: Type-safe database queries and migrations
- **PostgreSQL**: Production-ready relational database

## Data Flow

1. **Client Requests**: React components make API calls using TanStack React Query
2. **API Layer**: Express.js routes handle HTTP requests and responses
3. **Data Access**: Storage interface abstracts database operations
4. **Database**: PostgreSQL stores persistent data via Drizzle ORM
5. **State Management**: React Query manages caching and synchronization

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL driver for Neon
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Data fetching and caching library
- **wouter**: Lightweight React router
- **@radix-ui/**: Accessible UI component primitives

### Development Tools
- **TypeScript**: Type safety across the entire stack
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: Fast JavaScript bundler for production builds

### Optional Integrations
- **WhatsApp**: Contact integration for user support
- **Font Awesome**: Icon library for UI elements

## Deployment Strategy

### Build Process
1. **Client Build**: Vite builds React application to `dist/public`
2. **Server Build**: ESBuild bundles Node.js server to `dist/index.js`
3. **Database**: Drizzle manages schema migrations via `db:push` command

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **NODE_ENV**: Environment flag for development/production modes

### Scripts
- `npm run dev`: Development mode with hot reload
- `npm run build`: Production build for both client and server
- `npm run start`: Production server startup
- `npm run db:push`: Database schema deployment

### Architecture Decisions

1. **Monorepo Structure**: Simplifies development and deployment by keeping related code together
2. **TypeScript Throughout**: Ensures type safety from database to UI components
3. **Drizzle ORM**: Provides type-safe database operations while remaining lightweight
4. **In-Memory Storage Fallback**: Allows development without database setup, easily replaceable with PostgreSQL
5. **shadcn/ui Components**: Provides consistent, accessible UI components with customizable styling
6. **Portuguese Localization**: Content specifically tailored for Portuguese-speaking users interested in responsible gambling

The application is designed to be easily extensible, with clear separation of concerns and a robust foundation for adding features like user authentication, content management, and advanced gambling guidance tools.