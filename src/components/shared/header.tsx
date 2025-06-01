
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Loader2, LogIn, LogOut, UserPlus, ShieldCheck } from 'lucide-react'; // Added ShieldCheck
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

const USER_DASHBOARD_ROUTE = '/user/dashboard';
const ADMIN_DASHBOARD_ROUTE = '/admin/dashboard';

export function AppHeader() {
  const { user, signOut, isLoading: authLoading } = useAuth();
  const pathname = usePathname();
  const isAuthenticated = !!user;

  const getDashboardRoute = () => {
    if (!user) return '/auth'; // Should not happen if isAuthenticated is true
    return user.role === 'admin' ? ADMIN_DASHBOARD_ROUTE : USER_DASHBOARD_ROUTE;
  };

  // Hide header on SEB specific routes
  if (pathname.startsWith('/seb/')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/90 backdrop-blur-lg shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <ShieldCheck className="h-7 w-7 text-primary stroke-width-2" />
          <span className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">ProctorChecker</span>
        </Link>
        <nav className="flex items-center space-x-1 sm:space-x-2">
          {authLoading ? ( 
             <div className="p-2"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : isAuthenticated && user ? (
            <>
              <Button variant="ghost" asChild className="text-xs sm:text-sm font-medium text-foreground hover:bg-accent/50 hover:text-primary px-2 sm:px-3 py-1.5 rounded-md">
                <Link href={getDashboardRoute()}>
                 <LayoutDashboard className="mr-1.5 h-4 w-4" /> Dashboard
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={signOut}
                className="text-xs sm:text-sm font-medium border-border/70 hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive px-2 sm:px-3 py-1.5 rounded-md"
              >
                <LogOut className="mr-1.5 h-4 w-4" />
                 Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild className="text-xs sm:text-sm font-medium text-foreground hover:bg-accent/50 hover:text-primary px-2 sm:px-3 py-1.5 rounded-md">
                <Link href="/auth?action=login">
                  <LogIn className="mr-1.5 h-4 w-4" /> Login
                </Link>
              </Button>
              <Button asChild className="btn-primary text-xs sm:text-sm px-3 sm:px-4 py-1.5 rounded-md">
                <Link href="/auth?action=register">
                  <UserPlus className="mr-1.5 h-4 w-4" /> Register
                </Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
