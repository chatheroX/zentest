
'use client'; // Add this directive

import Link from 'next/link';
import { usePathname } from 'next/navigation'; // Import usePathname

export function AppFooter() {
  const pathname = usePathname();

  // Hide footer on SEB specific routes
  if (pathname.startsWith('/seb/')) {
    return null;
  }

  return (
    <footer className="border-t bg-muted/50">
      <div className="container flex flex-col items-center justify-between gap-4 py-8 md:h-20 md:flex-row md:py-0 px-4 md:px-6">
        <div className="flex flex-col items-center gap-2 md:flex-row md:gap-2">
          <p className="text-center text-xs text-muted-foreground md:text-left">
            &copy; {new Date().getFullYear()} ProctorChecker. All rights reserved.
          </p>
        </div>
        <div className="flex space-x-3">
          <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
