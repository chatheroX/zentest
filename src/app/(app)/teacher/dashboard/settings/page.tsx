import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Palette, ShieldQuestion, UploadCloud } from "lucide-react";

export default function TeacherSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Platform Settings</CardTitle>
          <CardDescription>Manage your teaching preferences and platform settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Notification Preferences</h3>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="exam-submission-notifications" className="font-semibold">Exam Submission Alerts</Label>
                <p className="text-sm text-muted-foreground">Notify me when a student submits an exam.</p>
              </div>
              <Switch id="exam-submission-notifications" defaultChecked />
            </div>
             <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="new-student-join-notifications" className="font-semibold">New Student Registrations</Label>
                <p className="text-sm text-muted-foreground">Alert me when a new student registers for one of my courses (if applicable).</p>
              </div>
              <Switch id="new-student-join-notifications" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2"><UploadCloud className="h-5 w-5 text-primary" /> Default Upload Settings</h3>
            <div className="p-4 border rounded-lg">
                <Label htmlFor="default-csv-format" className="font-semibold">Default CSV Format for Questions</Label>
                <p className="text-sm text-muted-foreground mb-2">Define your preferred CSV column order (e.g., question,option1,option2,answer).</p>
                {/* Input for CSV format string - not implemented */}
                <Button variant="outline" disabled>Set CSV Format</Button>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /> Appearance</h3>
             <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="dark-mode-teacher" className="font-semibold">Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Toggle dashboard theme.</p>
              </div>
              <Switch id="dark-mode-teacher" disabled />
            </div>
          </div>

           <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2"><ShieldQuestion className="h-5 w-5 text-primary" /> Security & Data</h3>
            <div className="p-4 border rounded-lg space-y-3">
              <Button variant="outline">Change Password</Button>
              <Button variant="outline">Export My Data (Not Implemented)</Button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button disabled>Save All Settings (Not Implemented)</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const metadata = {
  title: 'Settings | Teacher Dashboard | ProctorPrep',
};
