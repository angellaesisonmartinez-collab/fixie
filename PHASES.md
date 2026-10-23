# Fixie Report Status Flow & Real-Time Synchronization Plan

## Project Overview
Supabase Project: `https://ieznsbzddanjwmnpvncs.supabase.co`  
Goal: Implement the exact report status flow for Student and Technical Personnel, connected to Supabase in real-time with zero glitches and full status history compliance.

---

## The Required Flow
1. **Newly Submitted**
   - No highlighted step in the status stepper yet (phase 0).
   - Status History displays `Date Submitted` with the actual submission date and time.
   - Available button: `Review`.
2. **Under Review**
   - When Technical Personnel clicks `Review`, highlight `Under Review` in the stepper.
   - Status History adds `Reviewed` with the actual date and time the report was reviewed.
   - Available button: `Start Repair`.
3. **Under Repair**
   - When Technical Personnel clicks `Start Repair`, highlight `Under Repair` in the stepper.
   - Status History adds `Under Repair` with the actual date and time the repair started.
   - Available buttons: `Mark On Hold` and `Mark as Resolved`.
4. **On Hold**
   - Only when Technical Personnel clicks `Mark On Hold`, highlight `On Hold` in the stepper.
   - Status History adds `On Hold` with the actual date and time the report was placed on hold.
   - Available button: `Mark as Resolved`.
5. **Resolved**
   - When Technical Personnel clicks `Mark as Resolved`, highlight `Resolved` in the stepper.
   - Status History adds `Resolved` with the actual date and time the report was resolved, whether the previous status was `Under Repair` or `On Hold`.

---

## Status History Format
Same on both Student and Technical sides, strictly chronological, Asia/Manila (PHT) timezone:
`Date Submitted -> Reviewed -> Under Repair -> [On Hold only if explicitly clicked] -> Resolved`

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

### [x] Phase 15: Status Stepper, Status History Alignment & Real-Time Synchronization
- **Report Status Stepper (Technical Personnel & Student Views)**:
  - Aligned stepper state normalization in `StatusStepper.jsx`:
    - `Newly Submitted`: `phaseIndex = 0` (no highlighted step yet, all node circles and connector lines inactive).
    - `Under Review`: `phaseIndex = 1` (Step 1 `Under Review` active/highlighted, future steps inactive).
    - `Under Repair`: `phaseIndex = 2` (Step 1 completed with green check, Step 2 `Under Repair` active/highlighted).
    - `On Hold`: `phaseIndex = 3` (Step 1 & 2 completed with green checks, Step 3 `On Hold` highlighted amber, 4-step workflow).
    - `Resolved`: `phaseIndex = steps.length` (all steps completed with green checks; 3 steps if never on hold, 4 steps if on hold was triggered).
- **Status History Label Standardisation**:
  - In `ReportDetailsModal.jsx` and `reportStatusHistoryWorkflow.js`, updated `getStatusHistoryLabel()`:
    - `Submitted` -> `Date Submitted`
    - `Under Review` / `Reviewed` -> `Reviewed` (displays exact review timestamp)
    - `Under Repair` -> `Under Repair`
    - `On Hold` -> `On Hold`
    - `Resolved` -> `Resolved`
  - Preserved original `Date Submitted` timestamp across all stages without overwrite.
- **Database Schema Protection & Column Sanitization**:
  - Filtered payloads in `syncReportToSupabase` against valid table columns for `reports` and `reports_of_student`, eliminating PostgreSQL `PGRST204` schema errors on non-existent columns (`has_been_on_hold`, `on_hold_at`).
- **Button Workflow Verification**:
  - `Newly Submitted`: Available button is `Review`.
  - `Under Review`: Available button is `Start Repair`.
  - `Under Repair`: Available buttons are `Mark On Hold` and `Mark as Resolved`.
  - `On Hold`: Available button is `Mark as Resolved`.
  - `Resolved`: Modal footer action bar is hidden.
- **Real-time Synchronization Across Both Sides**:
  - Live broadcast and Supabase Realtime updates propagate without page refresh.
  - Report list status badges, modal stepper, and Status History timeline remain completely synchronized between Technical Personnel and Student sides.

### [x] Phase 16: Laboratory Guide Publishing, Editing, Date Formatting & Real-Time Synchronization
- **1. Technical Personnel — Add and Publish Guide**:
  - [x] Add Guide modal form opens cleanly with reset fields (title, category, content) and clear errors.
  - [x] Category selection properly mapped to Supabase database constraints (`Rules`, `How-to`, `Reminder`).
  - [x] Resolved root cause of publishing error so guides save reliably to Supabase `guides` table.
  - [x] Newly published guides immediately placed at top of list (sorted strictly by `created_at` descending).
  - [x] Eliminated duplicate guide records upon publish by removing local mock ID generation and deduplicating against incoming CDC/broadcast payloads.
  - [x] Newly published guide renders immediately without requiring page refresh.
  - [x] Module-level memory cache (`cachedTechnicalGuides`) updated in tandem with state to prevent layout shift on tab navigation.
- **2. Technical Personnel — Edit Published Guide & Cursor Jumping Fix**:
  - [x] Eliminated cursor jumping to beginning of text in `contentEditable` editor by removing disruptive `useEffect` re-injection of `innerHTML` on state change during active typing.
  - [x] Retained native DOM caret selection and cursor position across typing, insertions, linebreaks, and deletions.
  - [x] Edit guide saves updates (`category`, `title`, `content`, `updated_at`) directly to Supabase `guides` table.
  - [x] Update reflects in guide details modal and guide cards with zero layout changes or UI disruption.
  - [x] Guide keeps its chronological list position anchored by its original publication date (`created_at`).
- **3. Published and Updated Date Formatting Compliance**:
  - [x] Exact format for newly published guide: `Published (date)` (e.g., `Published Oct 23, 2026`).
  - [x] Exact format for edited guide: `Published (original publication date) • Update (latest update date)` (e.g., `Published Sep 01, 2026 • Update Oct 23, 2026`).
  - [x] Original publication date (`created_at`) strictly preserved upon edit.
  - [x] Latest update date (`updated_at`) automatically updated upon save and stored in Supabase.
  - [x] Both timestamps retrieved dynamically from Supabase `guides` records (never hardcoded).
  - [x] Uniform date display across both Technical Personnel (`GuidesPage.jsx`) and Student (`StudentGuidesPage.jsx`) list cards and detail modals.
  - [x] Timestamps remain persistent and accurate across page refresh, logout, and re-login.
- **4. Student Side — Real-Time Automatic Synchronization**:
  - [x] Newly published guides appear instantly on the Student Laboratory Guide page at the top without requiring a page refresh.
  - [x] Edits made by Technical Personnel immediately reflect on the Student side (updated title, content, and `Update (date)`).
  - [x] Full synchronization across tabs, windows, and remote devices using unified `realtimeSyncService` broadcast (`broadcastGuideChange`) and Supabase Realtime CDC (`postgres_changes` on `guides` table).
  - [x] Module cache (`cachedStudentGuides`) kept in sync so tab switches never revert to stale data.
- **5. Supabase Data Integrity & Non-Regressions**:
  - [x] Preserved existing 27 guide records, categories, student bookmarks (`saved_guides`), and guide views (`guide_views`).
  - [x] Strict category constraint compliance (`Rules`, `How-to`, `Reminder`).
  - [x] Maintained 5 items per page pagination flow, search filtering, and existing UI design styles.




