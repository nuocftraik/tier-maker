import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';

// POST: Advance a custom tournament from group stage to knockout stage
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });
    }
    const session = await decrypt(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: 'Phiên làm việc hết hạn' }, { status: 401 });
    }

    // Fetch tournament
    const { data: tournament, error: tError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();

    if (tError) throw tError;

    if (!session.isAdmin && tournament.created_by !== session.id) {
      return NextResponse.json({ error: 'Chỉ admin hoặc người tạo giải mới có quyền chuyển vòng' }, { status: 403 });
    }
    if (tournament.type !== 'custom') {
      return NextResponse.json({ error: 'Chỉ dùng cho giải custom' }, { status: 400 });
    }
    if (tournament.current_stage !== 'group') {
      return NextResponse.json({ error: 'Giải đã ở vòng knockout rồi' }, { status: 400 });
    }

    const groupCount = tournament.group_count || 2;
    const advancePerGroup = tournament.advance_per_group || 1;
    const matchType = tournament.match_mode || 'singles';

    // Calculate group standings
    const { data: groupMatches, error: mError } = await supabase
      .from('match_details')
      .select('*')
      .eq('tournament_id', id)
      .eq('stage', 'group');

    if (mError) throw mError;

    // Calculate standings per group
    const advancingPlayers: any[] = [];

    for (let g = 1; g <= groupCount; g++) {
      const gMatches = groupMatches.filter((m: any) => m.group_number === g);
      const stats: Record<string, { userId: string, wins: number, ptsFor: number, ptsAgainst: number }> = {};

      // Init all participants in this group
      const { data: groupParticipants } = await supabase
        .from('tournament_participants')
        .select('user_id')
        .eq('tournament_id', id)
        .eq('group_number', g);

      groupParticipants?.forEach(p => {
        stats[p.user_id] = { userId: p.user_id, wins: 0, ptsFor: 0, ptsAgainst: 0 };
      });

      // Tally results
      gMatches.forEach((m: any) => {
        if (m.team_a_score === 0 && m.team_b_score === 0) return;
        
        // Update Team A players
        m.team_a?.forEach((p: any) => {
          if (stats[p.id]) {
            stats[p.id].ptsFor += m.team_a_score;
            stats[p.id].ptsAgainst += m.team_b_score;
            if (m.team_a_score > m.team_b_score) stats[p.id].wins++;
          }
        });

        // Update Team B players
        m.team_b?.forEach((p: any) => {
          if (stats[p.id]) {
            stats[p.id].ptsFor += m.team_b_score;
            stats[p.id].ptsAgainst += m.team_a_score;
            if (m.team_b_score > m.team_a_score) stats[p.id].wins++;
          }
        });
      });

      // Sort by wins, then point diff
      const sorted = Object.values(stats).sort((a, b) => {
        if (a.wins !== b.wins) return b.wins - a.wins;
        return (b.ptsFor - b.ptsAgainst) - (a.ptsFor - a.ptsAgainst);
      });

      // Take top N per group
      for (let i = 0; i < Math.min(advancePerGroup, sorted.length); i++) {
        advancingPlayers.push({
          user_id: sorted[i].userId,
          seed: advancingPlayers.length + 1
        });
      }
    }

    if (advancingPlayers.length < 2) {
      return NextResponse.json({ error: 'Không đủ người chơi để tạo vòng knockout' }, { status: 400 });
    }

    // Generate elimination bracket for advancing players
    await generateEliminationBracket(id, advancingPlayers, session.id, matchType);

    // Update tournament stage
    await supabase.from('tournaments')
      .update({ current_stage: 'knockout', updated_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({ 
      message: `Đã tạo vòng knockout với ${advancingPlayers.length} vận động viên`,
      advancingPlayers
    });
  } catch (error: any) {
    console.error('Advance knockout error:', error);
    return NextResponse.json({ error: 'Lỗi chuyển vòng knockout: ' + error.message }, { status: 500 });
  }
}

// Reusable elimination bracket generator
async function generateEliminationBracket(
  tournamentId: string, participants: any[], creatorId: string, matchType: string
) {
  const isDoubles = matchType === 'doubles';
  const entityCount = isDoubles ? Math.ceil(participants.length / 2) : participants.length;
  const rounds = Math.ceil(Math.log2(entityCount)) || 1;
  const totalSlots = isDoubles ? Math.pow(2, rounds) * 2 : Math.pow(2, rounds);
  
  const matchTree: any[] = [];
  
  for (let r = rounds; r >= 1; r--) {
    const matchesInRound = Math.pow(2, rounds - r);
    const roundMatches: any[] = [];
    
    for (let i = 0; i < matchesInRound; i++) {
      const nextMatchIndex = Math.floor(i / 2);
      const nextMatchId = r < rounds ? matchTree[rounds - r - 1][nextMatchIndex].id : null;
      
      const { data: match, error } = await supabase
        .from('matches')
        .insert([{
          tournament_id: tournamentId,
          type: matchType,
          team_a_score: 0,
          team_b_score: 0,
          round_number: r,
          match_order: i + 1,
          next_match_id: nextMatchId,
          stage: 'knockout',
          created_by: creatorId
        }])
        .select('id')
        .single();
          
      if (error) throw error;
      roundMatches.push({ id: match.id, index: i });
    }
    matchTree.push(roundMatches);
  }
  
  const round1Matches = matchTree[rounds - 1];
  
  for (let i = 0; i < totalSlots / (isDoubles ? 4 : 2); i++) {
    const match = round1Matches[i];
    const mpInsert = [];
    
    if (isDoubles) {
      const pA1 = i * 4;
      const pA2 = i * 4 + 1;
      const pB1 = i * 4 + 2;
      const pB2 = i * 4 + 3;
      
      if (pA1 < participants.length) mpInsert.push({ match_id: match.id, user_id: participants[pA1].user_id, team: 'A' });
      if (pA2 < participants.length) mpInsert.push({ match_id: match.id, user_id: participants[pA2].user_id, team: 'A' });
      
      if (pB1 < participants.length) mpInsert.push({ match_id: match.id, user_id: participants[pB1].user_id, team: 'B' });
      if (pB2 < participants.length) mpInsert.push({ match_id: match.id, user_id: participants[pB2].user_id, team: 'B' });
    } else {
      if (i * 2 < participants.length) {
        mpInsert.push({ match_id: match.id, user_id: participants[i * 2].user_id, team: 'A' });
      }
      if (i * 2 + 1 < participants.length) {
        mpInsert.push({ match_id: match.id, user_id: participants[i * 2 + 1].user_id, team: 'B' });
      }
    }
    
    if (mpInsert.length > 0) {
      await supabase.from('match_participants').insert(mpInsert);
    }
  }
}
