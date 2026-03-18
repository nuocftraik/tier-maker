import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

const secretKey = process.env.JWT_SECRET;
const key = new TextEncoder().encode(secretKey);

export interface AuthSession {
  id: string;
  name: string;
  avatar_url: string | null;
  isAdmin: boolean;
}

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30 days from now')
    .sign(key);
}

export async function decrypt(input: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload as unknown as AuthSession;
  } catch (error) {
    return null;
  }
}

export async function getSession(req: NextRequest) {
  const session = req.cookies.get('session')?.value;
  if (!session) return null;
  return await decrypt(session);
}
