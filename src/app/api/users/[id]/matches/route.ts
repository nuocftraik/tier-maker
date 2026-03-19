import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to disable caching for dynamic routes in some Next.js versions if needed
export const dynamic = 'force-dynamic';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    
    // Using the match_details view, we need to find matches where the user is either in team A or team B
    // However, querying JSON inside a view with supabase-js can be tricky.
    // Instead, we can query matches directly or use match_participants to find match_ids.
    
    const { data: participants, error: partError } = await supabase
      .from('match_participants')
      .select('match_id')
      .eq('user_id', params.id);
      
    if (partError) throw partError;
    
    if (!participants || participants.length === 0) {
       return NextResponse.json({ matches: [] });
    }
    
    const matchIds = participants.map(p => p.match_id);
    
    const { data: matches, error: matchesError } = await supabase
      .from('match_details')
      .select('*')
      .in('match_id', matchIds)
      .order('created_at', { ascending: false });
      
    if (matchesError) throw matchesError;
    
    return NextResponse.json({ matches });
  } catch (error) {
    console.error('Fetch user matches error:', error);
    return NextResponse.json({ error: 'Lỗi lấy lịch sử trận đấu của người dùng' }, { status: 500 });
  }
}
