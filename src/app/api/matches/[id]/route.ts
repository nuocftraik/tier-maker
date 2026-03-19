import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';

// Helper to check user permission
const checkPermission = async (matchId: string) => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  if (!sessionCookie?.value) return { allowed: false, session: null };
  const session = await decrypt(sessionCookie.value);
  if (!session || !session.id) return { allowed: false, session: null };

  if (session.isAdmin) return { allowed: true, session };

  // Check if they created the match
  const { data: match } = await supabase.from('matches').select('created_by').eq('id', matchId).single();
  if (match?.created_by === session.id) return { allowed: true, session };

  return { allowed: false, session };
};

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { data: match, error } = await supabase
      .from('match_details')
      .select('*')
      .eq('match_id', params.id)
      .single();

    if (error || !match) throw error || new Error('Not found');

    return NextResponse.json({ match });
  } catch (error) {
    return NextResponse.json({ error: 'Không tìm thấy trận đấu' }, { status: 404 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const perm = await checkPermission(params.id);
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Không có quyền xóa' }, { status: 403 });
    }

    const { error } = await supabase.from('matches').delete().eq('id', params.id);
    if (error) throw error;

    return NextResponse.json({ message: 'Đã xóa trận đấu' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Lỗi xóa trận đấu: ' + error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const perm = await checkPermission(params.id);
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Không có quyền chỉnh sửa' }, { status: 403 });
    }

    const { type, team_a_score, team_b_score, team_a_players, team_b_players } = await request.json();

    // Validate
    if (!type || !['singles', 'doubles'].includes(type)) return NextResponse.json({ error: 'Sai loại trận' }, { status: 400 });
    if (typeof team_a_score !== 'number' || typeof team_b_score !== 'number') return NextResponse.json({ error: 'Sai điểm' }, { status: 400 });

    // Cập nhật điểm trận đấu (Không cho phép đổi type)
    const { error: matchError } = await supabase.from('matches')
      .update({ team_a_score, team_b_score, updated_at: new Date().toISOString() })
      .eq('id', params.id);

    if (matchError) throw matchError;

    // Cập nhật participants (xóa cũ thêm mới cho an toàn)
    await supabase.from('match_participants').delete().eq('match_id', params.id);

    const participants = [
      ...team_a_players.map((uid: string) => ({ match_id: params.id, user_id: uid, team: 'A' })),
      ...team_b_players.map((uid: string) => ({ match_id: params.id, user_id: uid, team: 'B' }))
    ];

    const { error: partError } = await supabase.from('match_participants').insert(participants);
    if (partError) throw partError;

    return NextResponse.json({ message: 'Đã cập nhật trận đấu' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Lỗi sửa trận đấu: ' + error.message }, { status: 500 });
  }
}
