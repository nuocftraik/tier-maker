import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';

const protectedRoutes = ['/vote', '/profile'];
const adminRoutes = ['/admin'];
const authRoutes = ['/login'];

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route));
  const isAdminRoute = adminRoutes.some((route) => path.startsWith(route));
  const isAuthRoute = authRoutes.includes(path);

  // Check valid session
  const cookie = req.cookies.get('session');
  // Root page is leaderboard, accessible to auth users. We could also protect it, but PRD says "A member opens the app -> enters code", so "/" could just redirect to "/login" if not authed.
  const isRoot = path === '/';

  if (!cookie?.value) {
    if (isProtectedRoute || isAdminRoute || isRoot) {
      return NextResponse.redirect(new URL('/login', req.nextUrl));
    }
    return NextResponse.next();
  }

  const session = await decrypt(cookie.value);

  // Invalid or expired token
  if (!session) {
    if (isProtectedRoute || isAdminRoute || isRoot) {
      const resp = NextResponse.redirect(new URL('/login', req.nextUrl));
      resp.cookies.delete('session');
      return resp;
    }
  }

  // Valid session logic
  if (session) {
    if (isRoot) {
      // Authenticated users go to leaderboard
      return NextResponse.redirect(new URL('/leaderboard', req.nextUrl));
    }

    if (isAuthRoute) {
      // Authenticated users shouldn't see login again
      return NextResponse.redirect(new URL('/leaderboard', req.nextUrl));
    }

    if (isAdminRoute && !session.isAdmin) {
      // Non-admins shouldn't access admin
      return NextResponse.redirect(new URL('/leaderboard', req.nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images).*)'],
};
