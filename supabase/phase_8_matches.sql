-- 1. Create matches table
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('singles', 'doubles')),
  team_a_score INTEGER NOT NULL CHECK (team_a_score >= 0),
  team_b_score INTEGER NOT NULL CHECK (team_b_score >= 0),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create match_participants table
CREATE TABLE IF NOT EXISTS public.match_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  team VARCHAR(1) NOT NULL CHECK (team IN ('A', 'B')),
  
  -- Each user can only participate once per match
  CONSTRAINT unique_match_user UNIQUE (match_id, user_id)
);

-- Create views to easily fetch match history
DROP VIEW IF EXISTS public.match_details;
CREATE VIEW public.match_details AS
SELECT 
  m.id AS match_id,
  m.type,
  m.team_a_score,
  m.team_b_score,
  m.created_at,
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

-- 4. Cấp quyền truy cập (Quan trọng để API call không bị permission denied)
GRANT ALL ON TABLE public.matches TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.match_participants TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.match_details TO anon, authenticated, service_role;
