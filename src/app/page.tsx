
import React from 'react';
import { AppHeader } from '@/components/shared/header'; 
import { AppFooter } from '@/components/shared/footer'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, UserPlus, ShieldCheck, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-gradient-to-b from-background via-muted/50 to-background">
          <div className="container px-4 md:px-6">
            <div className="grid gap-8 md:grid-cols-1 md:items-center text-center justify-items-center">
              <div className="space-y-6 max-w-2xl mx-auto">
                 <ShieldCheck className="h-24 w-24 text-primary mx-auto stroke-[1.2]" />
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-foreground">
                  ProctorChecker: System Compatibility
                </h1>
                <p className="text-lg text-muted-foreground md:text-xl max-w-xl mx-auto">
                  Ensure your system is ready for proctored environments. Securely manage reference links for SEB sessions.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center items-center pt-4">
                  <Button size="lg" className="btn-gradient w-full sm:w-auto text-base py-3 px-8 rounded-lg" asChild>
                    <Link href="/auth?action=login">
                      <LogIn className="mr-2 h-5 w-5" /> User Login
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-base py-3 px-8 rounded-lg btn-outline-primary border-2 hover:bg-primary/10" asChild>
                    <Link href="/auth?action=register">
                      <UserPlus className="mr-2 h-5 w-5" /> Register Key
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Minimal Features Section */}
        <section id="features" className="py-16 md:py-24 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">Core Features</h2>
              <p className="mt-3 text-lg text-muted-foreground max-w-lg mx-auto">
                Streamlined for security and ease of use.
              </p>
            </div>
            <div className="grid gap-6 md:gap-8 sm:grid-cols-1 lg:grid-cols-2 max-w-3xl mx-auto">
              <Card className="ui-card p-4 text-center transition-all hover:scale-[1.02] hover:shadow-2xl">
                <CardHeader className="items-center pt-6 pb-3">
                   <ShieldCheck className="h-14 w-14 text-accent mb-4 stroke-[1.5]" />
                  <CardTitle className="mt-2 text-xl font-semibold text-card-foreground">System Compatibility Check</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm pb-6">
                  <p>Verify your system configuration for secure proctored environments using SEB.</p>
                </CardContent>
              </Card>
              <Card className="ui-card p-4 text-center transition-all hover:scale-[1.02] hover:shadow-2xl">
                <CardHeader className="items-center pt-6 pb-3">
                   <LinkIcon className="h-14 w-14 text-accent mb-4 stroke-[1.5]" />
                  <CardTitle className="mt-2 text-xl font-semibold text-card-foreground">Secure Link Management</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm pb-6">
                  <p>Save and access your approved reference links securely within the SEB environment.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

      </main>
      <AppFooter />
    </div>
  );
}

    