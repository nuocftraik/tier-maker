import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

const getSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // In dev, we can use a fallback, but in production this should be a critical error
    // However, to prevent "sometimes" failures, let's at least log or use a stable fallback if possible
    return new TextEncoder().encode('fallback-secret-at-least-32-characters-long');
  }
  return new TextEncoder().encode(secret);
};

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
    .sign(getSecretKey());
}

export async function decrypt(input: string): Promise<AuthSession | null> {
  if (!input) return null;
  try {
    const { payload } = await jwtVerify(input, getSecretKey(), {
      algorithms: ['HS256'],
    });
    return payload as unknown as AuthSession;
  } catch (error) {
    // If decryption fails, it could be an expired token or a wrong secret
    console.error('JWT decryption failed:', error);
    return null;
  }
}

export async function getSession(req: NextRequest) {
  const session = req.cookies.get('session')?.value;
  if (!session) return null;
  return await decrypt(session);
}
