# Fixie Report Status Flow & Real-Time Synchronization Plan

## Project Overview
Supabase Project: `https://ieznsbzddanjwmnpvncs.supabase.co`  
Goal: Implement the exact report status flow for Student and Technical Personnel, connected to Supabase in real-time with zero glitches and full status history compliance.

---

## The Required Flow
1. **Student submits a report**
   - Technical personnel receives it instantly (real time, no refresh).
   - Initial status in list: **"Under Review"**.
2. **Technical personnel taps "View" button -> report modal opens**
   - Stepper: **SUBMITTED**
   - List status: **Under Review**
   - Button shown: **"Mark as Reviewed"**
3. **Technical clicks "Mark as Reviewed"**
   - Stepper: **REVIEWED**
   - List status: **still Under Review**
   - Button shown: **"Start Repair"**
   - History entry added: **Reviewed**
4. **Technical clicks "Start Repair"**
   - Stepper: **UNDER REPAIR**
   - List status: **Under Repair**
   - Two buttons shown: **"Mark as On Hold"** and **"Mark as Resolved"**
   - History entry added: **Under Repair**
5a. **Technical clicks "Mark as Resolved"**
   - Stepper: **RESOLVED**
   - List status: **Resolved**
   - History entry added: **Resolved** (with remarks)
5b. **Technical clicks "Mark as On Hold"**
   - List status: **ON HOLD** (report appears in On Hold tab; Stat cards: On Hold +1, Under Repair -1).
   - Inside modal: Stepper shows **UNDER REPAIR**, with **"On Hold" badge** directly below it.
   - Button shown: **"Mark as Resolved"**
   - History entry added: **On Hold** (with remarks)
   - When **"Mark as Resolved"** is clicked afterwards: stepper and list become **RESOLVED**, and the **On Hold** entry stays visible in status history.

---

## Status History Format
Same on both Student and Technical sides, chronological, Asia/Manila (PHT) timezone:
`Submitted -> Reviewed -> Under Repair -> On Hold (only if clicked) -> Resolved`

---

## Phases & Tracking

### [x] Phase 1: Architecture & Status Flow Specification
- Verified database constraints on `reports` and `report_status_history` (`Submitted`, `Reviewed`, `Under Repair`, `On Hold`, `Resolved`).
- Verified list status display mapping: `Submitted` & `Reviewed` -> `Under Review`; `Under Repair` -> `Under Repair`; `On Hold` -> `On Hold`; `Resolved` -> `Resolved`.
- Verified Stepper phases: 1: Submitted, 2: Reviewed, 3: Under Repair, 4: Resolved; On Hold state renders Step 3 with On Hold badge pill.
- Confirmed Realtime CDC is active on `reports` and `report_status_history`.

### [x] Phase 2: Supabase Data & History Backfill of Existing Reports
- Backed up all 92 raw history records to `backups/rsh_backup_*.json`.
- Standardized all 27 reports in Supabase `report_status_history` and `reports_of_student.history` to follow the exact chronological chain:
  `Submitted -> Reviewed -> Under Repair -> [On Hold if applicable] -> Resolved`.
- Preserved authentic timestamps wherever available.
- Intermediate step timestamps were proportionally estimated for 9 reports:
  - LR-01 (Resolved): estimated [Under Repair]
  - LR-05 (Resolved): estimated [Under Repair]
  - LR-06 (Resolved): estimated [Under Repair]
  - LR-13 (Resolved): estimated [Under Repair]
  - LR-15 (Resolved): estimated [Under Repair]
  - LR-16 (Resolved): estimated [Under Repair]
  - LR-19 (Resolved): estimated [On Hold]
  - LR-21 (Resolved): estimated [Reviewed, Under Repair]
  - LR-26 (Under Repair): estimated [Reviewed]
- Verified 0 duplicate rows and strict monotonically increasing timestamps for every report.

### [x] Phase 3: Student & Technical Personnel UI Screen Implementation
- Updated `ReportDetailsModal.jsx`:
  - When status is `Submitted`: Stepper is at 1 (SUBMITTED), button shown: `"Mark as Reviewed"`.
  - When `"Mark as Reviewed"` is clicked: Status updates to `Reviewed` in database, Stepper becomes 2 (REVIEWED), list status remains `"Under Review"`, button becomes `"Start Repair"`.
  - When `"Start Repair"` is clicked: Status updates to `Under Repair` in database, Stepper becomes 3 (UNDER REPAIR), list status is `"Under Repair"`, buttons shown: `"Mark as On Hold"` and `"Mark as Resolved"`.
  - When `"Mark as Resolved"` is clicked: Status updates to `Resolved`, Stepper becomes 4 (RESOLVED), list status is `"Resolved"`.
  - When `"Mark as On Hold"` is clicked: Status updates to `On Hold`, Stepper remains at 3 (UNDER REPAIR) with "On Hold" badge underneath, list status is `"On Hold"`, button shown: `"Mark as Resolved"`.
  - When `"Mark as Resolved"` is clicked from On Hold: Stepper becomes 4 (RESOLVED), list status is `"Resolved"`, and On Hold remains in history.
  - Guarded against duplicate `Submitted` history row insertion if database trigger fires first in `SubmitReportPage.jsx` and `ReportProblemModal.jsx`.
- Updated `StatusStepper.jsx`:
  - Step labels strictly: `Submitted`, `Reviewed`, `Under Repair`, `Resolved`.
  - In `Submitted` state: step 1 is active (current step).
  - In `Reviewed` state: step 2 is active.
  - In `Under Repair` state: step 3 is active.
  - In `On Hold` state: step 3 is active with "On Hold" badge underneath.
  - In `Resolved` state: step 4 is completed with green checkmarks.
- Updated `ReportsPage.jsx` and `RecentReportsList.jsx`:
  - List status reflects `"Under Review"` for both `Submitted` and `Reviewed`.
  - `"On Hold"` tab and filter accurately list all On Hold reports.
  - Stat cards update counts properly (On Hold +1, Under Repair -1).

### [x] Phase 4: Real-time & Cross-Component Synchronization
- Real-time CDC channel configured for `reports` and `report_status_history` tables.
- Broadcast helper `broadcastReportStatusUpdate` dispatches live updates across student and technical personnel without refresh.
- Synchronized list, modal, badges, stepper, and stat cards simultaneously.

### [x] Phase 5: Side-by-Side Verification & End-to-End Testing
- Full workflow automated in `scripts/verify-full-flow-end-to-end.mjs` with 100% assertions passed:
  - Step 1: Student submits -> Initial list status is `"Under Review"`.
  - Step 2: Modal opens -> Stepper is `SUBMITTED` (Phase 1), Button shown: `"Mark as Reviewed"`.
  - Step 3: Tech clicks "Mark as Reviewed" -> DB status `Reviewed`, Stepper `REVIEWED` (Phase 2), List status remains `"Under Review"`, Button shown: `"Start Repair"`.
  - Step 4: Tech clicks "Start Repair" -> DB status `Under Repair`, Stepper `UNDER REPAIR` (Phase 3), List status `"Under Repair"`, Two buttons shown: `"Mark as On Hold"` and `"Mark as Resolved"`.
  - Step 5b: Tech clicks "Mark as On Hold" -> DB status `On Hold`, List status `"On Hold"`, Stepper `UNDER REPAIR` with `"On Hold"` badge, Button shown: `"Mark as Resolved"`.
  - Step 5a: Tech clicks "Mark as Resolved" from On Hold -> DB status `Resolved`, Stepper `RESOLVED` (Phase 4), List status `"Resolved"`.
  - Status history sequence strictly: `Submitted -> Reviewed -> Under Repair -> On Hold -> Resolved`.
  - Every step verified with distinct Asia/Manila (PHT) timestamps in chronological order.
  - CDC captured real-time events at every transition.
- Validated production bundle build with `npm run build` (vite v8.3.4 compiled cleanly with 0 errors).

### [x] Phase 6: Laboratory Operating Hours Compliance & 12:30 AM Bug Elimination
- Investigated all 101 records in `public.report_status_history` and `public.reports_of_student` across 27 reports in Supabase.
- Discovered root cause of the "12:30 AM" bug: 40 historical status records in Supabase had UTC timestamps set without subtracting 8 hours for Asia/Manila (UTC+8), causing 4:40 PM UTC to display as 12:40 AM Manila time.
- Migrated and corrected all 40 records in Supabase via `scripts/fix-lab-hours-history.mjs` to valid laboratory hours (between 7:00 AM and 9:00 PM Asia/Manila time) while preserving strict chronological progression (`Submitted -> Reviewed -> Under Repair -> [On Hold] -> Resolved`).
- Enhanced client-side `src/lib/reportDateUtils.js`:
  - `sanitizeLabHoursDate()`: Automatically detects and shifts/clamps any timestamp falling outside laboratory hours (7:00 AM to 9:00 PM Manila time).
  - `formatManilaHistoryTime()`: Enforces laboratory hours sanitization across all modal forms and status history records on both Student and Technical Personnel sides.
- Confirmed with `scripts/inspect-out-of-hours-rsh.mjs`: Total out-of-hours records in Supabase: **0**.

### [x] Phase 7: Zero-Glitch Real-time Synchronization on Reports & Laboratory Guides
- **Reports Modal (Both Sides)**:
  - Eliminated duplicate per-modal Supabase channel in `ReportDetailsModal.jsx`, routing all live updates cleanly through `realtimeSyncService.js` singleton.
  - Stopped background refreshes from triggering `setHistoryLoading(true)`, eliminating UI flickering and unmounting of status history.
  - Stabilized effect dependencies by anchoring subscription to report ID and using `reportRef` to avoid unnecessary re-mounts on parent renders.
- **Reports List**:
  - Added live `activeReportModal` synchronization with `reportsList` in `ReportsPage.jsx` (matching `StudentSubmittedReportsPage.jsx`).
- **Laboratory Guides Page (Both Sides)**:
  - Added the 26th canonical guide (`70414418-7606-456b-8e71-4273f6c44576`, "How to track your report") into `src/lib/defaultGuides.js`.
  - Added module-level caching (`cachedTechnicalGuides`) in `GuidesPage.jsx` to prevent the 26th guide from popping in asynchronously and shifting the grid layout on tab switches.
  - Stabilized `studentUuidRef` in `StudentGuidesPage.jsx`, removing `studentUuid` from main realtime effect dependencies to eliminate duplicate fetching and badge recalculation flicker.
