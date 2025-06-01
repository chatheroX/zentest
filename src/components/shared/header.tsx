
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Loader2, LogIn, LogOut, UserPlus, ShieldCheck, Settings2 } from 'lucide-react'; 
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const USER_DASHBOARD_ROUTE = '/user/dashboard';
const ADMIN_DASHBOARD_ROUTE = '/admin/dashboard';

export function AppHeader() {
  const { user, signOut, isLoading: authLoading, setShowSignOutDialog } = useAuth();
  const pathname = usePathname();
  const isAuthenticated = !!user;

  const getDashboardRoute = () => {
    if (!user) return '/auth'; 
    return user.role === 'admin' ? ADMIN_DASHBOARD_ROUTE : USER_DASHBOARD_ROUTE;
  };

  if (pathname.startsWith('/seb/')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur-lg shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <ShieldCheck className="h-8 w-8 text-primary stroke-[1.5]" />
          <span className="text-2xl font-semibold text-foreground group-hover:text-primary transition-colors">ProctorChecker</span>
        </Link>
        <nav className="flex items-center space-x-2 sm:space-x-3">
          {authLoading ? ( 
             <div className="p-2"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : isAuthenticated && user ? (
            <>
              <Button variant="ghost" asChild className="text-sm font-medium text-foreground hover:bg-accent/60 hover:text-accent-foreground px-2.5 sm:px-3 py-2 rounded-md">
                <Link href={getDashboardRoute()}>
                 <LayoutDashboard className="mr-1.5 h-4 w-4" /> Dashboard
                </Link>
              </Button>
               <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowSignOutDialog(true)}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full h-9 w-9"
                title="Logout"
               >
                <LogOut className="h-5 w-5" />
              </Button>
               <Link href={`${user.role === 'admin' ? ADMIN_DASHBOARD_ROUTE : USER_DASHBOARD_ROUTE}/profile`} passHref legacyBehavior>
                <a title="Profile & Settings" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-full">
                <Avatar className="h-9 w-9 border-2 border-primary/50 hover:border-primary cursor-pointer transition-all">
                  <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    {user.username.substring(0,2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                </a>
              </Link>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild className="text-sm font-medium text-foreground hover:bg-accent/60 hover:text-accent-foreground px-2.5 sm:px-3 py-2 rounded-md">
                <Link href="/auth?action=login">
                  <LogIn className="mr-1.5 h-4 w-4" /> Login
                </Link>
              </Button>
              <Button asChild className="btn-primary text-sm px-4 sm:px-5 py-2 rounded-md shadow-sm">
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

    