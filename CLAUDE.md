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
