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

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) return NextResponse.json({ error: 'Thiếu ID' }, { status: 400 });

    const { error } = await supabase
      .from('users')
      .update({
        name: body.name,
        avatar_url: body.avatar_url,
        is_admin: body.is_admin,
        is_active: body.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'Đã cập nhật' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Lỗi cập nhật thành viên' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });

  try {
    const { id } = await params;
    
    // Soft delete is better, but PRD says delete. Let's do a hard delete which cascades votes.
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'Đã xóa' });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi xóa thành viên' }, { status: 500 });
  }
}
