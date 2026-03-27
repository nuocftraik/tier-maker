import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tier = searchParams.get('tier');

    let query = supabase.from('rankings').select('*');

    if (tier) {
      if (tier === 'Unranked') {
        query = query.eq('tier', 'Unranked');
      } else {
        query = query.eq('tier', tier);
      }
    }

    // Always sort by rank to ensure consistent ordering matching the DB view
    query = query.order('rank', { ascending: true });

    const [{ data: rankings, error }, { data: allUsers }] = await Promise.all([
      query,
      supabase.from('users').select('id, name').eq('is_active', true)
    ]);

    if (error || !allUsers) {
      console.error('Leaderboard fetch error:', error);
      return NextResponse.json({ error: 'Lỗi tải bảng xếp hạng' }, { status: 500 });
    }

    // Calculate previous rank (7 days ago) to check for rank stability/change
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: oldVotes } = await supabase
      .from('votes')
      .select('voter_id, target_user_id, score, created_at')
      .lt('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    // Since we keep history, we only want the LATEST vote from each user BEFORE 7 days ago.
    const latestOldVotesMap = new Map<string, any>();
    (oldVotes || []).forEach(vote => {
      const key = `${vote.voter_id}_${vote.target_user_id}`;
      // Data is ordered by created_at DESC, so first occurrence is the newest one before 7 days
      if (!latestOldVotesMap.has(key)) {
        latestOldVotesMap.set(key, vote);
      }
    });

    const oldVoteStats = Array.from(latestOldVotesMap.values()).reduce((acc: any, curr) => {
      if (!acc[curr.target_user_id]) acc[curr.target_user_id] = { sum: 0, count: 0 };
      acc[curr.target_user_id].sum += Number(curr.score);
      acc[curr.target_user_id].count += 1;
      return acc;
    }, {});

    // Replicate the RANK() logic from pgSQL for yesterday
    const oldRankings = allUsers.map(u => {
      const stats = oldVoteStats[u.id] || { sum: 0, count: 0 };
      const avg = stats.count > 0 ? stats.sum / stats.count : 0;
      return {
        id: u.id,
        name: u.name,
        avg_score: avg,
        total_votes: stats.count
      };
    }).sort((a, b) => {
      // 1. Ranked first
      const aRanked = a.total_votes > 0 ? 0 : 1;
      const bRanked = b.total_votes > 0 ? 0 : 1;
      if (aRanked !== bRanked) return aRanked - bRanked;
      
      // 2. Score desc
      if (b.avg_score !== a.avg_score) return b.avg_score - a.avg_score;
      
      // 3. Count desc
      if (b.total_votes !== a.total_votes) return b.total_votes - a.total_votes;
      
      // 4. Name asc
      return a.name.localeCompare(b.name);
    }).map((item, index) => ({ id: item.id, rank: index + 1, hasVotes: item.total_votes > 0 }));

    const prevRankMap = oldRankings.reduce((acc: any, curr) => {
      // If no votes back then, we set rank to null or mark it as NEW
      acc[curr.id] = curr.hasVotes ? curr.rank : null;
      return acc;
    }, {});

    // Format the number so it has exactly 1 decimal (e.g., 9.0) if not unranked
    const formattedRankings = rankings.map(r => {
      const prevRank = prevRankMap[r.user_id];
      let rankChange = null;
      
      if (r.tier !== 'Unranked') {
        if (prevRank === null) {
          rankChange = 'new';
        } else {
          rankChange = prevRank - r.rank; // If prev=5, cur=3, change = +2 (up)
        }
      }

      return {
        ...r,
        avg_score: r.avg_score > 0 ? Number(r.avg_score).toFixed(1) : 0,
        rank_change: rankChange
      };
    });

    // Fetch active settings for S-Tier effects
    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['tier_s_fire_effect', 'tier_s_sparkle_effect', 'tier_s_crown_effect']);

    const sTierSettings = settings?.reduce((acc: any, curr) => {
      acc[curr.key] = curr.value === 'true';
      return acc;
    }, {}) || {};

    return NextResponse.json({ rankings: formattedRankings, settings: sTierSettings }, { status: 200 });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
