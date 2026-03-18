import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';

async function checkAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  if (!sessionCookie?.value) return false;
  const session = await decrypt(sessionCookie.value);
  return session && session.isAdmin;
}

export async function POST(request: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });

  try {
    const { name, avatar_url, is_admin } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Tên thành viên không được để trống' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('users')
      .insert([{ name, avatar_url, is_admin }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ message: 'Đã thêm thành viên', user: data });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi thêm thành viên' }, { status: 500 });
  }
}
