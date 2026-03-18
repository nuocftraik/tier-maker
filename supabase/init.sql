-- Setup extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(500),
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Votes table
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  score DECIMAL(3,1) NOT NULL CHECK (score >= 1.0 AND score <= 10.0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT no_self_vote CHECK (voter_id != target_user_id),
  CONSTRAINT unique_vote UNIQUE (voter_id, target_user_id)
);

-- 3. Settings table
CREATE TABLE IF NOT EXISTS public.settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default settings
INSERT INTO public.settings (key, value) VALUES
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
  ('tier_f_threshold', '3.0')
ON CONFLICT (key) DO NOTHING;

-- 4. Rankings view
DROP VIEW IF EXISTS public.rankings;
CREATE VIEW public.rankings AS
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
FROM public.users u
LEFT JOIN public.votes v ON u.id = v.target_user_id
WHERE u.is_active = TRUE
GROUP BY u.id, u.name, u.avatar_url;

-- 5. Seed initial members
INSERT INTO public.users (name, avatar_url, is_admin) VALUES
  ('A Công', 'Cong.png', false),
  ('A Hiếu', 'Hieu.png', false),
  ('A Hùng 88', 'Hung.png', false),
  ('A Thành', 'Thanh.png', false),
  ('A Thắng', 'Thang.png', false),
  ('Ca sĩ', 'Casi.png', false),
  ('Chi', 'Chi.png', false),
  ('Chị Oanh', 'Oanh.png', false),
  ('Chị Thái', 'Thai.png', false),
  ('Chị Trang', 'Cheng.png', false),
  ('Duck Anh', 'DucAnh.jpg', false),
  ('Dương ass', 'DuongAss.png', false),
  ('Hoàn', 'Hoan.png', false),
  ('Huy Vua', 'HuyVua.png', false),
  ('Huy Đào', 'HuyDao.png', false),
  ('Huệ Huệ', 'HueHue.png', false),
  ('Hường', 'Huong.png', false),
  ('Minh Duck', 'MinhDuck.png', false),
  ('My sói', 'MyWolf.png', false),
  ('Nong', 'Nong.jpg', false),
  ('Phúc Chan', 'PhukPhuk.png', false),
  ('Sếp', 'Sep.png', false),
  ('Trường Phùng', 'TruongPhung.png', false),
  ('Vượng Chan', 'LoVuong.png', false),
  ('Đăng', 'Dang.png', false)
ON CONFLICT DO NOTHING;
