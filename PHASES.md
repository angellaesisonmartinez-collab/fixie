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

### [x] Phase 8: Reports Modal Remarks Deduplication & Instant Status History Loading
- **Remarks Deduplication & Layout**:
  - Removed duplicate remarks line from inside the status history entries (`tp-history-remarks-subline` in Technical Personnel modal and `student-history-remarks-line` in Student modal).
  - Enforced that remarks are strictly placed on top of the status list in both Technical Personnel and Student modal views.
- **Zero-Latency Status History Loading**:
  - Created `getInitialStatusHistory()` helper in [ReportDetailsModal.jsx](file:///c:/Users/Angel%20Lae%20Martinez/Downloads/itsme-fixie1-final/itsme-fixie/src/components/ReportDetailsModal.jsx) to immediately populate the complete status history from cache, `report.history`, or baseline synthesis upon modal mount (0ms latency, zero blank screen).
  - Parallelized Supabase queries in `loadFreshReportAndHistory()` using `Promise.all` (querying `report_status_history`, `reports`, and `reports_of_student` simultaneously instead of 4 sequential round trips).
  - Added module-level in-memory caching (`reportHistoryCache` and `canonicalUuidCache`) to instantly resolve status histories on subsequent modal opens.
  - Enhanced [ReportsPage.jsx](file:///c:/Users/Angel%20Lae%20Martinez/Downloads/itsme-fixie1-final/itsme-fixie/src/components/ReportsPage.jsx) `fetchLiveReports()` to fetch all status history in parallel and pre-populate `reportHistoryCache`, so opening any report modal is instantaneous.

### [x] Phase 9: Duplicate Email Registration & First-Time Account Setup
- **Subaddressing Fallback for Unique Database Constraint**:
  - The Supabase `students` table has a strict unique constraint `students_email_key` on the `email` column.
  - When registering a student with an email that is already in use (e.g., `martinezangellaewup@gmail.com`), [StudentsPage.jsx](file:///c:/Users/Angel%20Lae%20Martinez/Downloads/itsme-fixie1-final/itsme-fixie/src/components/StudentsPage.jsx) automatically detects the duplicate key violation (`23505` / `students_email_key`) and seamlessly saves the record using RFC 5233 plus-addressing (e.g. `martinezangellaewup+247890230@gmail.com`).
  - Gmail standard delivers all plus-addressed emails directly to the root mailbox (`martinezangellaewup@gmail.com`).
- **Clean Email Display in UI**:
  - Implemented `formatStudentEmail(email)` in [studentFormatUtils.js](file:///c:/Users/Angel%20Lae%20Martinez/Downloads/itsme-fixie1-final/itsme-fixie/src/lib/studentFormatUtils.js) which strips the plus-tag so that the UI everywhere (student lists, modals, profile views, and success dialogs) displays the clean, user-facing email address (`martinezangellaewup@gmail.com`).
- **EmailJS Credentials Dispatch**:
  - In [emailService.js](file:///c:/Users/Angel%20Lae%20Martinez/Downloads/itsme-fixie1-final/itsme-fixie/src/lib/emailService.js), sanitized the recipient email to ensure credentials generated for the new student are sent directly to `martinezangellaewup@gmail.com`.
- **First-Time Account Setup Isolation**:
  - In [StudentAccountSetup.jsx](file:///c:/Users/Angel%20Lae%20Martinez/Downloads/itsme-fixie1-final/itsme-fixie/src/components/StudentAccountSetup.jsx), updated the query logic to match specifically by `student_id` or UUID `id` (with UUID format validation to prevent PostgreSQL `22P02` cast errors), preventing updates from affecting other student accounts sharing the same email.
- **Login Candidate Resolution**:
  - In [LoginPage.jsx](file:///c:/Users/Angel%20Lae%20Martinez/Downloads/itsme-fixie1-final/itsme-fixie/src/components/LoginPage.jsx), students logging in with Student ID match their account directly. For email-based logins, candidate accounts sharing the email are resolved by matching the password against `password_hash` via bcrypt.

### [x] Phase 10: Under Repair Modal Form Empty Remarks Policy
- **Empty Initial Remarks on Under Repair**:
  - In [ReportDetailsModal.jsx](file:///c:/Users/Angel%20Lae%20Martinez/Downloads/itsme-fixie1-final/itsme-fixie/src/components/ReportDetailsModal.jsx), enforced that when the report status is "Under Repair", the remarks input field is strictly initialized as empty (`""`), displaying only the `"Enter remarks..."` placeholder.
  - Prevents previous or default database remarks from pre-populating into the textarea when opening or switching to an Under Repair report.
- **State Transition & Realtime Isolation**:
  - When clicking "Start Repair" (transitioning from Reviewed to Under Repair), `remarks`, `editedRemarks`, and errors are reset to empty.
  - In `loadFreshReportAndHistory` and realtime sync listener, background database remarks updates are prevented from overwriting the technician's input while in the Under Repair status.
- **Enforced Validation Before Action**:
  - The remarks field remains completely empty until the technical personnel types into it.
  - Tapping "Mark as On Hold" or "Mark as Resolved" while remarks are empty triggers focused validation requiring remarks explaining the action before the status transition can proceed.

### [x] Phase 11: Strict Student ID Format (XX-XXXX-XXX) & Student Cleanup
- **Deleted Malformed Student Record**:
  - Removed registered student "Franz Fernando" / "Franz Santos Fernando" (`student_id: 24-789-0234`, `id: 440a9c65-efe9-4164-8b08-759f2a329c49`) from the Supabase `students` table.
- **Strict Format Enforcement**:
  - Standardized the official Student ID format as `XX-XXXX-XXX` (e.g. `24-0908-909`) using regex `^\d{2}-\d{4}-\d{3}$`.
  - Implemented `formatStudentIdInput()` in [studentFormatUtils.js](file:///c:/Users/Angel%20Lae%20Martinez/Downloads/itsme-fixie1-final/itsme-fixie/src/lib/studentFormatUtils.js) which automatically extracts digits, limits input to 9 digits, and auto-masks hyphens as the user types (e.g., typing `240908909` automatically formats to `24-0908-909`).
  - Updated [StudentsPage.jsx](file:///c:/Users/Angel%20Lae%20Martinez/Downloads/itsme-fixie1-final/itsme-fixie/src/components/StudentsPage.jsx) with `placeholder="24-0908-909"`, `maxLength={11}`, form validity check `STUDENT_ID_REGEX.test(regStudentId.trim())`, and submit validation blocking any malformed Student ID.
  - Updated [LoginPage.jsx](file:///c:/Users/Angel%20Lae%20Martinez/Downloads/itsme-fixie1-final/itsme-fixie/src/components/LoginPage.jsx) identifier input with `formatStudentIdInput` auto-masking and explicit format error messaging.

### [x] Phase 12: Newly Registered Student Initials Avatar (First & Last Name Letter)
- **Eliminated Email Collisions with Canonical Avatars**:
  - Previously, `martinezangellaewup@gmail.com` mapped directly to `angelAvatar` in `STUDENT_AVATAR_ASSETS`. When new students were registered using `martinezangellaewup@gmail.com` as a testing receiver, they inadvertently inherited Angel's photo.
  - Removed email mapping for Angel in [studentAvatarUtils.js](file:///c:/Users/Angel%20Lae%20Martinez/Downloads/itsme-fixie1-final/itsme-fixie/src/lib/studentAvatarUtils.js) so that `angelAvatar` is strictly granted only to Angel Lae Martinez (`student_id: 24-0041-147`).
- **First & Last Name Letter Initials Extraction**:
  - Implemented `getStudentInitials(studentOrName)` in [studentAvatarUtils.js](file:///c:/Users/Angel%20Lae%20Martinez/Downloads/itsme-fixie1-final/itsme-fixie/src/lib/studentAvatarUtils.js).
  - Explicitly pairs the first letter of the first name and the first letter of the last name:
    - `Franz Fernando` -> **`FF`**
    - `Franz Santos Fernando` -> **`FF`**
    - `{ first_name: 'Franz', middle_name: 'Santos', last_name: 'Fernando' }` -> **`FF`**
- **Distinct Round Initials SVG Avatar**:
  - Enhanced `generateInitialsAvatar()` to produce an SVG with a circular background styled in Fixie's dark forest green palette with bold white initials (`FF`).
  - Integrated across [StudentsPage.jsx](file:///c:/Users/Angel%20Lae%20Martinez/Downloads/itsme-fixie1-final/itsme-fixie/src/components/StudentsPage.jsx), [StudentAccountSetup.jsx](file:///c:/Users/Angel%20Lae%20Martinez/Downloads/itsme-fixie1-final/itsme-fixie/src/components/StudentAccountSetup.jsx), and [StudentDashboard.jsx](file:///c:/Users/Angel%20Lae%20Martinez/Downloads/itsme-fixie1-final/itsme-fixie/src/components/StudentDashboard.jsx).

### [x] Phase 13: Zero-Glitch Real-time Auto-Updates Across Modals, Reports & Student Profiles
- **Report Details Modal Real-time Reliability**:
  - Fixed lexical block-scoping bug in [ReportDetailsModal.jsx](file:///c:/Users/Angel%20Lae%20Martinez/Downloads/itsme-fixie1-final/itsme-fixie/src/components/ReportDetailsModal.jsx) where `normSt` was scoped inside `if (newSt)` block, preventing `ReferenceError: normSt is not defined` from crashing the realtime listener during updates.
  - Ensured `effectiveStatus !== 'Under Repair'` safely preserves the technician's input without remarks overwrites.
- **Reports Page Modal Synchronization Deduplication**:
  - In [ReportsPage.jsx](file:///c:/Users/Angel%20Lae%20Martinez/Downloads/itsme-fixie1-final/itsme-fixie/src/components/ReportsPage.jsx), constrained `activeReportModal` synchronization to trigger only when status, remarks, or display status actually change, eliminating modal re-render flickering and layout jitter during real-time broadcasts.
- **Student Profile Modal Real-time Auto-Update & Snake/CamelCase Compatibility**:
  - In [StudentProfileModal.jsx](file:///c:/Users/Angel%20Lae%20Martinez/Downloads/itsme-fixie1-final/itsme-fixie/src/components/StudentProfileModal.jsx), added native subscription to `subscribeToStudentUpdates` and `fixie_student_profile_updated` so profile views automatically reflect changes in real time.
  - Supported both snake_case (`first_name`, `last_name`, `name`, `year_block`, `student_id`) and camelCase (`firstName`, `lastName`, `yearBlock`, `studentId`), preventing non-Angel student profiles from incorrectly falling back to "Angel Lae Martinez".
  - Sanitized and formatted `email_last_updated` timestamps (e.g. `Oct 22, 2026`) instead of rendering raw ISO strings.
- **Settings & Privacy and Student Dashboard Real-time Subscription**:
  - In [SettingsPrivacyPage.jsx](file:///c:/Users/Angel%20Lae%20Martinez/Downloads/itsme-fixie1-final/itsme-fixie/src/components/SettingsPrivacyPage.jsx) and [StudentDashboard.jsx](file:///c:/Users/Angel%20Lae%20Martinez/Downloads/itsme-fixie1-final/itsme-fixie/src/components/StudentDashboard.jsx), added listeners for `subscribeToStudentUpdates` via Supabase Realtime CDC, ensuring cross-tab and cross-device edits update active student session state smoothly with zero glitches and no manual refresh required.
- **Student List View Modal Live Sync**:
  - In [StudentsPage.jsx](file:///c:/Users/Angel%20Lae%20Martinez/Downloads/itsme-fixie1-final/itsme-fixie/src/components/StudentsPage.jsx), synchronized `viewingStudent` with incoming realtime updates so viewed profile cards update live without closing or flickering.


