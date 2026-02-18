# Cursor Context: Otonbu-Antigravity

This file provides comprehensive context for AI assistants working on the Otonbu-Antigravity project. It details the architecture, recent changes, database schema, and current state.

## 1. Project Overview

*   **Type**: Car Wash Management System (SaaS / Multi-Branch)
*   **Stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn/UI.
*   **Backend**: Supabase (PostgreSQL), Auth, Row Level Security (RLS).
*   **Deployment**: Vercel.

## 2. Core Architecture

### Branch System
*   **Multi-Tenancy**: The system is multi-tenant based on `branches`.
*   **Data Isolation**: Most tables (`jobs`, `customers`, `cars`, `staff_profiles`) have a `branch_id` column.
*   **Row Level Security (RLS)**: Enforces that users can only access data for their assigned branch.
    *   **Super Admin**: Can access ALL branches (bypass RLS via `is_super_admin()` function).
    *   **Partner**: Treated as Restricted Super Admin (see Roles below).
    *   **Branch Admin/Manager**: Scope limited to their `branch_id`.

### User Roles (`StaffRole`)
Defined in `src/types/index.ts`:
1.  **Super Admin**: Full system access. Can create other Super Admins.
2.  **Partner** (New): Full system access (Branches, Services, Settings). **Restriction**: Cannot create other Super Admins or Partners.
3.  **Branch Admin**: Full access to *their specific branch*.
4.  **Manager**: Operational access (Jobs, Staff) within their branch.
5.  **Staff**: Basic operational access (Update job status).

## 3. Key Features & Recent Changes

### A. Universal Services (Migration 013)
*   **Global Services**: Services with `branch_id IS NULL` are "Universal" (created by Super Admin).
*   **Branch Visibility**: The `branch_services` junction table toggles visibility/custom pricing per branch.
*   **Logic**:
    *   `getServices` (Admin): Shows Global + Branch-specific.
    *   `getAvailableServices` (Dashboard): Shows only active services for current branch (inherits Global unless unchecked).

### B. Unified Services (Migration 014, 016)
*   **Legacy**: `service_types` table (Deprecated).
*   **Current**: `services` table is the single source of truth.
*   **Jobs/Appointments**: Now link to `services(id)` via `service_id` column.
*   **Status**: `jobs.service_type_id` is now NULLABLE (Migration 016) to allow new jobs to use `service_id` without error.

### C. Partner Role (Migration 015)
*   **Implementation**: Added `partner` to `staff_profiles` role enum.
*   **Database**: Updated `is_super_admin()` function to return `true` for Partners (granting them RLS bypass).
*   **Code**: `src/app/actions/admin.ts` enforces that Partners cannot grant `super_admin` role.

### D. Invite-Only Auth
*   **No Public Signup**: Registration page removed.
*   **Staff Creation**: Admins create staff via `upsertStaffProfile`. This uses `supabase.auth.admin.createUser` to generate the Auth User and links it to the Profile.

## 4. Critical Files

*   **`src/app/actions/admin.ts`**: Core logic for Admin Panel (Staff, Services, Branches). Contains `requireAdmin` permission guard.
*   **`src/app/actions/jobs.ts`**: Core logic for Dashboard (Job creation, status updates).
*   **`src/contexts/BranchContext.tsx`**: Client-side context for current branch selection and permission flags (`isSuperAdmin`).
*   **`src/types/index.ts`**: TypeScript definitions for all database models.

## 5. Database Schema & Migrations

The database is managed via SQL migration files in the root.
**Critical Recent Migrations**:
*   `migration_013_global_services.sql`: Adds `branch_services` junction.
*   `migration_014_unify_services.sql`: Adds `service_id` to jobs/appointments.
*   `migration_015_add_partner_role.sql`: Adds 'partner' role and updates `is_super_admin`.
*   `migration_016_make_service_type_nullable.sql`: Relaxes constraint on old `service_type_id`.

## 6. Known State / Next Steps

*   **Service Types Cleanup**: `service_types` table is deprecated but not dropped. Future work should migrate any old data and drop the table.
*   **Locations vs Branches**: User confusion exists. "Locations" are sub-units of Branches (for working hours). UI might need simplification to hide Locations if 1:1 with Branches.
*   **Linting**: Some minor linting errors might persist in Admin Actions regarding duplicate object keys (fixed recently but check).

## 7. How to Verify Use Cases

*   **Create Service**: Go to Admin -> Services. Create "Global" service (as Super Admin).
*   **Create Job**: Go to Dashboard -> Quick Entry. Select the Global Service.
*   **Partner Access**: Login as Partner. Verify access to "Branches" menu. Verify inability to create "Super Admin" user in Staff page.
