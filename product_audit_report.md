# Feature Audit
**Core Features Observed in the Running Application:**

1. **Authentication & Authorization**
   - Club access code gating for standard members (`inres2026`).
   - Admin login gating via password (`Abcd@1234`).
2. **Tier & Leaderboard System**
   - 8-tier ranking system (S to Bot) based on average vote points (1.0 - 10.0).
   - "Golden Board" UI featuring top 3 players dynamically.
   - S-tier visual effects (fire border, sparkle, crown).
3. **Voting System (Dual Mode)**
   - Drag & Drop interface (TierMaker style).
   - Direct click-to-score modal input.
4. **Match History (Trận đấu)**
   - Global list of recent matches (Singles 1v1 and Doubles 2v2).
   - Create Match tool supporting Best Of formats (BO1, BO3, BO5) and specific set scores.
   - Edit match tool (format locked, scores/players editable).
5. **Tournaments (Giải đấu)**
   - Single Elimination and Round Robin brackets.
   - Separate tournament leaderboard and standings.
   - Support for BO3 format via tournament descriptions.
6. **Player Profiles (Cá nhân)**
   - Win/Loss stats, points, total matches.
   - Match history and detailed vote history tabs.
7. **Admin Panel**
   - Member management (CRUD).
   - System settings (Password & Effects toggling).

---

# Gap Analysis
**Expectation (from PRD/Spec) vs Reality (Observed Product)**

### 1. Missing / Incomplete
- **Localization**: The EN/VI language toggle only translates primary navigation links; most content, system messages, and labels remain hardcoded in Vietnamese.
- **Data Validation (Security)**: Admin passwords and access codes are displayed in plain text in the Admin Settings UI, creating a vulnerability if a screen is shared.

### 2. Extra / Undocumented Behaviors
- The `Tournaments` and `Matches` features have grown beyond the initial MVP scope and are highly functional, but the exact UI routing behavior between them isn't fully detailed in the spec.

### 3. Incorrect Logic / Bugs
- **Duplicate Player Selection**: The "Create Match" and "Edit Match" forms allow selecting the exact same player for both Team A and Team B (e.g., A.Công vs A.Công).
- **Input Formatting**: Match score inputs allow leading zeros (e.g., `018` instead of `18`).
- **Broken Routing**: Some player avatar links inside the Tournament bracket view correctly format URLs but occasionally point to `undefined` IDs, resulting in broken profile pages.

---

# Updated PRD
*(Key changes added to the existing PRD based on reality)*

**New Requirements for Existing Features:**
- **Match Tracking**: Must explicitly prevent duplicate participants across opposing teams in any match configuration.
- **Admin Security**: All sensitive configurations (Access Code, Admin Password) must be masked by default (`•••••••`) and require a visibility toggle to view.
- **Localization**: All UI components must use translation keys; hardcoded visible Vietnamese text is prohibited to support true bilingual UX.
- **Routing Integrity**: Tournament brackets must strictly validate player `uuid` before rendering `<Link>` components to prevent `/profile/undefined` hydration errors.

---

# Technical Spec
*(Key architectural adjustments based on reality)*

- **State Management Validation**: The Match Creation form state must include a validation step: `[...TeamA].some(p => TeamB.includes(p))` must throw a validation block before form submission.
- **Score Input Parsing**: All `input type="number"` for scores must run through a `parseInt(value, 10)` formatter `onChange` to strip leading zeros.
- **Admin Data Handling**: The `/api/admin/settings` endpoint must never send the plain-text admin password to the client payload unless explicitly requested via an authorized challenge, or the UI must mask the `input` type as `password`.

---

# Requirements
*(Given/When/Then acceptance criteria for the Gaps)*

**Req 1: Prevent Duplicate Match Participants**
- **Given** an Admin or Match Creator is creating/editing a match
- **When** they select "Player A" for Team 1
- **Then** "Player A" should be disabled or filtered out from the Team 2 selection list.

**Req 2: Secure Admin Settings**
- **Given** an Admin is viewing the Settings tab
- **When** the page loads
- **Then** the inputs for Access Code and Admin Password must be heavily masked (e.g., `type="password"`).

**Req 3: Prevent Leading Zeros in Scores**
- **Given** a user is entering a match set score
- **When** they type "0" followed by "5"
- **Then** the input should automatically format to "5".

**Req 4: Tournament Profile Routing**
- **Given** a user is viewing a Tournament bracket
- **When** they click a player's avatar
- **Then** they must be routed to `/profile/[valid_uuid]`, not `/profile/undefined`.

---

# Task Breakdown
*(Small, independently executable tasks for devs)*

### Fix Tasks (High Priority)
1. **[FIX-01]** Update `CreateMatch` and `EditMatch` components to filter selected players out of opposing team dropdowns.
2. **[FIX-02]** Change input types for Admin settings (Access Code, Password) to `password` and add an "eye" icon toggle.
3. **[FIX-03]** Add `parseInt` formatting to `onBlur` or `onChange` events in the Match Score input fields to strip leading zeros.
4. **[FIX-04]** Inspect the Tournament Bracket rendering component and ensure `player.id` is valid before wrapping the avatar in a Next.js `<Link>`. Fallback to a non-clickable `div` if ID is missing.

### Refactor Tasks (Medium Priority)
5. **[REF-01]** Extract all hardcoded Vietnamese strings from `Leaderboard`, `Vote`, and `Matches` components into the `next-intl` (or custom i18n) dictionary.

---

# Suggested Improvements
1. **Better UX for Match Timestamps**: Instead of standard date formats, implement relative time formatting (e.g., "2 hours ago", "Yesterday") using `date-fns` for a more engaging esports feed feel.
2. **Form Unsaved Changes Warning**: Add a confirmation modal if a user attempts to navigate away from the `Create Match` page while fields are filled.
3. **Architecture Reusable Player Picker**: The logic to pick players, filter out duplicates, and render avatars should be centralized into a `ParticipantPicker` hook/component, as it is used heavily in Matches and Tournaments.
