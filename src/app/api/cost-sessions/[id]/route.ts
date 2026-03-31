import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';

async function recalculateSessionParticipants(sessionId: string) {
  // 1. Fetch current session data
  const { data: session } = await supabase.from('cost_sessions').select('*').eq('id', sessionId).single();
  if (!session) return;

  const totalCourt = session.total_court_fee || 0;
  const totalShuttle = session.total_shuttle_fee || 0;
  const totalDrink = session.total_drink_fee || 0;
  const totalExpenses = totalCourt + totalShuttle + totalDrink;

  // 2. Fetch all participants
  const { data: participants } = await supabase.from('cost_participants').select('*').eq('session_id', sessionId);
  if (!participants) return;

  // People actually involved in the split (those with existing base_amount or designated)
  // Usually, if base_amount = 0 and vote_status is NO, they were never in the split.
  // We'll rely on base_amount > 0 or explicit designation set in start_split.
  const splittingParts = participants.filter(p => p.base_amount > 0 || p.vote_status === 'yes' || (p.adjustment !== 0 && p.adjustment_note !== 'Ứng trước' ));
  if (splittingParts.length === 0) return;

  // 3. Sum total penalties (adjustments > 0)
  // We treat positive adjustments as "Fines" that reduce the total bill for everyone.
  // Negative adjustments (adjustments < 0) are "Advances" that only reduce individual debt.
  let totalPenalty = 0;
  splittingParts.forEach(p => {
    // Note: We only count confirmed penalties. 
    // Advance payments (adjustment < 0) are handled separately later.
    if (p.adjustment > 0) totalPenalty += p.adjustment;
  });

  // Rules implementation:
  // - Absentees pay only Court fee (total court / total splitters)
  // - Fines (Penalties > 0) reduce the Group's expenses (Shuttle/Drink first, then Court)

  let totalFines = 0;
  splittingParts.forEach(p => {
    if (p.adjustment > 0) totalFines += p.adjustment;
  });

  // NEW LOGIC: Determine who pays shuttle fee based on override + vote
  const getIsAttendee = (p: any) => {
    if (p.attendance_override === 'force_present') return true;
    if (p.attendance_override === 'force_absent') return false;
    return p.vote_status === 'yes';
  };

  const attendees = splittingParts.filter(p => getIsAttendee(p));
  const absentees = splittingParts.filter(p => !getIsAttendee(p));

  if (splittingParts.length === 0) return;

  // Structured Reduction
  let expenseShuttleDrink = totalShuttle + totalDrink;
  let expenseCourt = totalCourt;

  // 1. Fines reduce Shuttle/Drink first
  let remainingFineToApply = totalFines;
  let netShuttleDrink = Math.max(0, expenseShuttleDrink - remainingFineToApply);
  remainingFineToApply = Math.max(0, remainingFineToApply - expenseShuttleDrink);

  // 2. Remaining Fines reduce Court fee
  let netCourtTotal = Math.max(0, expenseCourt - remainingFineToApply);

  // 3. Calculate shares (Division by zero check for splittingParts.length > 0 done above)
  const courtSharePerPerson = Math.ceil(netCourtTotal / splittingParts.length);
  const shuttleDrinkSharePerAttendee = attendees.length > 0 ? Math.ceil(netShuttleDrink / attendees.length) : 0;

  // 4. Update each participant
  for (const p of splittingParts) {
    const isActuallyAttending = getIsAttendee(p);
    const court = courtSharePerPerson;
    const shuttle = isActuallyAttending ? shuttleDrinkSharePerAttendee : 0;
    const base = court + shuttle;
    
    // Final amount = new base_amount + existing adjustment
    const finalAmt = base + (p.adjustment || 0);

    await supabase
      .from('cost_participants')
      .update({
        court_amount: court,
        shuttle_amount: shuttle,
        base_amount: base,
        final_amount: finalAmt
      })
      .eq('id', p.id);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('cost_sessions')
      .select(`
        *,
        creator:users!created_by(id, name, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Không tìm thấy phiên' }, { status: 404 });
    }

    // Fetch participants with user info
    const { data: participants } = await supabase
      .from('cost_participants')
      .select(`
        *,
        user:users!user_id(id, name, avatar_url)
      `)
      .eq('session_id', id)
      .order('final_amount', { ascending: false })
      .order('id', { ascending: true });

    // Fetch GLOBAL rules
    const { data: rules } = await supabase
      .from('cost_global_rules')
      .select('*')
      .order('created_at', { ascending: true });

    // Try to get current user from cookies
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    let currentUserId = null;
    let canManage = false;
    
    if (sessionCookie?.value) {
      const userSession = await decrypt(sessionCookie.value);
      if (userSession && userSession.id) {
        currentUserId = userSession.id;
        const { data: currentUser } = await supabase.from('users').select('is_admin').eq('id', currentUserId).single();
        canManage = currentUserId === session.created_by || !!currentUser?.is_admin;
      }
    }

    // Fetch recent unique QRs from previous sessions
    let recentQRs: string[] = [];
    const { data: pastSessions } = await supabase
      .from('cost_sessions')
      .select('qr_image_url')
      .not('qr_image_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30);

    if (pastSessions) {
      // Extract unique non-null URLs
      recentQRs = Array.from(new Set(pastSessions.map(s => s.qr_image_url).filter(Boolean))).slice(0, 5);
    }

    return NextResponse.json({ 
      session: {
        ...session,
        total_amount: (session.total_court_fee || 0) + (session.total_shuttle_fee || 0) + (session.total_drink_fee || 0)
      }, 
      participants: participants || [], 
      rules: rules || [],
      recentQRs,
      currentUserId,
      canManage
    });
  } catch (error) {
    console.error('Fetch cost session detail error:', error);
    return NextResponse.json({ error: 'Lỗi lấy chi tiết phiên' }, { status: 500 });
  }
}

async function verifyOwnerOrAdmin(id: string, userSession: any) {
  const { data: costSession } = await supabase
    .from('cost_sessions')
    .select('created_by')
    .eq('id', id)
    .single();

  if (!costSession) return { allowed: false, error: 'Không tìm thấy phiên', status: 404 };

  const { data: currentUser } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', userSession.id)
    .single();

  if (costSession.created_by !== userSession.id && !currentUser?.is_admin) {
    return { allowed: false, error: 'Không có quyền chỉnh sửa', status: 403 };
  }

  return { allowed: true, sessionParams: costSession };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });
    }
    
    const userSession = await decrypt(sessionCookie.value);
    if (!userSession || !userSession.id) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Actions that require owner/admin
    const ownerActions = ['start_split', 'adjust', 'close', 'reopen', 'update_note', 'upload_qr', 'lock_poll', 'reopen_poll', 'update_session'];
    if (ownerActions.includes(action)) {
      const check = await verifyOwnerOrAdmin(id, userSession);
      if (!check.allowed) {
        return NextResponse.json({ error: check.error }, { status: check.status });
      }
    }

    // Action: update_session - update title and date
    if (action === 'update_session') {
      const { title, session_date } = body;
      if (!title || !title.trim()) {
        return NextResponse.json({ error: 'Tiêu đề không được để trống' }, { status: 400 });
      }
      const { error } = await supabase
        .from('cost_sessions')
        .update({ 
          title: title.trim(),
          session_date: session_date || new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      return NextResponse.json({ message: 'Đã cập nhật thông tin phiên' });
    }

    // Action: vote - member votes yes/no for attendance
    if (action === 'vote') {
      const { vote_status } = body;
      if (!['yes', 'no', 'pending'].includes(vote_status)) {
        return NextResponse.json({ error: 'Trạng thái vote không hợp lệ' }, { status: 400 });
      }

      const { error } = await supabase
        .from('cost_participants')
        .update({ vote_status })
        .eq('session_id', id)
        .eq('user_id', userSession.id);
      
      if (error) throw error;
      return NextResponse.json({ message: 'Đã cập nhật vote' });
    }

    // Action: lock_poll
    if (action === 'lock_poll') {
      const { error } = await supabase.from('cost_sessions').update({ status: 'poll_locked' }).eq('id', id);
      if (error) throw error;
      return NextResponse.json({ message: 'Đã đóng điểm danh' });
    }

    // Action: reopen_poll
    if (action === 'reopen_poll') {
      const { error } = await supabase.from('cost_sessions').update({ status: 'voting' }).eq('id', id);
      if (error) throw error;
      return NextResponse.json({ message: 'Đã mở lại điểm danh' });
    }

    // Action: start_split - Owner locks the poll and sets the bill costs
    if (action === 'start_split') {
      const { 
        court_fee, shuttle_fee, drink_fee, qr_image_url, split_participant_ids,
        advance_payers
      } = body;
      
      const totalCtx = (parseInt(court_fee) || 0) + (parseInt(shuttle_fee) || 0) + (parseInt(drink_fee) || 0);
      const splitIds = Array.isArray(split_participant_ids) ? split_participant_ids : [];
      const basePerPerson = splitIds.length > 0 ? Math.ceil(totalCtx / splitIds.length) : 0;

      // 1. Update session costs and status
      const { error: sessErr } = await supabase
        .from('cost_sessions')
        .update({
          total_court_fee: parseInt(court_fee) || 0,
          total_shuttle_fee: parseInt(shuttle_fee) || 0,
          total_drink_fee: parseInt(drink_fee) || 0,
          bank_info: null, // Removing bank info per user request
          qr_image_url: qr_image_url || null,
          status: 'splitting'
        })
        .eq('id', id);
      if (sessErr) throw sessErr;

      // 2. Fetch all participants to recalculate final amount
      const { data: allParts } = await supabase
        .from('cost_participants')
        .select('id, adjustment, user_id, vote_status')
        .eq('session_id', id);

      if (allParts) {
        const advList = Array.isArray(advance_payers) ? advance_payers : [];
        for (const p of allParts) {
          const isPaying = splitIds.includes(p.user_id);
          
          let adj = 0;
          let note: string | null = null;
          
          // Apply advance deduction for anyone who paid in advance
          const userAdvs = advList.filter(a => a.user_id === p.user_id);
          for (const adv of userAdvs) {
            adj -= parseInt(adv.amount) || 0;
            const singleNote = adv.note || 'Ứng trước';
            note = note ? `${note}, ${singleNote}` : singleNote;
          }

          const updateObj: any = {
            base_amount: isPaying ? 1 : 0, // Temp value to mark as splitting
            adjustment: adj,
            adjustment_note: note,
            final_amount: 0 // Will be recalculated
          };

          // Mặc định những người không vote thì tính là không đi
          if (p.vote_status === 'pending') {
            updateObj.vote_status = 'no';
          }

          await supabase.from('cost_participants').update(updateObj).eq('id', p.id);
        }
      }

      // 3. Final Recalculation using the new logic
      await recalculateSessionParticipants(id);

      return NextResponse.json({ message: 'Đã chốt sổ và bắt đầu chia tiền' });
    }

    // Action: toggle_paid
    if (action === 'toggle_paid') {
      const { participant_id, is_paid } = body;
      const updateData: any = { is_paid };
      if (is_paid) {
        updateData.paid_at = new Date().toISOString();
      } else {
        updateData.paid_at = null;
      }
      const { error } = await supabase
        .from('cost_participants')
        .update(updateData)
        .eq('id', participant_id)
        .eq('session_id', id);
      
      if (error) throw error;
      return NextResponse.json({ message: 'Cập nhật trạng thái thanh toán thành công' });
    }

    // Action: adjust
    if (action === 'adjust') {
      const { participant_id, adjustment, adjustment_note, attendance_override } = body;
      const { data: participant } = await supabase
        .from('cost_participants')
        .select('id')
        .eq('id', participant_id)
        .eq('session_id', id)
        .single();

      if (!participant) {
        return NextResponse.json({ error: 'Không tìm thấy người tham gia' }, { status: 404 });
      }

      const adjustmentAmount = parseInt(adjustment) || 0;
      
      const updateData: any = {
        adjustment: adjustmentAmount,
        adjustment_note: adjustment_note || null,
        attendance_override: attendance_override || 'follow_vote'
      };

      const { error } = await supabase
        .from('cost_participants')
        .update(updateData)
        .eq('id', participant_id)
        .eq('session_id', id);

      if (error) throw error;

      // Recalculate everyone's share
      await recalculateSessionParticipants(id);

      return NextResponse.json({ message: 'Cập nhật điều chỉnh thành công' });
    }

    // Action: update_note
    if (action === 'update_note') {
      const { participant_id, participant_note } = body;
      const { error } = await supabase
        .from('cost_participants')
        .update({ participant_note: participant_note || null })
        .eq('id', participant_id)
        .eq('session_id', id);

      if (error) throw error;
      return NextResponse.json({ message: 'Cập nhật ghi chú thành công' });
    }

    // Action: upload_qr
    if (action === 'upload_qr') {
      const { qr_image_url } = body;
      const { error } = await supabase
        .from('cost_sessions')
        .update({ qr_image_url: qr_image_url || null })
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ message: 'Cập nhật QR thành công' });
    }

    // Action: close
    if (action === 'close') {
      const { error } = await supabase
        .from('cost_sessions')
        .update({ status: 'closed' })
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ message: 'Đã đóng phiên' });
    }

    // Action: reopen (returns to splitting)
    if (action === 'reopen') {
      const { error } = await supabase
        .from('cost_sessions')
        .update({ status: 'splitting' })
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ message: 'Đã mở lại phiên' });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error('Update cost session error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });
    }
    
    const userSession = await decrypt(sessionCookie.value);
    if (!userSession || !userSession.id) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });
    }

    const check = await verifyOwnerOrAdmin(id, userSession);
    if (!check.allowed) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const { error } = await supabase
      .from('cost_sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ message: 'Đã xóa phiên' });
  } catch (error: any) {
    console.error('Delete cost session error:', error);
    return NextResponse.json({ error: 'Lỗi xóa phiên: ' + error.message }, { status: 500 });
  }
}
