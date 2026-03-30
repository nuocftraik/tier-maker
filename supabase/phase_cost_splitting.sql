-- Phase: Cost Splitting V3 (Poll & Global Rules)
-- Run this migration on Supabase dashboard

-- 1. Phiên chơi (tạo poll trước, chia tiền sau)
CREATE TABLE IF NOT EXISTS public.cost_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  total_court_fee INT NOT NULL DEFAULT 0,
  total_shuttle_fee INT NOT NULL DEFAULT 0,
  total_drink_fee INT NOT NULL DEFAULT 0,
  qr_image_url TEXT,
  bank_info TEXT,
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'voting', -- 'voting', 'splitting', 'closed'
  session_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Danh sách người tham gia & số tiền
CREATE TABLE IF NOT EXISTS public.cost_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.cost_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  base_amount INT NOT NULL DEFAULT 0,
  adjustment INT NOT NULL DEFAULT 0,
  adjustment_note TEXT,
  final_amount INT NOT NULL DEFAULT 0,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  vote_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'yes', 'no'
  participant_note TEXT,
  UNIQUE(session_id, user_id)
);

-- 3. Bảng quy định chung (Global Rules)
CREATE TABLE IF NOT EXISTS public.cost_global_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_text TEXT NOT NULL,
  penalty_amount INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS to match the rest of the database
ALTER TABLE public.cost_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_global_rules DISABLE ROW LEVEL SECURITY;

-- Xóa các policy cũ nếu chúng tồn tại để dọn dẹp
DROP POLICY IF EXISTS "Allow all for cost_sessions" ON public.cost_sessions;
DROP POLICY IF EXISTS "Allow all for cost_participants" ON public.cost_participants;
DROP POLICY IF EXISTS "Allow all for cost_global_rules" ON public.cost_global_rules;

-- GRANT permissions explicitly for Supabase API roles
GRANT ALL ON TABLE public.cost_sessions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.cost_participants TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.cost_global_rules TO anon, authenticated, service_role;

-- Drop the old cost_rules table if it exists
DROP TABLE IF EXISTS public.cost_rules;
