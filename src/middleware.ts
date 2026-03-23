import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';

const protectedRoutes = ['/vote', '/profile', '/tournaments/new', '/tournaments/[id]/edit'];
const adminRoutes = ['/admin'];
const authRoutes = ['/login'];

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route)) || 
                           (path.startsWith('/tournaments/') && path.endsWith('/edit'));
  const isAdminRoute = adminRoutes.some((route) => path.startsWith(route));
  const isAuthRoute = authRoutes.includes(path);

  const cookie = req.cookies.get('session');
  const isRoot = path === '/';

  // Decode session
  const session = cookie?.value ? await decrypt(cookie.value) : null;
  const isPrefetch = req.headers.get('x-middleware-prefetch') === '1';

  // If no session and trying to access protected route
  if (!session && (isProtectedRoute || isAdminRoute || isRoot)) {
    // If it's a prefetch, we could ignore it to avoid flickering, but redirecting is usually OK
    // Importantly, we ONLY delete the session if we are absolutely sure the cookie is present but invalid.
    const loginUrl = new URL('/login', req.nextUrl);
    // loginUrl.searchParams.set('from', path); // Useful for redirection after login
    
    if (isPrefetch) {
      // For prefetch requests, we return a response that allows the prefetch to work but 
      // let the actual navigation handle the redirect if still unauthorized.
      return NextResponse.next();
    }
    
    const resp = NextResponse.redirect(loginUrl);
    if (cookie?.value) {
      // Only delete if there was a cookie that failed to decrypt
      resp.cookies.delete('session');
    }
    return resp;
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
