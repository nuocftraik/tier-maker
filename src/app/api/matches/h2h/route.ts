import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const u1 = searchParams.get('u1');
    const u2 = searchParams.get('u2');

    if (!u1 || !u2) {
      return NextResponse.json({ error: 'Thiếu ID người chơi' }, { status: 400 });
    }

    // Find all matches where both u1 and u2 participated
    // We need to check match_participants for both IDs on same match_id
    const { data: participation1 } = await supabase
      .from('match_participants')
      .select('match_id, team')
      .eq('user_id', u1);

    const { data: participation2 } = await supabase
      .from('match_participants')
      .select('match_id, team')
      .eq('user_id', u2);

    if (!participation1 || !participation2) {
      return NextResponse.json({ matches: [], stats: null });
    }

    const matchIds1 = participation1.map(p => p.match_id);
    const commonMatchIds = participation2
      .filter(p => matchIds1.includes(p.match_id))
      .map(p => p.match_id);

    if (commonMatchIds.length === 0) {
      return NextResponse.json({ matches: [], stats: null });
    }

    // Fetch full details for these matches
    const { data: matches, error } = await supabase
      .from('match_details')
      .select('*')
      .in('match_id', commonMatchIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate stats
    let u1Wins = 0;
    let u2Wins = 0;
    let draws = 0;
    let asOpponents = 0;
    let asTeammates = 0;

    matches?.forEach(m => {
      const p1 = participation1.find(p => p.match_id === m.match_id);
      const p2 = participation2.find(p => p.match_id === m.match_id);

      if (p1 && p2) {
        if (p1.team !== p2.team) {
          asOpponents++;
          // p1 is team A or B?
          if (p1.team === 'A') {
            if (m.team_a_score > m.team_b_score) u1Wins++;
            else if (m.team_b_score > m.team_a_score) u2Wins++;
            else draws++;
          } else {
            if (m.team_b_score > m.team_a_score) u1Wins++;
            else if (m.team_a_score > m.team_b_score) u2Wins++;
            else draws++;
          }
        } else {
          asTeammates++;
        }
      }
    });

    if (matches && matches.length > 0) {
      // Fetch set scores
      const { data: nativeMatches } = await supabase
        .from('matches')
        .select('id, set_scores')
        .in('id', commonMatchIds);

      // Fetch tournament names
      const tournamentIds = [...new Set(matches.map((m: any) => m.tournament_id).filter(Boolean))];
      let tournamentData: any[] = [];
      if (tournamentIds.length > 0) {
         const { data } = await supabase.from('tournaments').select('id, name').in('id', tournamentIds);
         tournamentData = data || [];
      }

      matches.forEach((m: any) => {
        const nm = nativeMatches?.find(n => n.id === m.match_id);
        if (nm) m.set_scores = nm.set_scores;
        
        if (m.tournament_id) {
           m.tournament_name = tournamentData.find(t => t.id === m.tournament_id)?.name;
        }
      });
    }

    return NextResponse.json({
      matches,
      stats: {
        total: commonMatchIds.length,
        asOpponents,
        asTeammates,
        u1Wins,
        u2Wins,
        draws
      }
    });
  } catch (error) {
    console.error('H2H API error:', error);
    return NextResponse.json({ error: 'Lỗi lấy dữ liệu đối đầu' }, { status: 500 });
  }
}
