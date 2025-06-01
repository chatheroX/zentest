import { type NextRequest, NextResponse } from 'next/server';

const USER_DASHBOARD_ROUTE = '/user/dashboard';
const ADMIN_DASHBOARD_ROUTE = '/admin/dashboard';
const ADMIN_LOGIN_ROUTE = '/uradmin'; // New admin login route
const AUTH_ROUTE = '/auth'; // User login/register
const PROTECTED_ROUTES_PATTERNS = ['/user/dashboard', '/admin/dashboard']; // Excludes /uradmin from this for now
const SEB_SPECIFIC_ROUTES_PATTERNS = ['/seb/'];
const PUBLIC_ROUTES = ['/', '/privacy', '/terms', '/unsupported-browser', AUTH_ROUTE, ADMIN_LOGIN_ROUTE];

const SESSION_COOKIE_NAME = 'proctorchecker-session';
const ROLE_COOKIE_NAME = 'proctorchecker-role';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();
  const middlewareLogId = `[Middleware ${Date.now().toString().slice(-5)}] Path: ${pathname}`;

  // Allow static assets and API routes to pass through
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/') || pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico|json)$/i)) {
    return res;
  }
  console.log(middlewareLogId);

  const sessionUsernameCookie = req.cookies.get(SESSION_COOKIE_NAME);
  const sessionRoleCookie = req.cookies.get(ROLE_COOKIE_NAME);
  const isAuthenticated = !!sessionUsernameCookie;
  const userRole = sessionRoleCookie?.value as 'user' | 'admin' | undefined;

  console.log(`${middlewareLogId} isAuthenticated: ${isAuthenticated}, Role: ${userRole}`);

  // Allow SEB routes unconditionally (SEB has its own token validation)
  const isSebRoute = SEB_SPECIFIC_ROUTES_PATTERNS.some(p => pathname.startsWith(p));
  if (isSebRoute) {
    console.log(`${middlewareLogId} SEB route detected. Allowing.`);
    return res;
  }

  const targetUserDashboard = USER_DASHBOARD_ROUTE;
  const targetAdminDashboard = ADMIN_DASHBOARD_ROUTE;

  // Handle public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    if (isAuthenticated) {
      if (userRole === 'admin' && (pathname === AUTH_ROUTE || pathname === ADMIN_LOGIN_ROUTE)) {
        console.log(`${middlewareLogId} Authenticated admin on auth page, redirect to ${targetAdminDashboard}`);
        return NextResponse.redirect(new URL(targetAdminDashboard, req.url));
      }
      if (userRole === 'user' && (pathname === AUTH_ROUTE || pathname === ADMIN_LOGIN_ROUTE)) {
        console.log(`${middlewareLogId} Authenticated user on auth page, redirect to ${targetUserDashboard}`);
        return NextResponse.redirect(new URL(targetUserDashboard, req.url));
      }
    }
    console.log(`${middlewareLogId} Public route: ${pathname}. Allowing.`);
    return res; // Allow access to public routes
  }

  // Handle protected routes
  const isProtectedRoute = PROTECTED_ROUTES_PATTERNS.some(p => pathname.startsWith(p));

  if (isAuthenticated) {
    if (userRole === 'user' && pathname.startsWith(ADMIN_DASHBOARD_ROUTE)) {
      console.log(`${middlewareLogId} User trying to access admin area, redirect to ${targetUserDashboard}`);
      return NextResponse.redirect(new URL(targetUserDashboard, req.url));
    }
    if (userRole === 'admin' && pathname.startsWith(USER_DASHBOARD_ROUTE)) {
      console.log(`${middlewareLogId} Admin trying to access user area, redirect to ${targetAdminDashboard}`);
      return NextResponse.redirect(new URL(targetAdminDashboard, req.url));
    }
    // If authenticated and trying to access a route specific to their role, allow.
    if ((userRole === 'user' && pathname.startsWith(USER_DASHBOARD_ROUTE)) ||
        (userRole === 'admin' && pathname.startsWith(ADMIN_DASHBOARD_ROUTE))) {
      console.log(`${middlewareLogId} Authenticated user/admin allowed for their dashboard: ${pathname}`);
      return res;
    }
    // If authenticated but on a non-public, non-dashboard route that isn't explicitly handled,
    // might redirect to their respective dashboard or allow if it's a sub-route of their dashboard.
    // For now, if it's a protected route they have access to, res is returned.
     if (isProtectedRoute) {
        console.log(`${middlewareLogId} Authenticated user/admin accessing a protected route they have access to: ${pathname}`);
        return res;
     }

  } else { // User is NOT authenticated
    if (isProtectedRoute) {
      console.log(`${middlewareLogId} Unauthenticated on protected route ${pathname}, redirecting to ${AUTH_ROUTE}`);
      const redirectUrl = new URL(AUTH_ROUTE, req.url);
      redirectUrl.searchParams.set('redirectedFrom', pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }
  
  // Fallback: If not authenticated and not a public route, redirect to general auth page.
  // This should catch most other cases.
  if (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
    console.log(`${middlewareLogId} Unauthenticated on unhandled route ${pathname}, redirecting to ${AUTH_ROUTE}`);
    const redirectUrl = new URL(AUTH_ROUTE, req.url);
    redirectUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  console.log(`${middlewareLogId} Fallback for: ${pathname}. Current res:`, res.status);
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
