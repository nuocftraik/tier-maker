import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';

export async function GET() {
  try {
    const { data: sessions, error } = await supabase
      .from('cost_sessions')
      .select(`
        *,
        creator:users!created_by(id, name, avatar_url)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Count participants and paid/vote status for each session
    if (sessions && sessions.length > 0) {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('session');
      let currentUserId = null;
      let isAdmin = false;

      if (sessionCookie?.value) {
        const userSession = await decrypt(sessionCookie.value);
        if (userSession && userSession.id) {
          currentUserId = userSession.id;
          const { data: currentUser } = await supabase.from('users').select('is_admin').eq('id', currentUserId).single();
          isAdmin = !!currentUser?.is_admin;
        }
      }

      const sessionIds = sessions.map((s: any) => s.id);
      const { data: participants } = await supabase
        .from('cost_participants')
        .select('session_id, is_paid, vote_status, base_amount, adjustment, final_amount')
        .in('session_id', sessionIds);

      sessions.forEach((s: any) => {
        s.canManage = currentUserId === s.created_by || isAdmin;

        const sp = participants?.filter((p: any) => p.session_id === s.id) || [];
        
        let activeParts = sp;
        if (s.status !== 'voting' && s.status !== 'poll_locked') {
          activeParts = sp.filter((p: any) => p.base_amount > 0 || p.adjustment !== 0 || p.final_amount > 0);
        }

        s.participant_count = activeParts.length;
        s.paid_count = activeParts.filter((p: any) => p.is_paid).length;
        
        // Vote counts (still from all parts)
        s.total_invited_count = sp.length;
        s.voted_yes_count = sp.filter((p: any) => p.vote_status === 'yes').length;
        s.voted_no_count = sp.filter((p: any) => p.vote_status === 'no').length;
        
        s.total_amount = (s.total_court_fee || 0) + (s.total_shuttle_fee || 0) + (s.total_drink_fee || 0);
      });
    }

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Fetch cost sessions error:', error);
    return NextResponse.json({ error: 'Lỗi lấy danh sách phiên chia tiền' }, { status: 500 });
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
      return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });
    }

    const { 
      title, session_date, notes, participants
    } = await request.json();

    // Validation
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Tiêu đề không được để trống' }, { status: 400 });
    }
    if (!Array.isArray(participants) || participants.length < 1) {
      return NextResponse.json({ error: 'Cần ít nhất 1 người tham gia' }, { status: 400 });
    }

    // Step 1: Create session (Poll mode)
    const { data: costSession, error: sessionError } = await supabase
      .from('cost_sessions')
      .insert([{
        title: title.trim(),
        created_by: session.id,
        total_court_fee: 0,
        total_shuttle_fee: 0,
        total_drink_fee: 0,
        notes: notes || null,
        session_date: session_date || new Date().toISOString(),
        status: 'voting'
      }])
      .select('id')
      .single();

    if (sessionError) throw sessionError;

    // Step 2: Add participants (all start as 'pending' vote, cost = 0)
    const participantData = participants.map((userId: string) => ({
      session_id: costSession.id,
      user_id: userId,
      base_amount: 0,
      adjustment: 0,
      adjustment_note: null,
      final_amount: 0,
      is_paid: false,
      vote_status: 'pending',
      participant_note: null
    }));

    const { error: partError } = await supabase
      .from('cost_participants')
      .insert(participantData);

    if (partError) {
      console.error('Insert participants error:', partError);
      await supabase.from('cost_sessions').delete().eq('id', costSession.id);
      return NextResponse.json({ error: 'Lỗi thêm người tham gia' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Tạo poll thành công', 
      sessionId: costSession.id 
    });
  } catch (error: any) {
    console.error('Create cost session error:', error);
    return NextResponse.json({ error: 'Lỗi tạo poll: ' + error.message }, { status: 500 });
  }
}
