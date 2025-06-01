'use client';

import { usePathname } from 'next/navigation'; 

export function AppFooter() {
  const pathname = usePathname();

  // Hide footer on SEB specific routes or if we want no footer globally
  if (pathname.startsWith('/seb/')) {
    return null;
  }

  // Footer is now intentionally minimal or can be removed entirely if not needed.
  // For now, let's return a very simple, almost empty footer structure
  // or null if no footer is desired at all.
  return (
    <footer className="h-10 border-t bg-muted/30 dark:bg-background/30">
      <div className="container flex items-center justify-center h-full px-4 md:px-6">
        {/* Intentionally empty or minimal content */}
        <span className="text-xs text-muted-foreground">&nbsp;</span> 
      </div>
    </footer>
  );
}
