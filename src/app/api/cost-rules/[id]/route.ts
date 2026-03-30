import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { rule_text, penalty_amount } = await request.json();

    if (!rule_text || !rule_text.trim()) {
      return NextResponse.json({ error: 'Nội dung quy định không được trống' }, { status: 400 });
    }

    const { error } = await supabase
      .from('cost_global_rules')
      .update({
        rule_text: rule_text.trim(),
        penalty_amount: parseInt(penalty_amount) || 0
      })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ message: 'Cập nhật thành công' });
  } catch (error: any) {
    console.error('Update rule error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await supabase
      .from('cost_global_rules')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ message: 'Đã xóa quy định' });
  } catch (error: any) {
    console.error('Delete rule error:', error);
    return NextResponse.json({ error: 'Lỗi xóa quy định' }, { status: 500 });
  }
}
