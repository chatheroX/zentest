
import type { Metadata } from 'next';
import { AppHeader } from '@/components/shared/header';
import { AppFooter } from '@/components/shared/footer';

export const metadata: Metadata = {
  title: 'ZenTest IDE | Secure Coding Environment',
  description: 'A web-based Integrated Development Environment for coding exams using StackBlitz WebContainers.',
};

export default function WebIdeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark flex flex-col min-h-screen bg-slate-900 text-slate-200">
      <AppHeader />
      {/* The main content area for the IDE should be flex-grow and allow children to define height */}
      <main className="flex-grow flex flex-col container mx-auto px-0 sm:px-4 py-4 sm:py-8">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
