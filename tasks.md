# 📋 Implementation Plan
## INRES BADMINTON CLUB — Tier Ranking System

---

## Overview

Kế hoạch triển khai MVP cho hệ thống xếp hạng tier CLB cầu lông INRES.
Chia thành **6 phases**, ước tính tổng thời gian: **~3-5 ngày** (vibe coding).

---

## Phase 1: Project Setup & Infrastructure
**Estimated: 30 phút**

- [ ] **1.1** Initialize Next.js project (TypeScript, App Router)
- [ ] **1.2** Install dependencies:
  - `@supabase/supabase-js` — Supabase client
  - `@dnd-kit/core`, `@dnd-kit/sortable` — Drag & drop
  - `framer-motion` — Animations
  - `lucide-react` — Icons
  - `swr` — Data fetching & caching
  - `jsonwebtoken` / `jose` — JWT auth
- [ ] **1.3** Setup Supabase project (free tier)
  - Create project on supabase.com
  - Run SQL migrations (users, votes, settings tables, rankings view)
  - Create storage bucket for avatars
  - Upload 25 member photos
- [ ] **1.4** Configure environment variables
- [ ] **1.5** Setup CSS architecture (globals, themes, variables)
- [ ] **1.6** Setup Google Fonts (Outfit + Inter)
- [ ] **1.7** Seed initial data (25 members + default settings)

---

## Phase 2: Authentication & Layout
**Estimated: 2-3 giờ**

- [x] **2.1** Create Login page
  - Access code input field
  - Member selection grid (avatars + names)
  - Admin login button
  - Responsive layout
- [x] **2.2** Create Admin Login flow
  - Select name + enter admin password
  - Validate against is_admin flag
- [x] **2.3** Implement auth API routes
  - `POST /api/auth/login`
  - `POST /api/auth/admin-login`
  - JWT token management
- [x] **2.4** Create app layout
  - Navbar with navigation links
  - Theme toggle (dark/light)
  - Language toggle (Vi/En)
  - User avatar + logout
- [x] **2.5** Implement auth middleware (protect routes)
- [x] **2.6** Create base UI components (Button, Input, Card, Avatar, Badge)

---

## Phase 3: Leaderboard (Main Page)
**Estimated: 3-4 giờ**

- [x] **3.1** Implement `GET /api/leaderboard` API
- [x] **3.2** Create LeaderboardTable component
  - Gaming/esports style design
  - Rank, Avatar, Name, Score, Tier badge
  - Blue + White brand colors
- [x] **3.3** Create TierBadge component
  - 8 tiers with unique colors
  - Styled badges with tier label
- [x] **3.4** Create TopThree component
  - Special display for top 3 players
  - Larger cards, podium style
- [x] **3.5** Implement S-tier special effects
  - Fire border animation (CSS)
  - Sparkle particle effect
  - Crown icon overlay
  - Toggle controls (admin settings)
- [x] **3.6** Implement Bot tier special styling (🤖 icon)
- [x] **3.7** Add Framer Motion animations
  - Rank change slide animations
  - Score counter animations
  - Staggered entry animations
- [x] **3.8** Add tier filter functionality
- [x] **3.9** Responsive design (mobile + desktop)
- [x] **3.10** Dark mode styling

---

## Phase 4: Voting System
**Estimated: 4-5 giờ**

- [x] **4.1** Implement Vote API routes
  - `POST /api/votes` (upsert)
  - `GET /api/votes?targetUserId=:id`
  - `GET /api/votes/my-votes`
  - `DELETE /api/votes/:id`
- [x] **4.2** Create Click & Score voting
  - Member grid/list
  - Click to open score input
  - Score slider or number input (1-10)
  - Submit button
- [x] **4.3** Create TierMaker Drag & Drop board
  - Tier rows (S through Bot) as drop zones
  - MemberPool (unassigned members)
  - Draggable TierCards with avatars
  - @dnd-kit integration
- [x] **4.4** Implement inline score editing
  - Score input appears on card after drop
  - Default score based on tier midpoint
  - Editable without popup
  - Auto-save on blur/enter (debounced)
- [x] **4.5** Pre-populate board with user's existing votes
- [x] **4.6** Add drag & drop animations
  - Drag start: scale up, shadow
  - Dragging: semi-transparent, cursor follow
  - Drop: smooth transition
  - Drop zone hover: highlight
- [x] **4.7** Real-time ranking update after vote
- [x] **4.8** Validation (no self-vote, score range)
- [x] **4.9** Responsive design for vote page

---

## Phase 5: Profile & Vote History
**Estimated: 2-3 giờ**

- [x] **5.1** Implement Profile API
  - `GET /api/users/:id/profile`
  - Return user info + received votes + stats
- [x] **5.2** Create ProfileCard component
  - Avatar (large), name, current tier, score
  - Tier badge with effects (if S)
- [x] **5.3** Create VoteHistory component
  - Table/list of received votes
  - Voter name, score, date
  - Sort by date or score
- [x] **5.4** Create StatsCard component
  - Total votes received
  - Average score
  - Highest/lowest vote
  - Current rank position
- [x] **5.5** Responsive design
- [x] **5.6** Dark mode styling

---

## Phase 6: Admin Panel
**Estimated: 2-3 giờ**

- [ ] **6.1** Implement Admin API routes
  - `PUT /api/admin/settings`
  - `PUT /api/admin/users/:id/role`
  - `POST /api/users` (admin only)
  - `PUT /api/users/:id` (admin only)
  - `DELETE /api/users/:id` (admin only)
- [ ] **6.2** Create Admin Dashboard
  - Quick stats overview
  - Member count, total votes, etc.
- [ ] **6.3** Create Member Management page
  - Member list with actions (edit, delete)
  - Add new member form (name + avatar upload)
  - Edit member form
  - Delete confirmation
- [ ] **6.4** Create Settings page
  - Change access code
  - Change admin password
  - Toggle S-tier effects (fire, sparkle, crown)
  - (Future: tier thresholds)
- [ ] **6.5** Create Admin Permission management
  - Grant/revoke admin role
  - Prevent removing last admin
- [ ] **6.6** Admin route protection

---

## Phase 7: Polish & Deploy
**Estimated: 2-3 giờ**

- [ ] **7.1** Internationalization (i18n)
  - Extract all text strings
  - Vietnamese translations
  - English translations
  - Language toggle persistence
- [ ] **7.2** Final responsive testing
  - Mobile (375px, 390px, 414px)
  - Tablet (768px)
  - Desktop (1024px, 1440px)
- [ ] **7.3** Dark mode polish
  - Verify all components in both themes
  - Smooth transition animation
- [ ] **7.4** Performance optimization
  - Image optimization (Next.js Image)
  - SWR caching configuration
  - Debounce API calls
- [ ] **7.5** Deploy to Vercel
  - Push to GitHub
  - Connect to Vercel
  - Configure environment variables
  - Verify deployment
- [ ] **7.6** Upload avatars to Supabase Storage
- [ ] **7.7** Seed production data
- [ ] **7.8** Final testing on production URL

---

## Deploy Checklist

- [ ] Supabase project created
- [ ] Database tables and views created
- [ ] Avatars uploaded to Supabase Storage
- [ ] Initial member data seeded
- [ ] Default settings configured
- [ ] GitHub repo created and pushed
- [ ] Vercel project connected
- [ ] Environment variables set in Vercel
- [ ] Production URL working
- [ ] Mobile responsive verified
- [ ] Dark mode verified
- [ ] Admin panel tested
- [ ] Voting flow tested end-to-end

---

## Future Phases (Post-MVP)

### Phase 8: Match History Tracking
- Record game results (winner, loser, score)
- Singles and doubles support
- Match statistics

### Phase 9: Elo-Based Ranking
- Implement Elo rating algorithm
- Dual ranking: community vote + Elo
- Historical rating graph

### Phase 10: Automated Matchmaking
- Skill-based pairing suggestions
- Singles and doubles matchmaking
- Fair team generation

### Phase 11: Tournament Features
- Bracket generation
- Tournament modes (round-robin, elimination)
- Tournament history

### Phase 12: Social Features
- Comments on profiles
- Reactions to rankings
- Activity feed

### Phase 13: Utilities
- Head-to-head comparison
- Data export (CSV/PDF)
- Player of the Week/Month
