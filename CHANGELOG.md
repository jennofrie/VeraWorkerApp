# Changelog

All notable changes to the VeraWorkerApp project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-19

### Added

#### Authentication & User Management
- Email/password authentication using Supabase Auth
- Worker profile management with photo and display name editing
- Account deletion functionality for App Store compliance
- Safe Supabase client wrapper with configuration validation
- Session persistence with AsyncStorage (native) and browser storage (web)
- Automatic session refresh and timeout handling

#### Core Features
- Location-based clock in/out with GPS tracking for NDIS compliance
- Shift tracking with notes, duration calculation, and location coordinates
- Worker schedule viewing (week view with Monday-Sunday navigation)
- Timesheet management with week-based grouping and hour calculations
- Shift notifications toggle in user preferences
- Profile photo selection from device library

#### UI/UX Improvements
- Glassmorphism modal design for shift notes
- Animated hero button with long-press progress indicator for clock in/out
- Breathing animation for active shift button
- Drawer navigation menu with profile section
- Week picker for schedule and timesheet views
- Pull-to-refresh functionality on schedule and timesheet screens
- Haptic feedback for all interactions
- Splash screen with extended timing (2 seconds) for App Store compliance

#### Technical Infrastructure
- Expo Router file-based routing
- Custom hooks: `useWorkerSchedules`, `useWorkerShifts`, `useTimesheets`
- Retry logic with exponential backoff for network operations
- Network error detection and user-friendly error messages
- Timeout handling (5s for auth, 30s for schedules, 20s for other queries)
- Error boundary component for crash prevention
- Platform-specific implementations (web vs native)

#### Database & Security
- Row-Level Security (RLS) policies for all tables
- Security definer functions: `get_auth_user_email()`, `worker_belongs_to_user()`
- Email-based worker authentication matching
- Foreign key constraints with CASCADE deletion
- Database migration scripts in `SQL/` folder

#### Documentation
- Comprehensive README with setup instructions
- Database schema documentation
- RLS policy setup guides
- Migration guides in `MarkDown/` folder
- SQL scripts for database setup and fixes

### Changed

#### Authentication Flow
- Migrated from UUID-based authentication to email/password (Supabase Auth)
- Optimized login flow: check AsyncStorage first (fast) before network call
- Added timeout protection for session checks (5 seconds max)
- Improved error messages for authentication failures

#### Logout Functionality
- **Critical Fix**: Resolved logout navigation issue using `expo-updates` reload
- Production builds use `Updates.reloadAsync()` for complete app restart
- Development mode uses fallback navigation
- Web platform uses hard page reload (`window.location.href = '/'`)

#### Build & Deployment
- Added EAS (Expo Application Services) configuration
- Configured for TestFlight deployment
- Added Netlify deployment configuration for web
- Disabled new architecture for iOS build stability
- Added babel configuration
- Installed react-native-svg dependency

#### App Store Compliance
- Updated login screen messaging: "invite-only NDIS platform" (removed free trial reference)
- Added account deletion feature
- Fixed Privacy Policy and Terms of Service links
- Extended splash screen timing to meet App Store requirements
- Added proper permission descriptions for location and photo library access

### Fixed

#### Critical Bugs
- Logout button navigation issue (17+ debugging attempts, resolved with app reload)
- Schedule display issues and week navigation improvements
- Web build compatibility issues
- iOS build failures (disabled newArch, added babel config)
- EAS build cache issues
- Location handling crashes (crash-free implementation)
- Mobile app stability issues

#### Error Handling
- Comprehensive error handling throughout the app
- Network timeout detection and retry logic
- Permission error handling
- Database query error messages
- User-friendly error messages for all failure scenarios

#### Database Issues
- Fixed foreign key constraint issues
- Fixed RLS policy permission errors
- Fixed schema permission issues
- Added missing shift columns (location, duration)

### Security

- Implemented Row-Level Security (RLS) on all database tables
- Email-based authentication matching between `auth.users` and `workers` table
- Security definer functions for safe auth.users access
- Anonymous read access for login (before authentication)
- Authenticated-only access for worker data after login

### Database

#### Tables
- `workers`: Worker accounts with id, name, email, created_at
- `shifts`: Clock in/out records with location, notes, duration
- `worker_schedules`: Scheduled shifts from CRM with status tracking

#### RLS Policies
- Workers table: Anonymous reads for login, authenticated reads by email match
- Shifts table: Workers can only insert/update/read their own shifts
- Worker schedules table: Workers can only read their own schedules

#### Functions
- `get_auth_user_email()`: Security definer function to get authenticated user's email
- `worker_belongs_to_user(worker_uuid)`: Validates worker ownership by email match

## [1.1.0] - 2025-12-26

### Added

#### Document Management System
- **Document upload functionality** for workers (PDF and Word documents)
- **My Documents screen** with document list, upload, and view capabilities
- **Document storage** in Supabase Storage bucket (`worker-documents`)
- **Document metadata tracking** in `worker_documents` database table
- **Document viewing** using `expo-web-browser` for reliable PDF/document display
- **Document limit enforcement** (10 documents per worker, 10MB per file)
- **SQL schema and RLS policies** for document management (`SQL/CREATE_WORKER_DOCUMENTS.sql`)
- **Custom hook** `useWorkerDocuments` for document CRUD operations

#### Documentation
- **Comprehensive ARCHITECTURE.md** with system design, flows, and technical details
- **Detailed CHANGELOG.md** following Keep a Changelog format
- **Document upload flow diagrams** and implementation details

### Changed

#### Critical Bug Fixes
- **Fixed 0-byte file upload bug on iOS** (CRITICAL)
  - Replaced unreliable `fetch(file.uri)` with `expo-file-system` File class
  - Proper base64 to binary blob conversion for file uploads
  - Added blob size validation to prevent empty file uploads
  - Uses actual blob size in database instead of reported file size
  - **Impact**: All documents uploaded before this fix had 0 bytes; users need to re-upload

#### TypeScript Improvements
- **Fixed Drawer `onLogout` prop** missing in 9 screen components
  - Added `handleLogout` function and `onLogout` prop to all tabs using Drawer
  - Fixed navigation issues from Modal context
  - Files: `about.tsx`, `availability.tsx`, `client-detail.tsx`, `document-hub.tsx`, `job-board.tsx`, `my-documents.tsx`, `my-forms.tsx`, `notification.tsx`, `timesheet.tsx`
- **Fixed duplicate StyleSheet properties**
  - `client-detail.tsx`: Renamed duplicate `clockInButton` to `clockInActionButton`
  - `schedule.tsx`: Renamed duplicate `weekRangeText` to `weekRangeModalText`
- **Fixed missing style properties**
  - `timesheet.tsx`: Added missing `weekRangeText` style
  - `WorkerLoginModal.tsx`: Added missing `inputContainer` style
- **Simplified error handling** in `clock-in.tsx`
  - Removed redundant error checks since `retryOperation` already throws on failure
- **Fixed route type error** in `client-detail.tsx`
  - Changed `router.replace('/(tabs)/')` to `router.replace('/')`
- **Excluded `todelete/` folder** from TypeScript compilation

#### Code Quality
- **Removed orphaned code** from `index.tsx`
  - Removed unused `handleDeleteShift` function and delete button
  - Shifts are now read-only from database (admin-only deletion)

#### Version Management
- **Bumped version** from `1.0.0` to `1.1.0` in `app.json`
- **Build number** incremented to 18 for TestFlight/App Store submission

### Fixed

#### Critical Bugs
- **Document upload 0-byte files bug** (iOS/Android)
  - Files were being uploaded but contained no data (0 bytes in storage)
  - Database showed correct metadata but storage files were empty
  - Fixed by using proper file reading with `expo-file-system` instead of `fetch()`

#### TypeScript Compilation Errors
- All TypeScript errors resolved (0 errors)
- Improved type safety across the application
- Better error handling with proper type annotations

### Security

#### Document Storage Security
- **RLS policies** for `worker_documents` table
  - Workers can only read/insert/delete their own documents
  - Email-based ownership validation using `worker_belongs_to_user()`
- **Storage bucket RLS policies**
  - Workers can only upload to their own folder (folder name = worker ID)
  - Workers can only read/delete from their own folder
  - Prevents unauthorized access to other workers' documents

### Dependencies

#### Added
- `expo-file-system` (~19.0.21): Reliable file reading on iOS/Android
- `expo-document-picker` (~14.0.8): Document selection from device
- `expo-web-browser` (~15.0.10): In-app browser for document viewing

### Database

#### New Table
- **`worker_documents`**: Document metadata storage
  - Tracks file name, type, size, storage path
  - Links documents to workers via `worker_id` foreign key
  - Supports optional title and description
  - Tracks uploader and timestamps

#### New Storage Bucket
- **`worker-documents`**: Private Supabase Storage bucket
  - Organized by worker ID folders
  - MIME type restrictions: PDF and Word documents only
  - 10MB file size limit
  - RLS policies enforce folder-level access control

---

## [Unreleased]

### Known Issues
- Development mode (Expo Go) logout may still exhibit navigation issues (acceptable for dev)
- Web platform requires AsyncStorage polyfill considerations
- Documents uploaded before v1.1.0 (build 18) have 0-byte files and need to be re-uploaded

### Future Improvements
- Real-time schedule updates via Supabase subscriptions
- Push notifications for shift reminders
- Offline mode support
- Enhanced error recovery mechanisms
- Document preview improvements
- Bulk document operations

---

## Version History

- **1.1.0** (2025-12-26): Document management system, critical iOS upload bug fix, TypeScript improvements, comprehensive documentation
- **1.0.0** (2025-12-19): Initial production release with core features, App Store compliance, and critical bug fixes

