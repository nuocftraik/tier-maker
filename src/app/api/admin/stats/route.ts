import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie?.value) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = await decrypt(sessionCookie.value);
    if (!session?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Users stats
    const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true);
    
    // Votes stats
    const { count: votesCount } = await supabase.from('votes').select('*', { count: 'exact', head: true });

    // Admins count
    const { count: adminsCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_admin', true);

    return NextResponse.json({
      totalUsers: usersCount || 0,
      totalVotes: votesCount || 0,
      totalAdmins: adminsCount || 0,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi tải stats' }, { status: 500 });
  }
}
