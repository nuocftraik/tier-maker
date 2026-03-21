# ⚙️ Technical Specification
## INRES BADMINTON CLUB — Tier Ranking System

---

## 1. Purpose

This document defines the complete technical design of the INRES Badminton Club Tier Ranking System. It covers architecture, data model, APIs, core logic, UI components, and deployment strategy. All decisions reflect the product owner interview.

---

## 2. Scope

### In Scope (MVP + Post-MVP)
- Authentication (access code + admin password)
- Member management with avatar support
- Dual voting system (Click & Score + Drag & Drop TierMaker)
- 8-tier ranking with custom colors and S-tier effects
- Real-time leaderboard (gaming style)
- Member profiles with vote history
- Admin panel
- Match History Tracking & Enhancements
- Tournament Features (Single Elimination, Round Robin, Custom, BO3)
- Dark mode + bilingual (Vi/En)
- Responsive design (mobile + desktop)

### Out of Scope (Future / Reverted)
- Elo-based ranking (Reverted to community vote system)
- Automated matchmaking
- Social features
- Head-to-head comparison
- Data export (CSV/PDF)

---

## 3. System Architecture

### 3.1 Overview

```
┌─────────────────────────────────────────────────┐
│                    Vercel                        │
│  ┌───────────────────────────────────────────┐   │
│  │           Next.js Application             │   │
│  │  ┌─────────────┐  ┌───────────────────┐   │   │
│  │  │   Pages     │  │   API Routes      │   │   │
│  │  │  (React)    │  │  (/api/*)          │   │   │
│  │  │             │  │                    │   │   │
│  │  │  - Login    │  │  - /api/auth/*     │   │   │
│  │  │  - Board    │  │  - /api/users/*    │   │   │
│  │  │  - Vote     │  │  - /api/votes/*    │   │   │
│  │  │  - Profile  │  │  - /api/leaderboard│   │   │
│  │  │  - Admin    │  │  - /api/admin/*    │   │   │
│  │  └─────────────┘  └────────┬──────────┘   │   │
│  └────────────────────────────┼──────────────┘   │
└───────────────────────────────┼───────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │      Supabase         │
                    │  ┌─────────────────┐  │
                    │  │   PostgreSQL    │  │
                    │  │   (Database)    │  │
                    │  └─────────────────┘  │
                    │  ┌─────────────────┐  │
                    │  │    Storage      │  │
                    │  │   (Avatars)     │  │
                    │  └─────────────────┘  │
                    └───────────────────────┘
```

### 3.2 Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 14+ (App Router) |
| Language | TypeScript | 5+ |
| UI Library | React | 18+ |
| Styling | CSS Modules + CSS Variables | — |
| Drag & Drop | @dnd-kit/core | Latest |
| Database | Supabase (PostgreSQL) | Free tier |
| Storage | Supabase Storage | Free tier |
| Deployment | Vercel | Free tier |
| State Management | React Context + SWR | — |
| Animations | Framer Motion | Latest |
| Icons | Lucide React | Latest |
| i18n | next-intl or custom | — |

### 3.3 Design Principles

- Keep logic simple and transparent
- Mobile-first responsive design
- Real-time updates without full page refresh
- Avoid premature optimization
- Ensure easy extensibility
- Maintain clear separation of concerns

---

## 4. Data Model

### 4.1 Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(500),
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Votes Table

```sql
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score DECIMAL(3,1) NOT NULL CHECK (score >= 1.0 AND score <= 10.0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT no_self_vote CHECK (voter_id != target_user_id),
  CONSTRAINT unique_vote UNIQUE (voter_id, target_user_id)
);
```

### 4.3 Rankings View (Computed)

```sql
CREATE VIEW rankings AS
SELECT
  u.id AS user_id,
  u.name,
  u.avatar_url,
  COALESCE(AVG(v.score), 0) AS avg_score,
  COUNT(v.id) AS total_votes,
  CASE
    WHEN COUNT(v.id) = 0 THEN 'Unranked'
    WHEN AVG(v.score) >= 9.0 THEN 'S'
    WHEN AVG(v.score) >= 8.0 THEN 'A'
    WHEN AVG(v.score) >= 7.0 THEN 'B'
    WHEN AVG(v.score) >= 6.0 THEN 'C'
    WHEN AVG(v.score) >= 5.0 THEN 'D'
    WHEN AVG(v.score) >= 4.0 THEN 'E'
    WHEN AVG(v.score) >= 3.0 THEN 'F'
    ELSE 'Bot'
  END AS tier,
  RANK() OVER (
    ORDER BY
      CASE WHEN COUNT(v.id) = 0 THEN 1 ELSE 0 END,
      AVG(v.score) DESC,
      COUNT(v.id) DESC,
      u.name ASC
  ) AS rank
FROM users u
LEFT JOIN votes v ON u.id = v.target_user_id
WHERE u.is_active = TRUE
GROUP BY u.id, u.name, u.avatar_url;
```

### 4.4 Settings Table

```sql
CREATE TABLE settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default settings
INSERT INTO settings (key, value) VALUES
  ('access_code', 'inres2026'),
  ('admin_password', 'Abcd@1234'),
  ('tier_s_fire_effect', 'true'),
  ('tier_s_sparkle_effect', 'true'),
  ('tier_s_crown_effect', 'true'),
  ('tier_s_threshold', '9.0'),
  ('tier_a_threshold', '8.0'),
  ('tier_b_threshold', '7.0'),
  ('tier_c_threshold', '6.0'),
  ('tier_d_threshold', '5.0'),
  ('tier_e_threshold', '4.0'),
  ('tier_f_threshold', '3.0');
```

### 4.5 Matches & Tournaments Tables (Added Phase 8 & 11)

```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY,
  type VARCHAR (singles/doubles),
  team_a_score INT,
  team_b_score INT,
  set_scores JSONB,
  tournament_id UUID,
  created_at TIMESTAMPTZ
);

CREATE TABLE match_participants (
  match_id UUID,
  user_id UUID,
  team VARCHAR
);

CREATE TABLE tournaments (
  id UUID PRIMARY KEY,
  name VARCHAR,
  type VARCHAR (elimination/round_robin/custom),
  status VARCHAR,
  description TEXT, -- Used for BO format
  created_at TIMESTAMPTZ
);
```

---

## 5. Core Logic

### 5.1 Authentication Flow

```
Member Login:
1. User enters access code
2. System validates against settings.access_code
3. System displays member list with avatars
4. User selects their identity
5. System creates session (JWT or cookie)

Admin Login:
1. User clicks "Admin Login"
2. User selects their name + enters admin password
3. System validates: user.is_admin === true AND password matches settings.admin_password
4. System creates admin session
```

### 5.2 Voting Logic

```
Submit Vote:
1. Validate: voter_id exists, target_user_id exists
2. Validate: voter_id ≠ target_user_id
3. Validate: score is between 1.0 and 10.0
4. UPSERT: If vote exists for (voter, target) → update; else → insert
5. Return updated ranking data

Drag & Drop Vote:
1. User drags avatar to tier row
2. System assigns default score for that tier:
   - S → 9.5, A → 8.5, B → 7.5, C → 6.5, D → 5.5, E → 4.5, F → 3.5, Bot → 2.0
3. Inline input appears on card for score fine-tuning
4. User can adjust score within tier range or any valid value
5. On blur/enter → submit vote via API
```

### 5.3 Score Calculation

```
avg_score = SUM(received_votes.score) / COUNT(received_votes)
```

- Real-time recalculation on every vote change
- Members with 0 votes → "Unranked" (no score displayed)

### 5.4 Ranking Calculation

```
ORDER BY:
  1. Unranked members go to bottom
  2. avg_score DESC (higher = better)
  3. total_votes DESC (more votes = higher on tie)
  4. name ASC (alphabetical on remaining ties)
```

### 5.5 Tier Assignment

| Tier | Score Range | Hex Color | Default Score (drag) |
|------|-----------|-----------|---------------------|
| S | ≥ 9.0 | `#FF1744` (Red) / `#FFD700` (Gold) | 9.5 |
| A | 8.0 – 8.9 | `#FF6D00` (Orange) | 8.5 |
| B | 7.0 – 7.9 | `#FFD600` (Yellow) | 7.5 |
| C | 6.0 – 6.9 | `#00C853` (Green) | 6.5 |
| D | 5.0 – 5.9 | `#2979FF` (Blue) | 5.5 |
| E | 4.0 – 4.9 | `#AA00FF` (Purple) | 4.5 |
| F | 3.0 – 3.9 | `#78909C` (Gray) | 3.5 |
| Bot | < 3.0 | `#37474F` (Dark Gray) | 2.0 |
| Unranked | No votes | `#546E7A` (Muted) | — |

### 5.6 Match Logic (Observed)
- The system dynamically handles BO1, BO3, and BO5 formats by storing overall scores along with an array of individual set scores.
- The UI exposes specific input groups per set depending on the selected "Best of" dropdown.
- Only administrators or the original match creators possess the authorization to edit or delete match records.
- The system currently allows selecting the identical player entity for both Team A and Team B in match creation/edit.
- Score inputs treat numerical values loosely, allowing inputs with leading zeros (e.g., "018").

### 5.7 Localization Logic (Observed)
- The application implements a VI/EN toggle, but its scope is limited to navigation headers. The core UI components rely on hardcoded Vietnamese strings.

### 5.8 Tournament Logic (Observed)
- **Best Of Workaround**: The "Số ván thắng" (BO1, BO3, BO5) selected in the frontend is stored and parsed using the `description` string column in the database API.
- **Pre-flight Modals**: Tournament start and creation trigger custom verification modals holding summarized participant and setting details to prevent misconfiguration.
- **Champion State**: The final winner is marked in the UI via specific checks against the bracket end-states, awarding a champion badge dynamically.

---

## 6. API Design

### 6.1 Authentication APIs

#### POST `/api/auth/login`
```json
// Request
{ "accessCode": "inres2026", "userId": "uuid-here" }

// Response 200
{ "token": "jwt-token", "user": { "id": "...", "name": "...", "isAdmin": false } }

// Response 401
{ "error": "Invalid access code" }
```

#### POST `/api/auth/admin-login`
```json
// Request
{ "userId": "uuid-here", "password": "Abcd@1234" }

// Response 200
{ "token": "jwt-token", "user": { "id": "...", "name": "...", "isAdmin": true } }

// Response 401
{ "error": "Invalid credentials or not an admin" }
```

---

### 6.2 User APIs

#### GET `/api/users`
Returns list of all active users (for member selection and display).
```json
// Response 200
[
  { "id": "...", "name": "A.Công", "avatarUrl": "https://...", "isAdmin": false }
]
```

#### POST `/api/users` (Admin only)
```json
// Request
{ "name": "New Member", "avatarUrl": "https://..." }
```

#### PUT `/api/users/:id` (Admin only)
```json
// Request
{ "name": "Updated Name", "avatarUrl": "https://..." }
```

#### DELETE `/api/users/:id` (Admin only)
Soft delete (sets `is_active = false`).

---

### 6.3 Vote APIs

#### POST `/api/votes`
Create or update a vote (upsert).
```json
// Request
{ "targetUserId": "uuid-here", "score": 8.5 }

// Response 200
{ "vote": { "id": "...", "voterId": "...", "targetUserId": "...", "score": 8.5 } }
```

#### GET `/api/votes?targetUserId=:id`
Get all votes received by a specific user.
```json
// Response 200
[
  { "id": "...", "voter": { "id": "...", "name": "..." }, "score": 8.5, "updatedAt": "..." }
]
```

#### GET `/api/votes/my-votes`
Get all votes submitted by the current user.

#### DELETE `/api/votes/:id`
Delete a specific vote.

---

### 6.4 Leaderboard API

#### GET `/api/leaderboard`
```json
// Query params: ?tier=S (optional filter)

// Response 200
[
  {
    "userId": "...",
    "name": "Huy Vua",
    "avatarUrl": "https://...",
    "avgScore": 9.2,
    "totalVotes": 15,
    "tier": "S",
    "rank": 1
  }
]
```

---

### 6.5 Matches & Tournaments APIs

#### Matches APIs
- `GET /api/matches`: Feed of recent matches globally or for a specific user.
- `POST /api/matches`: Report new match result, including set scores.
- `PUT /api/matches/:id`: Edit match details (Admin & match creator).
- `DELETE /api/matches/:id`: Delete a match (Admin & match creator).

#### Tournaments APIs
- `GET /api/tournaments`: List of active and completed tournaments.
- `POST /api/tournaments`: Create a new tournament.
- `GET /api/tournaments/:id`: Details and brackets of a tournament.
- `POST /api/tournaments/:id/generate-bracket`: Generate matches for the bracket.

---

### 6.6 Admin APIs

#### PUT `/api/admin/settings`
```json
// Request
{ "key": "access_code", "value": "newcode2026" }
```

#### PUT `/api/admin/users/:id/role`
```json
// Request
{ "isAdmin": true }
```

#### PUT `/api/admin/users/:id/tier`
Manual tier override (admin adjustment).
```json
// Request
{ "tier": "A", "reason": "Manual adjustment" }
```

---

## 7. Frontend Architecture

### 7.1 Page Structure (Next.js App Router)

```
app/
├── layout.tsx              — Root layout (theme, i18n, fonts)
├── page.tsx                — Login page
├── (app)/
│   ├── layout.tsx          — App layout (navbar, auth check)
│   ├── leaderboard/
│   │   └── page.tsx        — Main leaderboard (gaming style)
│   ├── vote/
│   │   └── page.tsx        — TierMaker drag-and-drop + click voting
│   ├── profile/
│   │   └── [id]/
│   │       └── page.tsx    — Member profile & vote history
│   └── admin/
│       ├── page.tsx        — Admin dashboard
│       ├── members/
│       │   └── page.tsx    — Member management
│       └── settings/
│           └── page.tsx    — App settings
├── api/                    — API routes (as defined in section 6)
└── components/
    ├── ui/                 — Base UI components
    │   ├── Button.tsx
    │   ├── Input.tsx
    │   ├── Card.tsx
    │   ├── Badge.tsx
    │   ├── Avatar.tsx
    │   ├── Modal.tsx
    │   └── Toggle.tsx
    ├── tier/               — Tier-specific components
    │   ├── TierBadge.tsx   — Colored tier label
    │   ├── TierRow.tsx     — TierMaker row (drop zone)
    │   ├── TierCard.tsx    — Draggable member card
    │   └── TierEffects.tsx — S-tier fire/sparkle/crown
    ├── leaderboard/        — Leaderboard components
    │   ├── LeaderboardTable.tsx
    │   ├── LeaderboardRow.tsx
    │   └── TopThree.tsx    — Special display for top 3
    ├── vote/               — Voting components
    │   ├── VoteBoard.tsx   — Drag & drop board
    │   ├── ScoreInput.tsx  — Inline score input
    │   └── MemberPool.tsx  — Unassigned members
    ├── profile/            — Profile components
    │   ├── ProfileCard.tsx
    │   ├── VoteHistory.tsx
    │   └── StatsCard.tsx
    ├── admin/              — Admin components
    │   ├── MemberForm.tsx
    │   └── SettingsForm.tsx
    └── layout/             — Layout components
        ├── Navbar.tsx
        ├── ThemeToggle.tsx
        └── LanguageToggle.tsx
```

### 7.2 Key UI Components

#### TierMaker Vote Board
```
┌──────────────────────────────────────────────────────┐
│ S  │ 🔥[Avatar1]9.5▼ │ 🔥[Avatar2]9.2▼ │           │
├──────────────────────────────────────────────────────┤
│ A  │ [Avatar3]8.5▼ │ [Avatar4]8.0▼ │                │
├──────────────────────────────────────────────────────┤
│ B  │ [Avatar5]7.5▼ │                                 │
├──────────────────────────────────────────────────────┤
│ ... │                                                │
├──────────────────────────────────────────────────────┤
│ Bot│ 🤖[Avatar9]2.0▼ │                               │
└──────────────────────────────────────────────────────┘
│ Unassigned: [Av10] [Av11] [Av12] ...                 │
└──────────────────────────────────────────────────────┘

▼ = inline score input (editable)
```

#### Gaming Leaderboard
```
┌──────────────────────────────────────────────────────┐
│           🏆 INRES LEADERBOARD 🏆                    │
├──────────────────────────────────────────────────────┤
│ 👑 #1  🔥[Avatar] Huy Vua      9.2  [S]  ✨         │
│    #2    [Avatar] Ca sĩ        8.7  [A]             │
│    #3    [Avatar] Sếp          8.3  [A]             │
│    #4    [Avatar] A.Công       7.8  [B]             │
│    ...                                               │
│    #25   [Avatar] Nong         2.1  [Bot] 🤖        │
└──────────────────────────────────────────────────────┘
```

---

## 8. Styling & Theme

### 8.1 CSS Architecture

```
styles/
├── globals.css         — CSS variables, resets, base styles
├── themes/
│   ├── light.css       — Light theme variables
│   └── dark.css        — Dark theme variables
└── components/         — Component-specific CSS modules
```

### 8.2 Color Palette

```css
/* Brand Colors */
--color-primary: #2979FF;        /* Blue */
--color-primary-light: #82B1FF;
--color-primary-dark: #1565C0;
--color-on-primary: #FFFFFF;     /* White */

/* Dark Mode Background */
--bg-dark-primary: #0D1117;
--bg-dark-secondary: #161B22;
--bg-dark-card: #1C2333;

/* Light Mode Background */
--bg-light-primary: #F8FAFC;
--bg-light-secondary: #FFFFFF;
--bg-light-card: #FFFFFF;

/* Tier Colors */
--tier-s: #FF1744;
--tier-s-gold: #FFD700;
--tier-a: #FF6D00;
--tier-b: #FFD600;
--tier-c: #00C853;
--tier-d: #2979FF;
--tier-e: #AA00FF;
--tier-f: #78909C;
--tier-bot: #37474F;
--tier-unranked: #546E7A;
```

### 8.3 Typography

```css
/* Google Fonts: Outfit (headings) + Inter (body) */
--font-heading: 'Outfit', sans-serif;
--font-body: 'Inter', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

---

## 9. Animation Specifications

### 9.1 S-Tier Effects

#### Fire Border
- CSS animation using `box-shadow` with animated gradient
- Colors: `#FF1744` → `#FF6D00` → `#FFD700`
- Animation duration: 2s, infinite loop

#### Sparkle/Particles
- CSS `@keyframes` with pseudo-elements or canvas particles
- Random position sparkles around avatar
- Subtle, non-distracting

#### Crown Icon
- SVG crown overlay on top-left of avatar
- Gentle bobbing animation (translateY)

### 9.2 Leaderboard Animations
- **Rank change:** Smooth slide up/down with Framer Motion `layout` animation
- **New entry:** Fade in + scale from 0.9 to 1.0
- **Score update:** Number counter animation

### 9.3 Drag & Drop
- **Drag start:** Scale up 1.05, add shadow
- **Dragging:** Semi-transparent, follow cursor
- **Drop:** Smooth transition to new position
- **Drop zone hover:** Highlight tier row color

---

## 10. Validation Rules

| Field | Rule |
|-------|------|
| `score` | Must be 1.0 – 10.0, decimal allowed (1 decimal place) |
| `voter_id` | Must exist in users table |
| `target_user_id` | Must exist in users table |
| `voter_id ≠ target_user_id` | Cannot vote for self |
| `access_code` | Non-empty string |
| `user.name` | 1-100 characters |

---

## 11. Edge Cases & Known Issues

| Case | Handling / Current State |
|------|----------|
| User with 0 votes | Display as "Unranked", no score shown |
| Admin Settings View | Currently reveals access codes and admin passwords in plain text without masking. |
| Tournament Bracket Profile Link | Player avatars in brackets occasionally link to `/profile/undefined` due to a rendering bug. |
| Multiple rapid vote updates | Debounce API calls (300ms) |
| Tie in score | More votes → higher; then alphabetical |
| Deleting user with votes | Cascade delete votes; recalculate rankings |
| Admin deletes themselves | Prevent if they are the last admin |
| All S-tier effects disabled | No effects shown, tier badge remains |
| Access code is empty | Reject, require non-empty code |
| Score exactly on threshold | Belongs to the higher tier (≥) |

---

## 12. Error Handling

| Error | HTTP Code | Response |
|-------|-----------|----------|
| Invalid access code | 401 | `{ "error": "Mã truy cập không đúng" }` |
| Invalid admin password | 401 | `{ "error": "Mật khẩu không đúng" }` |
| Self-vote attempt | 400 | `{ "error": "Không thể vote cho chính mình" }` |
| Invalid score range | 400 | `{ "error": "Điểm phải từ 1.0 đến 10.0" }` |
| User not found | 404 | `{ "error": "Không tìm thấy thành viên" }` |
| Unauthorized admin action | 403 | `{ "error": "Không có quyền truy cập" }` |
| Server error | 500 | `{ "error": "Lỗi hệ thống" }` |

---

## 13. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...

# App
NEXT_PUBLIC_APP_NAME=INRES BADMINTON CLUB
JWT_SECRET=your-jwt-secret-here
```

---

## 14. Deployment Strategy

### 14.1 Prerequisites
1. GitHub repository connected
2. Supabase project created (free tier)
3. Vercel account connected to GitHub

### 14.2 Deploy Steps
1. Push code to GitHub `main` branch
2. Vercel auto-deploys on push
3. Set environment variables in Vercel dashboard
4. Run database migrations via Supabase dashboard

### 14.3 CI/CD
- Auto-deploy on push to `main`
- Preview deployments on pull requests
- No additional CI setup needed for MVP

---

## 15. Notes for AI Agents

- Prioritize clarity over optimization
- Avoid introducing unnecessary abstractions
- Follow existing patterns consistently
- Keep implementation simple and readable
- Use TypeScript strict mode
- Use CSS Modules for component styles
- Use CSS variables for theming (no Tailwind)
- Animations via Framer Motion, not raw CSS where complex
- All text strings should support i18n