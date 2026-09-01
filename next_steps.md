# Grocery Expense Manager - Project Status & Continuation Guide

This file contains the current state of the application, the detailed requirements, and the exact steps to resume our work in the next session.

---

## 1. Project Requirements & Goals

We are building a **Grocery Expense Manager** web application on **Next.js** using a **Light, Clean, Premium SaaS Interface** based on the design system applied to Stitch project `11684811805873517374`.

### Key Features:
- **Separated Entities:** Complete data separation for **Lahore** and **Multan** (budgets, expenses, remaining balances, reports, slip uploads, history).
- **Role-Based Access (3 Roles):**
  - **Admin:** Access both entities, switch between them, set/edit monthly budgets, add/edit/delete expenses, approve missing-slip items, view and download PDF/Excel reports, and view budget history.
  - **Lahore User:** Lock to Lahore only. Can add/edit expenses, search/filter, upload slips, download reports. Cannot edit budgets, delete entries, or approve missing slips.
  - **Multan User:** Lock to Multan only. Can add/edit expenses, search/filter, upload slips, download reports. Cannot edit budgets, delete entries, or approve missing slips.
- **Overspending Logic:** Balance is calculated as `Monthly Budget - Total Spent`. Allow overspending. If remaining balance goes negative, display in bold red with a warning icon and a subtle `⚠ Over Budget` badge. Never block expense creation.
- **Slip Status System:**
  - `Slip Uploaded` (Green check icon / subtle green badge)
  - `Slip Missing` (Red warning icon / subtle red badge)
  - `Approved Without Slip` (Approved check icon / subtle neutral-blue badge, showing original slip missing but "Approved by Admin")
- **Monthly Budgets:** Changing budgets for new months must not alter historical budgets.
- **Date Filters & Search:** Search by description/details, filter by Today, This Week, This Month, Last Month, or Custom Date Ranges.

---

## 2. Current Project State

1. **Stitch Project Updated:**
   - Stitch project `projects/11684811805873517374` has been updated to the Light Theme (`Financial Precision System`) which uses `#F8FAFC` background, white card surfaces, `#16A34A` Emerald Green accent, `#DC2626` red alerts, and Inter typography.
2. **Next.js Initialization:**
   - A new Next.js project has been successfully initialized in the `grocery-expense-manager` subdirectory to bypass npm directory naming conflicts (spaces/capitals).

---

## 3. Immediate Next Steps (To Resume Work)

When we resume the session, here are the exact steps to execute:

### Step A: Finalize File Structure
Move all project files from the `grocery-expense-manager` folder to the root workspace `d:\Grocery Management` and delete the empty folder.
```powershell
Move-Item -Path "grocery-expense-manager\*" -Destination "."
Move-Item -Path "grocery-expense-manager\.*" -Destination "." -ErrorAction SilentlyContinue
Remove-Item -Path "grocery-expense-manager" -Force
```

### Step B: Interactive shadcn UI Installation
We will prompt you for the shadcn CLI commands **one by one**. You will copy and paste the commands from the website, and we will run them.
The components to install:
1. `button`
2. `input`
3. `textarea`
4. `select` (for month and entity switcher)
5. `calendar` (for date pickers)
6. `popover` (for calendar dropdown)
7. `table` (for expense tables)
8. `dialog` (for modals: Add/Edit/View details/Delete/Approve)
9. `tabs` (for navigation tabs)
10. `alert` & `alert-dialog`
11. `badge` (for status badges)
12. `card` (for dashboard metrics metrics summary cards)
13. `toast` (for success and error toast notifications)

### Step C: Design & Theme Configuration
Set up global Tailwind styles matching the `Financial Precision System` config (emerald green primary, off-white background, custom typography settings).

### Step D: State & Page Implementation
Implement pages for `/login`, `/select-entity`, `/dashboard`, `/grocery`, `/budget`, and `/reports` along with mock authentication and separate entity states.

---

## 🚀 Where We Will Continue:
When we start next time, **we will begin with Step A (moving the Next.js files to the root) and then prompt you for the shadcn CLI install command for the first component: Button.**
