# 📋 System Requirements
## INRES BADMINTON CLUB — Tier Ranking System

---

## 1. Introduction

This document defines the functional and non-functional requirements for the INRES Badminton Club Tier Ranking System. All requirements reflect decisions from the product owner interview.

---

## 2. Functional Requirements

### 2.1 Authentication

- The system shall accept a shared club access code to grant member access
- The system shall display a list of members (with avatars) for user selection after code entry
- The system shall support separate admin login with dedicated password
- The system shall allow multiple admin accounts
- The system shall allow admins to change the club access code
- The default access code shall be `inres2026`
- The default admin password shall be `Abcd@1234`

---

### 2.2 Member Management

- The system shall display a list of all club members with avatars
- The system shall support member nicknames as display names
- The system shall allow admins to add new members
- The system shall allow admins to edit member information (name, avatar)
- The system shall allow admins to remove members
- The system shall allow admins to grant/revoke admin privileges
- The system shall support members without avatars (display initials)
- The system shall store member avatars in cloud storage (Supabase)

---

### 2.3 Voting System

- The system shall allow a user to submit a score (1-10) for another member
- The system shall prevent users from voting for themselves
- The system shall allow updating a previous vote (upsert behavior)
- The system shall NOT enforce any voting frequency limits
- The system shall display vote attribution (non-anonymous)
- The system shall NOT apply vote weighting
- The system shall NOT expire votes over time
- The system shall store each vote with: voter, target user, score, timestamps

#### 2.3.1 Click & Score Voting
- The system shall allow users to click on a member and enter a score directly
- The score input shall accept values from 1 to 10 (including decimals)

#### 2.3.2 Drag & Drop Voting (TierMaker Style)
- The system shall display tier rows (S through Bot) as drop zones
- The system shall allow users to drag member avatars into tier rows
- The system shall assign a default score based on the tier's midpoint when dropped
- The system shall display an inline input on the dropped card for score fine-tuning
- The system shall NOT use popup dialogs for score input

---

### 2.4 Tier System (8 Tiers)

- The system shall support 8 tiers: S, A, B, C, D, E, F, Bot
- The system shall assign tiers based on score thresholds:
  - S: score ≥ 9.0
  - A: score ≥ 8.0
  - B: score ≥ 7.0
  - C: score ≥ 6.0
  - D: score ≥ 5.0
  - E: score ≥ 4.0
  - F: score ≥ 3.0
  - Bot: score < 3.0
- Each tier shall have a unique, distinct color
- The system shall display members with no votes as "Chưa xếp hạng" (Unranked)

#### 2.4.1 Tier S Special Effects
- The system shall support fire border animation for S-tier members
- The system shall support sparkle/particle animation for S-tier members
- The system shall support crown icon overlay for S-tier members
- Each effect shall be independently toggleable (via admin settings)

---

### 2.5 Ranking Calculation

- The system shall calculate score as: `average of all received votes`
- The system shall update rankings in real-time when votes change
- The system shall rank users by score in descending order
- The system shall handle ties by: more votes → higher rank; then alphabetical order
- The system shall maintain a consistent ranking order

---

### 2.6 Leaderboard

- The system shall display a gaming-style leaderboard
- The leaderboard shall include: rank, avatar, name, score, tier badge
- The leaderboard shall support filtering by tier
- The leaderboard shall animate when rankings change
- The leaderboard shall be responsive for mobile and desktop

---

### 2.7 Member Profile

- The system shall display member profile with: avatar, name, current tier, score
- The system shall display vote history (who voted what score)
- The system shall display basic statistics

---

### 2.8 Admin Controls

- The system shall allow admins to manually adjust a member's tier
- The system shall allow admins to manage member data (CRUD)
- The system shall allow admins to change the club access code (Current implementation displays this and admin password in plain text)
- The system shall allow admins to toggle S-tier special effects
- The system shall allow admins to manage admin permissions

---

### 2.9 Match History & Tracking (Implemented Phase 8)

- The system shall allow users to record match results (Singles and Doubles).
- The system shall dynamically expose multiple set score inputs based on the selected match format (BO1, BO3, BO5).
- The system shall display matches in a global feed and on user profiles with detailed per-set breakdowns (e.g., 2-0 (21-15, 21-18)).
- The system shall display Best Of format tags (BO1, BO3, BO5) for all applicable matches.
- The system shall enforce access control, allowing only match creators and administrators to edit or delete match records.
- *(Bug)* The system currently permits selecting the same player for both opposing teams.
- *(Bug)* The system currently accepts leading zeros in score inputs.
- The system shall allow match creators and admins to delete matches
- The system shall track player statistics like Win/Loss ratios

---

### 2.10 Tournament Features (Implemented Phase 11)

- The system shall allow admins to create Single Elimination, Round Robin, or Custom tournaments.
- The system shall provide a dedicated UI dropdown to select the BO format (BO1, BO3, BO5), which is saved utilizing the tournament description field as a backend workaround.
- The system shall mandate custom confirmation modals specifically for Tournament Creation and Tournament Start actions to verify settings.
- The system shall visually highlight the overall tournament winner with a "CHAMPION" badge in the finalized view.
- The system shall automatically generate match brackets or groups based on participants.
- The system shall progress winners to the next stage upon match completion seamlessly mapping to Match History.
- *(Bug)* Profile links from bracket components currently route to 'undefined' IDs.

---

## 3. Non-Functional Requirements

### 3.1 Performance
- The system should respond to user actions within 300ms under normal conditions
- Ranking updates should be reflected in real-time without page refresh
- Drag-and-drop interactions should feel smooth (60fps)

### 3.2 Usability
- The system shall have a premium, gaming-style UI
- The system shall support dark mode
- The system shall support bilingual interface (Vietnamese + English) - Current reality: English translation only applies to navigation menus.
- The system shall be usable on both desktop and mobile devices
- The system shall use modern animations and micro-interactions

### 3.3 Scalability
- The system should support up to 100 members without redesign
- The system architecture should allow future features (Elo, matchmaking)

### 3.4 Reliability
- The system shall ensure data consistency for votes and rankings
- The system shall prevent data loss during normal operation

### 3.5 Security
- The system shall restrict admin functionalities to authorized users only
- The system shall validate all user inputs
- The system shall sanitize inputs to prevent XSS/injection

### 3.6 Deployment
- The system shall deploy on Vercel (free tier)
- The system shall use Supabase for database and storage (free tier)
- Total infrastructure cost shall be $0

---

## 4. Business Rules

- A user cannot vote for themselves
- Each user can have at most ONE vote per target user (upsert)
- A member's tier is determined by their average score
- Ranking is determined by average score in descending order
- Ties are broken by: number of votes received (more = higher), then alphabetical
- All votes are permanent (no expiry)
- All votes are non-anonymous

---

## 5. Constraints

- Internal use only (~30 members)
- Free-tier infrastructure only
- No complex OAuth/SSO authentication
- Initial 25 members with avatars; more can be added

---

## 6. Data Requirements

### Initial Data
- 25 member profiles with avatar images (from `images/` folder)
- Default access code: `inres2026`
- Default admin password: `Abcd@1234`
- Default tier thresholds as specified above

### Data Volume Estimates
- Users: ~30 (max ~100)
- Votes: ~30 × 29 = ~870 max (each user votes for all others)
- Matches: Continually growing as club plays
- Tournaments: ~1-2 per month
- Rankings: ~30 computed records
- Storage: ~5MB for avatars