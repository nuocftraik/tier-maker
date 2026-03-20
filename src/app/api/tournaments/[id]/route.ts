import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    
    // 1. Fetch tournament basics
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select(`
        *,
        winner:users!winner_id(id, name, avatar_url),
        created_by_user:users!created_by(id, name, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (tournamentError) throw tournamentError;
    if (!tournament) return NextResponse.json({ error: 'Không tìm thấy giải đấu' }, { status: 404 });

    // 2. Fetch tournament participants
    const { data: participants, error: participantError } = await supabase
      .from('tournament_participants')
      .select(`
        user_id,
        seed,
        user:users!user_id(id, name, avatar_url)
      `)
      .eq('tournament_id', id)
      .order('seed', { ascending: true });

    if (participantError) throw participantError;

    // 3. Fetch tournament matches (history or planned)
    const { data: matches, error: matchError } = await supabase
      .from('match_details')
      .select('*')
      .eq('tournament_id', id)
      .order('round_number', { ascending: true })
      .order('match_order', { ascending: true });

    if (matchError) throw matchError;

    return NextResponse.json({
      tournament,
      participants,
      matches
    });
  } catch (error: any) {
    console.error('Fetch tournament error:', error);
    return NextResponse.json({ error: 'Lỗi lấy thông tin giải đấu' }, { status: 500 });
  }
}
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const { name, description, type, match_mode, seeding_mode, participants, group_count, advance_per_group } = await request.json();
    
    // Auth Check
    const { isAdmin, error: authErr } = await checkAdmin();
    if (authErr || !isAdmin) return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });

    // Status Check - Only Draft can be edited
    const { data: tourney } = await supabase.from('tournaments').select('status').eq('id', id).single();
    if (!tourney) return NextResponse.json({ error: 'Giải đấu không tồn tại' }, { status: 404 });
    if (tourney.status !== 'draft') {
      return NextResponse.json({ error: 'Chỉ có thể sửa giải đấu khi đang ở trạng thái Nháp' }, { status: 403 });
    }

    // Update Tournament
    const { error: updateError } = await supabase
      .from('tournaments')
      .update({
        name,
        description,
        type,
        match_mode,
        seeding_mode,
        group_count: type === 'custom' ? group_count : 0,
        advance_per_group: type === 'custom' ? advance_per_group : 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Update Participants if provided
    if (Array.isArray(participants)) {
      // Delete old
      await supabase.from('tournament_participants').delete().eq('tournament_id', id);
      
      // Insert new
      const pData = participants.map((p: any, idx: number) => ({
        tournament_id: id,
        user_id: typeof p === 'string' ? p : p.userId,
        seed: (typeof p === 'object' ? p.seed : (idx + 1)) || (idx + 1),
        group_number: (typeof p === 'object' ? p.group_number : 0) || 0
      }));
      await supabase.from('tournament_participants').insert(pData);
    }

    return NextResponse.json({ message: 'Đã cập nhật giải đấu' });
  } catch (error: any) {
    console.error('Update tournament error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    
    // Auth Check
    const { isAdmin, error: authErr } = await checkAdmin();
    if (authErr || !isAdmin) return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });

    // 1. Get matches
    const { data: matches } = await supabase.from('matches').select('id').eq('tournament_id', id);
    if (matches && matches.length > 0) {
      const matchIds = matches.map(m => m.id);
      // 2. Delete match_participants
      await supabase.from('match_participants').delete().in('match_id', matchIds);
      // 3. Delete matches
      await supabase.from('matches').delete().eq('tournament_id', id);
    }

    // 4. Delete tournament_participants
    await supabase.from('tournament_participants').delete().eq('tournament_id', id);

    // 5. Delete tournament
    const { error: delError } = await supabase.from('tournaments').delete().eq('id', id);
    if (delError) throw delError;

    return NextResponse.json({ message: 'Giải đấu đã được xóa' });
  } catch (error: any) {
    console.error('Delete tournament error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function checkAdmin() {
  const { cookies } = await import('next/headers');
  const { decrypt } = await import('@/lib/auth');
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  if (!sessionCookie?.value) return { isAdmin: false, error: 'Unauthorized' };
  const session = await decrypt(sessionCookie.value);
  if (!session || !session.isAdmin) return { isAdmin: false, error: 'Forbidden' };
  return { isAdmin: true, session };
}
