import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { encrypt } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { accessCode, userId } = await request.json();

    if (!accessCode || !userId) {
      return NextResponse.json({ error: 'Mã truy cập và Người dùng không được để trống' }, { status: 400 });
    }

    // Check access code first
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'access_code')
      .single();

    if (settingsError || !settingsData) {
      return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
    }

    if (settingsData.value !== accessCode) {
      return NextResponse.json({ error: 'Mã truy cập không đúng' }, { status: 401 });
    }

    // Check user exists
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, avatar_url, is_admin')
      .eq('id', userId)
      .eq('is_active', true)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    // Create session
    const sessionPayload = {
      id: userData.id,
      name: userData.name,
      avatar_url: userData.avatar_url,
      isAdmin: userData.is_admin,
    };

    const token = await encrypt(sessionPayload);
    const response = NextResponse.json({ user: sessionPayload, message: 'Đăng nhập thành công' }, { status: 200 });
    
    // Set cookie
    response.cookies.set({
      name: 'session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;

  } catch (error) {
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
