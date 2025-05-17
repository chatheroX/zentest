import { type NextRequest, NextResponse } from 'next/server';

const STUDENT_DASHBOARD_ROUTE = '/student/dashboard/overview';
const TEACHER_DASHBOARD_ROUTE = '/teacher/dashboard/overview';
const DEFAULT_DASHBOARD_ROUTE = STUDENT_DASHBOARD_ROUTE;
const AUTH_ROUTE = '/auth';
const PROTECTED_ROUTES_PATTERNS = ['/student/dashboard', '/teacher/dashboard'];
const SEB_SPECIFIC_ROUTES_PATTERNS = ['/seb/'];
const PUBLIC_ROUTES = ['/', '/privacy', '/terms', '/supabase-test', '/unsupported-browser']; // Added /unsupported-browser

const SESSION_COOKIE_NAME = 'proctorprep-user-email';
const ROLE_COOKIE_NAME = 'proctorprep-user-role';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();

  const middlewareLogId = `[Middleware ${Date.now().toString().slice(-5)}]`;
  console.log(`${middlewareLogId} Path: ${pathname}`);

  if (pathname.startsWith('/_next') || pathname.startsWith('/api/') || pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico|json)$/i)) {
    console.log(`${middlewareLogId} Allowing asset/API route: ${pathname}`);
    return res;
  }

  const sessionEmailCookie = req.cookies.get(SESSION_COOKIE_NAME);
  const sessionRoleCookie = req.cookies.get(ROLE_COOKIE_NAME);
  const isAuthenticated = !!sessionEmailCookie;
  const userRole = sessionRoleCookie?.value as 'student' | 'teacher' | undefined;

  console.log(`${middlewareLogId} isAuthenticated: ${isAuthenticated}, Role: ${userRole}`);

  const isSebRoute = SEB_SPECIFIC_ROUTES_PATTERNS.some(p => pathname.startsWith(p));
  if (isSebRoute) {
    console.log(`${middlewareLogId} SEB route detected: ${pathname}. Allowing SEB logic to handle auth/token.`);
    return res;
  }

  const getRedirectPathForRoleFromMiddleware = (role?: 'student' | 'teacher') => {
    if (role === 'teacher') return TEACHER_DASHBOARD_ROUTE;
    if (role === 'student') return STUDENT_DASHBOARD_ROUTE;
    return DEFAULT_DASHBOARD_ROUTE; // Fallback if role is undefined after login for some reason
  };

  const targetDashboardRedirect = getRedirectPathForRoleFromMiddleware(userRole);

  if (PUBLIC_ROUTES.includes(pathname)) {
    console.log(`${middlewareLogId} Public route: ${pathname}`);
    // If authenticated and trying to access /auth, redirect to their dashboard
    if (isAuthenticated && pathname === AUTH_ROUTE) {
      console.log(`${middlewareLogId} Authenticated user on ${AUTH_ROUTE}, redirecting to ${targetDashboardRedirect}`);
      return NextResponse.redirect(new URL(targetDashboardRedirect, req.url));
    }
    // Otherwise, allow access to public routes
    return res;
  }

  const isProtectedRoute = PROTECTED_ROUTES_PATTERNS.some(p => pathname.startsWith(p));
  console.log(`${middlewareLogId} isProtectedRoute: ${isProtectedRoute}`);

  if (isAuthenticated) {
    // This case should be caught by PUBLIC_ROUTES check above, but as a safeguard:
    if (pathname === AUTH_ROUTE) {
      console.log(`${middlewareLogId} Authenticated user on ${AUTH_ROUTE} (safeguard), redirecting to ${targetDashboardRedirect}`);
      return NextResponse.redirect(new URL(targetDashboardRedirect, req.url));
    }

    // Role-based access control for protected routes
    if (isProtectedRoute) {
        if (userRole === 'student' && pathname.startsWith('/teacher/dashboard')) {
            console.log(`${middlewareLogId} Student trying to access teacher dashboard, redirecting to ${STUDENT_DASHBOARD_ROUTE}`);
            return NextResponse.redirect(new URL(STUDENT_DASHBOARD_ROUTE, req.url));
        }
        if (userRole === 'teacher' && pathname.startsWith('/student/dashboard')) {
            console.log(`${middlewareLogId} Teacher trying to access student dashboard, redirecting to ${TEACHER_DASHBOARD_ROUTE}`);
            return NextResponse.redirect(new URL(TEACHER_DASHBOARD_ROUTE, req.url));
        }
    }
    console.log(`${middlewareLogId} Authenticated user allowed for: ${pathname}`);
    return res;
  }

  // User is NOT authenticated
  if (isProtectedRoute) { // Only redirect to AUTH_ROUTE if it's a known protected route
    console.log(`${middlewareLogId} Unauthenticated user on protected route ${pathname}, redirecting to ${AUTH_ROUTE}`);
    const redirectUrl = new URL(AUTH_ROUTE, req.url);
    if (pathname) {
      redirectUrl.searchParams.set('redirectedFrom', pathname);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // If route is not public, not /auth, not SEB, not a known protected pattern,
  // and user is not authenticated. For safety, default to redirecting to auth
  // unless it's the auth page itself.
  if (pathname !== AUTH_ROUTE) {
     console.log(`${middlewareLogId} Unauthenticated user on unhandled/unknown route ${pathname}, consider redirecting to ${AUTH_ROUTE} or a 404 page. For now, allowing but this might need review.`);
     // Allowing for now, but this could be changed to redirect to AUTH_ROUTE if strict policy is needed
     // For example:
     // const redirectUrl = new URL(AUTH_ROUTE, req.url);
     // redirectUrl.searchParams.set('redirectedFrom', pathname);
     // return NextResponse.redirect(redirectUrl);
  }


  console.log(`${middlewareLogId} Fallback for: ${pathname}. Allowing access (likely ${AUTH_ROUTE} for unauthenticated).`);
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
