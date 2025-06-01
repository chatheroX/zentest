
import type {Metadata} from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext'; // AuthProvider will be updated

const geistSans = GeistSans;

export const metadata: Metadata = {
  title: 'ProctorChecker - System Compatibility', // New Title
  description: 'A tool to check system compatibility for proctored environments and manage reference links securely.', // New Description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} font-sans antialiased flex flex-col min-h-screen bg-background text-foreground`}>
        <AuthProvider> {/* AuthProvider will be heavily modified */}
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
