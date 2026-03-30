import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';

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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Không có file' }, { status: 400 });
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'png';
    const filename = `qr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = `cost-qr/${filename}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('avatars') // Reuse existing bucket
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload QR error:', uploadError);
      return NextResponse.json({ error: 'Lỗi upload QR: ' + uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return NextResponse.json({ 
      url: urlData.publicUrl,
      message: 'Upload QR thành công' 
    });
  } catch (error: any) {
    console.error('Upload QR error:', error);
    return NextResponse.json({ error: 'Lỗi upload: ' + error.message }, { status: 500 });
  }
}
