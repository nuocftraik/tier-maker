import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';

// Helper to check admin
async function checkAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  if (!sessionCookie?.value) return false;
  const session = await decrypt(sessionCookie.value);
  return session && session.isAdmin;
}

export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });

  try {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) throw error;
    
    // Convert to object { key: value }
    const settingsMap = data.reduce((acc: any, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    return NextResponse.json(settingsMap);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi tải cài đặt' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });

  try {
    const settings = await request.json();
    
    const updates = Object.keys(settings).map((key) => ({
      key,
      value: String(settings[key]),
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('settings').upsert(updates);
    if (error) throw error;

    return NextResponse.json({ message: 'Lưu cài đặt thành công' });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi lưu cài đặt' }, { status: 500 });
  }
}
