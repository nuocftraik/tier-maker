import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID người dùng' }, { status: 400 });
    }

    // Fetch user basic info and rank from rankings view
    const { data: rankingData, error: rankingError } = await supabase
      .from('rankings')
      .select('*')
      .eq('user_id', id)
      .single();

    if (rankingError || !rankingData) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin profile' }, { status: 404 });
    }

    // Fetch detailed vote history received by this user
    // We want to know WHO voted for them (latest only)
    const { data: votesData, error: votesError } = await supabase
      .from('latest_votes')
      .select(`
        id,
        score,
        created_at,
        voter:voter_id (
          id,
          name,
          avatar_url
        )
      `)
      .eq('target_user_id', id)
      .order('created_at', { ascending: false });

    if (votesError) {
      return NextResponse.json({ error: 'Lỗi lấy lịch sử đánh giá' }, { status: 500 });
    }

    // Format the number so it has exactly 1 decimal (e.g., 9.0) if not unranked
    const profile = {
      ...rankingData,
      avg_score: rankingData.avg_score > 0 ? Number(rankingData.avg_score).toFixed(1) : 0,
      votesHistory: votesData || []
    };

    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
