import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';

// Define exact or prefix-based protected routes
const PROTECTED_PREFIXES = ['/vote', '/profile', '/tournaments/new', '/admin'];
const AUTH_ONLY_ROUTES = ['/login'];
const PUBLIC_PREFIXES = ['/leaderboard', '/matches', '/head-to-head', '/tournaments'];

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 1. Identify route type
  const isProtectedRoute = PROTECTED_PREFIXES.some(prefix => path.startsWith(prefix)) || 
                           (path.startsWith('/tournaments/') && path.endsWith('/edit'));
  const isAdminRoute = path.startsWith('/admin');
  const isAuthRoute = AUTH_ONLY_ROUTES.includes(path);
  const isRoot = path === '/';

  // 2. Get and Verify Session
  const cookie = req.cookies.get('session')?.value;
  const session = cookie ? await decrypt(cookie) : null;
  
  const isPrefetch = req.headers.get('x-middleware-prefetch') === '1';

  // 3. Authorization Logic

  // Case A: No session and trying to access protected content
  if (!session && (isProtectedRoute || isAdminRoute || isRoot)) {
    // For prefetch requests, we let it pass to avoid client-side error/flicker,
    // but the actual navigation request will hit the redirect below.
    if (isPrefetch) {
      return NextResponse.next();
    }

    const loginUrl = new URL('/login', req.nextUrl);
    // Don't delete the cookie here yet - let the actual auth process handle invalid tokens
    // to avoid logging out users due to transient decryption issues.
    return NextResponse.redirect(loginUrl);
  }

  // Case B: Session exists
  if (session) {
    // Redirect from root or login to default landing page
    if (isRoot || isAuthRoute) {
      return NextResponse.redirect(new URL('/leaderboard', req.nextUrl));
    }

    // Protect admin routes
    if (isAdminRoute && !session.isAdmin) {
      return NextResponse.redirect(new URL('/leaderboard', req.nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|favicon).*)'],
};
