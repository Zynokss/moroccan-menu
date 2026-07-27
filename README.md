# Warehouse Express — B2B Logistical Core & Smart Catalog

A modern, full-stack B2B digital catalog, client access key management, and real-time order fulfillment platform built for warehouse and store owners. Designed for seamless client ordering and live inventory dispatching.

---

## Features

* **Smart Public B2B Catalog:** Key-authenticated terminal for wholesale clients to browse inventory, save favorites, build order manifests, and submit orders directly to Supabase or WhatsApp.
* **Client & Key Directory (Admin):**
  * Cryptographically secure random key generator (`WE-XXXXXX`) or custom key assignment.
  * Built-in duplicate key validation against the database.
  * Complete client roster management (CRUD) for tracking company names, phone numbers, and delivery addresses.
* **Owner Orders Command Center:**
  * Real-time order sync using Supabase Realtime subscriptions.
  * Interactive status workflow (`pending`, `fulfilled`, `cancelled`).
  * Stock availability checks against active inventory.
  * Direct one-click WhatsApp client messaging with pre-filled order summaries.
  * Printable paper manifest receipts for warehouse pickers.
* **Master PIN Security Gate:** Passcode-protected admin routes verified against Supabase database settings with automatic session wiping on tab/browser close (`sessionStorage`).
* **Bilingual & Responsive UI:** Instant toggling between Arabic (RTL) and English (LTR) with dark/light theme support and Framer Motion micro-interactions.

---

## Tech Stack

* **Framework:** Next.js (App Router & Client Components)
* **Styling & Motion:** Tailwind CSS & Framer Motion
* **Backend & Database:** Supabase (PostgreSQL & Realtime Subscriptions)
* **Icons:** Lucide React
* **Deployment:** Vercel

---

## Database Schema Overview

The system runs on four main Postgres tables managed via Supabase Row Level Security (RLS):

* `products` — Inventory items, prices, SKUs, and images.
* `clients` — Client company directory, phone numbers, delivery addresses, and access keys.
* `orders` — Requisition order manifests, statuses, client key references, and totals.
* `store_settings` — Master store owner authentication PINs and app settings.

---

## Getting Started

### 1. Clone the repository
git clone https://github.com/Zynokss/warehouse-express.git
cd warehouse-express

### 2. Install dependencies
npm install

### 3. Set up environment variables
Create a `.env.local` file in the root directory:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

### 4. Run the development server
npm run dev