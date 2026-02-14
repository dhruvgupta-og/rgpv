# RGPV Papers

## Overview

RGPV Papers is a mobile-first application for browsing and accessing past exam papers from RGPV (Rajiv Gandhi Proudyogiki Vishwavidyalaya). Users can browse engineering branches (like CS, IT, ECE, etc.), select semesters, view subjects with their syllabus, and access previous year question papers as PDFs. The app supports bookmarking subjects for quick access and searching across all subjects.

The project is a full-stack application with an Expo React Native frontend (targeting iOS, Android, and web) and an Express.js backend with a PostgreSQL database managed through Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with React Native 0.81, using the new architecture
- **Routing**: expo-router v6 with file-based routing and typed routes
  - Tab-based navigation with three tabs: Home, Search, and Bookmarks
  - Dynamic routes for `/branch/[id]` and `/subject/[id]`
  - Supports native tab bars via `expo-router/unstable-native-tabs` with liquid glass when available, falling back to classic tabs
- **State Management**: 
  - Server state via `@tanstack/react-query` for all API data fetching
  - Local bookmarks state via React Context + `AsyncStorage` (persisted locally on device)
- **Styling**: Dark theme throughout using a centralized color palette in `constants/colors.ts`. No CSS-in-JS library; uses React Native `StyleSheet.create`
- **Fonts**: Inter font family (400, 500, 600, 700 weights) loaded via `@expo-google-fonts/inter`
- **Animations**: `react-native-reanimated` for entry animations (e.g., `FadeInDown` on syllabus units)
- **Haptics**: `expo-haptics` for touch feedback on interactive elements (disabled on web)
- **API Communication**: Custom `apiRequest` helper and `getQueryFn` factory in `lib/query-client.ts` that constructs URLs from `EXPO_PUBLIC_DOMAIN` environment variable

### Backend (Express.js)

- **Runtime**: Node.js with TypeScript (compiled via `tsx` in dev, `esbuild` for production)
- **Framework**: Express v5
- **API Design**: RESTful JSON API under `/api/` prefix
  - CRUD endpoints for branches, subjects, syllabus units, and papers
  - File upload support for PDF papers via `multer` (stored in `uploads/` directory, max 20MB, PDF only)
  - Static file serving for uploaded PDFs at `/uploads/`
- **Admin Panel**: Server-rendered HTML admin interface at `/admin` (served from `server/templates/admin.html`) for managing branches, subjects, syllabus, and papers
- **CORS**: Dynamic CORS handling that allows Replit domains and localhost origins for development
- **Storage Layer**: Abstracted in `server/storage.ts` using a simple object with async methods wrapping Drizzle queries

### Database

- **Database**: PostgreSQL (provisioned via Replit)
- **ORM**: Drizzle ORM with `drizzle-zod` for schema validation
- **Schema** (in `shared/schema.ts`):
  - `users` — Basic auth table (id, username, password)
  - `branches` — Engineering branches (id, name, shortName, icon, color)
  - `subjects` — Subjects linked to branches with semester info
  - `syllabus_units` — Unit-wise syllabus with topics stored as JSONB array
  - `papers` — Past exam papers with year, month, exam type, and optional PDF path
- **Migrations**: Managed via `drizzle-kit push` (schema push approach, not migration files)
- **Connection**: `pg.Pool` with `DATABASE_URL` environment variable

### Build & Deployment

- **Development**: Two processes run simultaneously — Expo dev server for the mobile app and Express server for the API
- **Production Build**: 
  - Frontend: Custom build script (`scripts/build.js`) that uses Metro bundler for static web export
  - Backend: Bundled with esbuild to `server_dist/`
- **Environment Variables**:
  - `DATABASE_URL` — PostgreSQL connection string
  - `EXPO_PUBLIC_DOMAIN` — Domain for API requests from the client
  - `REPLIT_DEV_DOMAIN` / `REPLIT_DOMAINS` — Used for CORS and build configuration

### Shared Code

- `shared/schema.ts` contains database schema and types shared between frontend and backend
- `lib/rgpv-data.ts` defines TypeScript interfaces used on the frontend that mirror the database models

## External Dependencies

- **PostgreSQL** — Primary database, connected via `DATABASE_URL` environment variable
- **AsyncStorage** (`@react-native-async-storage/async-storage`) — Local device storage for bookmarks persistence
- **Multer** — File upload middleware for PDF paper uploads, stored on disk in `uploads/` directory
- **Drizzle ORM + drizzle-kit** — Database ORM and schema management tool
- **TanStack React Query** — Server state management and caching for API requests
- **Expo ecosystem** — Comprehensive set of Expo modules for native functionality (haptics, image picker, linear gradient, blur, splash screen, status bar, web browser, etc.)
- **patch-package** — Applied via `postinstall` script for patching node_modules