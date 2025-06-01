
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Lock, Save, Loader2, Hash, Briefcase, RefreshCw, LinkIcon, PlusCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { CustomUser } from '@/types/supabase';
import { DICEBEAR_STYLES, DICEBEAR_TECH_KEYWORDS, generateEnhancedDiceBearAvatar } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface UserProfileFormProps {
  user: CustomUser;
  onSave: (data: { name: string; password?: string; avatar_url?: string; saved_links?: string[] }) => Promise<void>;
  cardClassName?: string;
}

export function UserProfileForm({ user: propUser, onSave, cardClassName }: UserProfileFormProps) {
  const [name, setName] = useState(propUser.name || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(propUser.avatar_url || '');
  const [newAvatarPreviewUrl, setNewAvatarPreviewUrl] = useState<string | null>(null);

  const [userSavedLinks, setUserSavedLinks] = useState<string[]>(propUser.saved_links || []);
  const [currentLinkInput, setCurrentLinkInput] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setName(propUser.name || '');
    setCurrentAvatarUrl(propUser.avatar_url || '');
    setUserSavedLinks(propUser.saved_links || []);
    setNewAvatarPreviewUrl(null); 
  }, [propUser]);

  const handleGenerateNewAvatar = useCallback(() => {
    if (!propUser?.user_id || !propUser?.role) {
      toast({ title: "Error", description: "User details missing for avatar generation.", variant: "destructive" });
      return;
    }
    const randomStyle = DICEBEAR_STYLES[Math.floor(Math.random() * DICEBEAR_STYLES.length)];
    const newUrl = generateEnhancedDiceBearAvatar(propUser.role, propUser.user_id, randomStyle, DICEBEAR_TECH_KEYWORDS);
    setNewAvatarPreviewUrl(newUrl);
    toast({ description: "New avatar preview generated. Click 'Save Changes' to apply."});
  }, [propUser?.user_id, propUser?.role, toast]);

  const handleAddLink = () => {
    if (currentLinkInput.trim()) {
      try {
        new URL(currentLinkInput.trim()); // Validate URL
        if (userSavedLinks.length >= 10) { // Limit to 10 links for profile
            toast({ title: "Limit Reached", description: "You can add a maximum of 10 links to your profile.", variant: "default" });
            return;
        }
        setUserSavedLinks(prev => [...prev, currentLinkInput.trim()]);
        setCurrentLinkInput('');
      } catch (_) {
        toast({ title: "Invalid Link", description: "Please enter a valid URL (e.g., https://example.com).", variant: "destructive" });
      }
    }
  };

  const handleRemoveLink = (indexToRemove: number) => {
    setUserSavedLinks(prev => prev.filter((_, index) => index !== indexToRemove));
  };

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
        saved_links: userSavedLinks,
      });
      
      if (newAvatarPreviewUrl) {
        setCurrentAvatarUrl(newAvatarPreviewUrl); 
        setNewAvatarPreviewUrl(null); 
      }
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({ title: "Error Saving Profile", description: error.message || "Failed to update profile. Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const displayAvatarUrl = newAvatarPreviewUrl || currentAvatarUrl;

  return (
    <Card className={cn("w-full max-w-2xl mx-auto modern-card shadow-xl border-border/30", cardClassName)}>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-foreground">Edit Your Profile</CardTitle>
          <CardDescription className="text-muted-foreground/90">Update your personal information, avatar, and saved links.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-2 pb-6">
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
            <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-blue-500/60 shadow-lg rounded-full bg-slate-200 shrink-0">
              <AvatarImage src={displayAvatarUrl || undefined} alt={name || 'User'} className="rounded-full object-cover" />
              <AvatarFallback className="text-3xl text-slate-500 font-semibold rounded-full bg-slate-200">
                {(name || propUser.email || 'U').substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex flex-col items-center sm:items-start mt-2 sm:mt-0">
                <Button id="refreshAvatar" type="button" variant="outline" onClick={handleGenerateNewAvatar} title="Generate New Avatar Preview" 
                className="text-sm py-2 px-4 rounded-md shadow-sm border-slate-300 hover:bg-slate-100 text-slate-700">
                    <RefreshCw className="mr-2 h-4 w-4 text-blue-600" />
                    Refresh Avatar
                </Button>
                 <p className="text-xs text-slate-500 text-center sm:text-left mt-2 max-w-xs">Click to generate a new random avatar. Save changes to apply.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-200/70">
            <div className="space-y-1.5">
              <Label htmlFor="user_id" className="text-slate-600">Roll Number / User ID</Label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input id="user_id" value={propUser.user_id || 'N/A'} readOnly className="pl-10 bg-slate-100/80 cursor-not-allowed border-slate-300/70 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-600">Email Address (Login)</Label>
               <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input id="email" type="email" value={propUser.email || 'N/A'} readOnly className="pl-10 bg-slate-100/80 cursor-not-allowed border-slate-300/70 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-slate-600">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input id="fullName" value={name} onChange={(e) => setName(e.target.value)} required className="pl-10 border-slate-300/80 focus:ring-blue-500 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-slate-600">Role</Label>
              <div className="relative">
                <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input id="role" value={propUser.role || 'N/A'} readOnly className="pl-10 capitalize bg-slate-100/80 cursor-not-allowed border-slate-300/70 text-sm" />
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-6 border-t border-slate-200/70">
            <Label className="font-medium text-slate-700">Change Password (optional)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input type="password" placeholder="New Password (min. 6)" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 border-slate-300/80 focus:ring-blue-500 text-sm" />
              </div>
              <div className="relative">
                 <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 border-slate-300/80 focus:ring-blue-500 text-sm" />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-slate-200/70">
            <Label className="font-medium text-slate-700 flex items-center gap-1.5">
              <LinkIcon className="h-4 w-4 text-blue-600"/> My Saved Links (Max 10)
            </Label>
            <div className="flex gap-2">
                <Input
                    type="url"
                    value={currentLinkInput}
                    onChange={(e) => setCurrentLinkInput(e.target.value)}
                    placeholder="https://example.com/resource"
                    className="border-slate-300/80 focus:ring-blue-500 text-sm"
                />
                <Button type="button" variant="outline" size="icon" onClick={handleAddLink} className="border-slate-300 hover:bg-blue-500/10 hover:border-blue-500" title="Add Link">
                    <PlusCircle className="h-5 w-5 text-blue-500"/>
                </Button>
            </div>
            {userSavedLinks.length > 0 && (
            <div className="space-y-2 pt-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300">
                {userSavedLinks.map((link, index) => (
                    <div key={index} className="flex items-center justify-between text-xs p-1.5 bg-slate-100 rounded text-slate-600">
                        <a href={link} target="_blank" rel="noopener noreferrer" className="truncate hover:underline" title={link}>
                        {link.length > 50 ? `${link.substring(0,47)}...` : link}
                        </a>
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveLink(index)} className="h-6 w-6 text-red-500 hover:bg-red-100/50" title="Remove Link">
                            <XCircle className="h-4 w-4"/>
                        </Button>
                    </div>
                ))}
            </div>
            )}
          </div>

        </CardContent>
        <CardFooter className="border-t border-slate-200/70 p-6">
          <Button type="submit" className="ml-auto bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-6 rounded-md text-sm shadow-md hover:shadow-lg" disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
            {isSaving ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
