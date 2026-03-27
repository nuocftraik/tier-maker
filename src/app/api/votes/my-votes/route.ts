import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';

export async function GET() {
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

    const { data: myVotes, error } = await supabase
      .from('latest_votes')
      .select('*')
      .eq('voter_id', session.id);

    if (error) {
      return NextResponse.json({ error: 'Lỗi tải lịch sử vote' }, { status: 500 });
    }

    return NextResponse.json(myVotes, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
