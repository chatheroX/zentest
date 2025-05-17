
import { type NextRequest, NextResponse } from 'next/server';

const STUDENT_DASHBOARD_ROUTE = '/student/dashboard/overview';
const TEACHER_DASHBOARD_ROUTE = '/teacher/dashboard/overview';
const DEFAULT_DASHBOARD_ROUTE = STUDENT_DASHBOARD_ROUTE; 
const AUTH_ROUTE = '/auth';
const PROTECTED_ROUTES_PATTERNS = ['/student/dashboard', '/teacher/dashboard'];
// Add /api/seb/ routes here if they need to be exempted from certain checks,
// but generally API routes are handled before this middleware if specific logic is needed.
const SEB_SPECIFIC_ROUTES_PATTERNS = ['/seb/']; // Routes related to SEB exam taking
const PUBLIC_ROUTES = ['/', '/privacy', '/terms', '/supabase-test', '/unsupported-browser'];

const SESSION_COOKIE_NAME = 'proctorprep-user-email';
const ROLE_COOKIE_NAME = 'proctorprep-user-role';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next(); 

  console.log(`[Middleware] Path: ${pathname}`);

  // Allow static assets, API routes, and image optimization routes to pass through
  // _next/static, _next/image, /api (unless specific /api/seb needs different handling)
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/') || pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico|json)$/i)) {
    console.log(`[Middleware] Allowing asset/API route: ${pathname}`);
    return res;
  }
  
  const sessionEmailCookie = req.cookies.get(SESSION_COOKIE_NAME);
  const sessionRoleCookie = req.cookies.get(ROLE_COOKIE_NAME);
  const isAuthenticated = !!sessionEmailCookie;
  const userRole = sessionRoleCookie?.value as 'student' | 'teacher' | undefined;

  console.log(`[Middleware] isAuthenticated: ${isAuthenticated}, Role: ${userRole}`);

  // Check if the route is an SEB-specific route
  const isSebRoute = SEB_SPECIFIC_ROUTES_PATTERNS.some(p => pathname.startsWith(p));
  if (isSebRoute) {
    console.log(`[Middleware] SEB route detected: ${pathname}. Allowing access for SEB page logic to handle auth/token.`);
    return res; // Allow SEB routes to handle their own token-based auth
  }

  const getRedirectPathForRoleFromMiddleware = (role?: 'student' | 'teacher') => {
    if (role === 'teacher') return TEACHER_DASHBOARD_ROUTE;
    if (role === 'student') return STUDENT_DASHBOARD_ROUTE;
    return DEFAULT_DASHBOARD_ROUTE;
  };
  
  const targetDashboardRedirect = getRedirectPathForRoleFromMiddleware(userRole);

  if (PUBLIC_ROUTES.includes(pathname)) {
    console.log(`[Middleware] Public route: ${pathname}`);
    if (isAuthenticated && pathname === AUTH_ROUTE) {
      console.log(`[Middleware] Authenticated user on /auth, redirecting to ${targetDashboardRedirect}`);
      return NextResponse.redirect(new URL(targetDashboardRedirect, req.url));
    }
    return res; 
  }
  
  const isProtectedRoute = PROTECTED_ROUTES_PATTERNS.some(p => pathname.startsWith(p));
  console.log(`[Middleware] isProtectedRoute: ${isProtectedRoute}`);

  if (isAuthenticated) {
    if (pathname === AUTH_ROUTE) {
      console.log(`[Middleware] Authenticated user on /auth (re-check), redirecting to ${targetDashboardRedirect}`);
      return NextResponse.redirect(new URL(targetDashboardRedirect, req.url));
    }

    if (isProtectedRoute) {
        if (userRole === 'student' && pathname.startsWith('/teacher/dashboard')) {
            console.log(`[Middleware] Student trying to access teacher dashboard, redirecting to ${STUDENT_DASHBOARD_ROUTE}`);
            return NextResponse.redirect(new URL(STUDENT_DASHBOARD_ROUTE, req.url));
        }
        if (userRole === 'teacher' && pathname.startsWith('/student/dashboard')) {
            console.log(`[Middleware] Teacher trying to access student dashboard, redirecting to ${TEACHER_DASHBOARD_ROUTE}`);
            return NextResponse.redirect(new URL(TEACHER_DASHBOARD_ROUTE, req.url));
        }
    }
    console.log(`[Middleware] Authenticated user allowed for: ${pathname}`);
    return res; 
  }

  // User is NOT authenticated
  if (isProtectedRoute) {
    console.log(`[Middleware] Unauthenticated user on protected route ${pathname}, redirecting to ${AUTH_ROUTE}`);
    const redirectUrl = new URL(AUTH_ROUTE, req.url);
    if (pathname) {
      redirectUrl.searchParams.set('redirectedFrom', pathname);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // If route is neither public, nor /auth, nor SEB, nor a known protected pattern,
  // and user is not authenticated, it's an unhandled case.
  // For safety, if it's not /auth, redirect to /auth.
  if (pathname !== AUTH_ROUTE) { 
     console.log(`[Middleware] Unauthenticated user on unhandled/unknown route ${pathname}, redirecting to ${AUTH_ROUTE}`);
     const redirectUrl = new URL(AUTH_ROUTE, req.url);
     if (pathname) {
       redirectUrl.searchParams.set('redirectedFrom', pathname);
     }
     return NextResponse.redirect(redirectUrl);
  }

  console.log(`[Middleware] Fallback for: ${pathname}. Allowing access (likely /auth page for unauthenticated user).`);
  return res;
}

export const config = {
  matcher: [
    // Match all routes except static files and specific Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
