
import React from 'react';
import { AppHeader } from '@/components/shared/header';
import { AppFooter } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CircleCheckBig, BookOpenText, Users, Cpu, ArrowRight, ShieldCheck, BarChart3, Brain, Code } from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    icon: <ShieldCheck className="h-10 w-10 text-primary mb-3 stroke-width-1.5" />,
    title: 'Secure Exam Environment',
    description: 'Tight integration with Safe Exam Browser (SEB) for cheat-proof online exams.',
  },
  {
    icon: <BookOpenText className="h-10 w-10 text-primary mb-3 stroke-width-1.5" />,
    title: 'Flexible Exam Management',
    description: 'Full CRUD for exams, diverse question upload options, and customizable settings.',
  },
  {
    icon: <Users className="h-10 w-10 text-primary mb-3 stroke-width-1.5" />,
    title: 'Role-Based Dashboards',
    description: 'Dedicated, intuitive dashboards for both students and teachers.',
  },
  {
    icon: <Brain className="h-10 w-10 text-primary mb-3 stroke-width-1.5" />,
    title: 'AI-Powered Assistance',
    description: 'Built-in AI assistant to help teachers generate diverse exam questions effortlessly.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 md:py-28 bg-background">
          <div className="container px-4 md:px-6">
            <div className="grid gap-8 md:grid-cols-1 md:items-center text-center justify-items-center">
              <div className="space-y-6 max-w-3xl mx-auto">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-slate-800 dark:text-slate-100">
                  The Future of <span className="text-primary">Secure Online</span> Proctoring
                </h1>
                <p className="text-lg text-slate-600 md:text-xl max-w-2xl mx-auto dark:text-slate-300">
                  ZenTest offers a robust, modern platform for conducting secure online exams, trusted by educators and students alike.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center items-center">
                  <Button size="lg" className="btn-primary-solid shadow-sm hover:shadow-md transition-shadow duration-300" asChild>
                    <Link href="/auth?action=register&role=teacher">
                      Get Started as Teacher <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="shadow-sm hover:shadow-md transition-shadow duration-300 border-border hover:bg-accent/10 text-primary hover:text-primary dark:text-slate-100 dark:hover:text-primary" asChild>
                    <Link href="/auth?action=register&role=student">
                      Join as Student
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">Why Choose ZenTest?</h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
                Empowering education with cutting-edge proctoring technology.
              </p>
            </div>
            <div className="grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => (
                <Card key={index} className="modern-card p-4 text-center bg-card hover:border-primary/30">
                  <CardHeader className="items-center pt-4 pb-3">
                     {React.cloneElement(feature.icon, { className: "h-10 w-10 text-primary mb-3 stroke-width-1.5" })}
                    <CardTitle className="mt-2 text-lg font-semibold text-card-foreground">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground text-sm pb-4">
                    <p>{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-slate-800 dark:text-slate-100">
              Ready to Elevate Your Online Exams?
            </h2>
            <p className="mt-4 mb-8 text-lg text-slate-600 max-w-xl mx-auto dark:text-slate-300">
              Join ZenTest today and experience a seamless, secure, and intelligent proctoring solution.
            </p>
            <Button size="lg" className="btn-primary-solid shadow-md hover:shadow-lg transition-shadow duration-300 py-3 px-8 text-base" asChild>
              <Link href="/auth?action=register">
                Sign Up Now <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <AppFooter />
    </div>
  );
}
