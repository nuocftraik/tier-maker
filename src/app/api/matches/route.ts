import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';

export async function GET() {
  try {
    const { data: matches, error } = await supabase
      .from('match_details')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    
    return NextResponse.json({ matches });
  } catch (error) {
    console.error('Fetch matches error:', error);
    return NextResponse.json({ error: 'Lỗi lấy lịch sử trận đấu' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });
    }
    
    const session = await decrypt(sessionCookie.value);
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });
    }

    const { type, team_a_score, team_b_score, team_a_players, team_b_players } = await request.json();

    if (!type || !['singles', 'doubles'].includes(type)) {
      return NextResponse.json({ error: 'Loại trận đấu không hợp lệ' }, { status: 400 });
    }
    
    if (typeof team_a_score !== 'number' || typeof team_b_score !== 'number') {
      return NextResponse.json({ error: 'Điểm số không hợp lệ' }, { status: 400 });
    }
    
    if (!Array.isArray(team_a_players) || !Array.isArray(team_b_players) || team_a_players.length === 0 || team_b_players.length === 0) {
      return NextResponse.json({ error: 'Danh sách người chơi không hợp lệ' }, { status: 400 });
    }

    // Insert the match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert([{
        type,
        team_a_score,
        team_b_score,
        created_by: session.id || null
      }])
      .select('id')
      .single();

    if (matchError) throw matchError;

    // Insert participants
    const participants = [
      ...team_a_players.map((user_id: string) => ({ match_id: match.id, user_id, team: 'A' })),
      ...team_b_players.map((user_id: string) => ({ match_id: match.id, user_id, team: 'B' }))
    ];

    const { error: partError } = await supabase
      .from('match_participants')
      .insert(participants);

    if (partError) {
      // Rollback if possible, but JS supabase client doesn't do transactions.
      console.error('Insert participants error:', partError);
      return NextResponse.json({ error: 'Lỗi thêm người chơi vào trận đấu' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Ghi nhận trận đấu thành công', matchId: match.id });
  } catch (error: any) {
    console.error('Record match error:', error);
    return NextResponse.json({ error: 'Lỗi ghi nhận trận đấu: ' + error.message, details: error }, { status: 500 });
  }
}
