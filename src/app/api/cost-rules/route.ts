import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: rules, error } = await supabase
      .from('cost_global_rules')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ rules });
  } catch (error) {
    console.error('Fetch global rules error:', error);
    return NextResponse.json({ error: 'Lỗi lấy danh sách quy định' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { rule_text, penalty_amount } = await request.json();

    if (!rule_text || !rule_text.trim()) {
      return NextResponse.json({ error: 'Nội dung quy định không được trống' }, { status: 400 });
    }

    const { data: newRule, error } = await supabase
      .from('cost_global_rules')
      .insert([{
        rule_text: rule_text.trim(),
        penalty_amount: parseInt(penalty_amount) || 0
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ message: 'Tạo quy định thành công', rule: newRule });
  } catch (error: any) {
    console.error('Create global rule error:', error);
    return NextResponse.json({ error: 'Lỗi tạo quy định: ' + error.message }, { status: 500 });
  }
}
