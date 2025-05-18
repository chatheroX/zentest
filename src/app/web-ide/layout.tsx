
import type { Metadata } from 'next';
import { AppHeader } from '@/components/shared/header';
import { AppFooter } from '@/components/shared/footer';

export const metadata: Metadata = {
  title: 'Web IDE | ZenTest',
  description: 'A web-based Integrated Development Environment for coding exams.',
};

export default function WebIdeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
