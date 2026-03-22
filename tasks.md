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

- [x] **6.1** Implement Admin API routes
  - `PUT /api/admin/settings`
  - `PUT /api/admin/users/:id/role`
  - `POST /api/users` (admin only)
  - `PUT /api/users/:id` (admin only)
  - `DELETE /api/users/:id` (admin only)
- [x] **6.2** Create Admin Dashboard
  - Quick stats overview
  - Member count, total votes, etc.
- [x] **6.3** Create Member Management page
  - Member list with actions (edit, delete)
  - Add new member form (name + avatar upload)
  - Edit member form
  - Delete confirmation
- [x] **6.4** Create Settings page
  - Change access code
  - Change admin password
  - Toggle S-tier effects (fire, sparkle, crown)
  - (Future: tier thresholds)
- [x] **6.5** Create Admin Permission management
  - Grant/revoke admin role
  - Prevent removing last admin
- [x] **6.6** Admin route protection

---

## Phase 7: Polish & Deploy
**Estimated: 2-3 giờ**

- [x] **7.1** Internationalization (i18n)
  - Extract all text strings
  - Vietnamese translations
  - English translations
  - Language toggle persistence
- [x] **7.2** Final responsive testing
  - Mobile (375px, 390px, 414px)
  - Tablet (768px)
  - Desktop (1024px, 1440px)
- [x] **7.3** Dark mode polish
  - Verify all components in both themes
  - Smooth transition animation
- [x] **7.4** Performance optimization
  - Image optimization (Next.js Image)
  - SWR caching configuration
  - Debounce API calls
- [x] **7.5** Deploy to Vercel
  - Push to GitHub
  - Connect to Vercel
  - Configure environment variables
  - Verify deployment
- [x] **7.6** Upload avatars to Supabase Storage
- [x] **7.7** Seed production data
- [x] **7.8** Final testing on production URL


---

## Deploy Checklist

- [x] Supabase project created
- [x] Database tables and views created
- [x] Avatars uploaded to Supabase Storage
- [x] Initial member data seeded
- [x] Default settings configured
- [x] GitHub repo created and pushed
- [x] Vercel project connected
- [x] Environment variables set in Vercel
- [x] Production URL working
- [x] Mobile responsive verified
- [x] Dark mode verified
- [x] Admin panel tested
- [x] Voting flow tested end-to-end

---

## Future Phases (Post-MVP)

## Phase 8: Match History Tracking
**Estimated: 3-4 giờ**

- [x] **8.1** Database Schema for Matches
  - Create `matches` table (id, type, team_a_score, team_b_score, created_at)
  - Create `match_participants` table (id, match_id, user_id, team)
  - Add SQL script `supabase/phase_8_matches.sql`
- [x] **8.2** Implement Match API
  - `POST /api/matches` (Record result and players)
  - `GET /api/matches` (Recent global matches feed)
  - `GET /api/users/:id/matches` (Specific user's match history)
- [x] **8.3** Create Match Recorder UI
  - Modal/Page for recording match
  - Select Singles (1v1) or Doubles (2v2)
  - Player selectors with Avatars
  - Input scores (VD: 21-19)
- [x] **8.4** Create Global Match History UI
  - Add a Feed component to show all recent matches
  - Highlight winner/loser
- [x] **8.5** Player Match Statistics
  - Update Personal Profile page
  - Show Win/Loss ratio, total matches played
- [x] **8.6** Match History Enhancements
  - Add Edit and Delete functionalities for administrators and match creators
  - Refactor match scoring UI to display Best Of format tags (BO1, BO3, BO5)
  - Styling adjustments for match tags and scores

### Phase 9: Elo-Based Ranking (Đã Hủy Bỏ / Reverted)
- [x] Đã thử nghiệm nhưng quyết định revert để ưu tiên hệ thống community vote
- [x] Xóa database schema, API, logic tính toán Elo
- [x] Xóa UI hiển thị Elo trên Rankings và Profile
- [x] Đảm bảo hệ thống hoạt động ổn định với cơ chế Rank Vote nguyên bản

### Phase 11: Tournament Features
**Estimated: 5-7 giờ**

- [x] **11.1** Database Schema for Tournaments
  - Create `tournaments` table (id, name, type, status, winner_id, created_at)
  - Create `tournament_participants` table (tournament_id, user_id, seed)
  - Add `tournament_id`, `round_number`, `match_order` to `matches` table (allow null for standard matches)
  - Add SQL script `supabase/phase_11_tournaments.sql`
- [x] **11.2** Implement Tournament API
  - `POST /api/tournaments` (Create new tournament)
  - `GET /api/tournaments` (List tournaments)
  - `GET /api/tournaments/:id` (Get tournament details with bracket)
  - `POST /api/tournaments/:id/generate-bracket` (Generate matches based on type/participants)
- [x] **11.3** Create Tournament Portal UI
  - Page showing list of active and past tournaments
  - Navigation in Navbar (Tournament icon 🏆)
- [x] **11.4** Tournament Creation & Management (Admin Only)
  - UI for naming tournament, selecting type (Elimination/Round-robin)
  - Player picker (multiple select) with seed assignment
- [x] **11.5** Implementation: Single Elimination Bracket
  - Algorithm to generate bracket matches (power of 2 handling)
  - UI for viewing the bracket (interactive tree)
  - Recording match results updates bracket progression automatically
- [x] **11.6** Implementation: Round Robin System
  - Algorithm to generate all-vs-all match schedule
  - Standings table with Win/Loss/Points/Diff
- [x] **11.7** Tournament Finalization & History
  - Mark tournament as completed, award winner badge
  - Update user profile to list tournament podium positions
- [x] **11.8** BO3 Tournament Flow & Custom Modals
  - Implement Single Elimination + Singles + BO3 logic
  - Support setting BO number (BO1, BO3, BO5) via description field workaround
  - UI custom confirmation modals (start/confirm tournament)
  - Display final champion and tournament completion status

### Phase 12: Social Features
- Comments on profiles
- Reactions to rankings
- Activity feed

### Phase 13: Utilities
- [x] **13.1 Head-to-head comparison**
  - Xem lịch sử đối đầu trực tiếp giữa 2 người chơi qua trang `/head-to-head`.
- [x] **13.2 Player of the Month**
  - Tính năng vinh danh người chơi xuất sắc nhất tháng (most wins) trên Leaderboard.
- [ ] Data export (CSV/PDF)
- [x] **14.1 Fix Match Creation Duplicate Players**
  - Cập nhật logic trong form tạo/sửa trận đấu để ngăn chặn chọn cùng một người chơi cho cả 2 đội (Team A và Team B).
- [x] **14.2 Secure Admin Settings UI**
  - Chuyển đổi các trường hiển thị `Access Code` và `Admin Password` trong trang cài đặt Admin từ dạng clear text sang mask (`type="password"`), đi kèm nút toggle hiển thị.
- [x] **14.3 Fix Score Input Leading Zeros**
  - Thêm xử lý `parseInt` hoặc validation để loại bỏ số 0 ở đầu khi nhập điểm số các set đấu (VD: không cho nhập "018", tự chuyển thành "18").
- [x] **14.4 Fix Tournament Bracket Profile Links**
  - Kiểm tra và sửa lỗi thẻ `<Link>` trong form xem nhánh giải đấu dẫn đến `/profile/undefined`. Yêu cầu fallback ID an toàn.
- [ ] **14.5 Complete i18n Localization**
  - Đưa toàn bộ các text tiếng Việt hardcode trong các trang (Xếp hạng, Bỏ phiếu, Trận đấu) vào hệ thống từ điển ngôn ngữ để chức năng switch EN/VI hoạt động đồng bộ 100%.

---
*(Xem chi tiết Phân tích Gap trong file `product_audit_report.md`)*
