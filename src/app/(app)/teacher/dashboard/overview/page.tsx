
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpenCheck, Brain, ArrowRight, PlusCircle, Info, Users, Activity, FileCheck2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Stats card component
const StatCard = ({ title, value, icon, description }: { title: string, value: string, icon: React.ReactNode, description: string }) => (
  <Card className="modern-card">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);


export default function TeacherOverviewPage() {
  const { user } = useAuth(); 

  return (
    // TODO: Add Framer Motion page wrapper for entrance animation
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
            <h1 className="text-2xl font-semibold text-foreground">
                Welcome, {user?.name || 'Teacher'}!
            </h1>
            <p className="text-sm text-muted-foreground">
                Here's an overview of your proctoring activities.
            </p>
        </div>
        <Button asChild size="default" className="btn-primary-solid w-full sm:w-auto text-sm py-2">
            <Link href="/teacher/dashboard/exams/create">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Exam
            </Link>
        </Button>
      </div>
      
      {/* Stats Cards Section - Placeholder Data */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Exams" value="0" icon={<Activity className="h-4 w-4 text-muted-foreground" />} description="Exams currently ongoing" />
        <StatCard title="Total Students" value="0" icon={<Users className="h-4 w-4 text-muted-foreground" />} description="Across all published exams" />
        <StatCard title="Exams Completed" value="0" icon={<FileCheck2 className="h-4 w-4 text-muted-foreground" />} description="Total exams concluded" />
        <StatCard title="Pending Gradings" value="0" icon={<Brain className="h-4 w-4 text-muted-foreground" />} description="Submissions awaiting review" />
      </div>
      
      <Alert className="modern-card border-primary/20 bg-blue-50 dark:bg-blue-500/10">
        <Info className="h-5 w-5 text-primary" />
        <AlertTitle className="font-semibold text-primary/90">Dashboard Overview</AlertTitle>
        <AlertDescription className="text-primary/80">
          The statistics above are placeholders. Real-time data for active exams, student counts, and pending gradings will be displayed here once backend data fetching for submissions and enrollments is implemented.
        </AlertDescription>
      </Alert>
      

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="modern-card hover:border-primary/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2.5 text-lg font-semibold text-foreground">
              <BookOpenCheck className="h-5 w-5 text-primary" />
              Manage Exams
            </CardTitle>
            <CardDescription className="pt-1 text-xs text-muted-foreground">Create, update, and monitor your exams. Share unique codes with students.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="btn-primary-solid w-full text-sm py-2 rounded-md" size="sm">
              <Link href="/teacher/dashboard/exams">
                Go to Exams <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="modern-card hover:border-primary/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2.5 text-lg font-semibold text-foreground">
              <Brain className="h-5 w-5 text-primary" />
              AI Question Assistant
            </CardTitle>
            <CardDescription className="pt-1 text-xs text-muted-foreground">Generate diverse exam questions based on topics and difficulty.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full text-sm py-2 rounded-md border-border hover:bg-accent/10" variant="outline" size="sm">
              <Link href="/teacher/dashboard/ai-assistant">
                Use AI Assistant <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
