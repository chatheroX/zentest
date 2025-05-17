
'use client'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Edit3, History, UserCircle, ArrowRight, ShieldAlert, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext"; 
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// Stats card component - can be shared or defined locally
const StatCard = ({ title, value, icon, description }: { title: string, value: string | number, icon: React.ReactNode, description?: string }) => (
  <Card className="modern-card">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </CardContent>
  </Card>
);


export default function StudentOverviewPage() {
  const { user } = useAuth(); 

  return (
    // TODO: Add Framer Motion wrapper for staggered item reveal
    <div className="space-y-6 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Welcome, {user?.name || 'Student'}!</h1>
        <p className="text-sm text-muted-foreground">
          Manage your exams, view your history, and keep your profile up to date.
        </p>
      </div>

       {/* Stats Cards Section - Placeholder Data for Student */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Exams Taken" value={0} icon={<History className="h-4 w-4 text-muted-foreground" />} description="Total exams completed" />
        <StatCard title="Average Score" value={"N/A"} icon={<UserCircle className="h-4 w-4 text-muted-foreground" />} description="Across all taken exams" />
        <StatCard title="Upcoming Exams" value={0} icon={<Edit3 className="h-4 w-4 text-muted-foreground" />} description="Exams you can join" />
      </div>
       <Alert className="modern-card border-primary/20 bg-blue-50 dark:bg-blue-500/10 mt-4">
        <Info className="h-5 w-5 text-primary" />
        <AlertTitle className="font-semibold text-primary/90">Student Dashboard</AlertTitle>
        <AlertDescription className="text-primary/80">
          The statistics above are placeholders. Your actual exam data will be displayed here once exam taking and submission functionalities are fully implemented.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-4">
        <Card className="modern-card hover:border-primary/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2.5 text-lg font-semibold text-foreground">
              <Edit3 className="h-5 w-5 text-primary" />
              Join an Exam
            </CardTitle>
            <CardDescription className="pt-1 text-xs text-muted-foreground">Ready for your next assessment? Enter an exam code to begin.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="btn-primary-solid w-full text-sm py-2 rounded-md" size="sm">
              <Link href="/student/dashboard/join-exam">
                Go to Join Exam <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="modern-card hover:border-primary/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2.5 text-lg font-semibold text-foreground">
              <History className="h-5 w-5 text-primary" />
              View Exam History
            </CardTitle>
            <CardDescription className="pt-1 text-xs text-muted-foreground">Review your past exam attempts and scores (Feature upcoming).</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full text-sm py-2 rounded-md border-border hover:bg-accent/10" variant="outline" size="sm">
              <Link href="/student/dashboard/exam-history">
                Check History <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="modern-card hover:border-primary/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2.5 text-lg font-semibold text-foreground">
              <UserCircle className="h-5 w-5 text-primary" />
              Update Profile
            </CardTitle>
            <CardDescription className="pt-1 text-xs text-muted-foreground">Keep your personal information current.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full text-sm py-2 rounded-md border-border hover:bg-accent/10" variant="outline" size="sm">
              <Link href="/student/dashboard/profile">
                Edit Profile <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="modern-card border-border">
        <CardHeader>
            <CardTitle className="flex items-center text-lg font-semibold text-foreground">
                <ShieldAlert className="h-5 w-5 text-primary mr-2" />
                Important Notice
            </CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
                All exams must be taken using the <strong>Safe Exam Browser (SEB)</strong> or as instructed by your teacher. Ensure you have any required software installed and configured correctly before attempting to join an exam.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
