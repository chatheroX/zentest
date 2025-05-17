import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, Palette, ShieldQuestion } from "lucide-react";

export default function StudentSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>Manage your account preferences and settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Notifications</h3>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="email-notifications" className="font-semibold">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive email updates about exam schedules and results.</p>
              </div>
              <Switch id="email-notifications" defaultChecked />
            </div>
             <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="push-notifications" className="font-semibold">Push Notifications (App)</Label>
                <p className="text-sm text-muted-foreground">Get real-time alerts on your device (if app is available).</p>
              </div>
              <Switch id="push-notifications" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /> Appearance</h3>
             <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="dark-mode" className="font-semibold">Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Toggle between light and dark themes for the dashboard.</p>
              </div>
              {/* Actual dark mode toggle would require theme context provider */}
              <Switch id="dark-mode" disabled/> 
            </div>
          </div>

           <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2"><ShieldQuestion className="h-5 w-5 text-primary" /> Security & Privacy</h3>
            <div className="p-4 border rounded-lg space-y-3">
              <Button variant="outline">Change Password</Button>
              <Button variant="outline">View Privacy Policy</Button>
              <Button variant="destructive" disabled>Delete Account (Not Implemented)</Button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button disabled>Save Settings (Not Implemented)</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const metadata = {
  title: 'Settings | Student Dashboard | ProctorPrep',
};
