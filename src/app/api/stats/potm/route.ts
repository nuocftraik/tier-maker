import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Fetch all matches in last 30 days
    const { data: matches, error } = await supabase
      .from('matches')
      .select('id, team_a_score, team_b_score, created_at')
      .gt('created_at', thirtyDaysAgo.toISOString())
      .or('team_a_score.gt.0,team_b_score.gt.0');

    if (error) throw error;

    if (!matches || matches.length === 0) {
      return NextResponse.json({ potm: null });
    }

    const matchIds = matches.map(m => m.id);
    const { data: participants } = await supabase
      .from('match_participants')
      .select('match_id, user_id, team')
      .in('match_id', matchIds);

    if (!participants) return NextResponse.json({ potm: null });

    // Calculate wins per user
    const userWins: Record<string, number> = {};
    const userTotalMatches: Record<string, number> = {};

    participants.forEach(p => {
      const match = matches.find(m => m.id === p.match_id);
      if (!match) return;

      userTotalMatches[p.user_id] = (userTotalMatches[p.user_id] || 0) + 1;

      const isWinner = (p.team === 'A' && match.team_a_score > match.team_b_score) ||
                       (p.team === 'B' && match.team_b_score > match.team_a_score);
      
      if (isWinner) {
        userWins[p.user_id] = (userWins[p.user_id] || 0) + 1;
      }
    });

    // Find user with most wins
    let bestUserId = null;
    let maxWins = -1;

    for (const [uid, wins] of Object.entries(userWins)) {
      if (wins > maxWins) {
        maxWins = wins;
        bestUserId = uid;
      }
    }

    if (!bestUserId) return NextResponse.json({ potm: null });

    // Fetch user details
    const { data: user } = await supabase
      .from('users')
      .select('id, name, avatar_url')
      .eq('id', bestUserId)
      .single();

    return NextResponse.json({
      potm: {
        user,
        stats: {
          wins: maxWins,
          total: userTotalMatches[bestUserId] || 0,
          winRate: Math.round((maxWins / (userTotalMatches[bestUserId] || 1)) * 100)
        }
      }
    });
  } catch (error) {
    console.error('POTM API error:', error);
    return NextResponse.json({ error: 'Lỗi lấy dữ liệu POTM' }, { status: 500 });
  }
}
