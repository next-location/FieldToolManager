# Field Tool Management Web App Development Plan

## Language Instruction 🗣️

Please conduct your thinking process in English, but **output all final responses and code explanations to the user in Japanese (日本語)**.

## Goal and Context 🎯

The primary goal is to build the frontend development environment for a web application that solves the analog tool management challenges faced by field operations (civil engineering, painting, etc.). The system must provide real-time inventory and location tracking (traceability).

### Background

- The company currently manages a large number of tools (drivers, sanders, etc.) manually, making it difficult to track their quantity and location (site vs. warehouse).
- Tool movement between sites and the warehouse by approximately 20 staff members is complex to manage.
- **Key Solution:** Every tool will be assigned a unique ID and a QR code, enabling staff to use their smartphones to easily scan tools for check-in/check-out operations.

## Technology Stack 🛠️

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS

---

## Task List (Instructions for Claude) 📝

### 1. Initial Setup Procedure and Commands

Provide the necessary **steps and terminal commands**, including dependency installation, required for setting up a new Next.js project using the specified technology stack (Next.js + TypeScript + Tailwind CSS).

### 2. package.json Proposal

Propose the content for the **`package.json`** file, defining the basic development settings and dependencies, to be placed in the project's root directory.

### 3. Tailwind CSS Configuration Files

Propose the basic configurations for the following files to ensure Tailwind CSS functions correctly with Next.js:

- `tailwind.config.ts`
- `postcss.config.js`

### 4. Basic UI Components Proposal (Layout and Dashboard Skeleton)

Propose the content for the following components, built using Tailwind CSS and considering **responsive design** and **Japanese font display**.

- **`app/layout.tsx`**:
  - Must include the basic HTML structure and settings for displaying Japanese fonts (e.g., integrating a Google Font like Noto Sans JP).
  - Should contain placeholders for a consistent **Header** (App Name, Navigation) and **Footer** applied across the entire application.
- **`app/page.tsx`** (Main Dashboard Skeleton):
  - Construct a **simple UI** using Tailwind CSS to display the following information:
    - Display boxes for **Inventory Summary** (Total Stock, In-Use at Sites, Stock at Company Warehouse).
    - A notification area for **Low Stock Alerts** (needs ordering).

### 5. Documentation Structure Recognition and Planning

The project will use a dedicated `docs/` folder for comprehensive documentation, crucial for scalability and multi-person management. Please acknowledge this structure and be prepared to assist in generating content for these files in subsequent steps.

- **`docs/ARCHITECTURE.md`**: System's overall design, data flow, backend integration (future), database schema (future), and main directory structure explanation.
- **`docs/CONTRIBUTING.md`**: Development rules and contribution procedures, including coding conventions, branch strategy (e.g., Git Flow), and Pull Request submission guidelines.
- **`docs/FEATURES.md`**: Detailed functional requirements (specs) for core features (Tool Master, Inventory/Location, In/Out Tracking), screen transitions, and QR code reading logic.
- **`docs/MANUAL.md`**: User manual describing specific operational procedures for both field staff and administrators.

---

## Project Documentation Files Overview 📚

### Core Documentation Files and Their Purposes

#### 1. **`CLAUDE.md`** (This File)
- **Purpose**: Instructions and context for Claude AI
- **Content**: Language preferences, project goals, technology stack, and task list
- **Usage**: Always refer to this file first when starting a new conversation with Claude

#### 2. **`docs/SPECIFICATION.md`**
- **Purpose**: Initial single-company version specification (DEPRECATED)
- **Content**: Original tool management system design for a single construction company
- **Status**: Superseded by SPECIFICATION_SAAS_FINAL.md

#### 3. **`docs/SPECIFICATION_SAAS_FINAL.md`** ⭐ MAIN SPEC
- **Purpose**: Final SaaS multi-tenant system specification (ACTIVE)
- **Content**:
  - Complete system architecture for multi-tenant SaaS
  - Security features (UUID-based QR codes, RLS, audit logs)
  - Contract management and billing system (invoice-based)
  - Data models including Contract, Invoice, PaymentRecord tables
  - Implementation phases and roadmap
- **Usage**: This is the PRIMARY specification document for development

#### 4. **`docs/ADDITIONAL_FEATURES_SPEC.md`**
- **Purpose**: Future features specification (post-launch)
- **Content**:
  - Stripe payment integration details
  - Automatic subscription management
  - Credit card processing features
- **Implementation Timing**: When customer base reaches 30+ companies

#### 5. **`scripts/github-project-tasks.md`**
- **Purpose**: GitHub Project management and task tracking
- **Content**:
  - CLI commands for creating issues and milestones
  - Task lists organized by development phases
  - GitHub labels configuration
  - Automation scripts for project management
- **Usage**: Reference for managing GitHub Projects and tracking development progress

#### 6. **`prototype/`** Directory
- **Purpose**: UI/UX prototype code and mockups
- **Content**: HTML/CSS prototypes for testing user interfaces
- **Status**: Reference implementation (not production code)

#### 7. **`docs/ENVIRONMENT_SETUP.md`** ⭐ CRITICAL
- **Purpose**: Complete environment setup and deployment guide
- **Content**:
  - Docker environment configuration
  - Environment variable management
  - Database migration strategies
  - CI/CD pipeline setup
  - Testing strategies (E2E, RLS, Unit tests)
  - Monitoring and error tracking
  - Production deployment checklist
- **Usage**: MUST follow this guide to minimize local vs production environment differences
- **Priority**: Set up environment BEFORE starting development

#### 8. **`docs/UI_DESIGN.md`**
- **Purpose**: UI design specifications and implementation guidelines
- **Content**:
  - Responsive design principles
  - Component architecture
  - Feature flag-based UI system
  - Device-specific menu systems
  - Performance optimization strategies
- **Usage**: Reference for all UI/UX implementation decisions

#### 9. **`docs/ROLE_BASED_ACCESS_CONTROL.md`** ⭐ CRITICAL
- **Purpose**: Complete role-based access control (RBAC) specification
- **Content**:
  - User roles definition (staff, leader, admin, super_admin)
  - 75 features with detailed permission matrix
  - Role-specific UI/UX layouts
  - API endpoint permissions
  - Security implementation guidelines
- **Usage**: MUST implement according to this specification for all features
- **Note**: This document defines WHO can access WHAT in the system

#### 10. **`docs/DATABASE_SCHEMA.md`** ⭐ CRITICAL
- **Purpose**: Complete database schema design and management
- **Content**:
  - ER diagram for multi-tenant architecture
  - All table definitions (SQL)
  - TypeScript type definitions
  - Index design for performance
  - Row Level Security (RLS) policies
  - Constraints and validation rules
- **Usage**: MUST reference when working with database
- **Note**: THIS DOCUMENT MUST BE UPDATED whenever table structure or columns are modified

#### 11. **`docs/MIGRATIONS.md`** ⭐ CRITICAL
- **Purpose**: Database migration management and version control
- **Content**:
  - Migration strategy (dev → test → staging → production)
  - Environment-specific migration procedures
  - Complete migration history with SQL
  - Rollback procedures
  - Troubleshooting guide
- **Usage**: MUST reference when applying database changes
- **Note**: THIS DOCUMENT MUST BE UPDATED whenever migrations are created or executed

#### 12. **`docs/STAFF_MANAGEMENT.md`** ⭐ NEW
- **Purpose**: Staff management feature specification (Phase 8)
- **Content**:
  - Plan-based staff limits (basic: 10, standard: 30, premium: 100)
  - Role-based permissions (admin/leader/staff)
  - Database design (users table extensions, user_history table)
  - UI/UX design (staff list, add/edit modals, history tracking)
  - CSV bulk import functionality
  - Future integration with attendance tracking (time card)
- **Usage**: MUST reference when implementing staff management features
- **Note**: Extends existing users table with new columns and adds audit logging

#### 13. **`docs/WORK_REPORT_SPEC.md`** ⭐ 作業報告書機能仕様
- **Purpose**: 作業報告書機能の完全な設計書
- **Content**:
  - ハイブリッド方式の設計（コア項目 + オプション項目 + カスタムフィールド）
  - データベース設計（work_reports, work_report_photos, work_report_attachments, organization_report_settings）
  - 機能仕様（作成、一覧、詳細、承認フロー、PDF出力）
  - 画面設計（ワイヤーフレーム付き）
  - 段階的実装計画（Phase 1-4）
  - 写真・資料アップロード機能
  - 業種別カスタマイズ対応
- **Usage**: 作業報告書機能の実装時に必ず参照
- **Note**: 建築業をはじめ様々な現場系業種に対応できる汎用的な設計

### Development Priority

1. **Environment Setup**: Follow `docs/ENVIRONMENT_SETUP.md` FIRST
2. **Start with**: `SPECIFICATION_SAAS_FINAL.md` as the main reference
3. **Database Design**: Reference `DATABASE_SCHEMA.md` for all table structures
4. **Database Changes**: Update `MIGRATIONS.md` when creating or executing migrations
5. **Access Control**: Implement features according to `ROLE_BASED_ACCESS_CONTROL.md`
6. **UI Implementation**: Follow `UI_DESIGN.md` for consistent user experience
7. **Implement**: Phases 1-5 as outlined in the specification
8. **Defer**: Stripe integration (see `ADDITIONAL_FEATURES_SPEC.md`) until customer growth
9. **Track progress**: Using `scripts/github-project-tasks.md`

### Important Notes for Claude

- **Language**: Always respond in Japanese (日本語) for final outputs
- **Main Spec**: Always use `SPECIFICATION_SAAS_FINAL.md` as the source of truth
- **Database Design**: Always reference `DATABASE_SCHEMA.md` when working with database tables
- **Database Migrations**: Always update `MIGRATIONS.md` when modifying database schema
- **Payment Method**: Initial implementation uses invoice-based billing (請求書払い), NOT Stripe
- **Security**: Emphasize UUID-based QR codes, RLS, and audit logging
- **Multi-tenant**: System is designed for multiple companies (SaaS model)

### 🚨 CRITICAL: Database Documentation Maintenance

When working with database:
1. **Before modifying tables**: Check `DATABASE_SCHEMA.md` for current structure
2. **After modifying tables**: Update BOTH `DATABASE_SCHEMA.md` AND `MIGRATIONS.md`
3. **When creating migrations**: Document the migration in `MIGRATIONS.md` with SQL and rollback procedures
4. **Before deployment**: Verify all changes are documented in both files

Failure to update these files will result in:
- Documentation drift from actual database state
- Difficulty in troubleshooting issues
- Migration conflicts in team development
- Production deployment failures
