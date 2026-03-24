import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const source = searchParams.get('source') || 'all'; // all, manual, tournament
    const userId = searchParams.get('user_id');

    let query = supabase
      .from('match_details')
      .select('*')
      .order('created_at', { ascending: false });

    if (source === 'manual') {
      query = query.is('tournament_id', null);
    } else if (source === 'tournament') {
      query = query.not('tournament_id', 'is', null);
    }

    // New: Skip matches where both scores are 0 (never played)
    // For our badminton system, we use 0-0 to indicate "to be played"
    query = query.or('team_a_score.gt.0,team_b_score.gt.0');

    if (userId) {
      // filtering by user_id. In the view, participants is usually an array of objects
      // but if we used the 'match_details' view from phase_11, it has user IDs in it?
      // actually let's use the match_participants table to get match IDs first if needed,
      // or check if 'match_details' contains user IDs in a searchable field.
      // Assuming 'match_details' has 'team_a' and 'team_b' as JSONBs containing user info.
      // A more performant way is to filter matches by participant first.
      
      const { data: userMatchIds } = await supabase
        .from('match_participants')
        .select('match_id')
        .eq('user_id', userId);
      
      if (userMatchIds && userMatchIds.length > 0) {
        const ids = userMatchIds.map(um => um.match_id);
        query = query.in('match_id', ids);
      } else {
        // No matches for this user
        return NextResponse.json({ matches: [] });
      }
    }

    const { data: matches, error } = await query.limit(limit);

    if (error) throw error;
    
    // Fetch set scores natively
    if (matches && matches.length > 0) {
      const matchIds = matches.map((m: any) => m.match_id);
      const { data: nativeMatches } = await supabase
        .from('matches')
        .select('id, set_scores, is_bye, created_by:users(name)')
        .in('id', matchIds);

      if (nativeMatches && nativeMatches.length > 0) {
        // We filter out BYE matches because they aren't real player-vs-player matches
        const filteredMatches = matches.filter((m: any) => {
           const nativeM = nativeMatches.find((nm: any) => nm.id === m.match_id);
           return !nativeM?.is_bye;
        });

        // Update the list of matches
        matches.length = 0;
        matches.push(...filteredMatches);

        matches.forEach((m: any) => {
           const nativeM = nativeMatches.find((nm: any) => nm.id === m.match_id);
           if (nativeM) {
             if (nativeM.set_scores) m.set_scores = nativeM.set_scores;
             if (nativeM.created_by) m.creator_name = (nativeM.created_by as any).name;
           }
        });
      }

      // Fetch tournament names
      const tournamentIds = [...new Set(matches.map((m: any) => m.tournament_id).filter(Boolean))];
      if (tournamentIds.length > 0) {
        const { data: tournaments } = await supabase.from('tournaments').select('id, name').in('id', tournamentIds);
        if (tournaments && tournaments.length > 0) {
          matches.forEach((m: any) => {
            if (m.tournament_id) {
               m.tournament_name = tournaments.find((t: any) => t.id === m.tournament_id)?.name;
            }
          });
        }
      }
    }

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

    const { type, team_a_score, team_b_score, team_a_players, team_b_players, set_scores } = await request.json();

    if (!type || !['singles', 'doubles'].includes(type)) {
      return NextResponse.json({ error: 'Loại trận đấu không hợp lệ' }, { status: 400 });
    }
    
    if (typeof team_a_score !== 'number' || typeof team_b_score !== 'number') {
      return NextResponse.json({ error: 'Điểm số không hợp lệ' }, { status: 400 });
    }
    
    if (!Array.isArray(team_a_players) || !Array.isArray(team_b_players) || team_a_players.length === 0 || team_b_players.length === 0) {
      return NextResponse.json({ error: 'Danh sách người chơi không hợp lệ' }, { status: 400 });
    }

    // Clean up unplayed sets before mapping
    let final_set_scores: any[] | null = null;
    if (Array.isArray(set_scores) && set_scores.length > 0) {
        final_set_scores = set_scores.filter(s => s.a > 0 || s.b > 0);
        if (final_set_scores.length === 0) final_set_scores = null;
    }

    // Insert the match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert([{
        type,
        team_a_score,
        team_b_score,
        set_scores: final_set_scores,
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
