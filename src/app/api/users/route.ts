import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, avatar_url, is_admin')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: `Lỗi từ DB: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
