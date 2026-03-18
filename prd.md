# 🏸 Product Requirements Document (PRD)
## INRES BADMINTON CLUB — Tier Ranking System

---

## 1. Overview

### 1.1 Product Summary
A web-based internal platform for **INRES Badminton Club** (~30 members) to rank player skill levels using an 8-tier system. The platform enables transparent voting, real-time leaderboard, and an engaging TierMaker-style drag-and-drop experience.

### 1.2 Brand Identity

| Attribute | Value |
|-----------|-------|
| **App Name** | INRES BADMINTON CLUB |
| **Brand Colors** | Xanh dương (Blue) + Trắng (White) |
| **Design Style** | Gaming/Esports, modern, trending |
| **Dark Mode** | Supported |
| **Languages** | Vietnamese + English (bilingual) |

---

## 2. Objectives

- Provide a clear, transparent, and fun 8-tier ranking system
- Improve match quality by enabling better player pairing
- Increase engagement through interactive TierMaker-style voting
- Establish a scalable foundation for future features (Elo, matchmaking, tournaments)

---

## 3. Problem Statement

Currently, the club lacks a standardized way to evaluate player skill levels. This leads to:

- Unbalanced matches due to unclear skill differences
- Disagreements about player rankings
- Difficulty in organizing fair and competitive games
- Low engagement outside of physical play sessions

---

## 4. Goals & Success Metrics

### 4.1 Goals

- Build a visually stunning, intuitive ranking system
- Encourage active participation from all ~30 members
- Ensure fairness and transparency (non-anonymous voting)

### 4.2 Success Metrics

- % of members who have voted at least once
- Number of votes per week
- Average session time on the platform
- Member engagement (return rate)

---

## 5. Target Users

### 5.1 Primary Users — Club Members (~30 people)
- View leaderboard and rankings
- Vote on other players (click-to-score + drag-and-drop)
- View personal profile and vote history
- Access via mobile and desktop

### 5.2 Secondary Users — Admins (multiple)
- Manage members (add/edit/delete)
- Adjust rankings/tiers manually
- Change access code and settings
- Manage admin permissions

---

## 6. User Scenarios

### Scenario 1: Member Login
A member opens the app → enters the club access code `inres2026` → selects their name from the member list → enters the app.

### Scenario 2: Drag-and-Drop Voting
A member navigates to the Vote page → sees TierMaker-style tier rows → drags another member's avatar into a tier → fine-tunes the score via inline input → submits.

### Scenario 3: Quick Score Voting
A member clicks on another member's avatar → types a score (1-10) → submits.

### Scenario 4: Viewing Leaderboard
A member checks the leaderboard → sees gaming-style rankings with tier badges, scores, and S-tier fire/sparkle effects.

### Scenario 5: Admin Management
An admin logs in with admin password → manages members, changes access code, adjusts tiers.

---

## 7. Core Features (MVP)

### 7.1 Authentication
- Club-wide access code for members
- Admin password for elevated access
- User selection from member list (with avatars)

### 7.2 8-Tier Ranking System
- Tiers: S, A, B, C, D, E, F, Bot
- Each tier has unique color
- S-tier has special effects (fire, sparkle, crown — customizable)
- Bot tier is a fun "meme" tier for beginners

### 7.3 Dual Voting System
- **Click & Score:** Direct input (1-10)
- **Drag & Drop:** TierMaker-style with inline score editing
- Non-anonymous (voters are visible)
- No limits, no expiry, no weighting

### 7.4 Real-time Leaderboard
- Gaming/esports style
- Avatar, name, score, tier badge, rank position
- Animations on rank changes
- Filter by tier

### 7.5 Member Profiles
- Avatar, name, current tier
- Vote history (who voted, what score)
- Basic statistics

### 7.6 Admin Panel
- CRUD members
- Change access code
- Manual tier/ranking adjustments
- Admin permission management

### 7.7 UI/UX
- Responsive (mobile-first + desktop)
- Dark mode
- Bilingual (Vietnamese + English)
- Modern animations and transitions
- Hover effects, particle effects for S-tier

---

## 8. Non-Functional Requirements

- Responsive and mobile-friendly UI
- Fast response time (< 300ms for key actions)
- Real-time ranking updates
- Beautiful, premium design with animations
- Free-tier deployment (Vercel + Supabase)

---

## 9. Future Scope (Post-MVP, in priority order)

1. **Match history tracking** — Record game results
2. **Elo-based ranking** — More sophisticated ranking algorithm
3. **Automated matchmaking** — Pair players by skill level
4. **Tournament features** — Organize club tournaments
5. **Social features** — Comments, reactions on profiles
6. **Head-to-head comparison** — Compare two players side by side
7. **Export data** — CSV/PDF reports
8. **Player of the Week/Month** — Recognition features

---

## 10. Constraints & Assumptions

### Constraints
- Internal club use only (~30 members)
- Free-tier services only ($0 budget)
- No complex authentication needed

### Assumptions
- Members will provide honest ratings
- Members are familiar with each other's skill levels
- Both singles and doubles play formats
- Members access from both mobile and desktop

---

## 11. Risks

- Biased or joke voting (mitigated by non-anonymous voting)
- Low participation rate (mitigated by engaging UI/UX)
- Budget limitations (mitigated by choosing free-tier services)

---

## 12. Member List (Current: 25 members)

| # | Nickname | Avatar |
|---|----------|--------|
| 1 | A.Công | ✅ |
| 2 | A.Hiếu | ✅ |
| 3 | A.Hùng 88 | ✅ |
| 4 | A.Thành | ✅ |
| 5 | A.Thắng | ✅ |
| 6 | Ca sĩ | ✅ |
| 7 | Chi | ✅ |
| 8 | Chị Oanh | ✅ |
| 9 | Chị Thái | ✅ |
| 10 | Chị Trang | ✅ |
| 11 | Duck Anh | ✅ |
| 12 | Dương ass | ✅ |
| 13 | Hoàn | ✅ |
| 14 | Huy Vua | ✅ |
| 15 | Huy Đào | ✅ |
| 16 | Huệ Huệ | ✅ |
| 17 | Hường | ✅ |
| 18 | Minh Duck | ✅ |
| 19 | My sói | ✅ |
| 20 | Nong | ✅ |
| 21 | Phúc-Chan | ✅ |
| 22 | Sếp | ✅ |
| 23 | Trường Phùng | ✅ |
| 24 | Vượng-Chan | ✅ |
| 25 | Đăng | ✅ |

> Note: ~5 more members can be added later via admin panel.