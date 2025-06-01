
import { type NextRequest, NextResponse } from 'next/server';

const USER_DASHBOARD_ROUTE = '/user/dashboard';
const ADMIN_DASHBOARD_ROUTE = '/admin/dashboard';
const AUTH_ROUTE = '/auth';
const PROTECTED_ROUTES_PATTERNS = ['/user/dashboard', '/admin/dashboard'];
const SEB_SPECIFIC_ROUTES_PATTERNS = ['/seb/'];
const PUBLIC_ROUTES = ['/', '/privacy', '/terms', '/unsupported-browser']; // Removed supabase-test

const SESSION_COOKIE_NAME = 'proctorchecker-session'; // Updated cookie name
const ROLE_COOKIE_NAME = 'proctorchecker-role'; // Updated cookie name

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();
  const middlewareLogId = `[Middleware ${Date.now().toString().slice(-5)}] Path: ${pathname}`;

  if (pathname.startsWith('/_next') || pathname.startsWith('/api/') || pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico|json)$/i)) {
    return res;
  }
  console.log(middlewareLogId);

  const sessionUsernameCookie = req.cookies.get(SESSION_COOKIE_NAME);
  const sessionRoleCookie = req.cookies.get(ROLE_COOKIE_NAME);
  const isAuthenticated = !!sessionUsernameCookie;
  const userRole = sessionRoleCookie?.value as 'user' | 'admin' | undefined;

  console.log(`${middlewareLogId} isAuthenticated: ${isAuthenticated}, Role: ${userRole}`);

  const isSebRoute = SEB_SPECIFIC_ROUTES_PATTERNS.some(p => pathname.startsWith(p));
  if (isSebRoute) {
    console.log(`${middlewareLogId} SEB route detected. Allowing.`);
    return res;
  }

  const targetDashboard = userRole === 'admin' ? ADMIN_DASHBOARD_ROUTE : USER_DASHBOARD_ROUTE;

  if (PUBLIC_ROUTES.includes(pathname)) {
    if (isAuthenticated && pathname === AUTH_ROUTE) {
      console.log(`${middlewareLogId} Authenticated on ${AUTH_ROUTE}, redirect to ${targetDashboard}`);
      return NextResponse.redirect(new URL(targetDashboard, req.url));
    }
    console.log(`${middlewareLogId} Public route: ${pathname}. Allowing.`);
    return res;
  }

  const isProtectedRoute = PROTECTED_ROUTES_PATTERNS.some(p => pathname.startsWith(p));

  if (isAuthenticated) {
    if (pathname === AUTH_ROUTE) { // Should be caught by public routes check, but safeguard
      console.log(`${middlewareLogId} Authenticated on ${AUTH_ROUTE} (safeguard), redirect to ${targetDashboard}`);
      return NextResponse.redirect(new URL(targetDashboard, req.url));
    }
    if (userRole === 'user' && pathname.startsWith(ADMIN_DASHBOARD_ROUTE)) {
      console.log(`${middlewareLogId} User trying to access admin area, redirect to ${USER_DASHBOARD_ROUTE}`);
      return NextResponse.redirect(new URL(USER_DASHBOARD_ROUTE, req.url));
    }
    if (userRole === 'admin' && pathname.startsWith(USER_DASHBOARD_ROUTE)) {
      console.log(`${middlewareLogId} Admin trying to access user area, redirect to ${ADMIN_DASHBOARD_ROUTE}`);
      return NextResponse.redirect(new URL(ADMIN_DASHBOARD_ROUTE, req.url));
    }
    console.log(`${middlewareLogId} Authenticated user allowed for: ${pathname}`);
    return res;
  }

  // User is NOT authenticated
  if (isProtectedRoute) {
    console.log(`${middlewareLogId} Unauthenticated on protected route ${pathname}, redirecting to ${AUTH_ROUTE}`);
    const redirectUrl = new URL(AUTH_ROUTE, req.url);
    redirectUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(redirectUrl);
  }
  
  // For any other non-public, non-protected routes, if unauthenticated, redirect to auth.
  // This covers cases like trying to access /seb/entry directly without a token flow that sets auth cookies.
  if (pathname !== AUTH_ROUTE) { // Avoid redirect loop if already on auth page
     console.log(`${middlewareLogId} Unauthenticated on unhandled route ${pathname}, redirecting to ${AUTH_ROUTE}`);
     const redirectUrl = new URL(AUTH_ROUTE, req.url);
     redirectUrl.searchParams.set('redirectedFrom', pathname);
     return NextResponse.redirect(redirectUrl);
  }

  console.log(`${middlewareLogId} Fallback for unauthenticated on: ${pathname} (likely /auth). Allowing.`);
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
