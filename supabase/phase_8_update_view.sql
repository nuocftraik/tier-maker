DROP VIEW IF EXISTS public.match_details;

CREATE OR REPLACE VIEW public.match_details AS
SELECT 
  m.id AS match_id,
  m.type,
  m.team_a_score,
  m.team_b_score,
  m.created_at,
  m.created_by,
  (
    SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'avatar_url', u.avatar_url))
    FROM public.match_participants mp
    JOIN public.users u ON u.id = mp.user_id
    WHERE mp.match_id = m.id AND mp.team = 'A'
  ) AS team_a,
  (
    SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'avatar_url', u.avatar_url))
    FROM public.match_participants mp
    JOIN public.users u ON u.id = mp.user_id
    WHERE mp.match_id = m.id AND mp.team = 'B'
  ) AS team_b
FROM public.matches m
ORDER BY m.created_at DESC;

-- Cấp quyền truy cập lại cho View mới
GRANT ALL ON TABLE public.match_details TO anon, authenticated, service_role;
