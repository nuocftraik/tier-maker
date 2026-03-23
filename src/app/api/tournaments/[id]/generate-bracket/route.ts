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
    if (!session) {
      return NextResponse.json({ error: 'Phiên làm việc hết hạn' }, { status: 401 });
    }

    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();

    if (tournamentError) throw tournamentError;
    
    if (!session.isAdmin && tournament.created_by !== session.id) {
      return NextResponse.json({ error: 'Chỉ admin hoặc người tạo giải mới có quyền tạo vòng đấu' }, { status: 403 });
    }
    const body = await request.json().catch(() => ({}));
    const advancingParticipants = body.advancingParticipants;
    const isAdvancingKnockout = body.stage === 'knockout';

    if (tournament.status !== 'draft' && !isAdvancingKnockout) {
      return NextResponse.json({ error: 'Chỉ có thể tạo vòng đấu cho giải đấu nháp' }, { status: 400 });
    }

    const matchType = tournament.match_mode || 'singles';

    let participants = [];
    if (isAdvancingKnockout && advancingParticipants && advancingParticipants.length >= 2) {
      participants = advancingParticipants;
    } else {
      const { data: dbParticipants, error: participantError } = await supabase
        .from('tournament_participants')
        .select('user_id, seed, group_number')
        .eq('tournament_id', id)
        .order('seed', { ascending: true });

      if (participantError) throw participantError;
      participants = dbParticipants || [];
    }

    if (participants.length < 2) {
      return NextResponse.json({ error: 'Cần ít nhất 2 người chơi' }, { status: 400 });
    }

    if (tournament.type === 'elimination' || isAdvancingKnockout) {
      await generateEliminationBracket(id, participants, session.id, matchType, isAdvancingKnockout ? 'knockout' : undefined);
    } else if (tournament.type === 'round_robin') {
      const config = tournament.format_config || {};
      await generateRoundRobinSchedule(id, participants, session.id, matchType, undefined, undefined, config.group_bo || 1);
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
  
  // Group into teams
  const teams: any[][] = [];
  if (isDoubles) {
    for (let i = 0; i < participants.length; i += 2) {
      const team = [participants[i]];
      if (i + 1 < participants.length) team.push(participants[i+1]);
      teams.push(team);
    }
  } else {
    participants.forEach(p => teams.push([p]));
  }

  const entityCount = teams.length;
  // Calculate nearest power of 2
  const rounds = Math.max(1, Math.ceil(Math.log2(entityCount)));
  const totalSlots = Math.pow(2, rounds);
  const byesCount = totalSlots - entityCount;
  const matchCountR1 = totalSlots / 2;

  // Retrieve format config using a global store or pass it. We need to fetch tournament again or use parameter.
  // We'll fetch the tournament to get format_config cleanly:
  const { data: tour } = await supabase.from('tournaments').select('format_config').eq('id', tournamentId).single();
  const config = tour?.format_config || {};
  const knockoutBo = config.knockout_bo || 3;
  const finalBo = config.final_bo || knockoutBo;
  
  const matchTree: any[] = [];
  
  for (let r = rounds; r >= 1; r--) {
    const matchesInRound = Math.pow(2, rounds - r);
    const roundMatches: any[] = [];
    const isFinal = (r === rounds);
    const currentBestOf = isFinal ? finalBo : knockoutBo;
    
    for (let i = 0; i < matchesInRound; i++) {
      const nextMatchIndex = Math.floor(i / 2);
      const nextMatchId = r < rounds ? matchTree[rounds - r - 1][nextMatchIndex].id : null;
      
      // If it's round 1, we determine if it's a bye later, for now just insert empty matches.
      // Wait, we need to insert `is_bye` flag for Round 1 matches!
      // Let's insert matches first, then we update them if they are byes.
      
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
          created_by: creatorId,
          best_of: currentBestOf,
          is_bye: false // default, updated later for R1
        }])
        .select('id')
        .single();
          
      if (error) throw error;
      roundMatches.push({ id: match.id, index: i });
    }
    matchTree.push(roundMatches);
  }
  
  const round1Matches = matchTree[rounds - 1];
  
  // Distribute Byes evenly to opposite ends of the bracket
  const matchAssignments = Array(matchCountR1).fill(null).map(() => ({ teamA: null as any[]|null, teamB: null as any[]|null, is_bye: false }));
  let left = 0;
  let right = matchCountR1 - 1;
  let placingLeft = true;
  
  for(let i = 0; i < byesCount; i++) {
     const matchIdx = placingLeft ? left++ : right--;
     matchAssignments[matchIdx].teamA = teams.shift() || null;
     matchAssignments[matchIdx].is_bye = true;
     placingLeft = !placingLeft;
  }
  // Fill remaining slots
  for(let i = 0; i < matchCountR1; i++) {
     if (!matchAssignments[i].teamA && teams.length > 0) matchAssignments[i].teamA = teams.shift() || null;
     if (!matchAssignments[i].teamB && !matchAssignments[i].is_bye && teams.length > 0) matchAssignments[i].teamB = teams.shift() || null;
  }
  
  for (let i = 0; i < matchCountR1; i++) {
    const match = round1Matches[i];
    const assignment = matchAssignments[i];
    const participantsToInsert: any[] = [];
    
    if (assignment.teamA) {
      assignment.teamA.forEach(p => {
        participantsToInsert.push({ match_id: match.id, user_id: p.user_id, team: 'A' });
      });
    }
    if (assignment.teamB) {
      assignment.teamB.forEach(p => {
        participantsToInsert.push({ match_id: match.id, user_id: p.user_id, team: 'B' });
      });
    }
    
    if (participantsToInsert.length > 0) {
      const { error } = await supabase.from('match_participants').insert(participantsToInsert);
      if (error) throw error;
    }

    // If it's a bye match, update the match record to implicitly win for Team A
    // We can set team_a_score = 1 to automatically advance them, but since advance logic usually relies on user submitting score,
    // we should just set team_a_score = wins necessary, or handled by the bracket UI automatically?
    // Let's set team_a_score = Math.ceil(knockoutBo / 2) so it's already "won".
    if (assignment.is_bye) {
      const winScore = Math.ceil(knockoutBo / 2);
      await supabase.from('matches').update({ is_bye: true, team_a_score: winScore }).eq('id', match.id);
      
      // Auto advance to next match
      // Find what match it connects to
      const nextMatchIndex = Math.floor(i / 2);
      const isTeamAInNext = i % 2 === 0;
      if (rounds > 1 && assignment.teamA) {
         const nextMatchId = matchTree[rounds - 2][nextMatchIndex].id;
         const advancementInsert = assignment.teamA.map(p => ({
           match_id: nextMatchId,
           user_id: p.user_id,
           team: isTeamAInNext ? 'A' : 'B'
         }));
         await supabase.from('match_participants').insert(advancementInsert);
      }
    }
  }
}

// ===== ROUND ROBIN =====
async function generateRoundRobinSchedule(
  tournamentId: string, participants: any[], creatorId: string, matchType: string,
  groupNumber?: number, stage?: string, bestOf: number = 1
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
            created_by: creatorId,
            best_of: bestOf
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
  const config = tournament.format_config || {};
  const groupBo = config.group_bo || 1;
  
  // Group participants by group_number
  const groups: Record<number, any[]> = {};
  for (let g = 1; g <= groupCount; g++) {
    groups[g] = participants.filter(p => p.group_number === g);
  }
  
  // Generate round-robin for each group
  for (let g = 1; g <= groupCount; g++) {
    if (groups[g].length >= 2) {
      await generateRoundRobinSchedule(tournamentId, groups[g], creatorId, matchType, g, 'group', groupBo);
    }
  }
  
  // NOTE: Knockout stage matches are NOT generated now.
  // They will be generated when admin advances the tournament from group → knockout
  // via a separate API call after all group matches are complete.
}
