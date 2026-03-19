import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const session = await decrypt(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: 'Phiên bản không hợp lệ' }, { status: 401 });
    }

    // Security check: only allow deleting if the user is the owner (voter)
    // Or if they are admin (optional).
    // Let's first check if the vote exists and belongs to the user.
    const { data: vote, error: fetchError } = await supabase
      .from('votes')
      .select('voter_id')
      .eq('id', id)
      .single();

    if (fetchError || !vote) {
      return NextResponse.json({ error: 'Không tìm thấy phiếu vote' }, { status: 404 });
    }

    if (vote.voter_id !== session.id) {
      return NextResponse.json({ error: 'Bạn không có quyền xóa phiếu bầu này' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('votes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ message: 'Đã xóa phiếu bầu thành công' }, { status: 200 });

  } catch (error) {
    console.error('DELETE vote error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi xóa vote' }, { status: 500 });
  }
}
