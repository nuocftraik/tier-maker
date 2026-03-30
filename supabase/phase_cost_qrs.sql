CREATE TABLE IF NOT EXISTS public.cost_qrs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    qr_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.cost_qrs DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.cost_qrs TO anon, authenticated, service_role;
