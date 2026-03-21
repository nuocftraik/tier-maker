import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';

export async function GET() {
  try {
    const { data: tournaments, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        winner:users!winner_id(id, name, avatar_url),
        created_by_user:users!created_by(id, name, avatar_url)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Parse format_config from tournament
    const processed = tournaments?.map(t => {
      const config = t.format_config || {};
      return {
        ...t,
        best_of: config.knockout_bo || t.best_of || 1
      };
    });

    return NextResponse.json({ tournaments: processed });
  } catch (error) {
    console.error('Fetch tournaments error:', error);
    return NextResponse.json({ error: 'Lỗi lấy danh sách giải đấu' }, { status: 500 });
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
    if (!session || !session.id || !session.isAdmin) {
      return NextResponse.json({ error: 'Chỉ admin mới có quyền tạo giải đấu' }, { status: 403 });
    }

    const { 
      name, description, type, match_mode, seeding_mode,
      participants, group_count, advance_per_group, best_of, format_config
    } = await request.json();

    // Validation
    if (!name || !type || !['elimination', 'round_robin', 'custom'].includes(type)) {
      return NextResponse.json({ error: 'Thông tin giải đấu không hợp lệ' }, { status: 400 });
    }
    
    if (!Array.isArray(participants) || participants.length < 2) {
      return NextResponse.json({ error: 'Cần ít nhất 2 người chơi để tạo giải đấu' }, { status: 400 });
    }

    const validMatchMode = match_mode === 'doubles' ? 'doubles' : 'singles';
    const validSeedingMode = seeding_mode === 'manual' ? 'manual' : 'random';

    // Custom type validation
    if (type === 'custom') {
      if (!group_count || group_count < 2) {
        return NextResponse.json({ error: 'Giải custom cần ít nhất 2 bảng' }, { status: 400 });
      }
      if (!advance_per_group || advance_per_group < 1) {
        return NextResponse.json({ error: 'Mỗi bảng cần ít nhất 1 người đi tiếp' }, { status: 400 });
      }
    }

    // Step 1: Create the tournament
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .insert([{
        name,
        description,
        type,
        match_mode: validMatchMode,
        seeding_mode: validSeedingMode,
        status: 'draft',
        group_count: type === 'custom' ? group_count : 0,
        advance_per_group: type === 'custom' ? advance_per_group : 0,
        current_stage: type === 'custom' ? 'group' : null,
        format_config: format_config || { knockout_bo: best_of || 3, final_bo: best_of === 1 ? 1 : 5, group_bo: 1 },
        created_by: session.id
      }])
      .select('id')
      .single();

    if (tournamentError) throw tournamentError;

    // Step 2: Add participants
    // participants can be either string[] (random seeding) or { userId, seed, group_number? }[] (manual)
    let participantData: any[];
    
    if (validSeedingMode === 'manual' && typeof participants[0] === 'object') {
      // Manual seeding: participants is an array of { userId, seed, group_number }
      participantData = participants.map((p: any) => ({
        tournament_id: tournament.id,
        user_id: p.userId,
        seed: p.seed || 1,
        group_number: p.group_number || 0
      }));
    } else {
      // Random seeding: shuffle then assign
      const shuffled = validSeedingMode === 'random' 
        ? [...participants].sort(() => Math.random() - 0.5) 
        : participants;
      
      if (type === 'custom' && group_count) {
        // Distribute to groups evenly
        participantData = shuffled.map((userId: string, index: number) => ({
          tournament_id: tournament.id,
          user_id: userId,
          seed: index + 1,
          group_number: (index % group_count) + 1
        }));
      } else {
        participantData = shuffled.map((userId: string, index: number) => ({
          tournament_id: tournament.id,
          user_id: userId,
          seed: index + 1,
          group_number: 0
        }));
      }
    }

    const { error: partError } = await supabase
      .from('tournament_participants')
      .insert(participantData);

    if (partError) {
      console.error('Insert participants error:', partError);
      return NextResponse.json({ error: 'Lỗi thêm người chơi vào giải đấu' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Giải đấu đã được tạo dưới dạng bản nháp', 
      tournamentId: tournament.id 
    });
  } catch (error: any) {
    console.error('Create tournament error:', error);
    return NextResponse.json({ error: 'Lỗi tạo giải đấu: ' + error.message }, { status: 500 });
  }
}
