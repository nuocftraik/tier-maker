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

    // Fetch set scores natively if match_details view hasn't been updated
    const { data: nativeMatch } = await supabase
      .from('matches')
      .select('set_scores, best_of, is_bye')
      .eq('id', params.id)
      .single();

    if (nativeMatch) {
      if (nativeMatch.set_scores) match.set_scores = nativeMatch.set_scores;
      if (nativeMatch.best_of) match.best_of = nativeMatch.best_of;
      if (nativeMatch.is_bye !== undefined) match.is_bye = nativeMatch.is_bye;
    }

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

    // Check if match belongs to a tournament
    const { data: match } = await supabase.from('matches').select('tournament_id').eq('id', params.id).single();
    if (match?.tournament_id) {
      return NextResponse.json({ error: 'Không thể xóa riêng lẻ trận đấu thuộc giải đấu. Hệ thống cần các trận đấu này để duy trì sơ đồ và bảng xếp hạng. Hãy xóa toàn bộ giải đấu nếu cần.' }, { status: 400 });
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

    const { type, team_a_score, team_b_score, team_a_players, team_b_players, set_scores } = await request.json();

    // Validate
    if (!type || !['singles', 'doubles'].includes(type)) return NextResponse.json({ error: 'Sai loại trận' }, { status: 400 });
    if (typeof team_a_score !== 'number' || typeof team_b_score !== 'number') return NextResponse.json({ error: 'Sai điểm' }, { status: 400 });

    // Clean up unplayed sets before mapping
    let final_set_scores: any[] | null = null;
    if (Array.isArray(set_scores) && set_scores.length > 0) {
        final_set_scores = set_scores.filter(s => s.a > 0 || s.b > 0);
        if (final_set_scores.length === 0) final_set_scores = null;
    }

    // Lấy trận cũ để kiểm tra xem có được thay đổi người thắng không
    const { data: oldMatch } = await supabase.from('matches').select('team_a_score, team_b_score, next_match_id').eq('id', params.id).single();
    
    if (oldMatch) {
      const oldWinner = oldMatch.team_a_score > oldMatch.team_b_score ? 'A' : (oldMatch.team_b_score > oldMatch.team_a_score ? 'B' : null);
      const newWinner = team_a_score > team_b_score ? 'A' : (team_b_score > team_a_score ? 'B' : null);

      if (oldWinner && newWinner && oldWinner !== newWinner && oldMatch.next_match_id) {
         // Kiểm tra trận tiếp theo
         const { data: nextMatch } = await supabase.from('matches').select('team_a_score, team_b_score, set_scores').eq('id', oldMatch.next_match_id).single();
         const hasPlayed = nextMatch && (nextMatch.team_a_score > 0 || nextMatch.team_b_score > 0 || (nextMatch.set_scores && nextMatch.set_scores.length > 0));
         
         if (hasPlayed) {
             return NextResponse.json({ error: 'Không thể thay đổi kết quả thắng/thua do trận tiếp theo ở vòng trong đã có tỉ số! Bạn chỉ được sửa lại điểm số sao cho giữ nguyên đội thắng.' }, { status: 400 });
         }
      }
    }

    // Cập nhật điểm trận đấu và lấy thông tin để xử lý progression
    const { data: fullMatch, error: matchError } = await supabase.from('matches')
      .update({ team_a_score, team_b_score, set_scores: final_set_scores, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select('tournament_id, next_match_id, match_order, stage')
      .single();

    if (matchError || !fullMatch) throw matchError || new Error('Không thể cập nhật trận đấu');

    // Cập nhật participants (xóa cũ thêm mới để đồng bộ với body)
    await supabase.from('match_participants').delete().eq('match_id', params.id);
    const participants = [
      ...team_a_players.map((uid: string) => ({ match_id: params.id, user_id: uid, team: 'A' })),
      ...team_b_players.map((uid: string) => ({ match_id: params.id, user_id: uid, team: 'B' }))
    ];
    const { error: partError } = await supabase.from('match_participants').insert(participants);
    if (partError) throw partError;

    // --- Tournament Progression Logic ---
    if (fullMatch.tournament_id) {
      const winningTeamPlayers = team_a_score > team_b_score ? team_a_players : (team_b_score > team_a_score ? team_b_players : []);
      
      if (winningTeamPlayers.length > 0) {
        // Since matches.winner_id doesn't exist, we don't save it there. 
        // We only use the winner in the next_match_id logic or tournament completion.

        if (fullMatch.next_match_id) {
          const nextTeam = ((fullMatch.match_order - 1) % 2 === 0) ? 'A' : 'B';
          
          await supabase.from('match_participants').delete().eq('match_id', fullMatch.next_match_id).eq('team', nextTeam);

          const nextParticipants = winningTeamPlayers.map((uid: string) => ({
            match_id: fullMatch.next_match_id,
            user_id: uid,
            team: nextTeam
          }));
          
          const { error: insError } = await supabase.from('match_participants').insert(nextParticipants);
          if (insError) console.error('Advance Winner Error:', insError);
        } else {
          // Final match logic
          if (fullMatch.stage === 'knockout' && !fullMatch.next_match_id) {
             await supabase.from('tournaments')
               .update({ status: 'completed' })
               .eq('id', fullMatch.tournament_id);
          }
        }
      }
    }

    return NextResponse.json({ message: 'Đã cập nhật trận đấu' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Lỗi sửa trận đấu: ' + error.message }, { status: 500 });
  }
}
