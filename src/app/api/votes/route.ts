import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const session = await decrypt(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: 'Phiên bản không hợp lệ' }, { status: 401 });
    }

    const { target_user_id, score } = await request.json();

    if (!target_user_id || score === undefined) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const numScore = parseFloat(score);

    if (isNaN(numScore) || numScore < 1.0 || numScore > 10.0) {
      return NextResponse.json({ error: 'Điểm số phải từ 1.0 đến 10.0' }, { status: 400 });
    }

    if (session.id === target_user_id) {
      return NextResponse.json({ error: 'Không thể tự vote cho chính mình!' }, { status: 400 });
    }

    // Upsert vote
    const { data, error } = await supabase
      .from('votes')
      .upsert(
        { voter_id: session.id, target_user_id: target_user_id, score: numScore, updated_at: new Date().toISOString() },
        { onConflict: 'voter_id,target_user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Lỗi khi vote:', error);
      return NextResponse.json({ error: 'Lỗi khi lưu vote. Vui lòng kiểm tra lại quyền Database.' }, { status: 500 });
    }

    return NextResponse.json({ vote: data, message: 'Lưu vote thành công' }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
