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

    const { data: rankings, error } = await query;

    if (error) {
      console.error('Leaderboard fetch error:', error);
      return NextResponse.json({ error: 'Lỗi tải bảng xếp hạng' }, { status: 500 });
    }

    // Format the number so it has exactly 1 decimal (e.g., 9.0) if not unranked
    const formattedRankings = rankings.map(r => ({
      ...r,
      avg_score: r.avg_score > 0 ? Number(r.avg_score).toFixed(1) : 0
    }));

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
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
