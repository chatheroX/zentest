
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Lock, Save, Loader2, Hash, Briefcase, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { CustomUser } from '@/types/supabase';
import { DICEBEAR_STYLES, DICEBEAR_TECH_KEYWORDS, generateEnhancedDiceBearAvatar } from '@/contexts/AuthContext';

interface UserProfileFormProps {
  user: CustomUser;
  onSave: (data: { name: string; password?: string; avatar_url?: string }) => Promise<void>;
}

export function UserProfileForm({ user: propUser, onSave }: UserProfileFormProps) {
  const [name, setName] = useState(propUser.name || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(propUser.avatar_url || '');
  const [newAvatarPreviewUrl, setNewAvatarPreviewUrl] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setName(propUser.name || '');
    setCurrentAvatarUrl(propUser.avatar_url || ''); // Ensure this updates if propUser.avatar_url changes from AuthContext
    setNewAvatarPreviewUrl(null); 
  }, [propUser]);

  const handleGenerateNewAvatar = useCallback(() => {
    if (!propUser?.user_id || !propUser?.role) {
      toast({ title: "Error", description: "User details missing for avatar generation.", variant: "destructive" });
      return;
    }
    // Randomly select a style from the imported DICEBEAR_STYLES
    const randomStyle = DICEBEAR_STYLES[Math.floor(Math.random() * DICEBEAR_STYLES.length)];
    const newUrl = generateEnhancedDiceBearAvatar(propUser.role, propUser.user_id, randomStyle, DICEBEAR_TECH_KEYWORDS);
    setNewAvatarPreviewUrl(newUrl);
    toast({ description: "New avatar preview generated. Click 'Save Changes' to apply."});
  }, [propUser?.user_id, propUser?.role, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password.length < 6) {
      toast({ title: "Error", description: "New password must be at least 6 characters long.", variant: "destructive" });
      return;
    }
    if (password && password !== confirmPassword) {
      toast({ title: "Error", description: "New passwords do not match.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const avatarToSave = newAvatarPreviewUrl || currentAvatarUrl;

      await onSave({
        name: name.trim() || propUser.name || "User",
        password: password || undefined,
        avatar_url: avatarToSave || undefined,
      });
      
      if (newAvatarPreviewUrl) {
        setCurrentAvatarUrl(newAvatarPreviewUrl); // Make the previewed avatar the current one visually
        setNewAvatarPreviewUrl(null); // Clear the preview
      }
      setPassword('');
      setConfirmPassword('');
      // No toast here, onSave in parent page should show it
    } catch (error: any) {
      toast({ title: "Error Saving Profile", description: error.message || "Failed to update profile. Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const displayAvatarUrl = newAvatarPreviewUrl || currentAvatarUrl;

  return (
    <Card className="w-full max-w-2xl mx-auto modern-card shadow-xl border-border/30">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-foreground">Edit Your Profile</CardTitle>
          <CardDescription className="text-muted-foreground/90">Update your personal information and avatar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-2 pb-6">
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
            <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-primary/20 shadow-lg rounded-full bg-muted shrink-0">
              <AvatarImage src={displayAvatarUrl || undefined} alt={name || 'User'} className="rounded-full object-cover" />
              <AvatarFallback className="text-3xl text-muted-foreground font-semibold rounded-full bg-slate-200 dark:bg-slate-700">
                {(name || propUser.email || 'U').substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex flex-col items-center sm:items-start mt-2 sm:mt-0">
                <Button id="refreshAvatar" type="button" variant="outline" onClick={handleGenerateNewAvatar} title="Generate New Avatar Preview" className="border-border/50 hover:bg-primary/10 hover:border-primary/50 text-sm py-2 px-4 rounded-md shadow-sm">
                    <RefreshCw className="mr-2 h-4 w-4 text-primary" />
                    Refresh Avatar
                </Button>
                 <p className="text-xs text-muted-foreground/80 text-center sm:text-left mt-2 max-w-xs">Click to generate a new random avatar. Save changes to apply.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border/20">
            <div className="space-y-1.5">
              <Label htmlFor="user_id">Roll Number / User ID</Label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                <Input id="user_id" value={propUser.user_id || 'N/A'} readOnly className="pl-10 bg-muted/60 cursor-not-allowed border-border/40 text-sm modern-input" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address (Login)</Label>
               <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                <Input id="email" type="email" value={propUser.email || 'N/A'} readOnly className="pl-10 bg-muted/60 cursor-not-allowed border-border/40 text-sm modern-input" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                <Input id="fullName" value={name} onChange={(e) => setName(e.target.value)} required className="pl-10 border-border/50 focus:ring-primary/50 text-sm modern-input" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <div className="relative">
                <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                <Input id="role" value={propUser.role || 'N/A'} readOnly className="pl-10 capitalize bg-muted/60 cursor-not-allowed border-border/40 text-sm modern-input" />
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-6 border-t border-border/20">
            <Label className="font-medium text-foreground/90">Change Password (optional)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                <Input type="password" placeholder="New Password (min. 6)" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 border-border/50 focus:ring-primary/50 text-sm modern-input" />
              </div>
              <div className="relative">
                 <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                <Input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 border-border/50 focus:ring-primary/50 text-sm modern-input" />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t border-border/20 p-6">
          <Button type="submit" className="ml-auto btn-primary-solid py-2.5 px-6 rounded-md text-sm" disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
            {isSaving ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
