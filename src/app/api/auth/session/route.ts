import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ session: null });
  }

  try {
    const session = await decrypt(sessionCookie.value);
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json({ session: null });
  }
}
