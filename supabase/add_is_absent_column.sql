-- Add is_absent column to cost_participants
ALTER TABLE public.cost_participants 
ADD COLUMN IF NOT EXISTS is_absent BOOLEAN NOT NULL DEFAULT FALSE;
