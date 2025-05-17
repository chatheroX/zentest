
'use client';

import { UserProfileForm } from '@/components/shared/user-profile-form';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';
import type { CustomUser } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


export default function TeacherProfilePage() {
  const { user, isLoading: authLoading, updateUserProfile } = useAuth();
  const { toast } = useToast();

  const handleSaveProfile = async (data: { name: string; password?: string; avatar_url?: string }) => {
     if (!user) {
      toast({ title: "Error", description: "You must be logged in to update your profile.", variant: "destructive" });
      return;
    }
    const result = await updateUserProfile({
        name: data.name,
        password: data.password,
        avatar_url: data.avatar_url,
    });

    if (result.success) {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } else {
      toast({
        title: "Update Failed",
        description: result.error || "Could not update your profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (authLoading && !user) { // Show loader if auth is loading and user isn't available yet
    return (
      <div className="flex justify-center items-center h-full py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!user) { // If auth is done loading, and still no user
     return (
        <div className="flex h-full items-center justify-center p-4">
            <Card className="p-6 modern-card text-center shadow-xl">
              <CardHeader>
                <AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-3"/>
                <CardTitle className="text-xl">Profile Not Available</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">User data not found. Please try logging in again.</p>
              </CardContent>
            </Card>
        </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
      <UserProfileForm
        user={user} 
        onSave={handleSaveProfile}
      />
    </div>
  );
}
