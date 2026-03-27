-- Phase 12: Giữ lại lịch sử đánh giá thay vì ghi đè (Vote History)

-- 1. Xoá bỏ Unique constraint để 1 người có thể vote nhiều lần cho 1 người (các thời điểm khác nhau)
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS unique_vote;

-- 2. Tạo logic View mới (latest_votes) để chỉ hiển thị lượt vote mới nhất của mỗi người
CREATE OR REPLACE VIEW public.latest_votes AS
SELECT DISTINCT ON (voter_id, target_user_id)
  id, voter_id, target_user_id, score, created_at, updated_at
FROM public.votes
ORDER BY voter_id, target_user_id, created_at DESC;

-- Cấp quyền truy cập cho View mới
GRANT ALL ON TABLE public.latest_votes TO anon, authenticated, service_role;

-- 3. Cập nhật View Rankings để dùng latest_votes thay vì bảng votes nguyên gốc
CREATE OR REPLACE VIEW public.rankings AS
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
LEFT JOIN public.latest_votes v ON u.id = v.target_user_id
WHERE u.is_active = TRUE
GROUP BY u.id, u.name, u.avatar_url;

-- Đảm bảo cấp quyền truy cập
GRANT ALL ON TABLE public.rankings TO anon, authenticated, service_role;
