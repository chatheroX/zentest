import { Suspense } from 'react';
import { AppHeader } from '@/components/shared/header';
import { AppFooter } from '@/components/shared/footer';
import { AuthForm } from '@/components/auth/auth-form';
import { Skeleton } from '@/components/ui/skeleton';

function AuthFormFallback() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] py-12">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-xl">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-6 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

export default function AuthenticationPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="flex-grow container px-4 md:px-6">
        <Suspense fallback={<AuthFormFallback />}>
          <AuthForm />
        </Suspense>
      </main>
      <AppFooter />
    </div>
  );
}

export const metadata = {
  title: 'Login or Register | ProctorPrep',
  description: 'Access your ProctorPrep account or create a new one.',
};
