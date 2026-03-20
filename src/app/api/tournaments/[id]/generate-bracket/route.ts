import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';

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
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: 'Chỉ admin mới có quyền tạo vòng đấu' }, { status: 403 });
    }

    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();

    if (tournamentError) throw tournamentError;
    if (tournament.status !== 'draft') {
      return NextResponse.json({ error: 'Chỉ có thể tạo vòng đấu cho giải đấu nháp' }, { status: 400 });
    }

    const matchType = tournament.match_mode || 'singles';

    const { data: participants, error: participantError } = await supabase
      .from('tournament_participants')
      .select('user_id, seed, group_number')
      .eq('tournament_id', id)
      .order('seed', { ascending: true });

    if (participantError) throw participantError;
    if (participants.length < 2) {
      return NextResponse.json({ error: 'Cần ít nhất 2 người chơi' }, { status: 400 });
    }

    if (tournament.type === 'elimination') {
      await generateEliminationBracket(id, participants, session.id, matchType);
    } else if (tournament.type === 'round_robin') {
      await generateRoundRobinSchedule(id, participants, session.id, matchType);
    } else if (tournament.type === 'custom') {
      await generateCustomTournament(id, tournament, participants, session.id, matchType);
    }

    // Update tournament status to active
    await supabase.from('tournaments')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({ message: 'Đã tạo xong vòng đấu/lịch thi đấu' });
  } catch (error: any) {
    console.error('Generate bracket error:', error);
    return NextResponse.json({ error: 'Lỗi tạo vòng đấu: ' + error.message }, { status: 500 });
  }
}

// ===== ELIMINATION BRACKET =====
async function generateEliminationBracket(
  tournamentId: string, participants: any[], creatorId: string, matchType: string,
  stage?: string // 'knockout' for custom tournaments
) {
  const isDoubles = matchType === 'doubles';
  const entityCount = isDoubles ? Math.ceil(participants.length / 2) : participants.length;
  const rounds = Math.ceil(Math.log2(entityCount));
  const totalSlots = Math.pow(2, rounds);
  
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
          stage: stage || 'knockout',
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
  
  for (let i = 0; i < totalSlots / 2; i++) {
    const match = round1Matches[i];
    const participantsToInsert = [];
    
    if (isDoubles) {
      // Team A: players at (i*2)*2 and (i*2)*2 + 1
      const pA1 = i * 4;
      const pA2 = i * 4 + 1;
      const pB1 = i * 4 + 2;
      const pB2 = i * 4 + 3;

      if (pA1 < participants.length) participantsToInsert.push({ match_id: match.id, user_id: participants[pA1].user_id, team: 'A' });
      if (pA2 < participants.length) participantsToInsert.push({ match_id: match.id, user_id: participants[pA2].user_id, team: 'A' });
      
      if (pB1 < participants.length) participantsToInsert.push({ match_id: match.id, user_id: participants[pB1].user_id, team: 'B' });
      if (pB2 < participants.length) participantsToInsert.push({ match_id: match.id, user_id: participants[pB2].user_id, team: 'B' });
    } else {
      const playerAIndex = i * 2;
      const playerBIndex = i * 2 + 1;
      
      if (playerAIndex < participants.length) {
        participantsToInsert.push({ match_id: match.id, user_id: participants[playerAIndex].user_id, team: 'A' });
      }
      if (playerBIndex < participants.length) {
        participantsToInsert.push({ match_id: match.id, user_id: participants[playerBIndex].user_id, team: 'B' });
      }
    }
    
    if (participantsToInsert.length > 0) {
      const { error } = await supabase.from('match_participants').insert(participantsToInsert);
      if (error) throw error;
    }
  }
}

// ===== ROUND ROBIN =====
async function generateRoundRobinSchedule(
  tournamentId: string, participants: any[], creatorId: string, matchType: string,
  groupNumber?: number, stage?: string
) {
  const isDoubles = matchType === 'doubles';
  
  // Create teams
  let teams: (string[] | null)[] = [];
  if (isDoubles) {
    for (let i = 0; i < participants.length; i += 2) {
      const team = [participants[i].user_id];
      if (i + 1 < participants.length) team.push(participants[i+1].user_id);
      teams.push(team);
    }
  } else {
    teams = participants.map(p => [p.user_id]);
  }

  if (teams.length % 2 !== 0) {
    teams.push(null);
  }
  
  const numRounds = teams.length - 1;
  const half = teams.length / 2;
  
  for (let round = 0; round < numRounds; round++) {
    for (let i = 0; i < half; i++) {
      const teamA = teams[i];
      const teamB = teams[teams.length - 1 - i];
      
      if (teamA && teamB) {
        // Create match
        const { data: match, error: mErr } = await supabase
          .from('matches')
          .insert([{
            tournament_id: tournamentId,
            type: matchType,
            team_a_score: 0,
            team_b_score: 0,
            round_number: round + 1,
            match_order: i + 1,
            stage: stage || 'group',
            group_number: groupNumber || null,
            created_by: creatorId
          }])
          .select('id')
          .single();
            
        if (mErr) throw mErr;
        
        const mp: any[] = [];
        teamA.forEach(uid => mp.push({ match_id: match.id, user_id: uid, team: 'A' }));
        teamB.forEach(uid => mp.push({ match_id: match.id, user_id: uid, team: 'B' }));
        
        await supabase.from('match_participants').insert(mp);
      }
    }
    
    teams = [teams[0], teams[teams.length - 1], ...teams.slice(1, teams.length - 1)];
  }
}

// ===== CUSTOM: GROUP STAGE + KNOCKOUT =====
async function generateCustomTournament(
  tournamentId: string, tournament: any, participants: any[], creatorId: string, matchType: string
) {
  const groupCount = tournament.group_count || 2;
  
  // Group participants by group_number
  const groups: Record<number, any[]> = {};
  for (let g = 1; g <= groupCount; g++) {
    groups[g] = participants.filter(p => p.group_number === g);
  }
  
  // Generate round-robin for each group
  for (let g = 1; g <= groupCount; g++) {
    if (groups[g].length >= 2) {
      await generateRoundRobinSchedule(tournamentId, groups[g], creatorId, matchType, g, 'group');
    }
  }
  
  // NOTE: Knockout stage matches are NOT generated now.
  // They will be generated when admin advances the tournament from group → knockout
  // via a separate API call after all group matches are complete.
}
