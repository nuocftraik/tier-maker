-- 1. Enum types for tournaments
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tournament_type') THEN
        CREATE TYPE tournament_type AS ENUM ('elimination', 'round_robin', 'custom');
    ELSE
        -- Add 'custom' to existing enum if not yet present
        BEGIN
            ALTER TYPE tournament_type ADD VALUE IF NOT EXISTS 'custom';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tournament_status') THEN
        CREATE TYPE tournament_status AS ENUM ('draft', 'active', 'completed');
    END IF;
END $$;

-- 2. Create tournaments table
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type tournament_type NOT NULL DEFAULT 'elimination',
  match_mode VARCHAR(10) NOT NULL DEFAULT 'singles' CHECK (match_mode IN ('singles', 'doubles')),
  seeding_mode VARCHAR(10) NOT NULL DEFAULT 'random' CHECK (seeding_mode IN ('random', 'manual')),
  status tournament_status NOT NULL DEFAULT 'draft',
  -- Custom type config: group stage → knockout
  group_count INTEGER DEFAULT 0,           -- Number of groups (0 = not custom)
  advance_per_group INTEGER DEFAULT 0,     -- How many from each group advance to knockout
  current_stage VARCHAR(20) DEFAULT 'group' CHECK (current_stage IN ('group', 'knockout')),
  winner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2b. Add new columns to existing tournaments table (safe migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournaments' AND column_name='match_mode') THEN
        ALTER TABLE public.tournaments ADD COLUMN match_mode VARCHAR(10) NOT NULL DEFAULT 'singles' CHECK (match_mode IN ('singles', 'doubles'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournaments' AND column_name='seeding_mode') THEN
        ALTER TABLE public.tournaments ADD COLUMN seeding_mode VARCHAR(10) NOT NULL DEFAULT 'random' CHECK (seeding_mode IN ('random', 'manual'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournaments' AND column_name='group_count') THEN
        ALTER TABLE public.tournaments ADD COLUMN group_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournaments' AND column_name='advance_per_group') THEN
        ALTER TABLE public.tournaments ADD COLUMN advance_per_group INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournaments' AND column_name='current_stage') THEN
        ALTER TABLE public.tournaments ADD COLUMN current_stage VARCHAR(20) DEFAULT 'group' CHECK (current_stage IN ('group', 'knockout'));
    END IF;
END $$;

-- 3. Create tournament_participants table
CREATE TABLE IF NOT EXISTS public.tournament_participants (
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  seed INTEGER,
  group_number INTEGER DEFAULT 0,  -- For custom type: which group they belong to
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (tournament_id, user_id)
);

-- 3b. Add group_number to existing table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournament_participants' AND column_name='group_number') THEN
        ALTER TABLE public.tournament_participants ADD COLUMN group_number INTEGER DEFAULT 0;
    END IF;
END $$;

-- 4. Add tournament context to matches table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='tournament_id') THEN
        ALTER TABLE public.matches ADD COLUMN tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='round_number') THEN
        ALTER TABLE public.matches ADD COLUMN round_number INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='match_order') THEN
        ALTER TABLE public.matches ADD COLUMN match_order INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='next_match_id') THEN
        ALTER TABLE public.matches ADD COLUMN next_match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='stage') THEN
        ALTER TABLE public.matches ADD COLUMN stage VARCHAR(20) DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='group_number') THEN
        ALTER TABLE public.matches ADD COLUMN group_number INTEGER DEFAULT NULL;
    END IF;
END $$;

-- 5. Update match_details view to include tournament + stage info
DROP VIEW IF EXISTS public.match_details;
CREATE VIEW public.match_details AS
SELECT 
  m.id AS match_id,
  m.type,
  m.team_a_score,
  m.team_b_score,
  m.created_at,
  m.created_by,
  m.tournament_id,
  m.round_number,
  m.match_order,
  m.next_match_id,
  m.stage,
  m.group_number,
  -- Aggregating Team A info
  (
    SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'avatar_url', u.avatar_url))
    FROM public.match_participants mp
    JOIN public.users u ON u.id = mp.user_id
    WHERE mp.match_id = m.id AND mp.team = 'A'
  ) AS team_a,
  -- Aggregating Team B info
  (
    SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'avatar_url', u.avatar_url))
    FROM public.match_participants mp
    JOIN public.users u ON u.id = mp.user_id
    WHERE mp.match_id = m.id AND mp.team = 'B'
  ) AS team_b
FROM public.matches m
ORDER BY m.created_at DESC;

-- 6. Grant access
GRANT ALL ON TABLE public.tournaments TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.tournament_participants TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.match_details TO anon, authenticated, service_role;
