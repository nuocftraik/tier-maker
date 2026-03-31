-- Add breakdown columns to cost_participants
ALTER TABLE public.cost_participants 
ADD COLUMN IF NOT EXISTS court_amount INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS shuttle_amount INT NOT NULL DEFAULT 0;
