
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Lock, Save, Loader2, Hash, Briefcase, RefreshCw, LinkIcon, PlusCircle, Trash2, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AuthenticatedUser } from '@/types/supabase';
import { DICEBEAR_STYLES, DICEBEAR_TECH_KEYWORDS, generateEnhancedDiceBearAvatar } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserProfileFormProps {
  user: AuthenticatedUser;
  onSave: (data: { name?: string; password?: string; avatar_url?: string; saved_links?: string[] }) => Promise<void>;
  cardClassName?: string;
}

export function UserProfileForm({ user: propUser, onSave, cardClassName }: UserProfileFormProps) {
  const [name, setName] = useState(propUser.username || ''); // Users use username as their display name primarily
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(propUser.avatar_url || '');
  const [newAvatarPreviewUrl, setNewAvatarPreviewUrl] = useState<string | null>(null);
  const [selectedAvatarStyle, setSelectedAvatarStyle] = useState<string>(propUser.role === 'admin' ? 'shapes' : DICEBEAR_STYLES[0]);


  const [userSavedLinks, setUserSavedLinks] = useState<string[]>(propUser.saved_links || []);
  const [currentLinkInput, setCurrentLinkInput] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setName(propUser.username || '');
    setCurrentAvatarUrl(propUser.avatar_url || '');
    setUserSavedLinks(propUser.saved_links || []);
    setNewAvatarPreviewUrl(null); 
    setSelectedAvatarStyle(propUser.role === 'admin' ? 'shapes' : DICEBEAR_STYLES[0]);
  }, [propUser]);

  const handleGenerateNewAvatar = useCallback(() => {
    if (!propUser?.id || !propUser?.role) {
      toast({ title: "Error", description: "User details missing for avatar generation.", variant: "destructive" });
      return;
    }
    const newUrl = generateEnhancedDiceBearAvatar(propUser.role, propUser.id, selectedAvatarStyle, DICEBEAR_TECH_KEYWORDS);
    setNewAvatarPreviewUrl(newUrl);
    toast({ description: "New avatar preview generated. Save changes to apply."});
  }, [propUser?.id, propUser?.role, toast, selectedAvatarStyle]);

  const handleAddLink = () => {
    if (currentLinkInput.trim()) {
      try {
        new URL(currentLinkInput.trim()); 
        if (userSavedLinks.length >= 10) {
            toast({ title: "Limit Reached", description: "You can add a maximum of 10 links to your profile.", variant: "default" });
            return;
        }
        setUserSavedLinks(prev => Array.from(new Set([...prev, currentLinkInput.trim()])));
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
        name: name.trim() || propUser.username, // For users, 'name' is their username
        password: password || undefined,
        avatar_url: avatarToSave || undefined,
        saved_links: propUser.role === 'user' ? userSavedLinks : undefined, // Only save links for users
      });
      
      if (newAvatarPreviewUrl) {
        setCurrentAvatarUrl(newAvatarPreviewUrl); 
        setNewAvatarPreviewUrl(null); 
      }
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({ title: "Error Saving Profile", description: error.message || "Failed to update profile.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const displayAvatarUrl = newAvatarPreviewUrl || currentAvatarUrl;

  return (
    <Card className={cn("w-full max-w-2xl mx-auto ui-card", cardClassName)}>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-foreground">Edit Your Profile</CardTitle>
          <CardDescription className="text-muted-foreground/90">Update your personal information and preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-2 pb-6">
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
            <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-primary/40 shadow-lg rounded-full bg-muted shrink-0">
              <AvatarImage src={displayAvatarUrl || undefined} alt={name || 'User'} className="rounded-full object-cover" />
              <AvatarFallback className="text-3xl text-muted-foreground font-semibold rounded-full bg-muted/80">
                {(name || propUser.username || 'U').substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex flex-col items-center sm:items-start mt-2 sm:mt-0 space-y-3 w-full sm:w-auto">
                 <div className="grid grid-cols-2 gap-2 w-full">
                    <Select value={selectedAvatarStyle} onValueChange={setSelectedAvatarStyle} disabled={propUser.role === 'admin'}>
                        <SelectTrigger className="ui-input text-xs" disabled={propUser.role === 'admin'}>
                           <Palette className="h-3.5 w-3.5 mr-1 text-primary/80"/> <SelectValue placeholder="Avatar Style" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 bg-popover border-border shadow-lg">
                            {DICEBEAR_STYLES.map(style => (
                                <SelectItem key={style} value={style} className="text-xs">{style.charAt(0).toUpperCase() + style.slice(1)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button id="refreshAvatar" type="button" variant="outline" onClick={handleGenerateNewAvatar} title="Generate New Avatar Preview" 
                    className="text-xs py-2 px-3 rounded-md shadow-sm btn-outline-primary h-10">
                        <RefreshCw className="mr-1.5 h-4 w-4" />
                        Refresh
                    </Button>
                </div>
                 <p className="text-xs text-muted-foreground text-center sm:text-left max-w-xs">Select a style and click refresh. Save changes to apply.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border/20">
            <div className="space-y-1.5">
              <Label htmlFor="user_id" className="text-muted-foreground">User ID</Label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
                <Input id="user_id" value={propUser.id || 'N/A'} readOnly className="pl-10 bg-muted/50 cursor-not-allowed ui-input text-sm" />
              </div>
            </div>
             <div className="space-y-1.5">
              <Label htmlFor="username" className="text-muted-foreground">Username (Login)</Label>
               <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
                <Input id="username" type="text" value={propUser.username || 'N/A'} readOnly className="pl-10 bg-muted/50 cursor-not-allowed ui-input text-sm" />
              </div>
            </div>
             <div className="space-y-1.5">
              <Label htmlFor="displayName" className="text-muted-foreground">Display Name</Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
                <Input id="displayName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your display name" required className="pl-10 ui-input text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-muted-foreground">Role</Label>
              <div className="relative">
                <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
                <Input id="role" value={propUser.role || 'N/A'} readOnly className="pl-10 capitalize bg-muted/50 cursor-not-allowed ui-input text-sm" />
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-6 border-t border-border/20">
            <Label className="font-medium text-foreground">Change Password (optional)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
                <Input type="password" placeholder="New Password (min. 6)" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 ui-input text-sm" />
              </div>
              <div className="relative">
                 <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
                <Input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 ui-input text-sm" />
              </div>
            </div>
          </div>
          
          {propUser.role === 'user' && (
            <div className="space-y-4 pt-6 border-t border-border/20">
              <Label className="font-medium text-foreground flex items-center gap-1.5">
                <LinkIcon className="h-4 w-4 text-primary"/> My Saved Links (Max 10)
              </Label>
              <div className="flex gap-2">
                  <Input
                      type="url"
                      value={currentLinkInput}
                      onChange={(e) => setCurrentLinkInput(e.target.value)}
                      placeholder="https://example.com/resource"
                      className="ui-input text-sm"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={handleAddLink} className="btn-outline-primary h-10 w-10" title="Add Link">
                      <PlusCircle className="h-5 w-5"/>
                  </Button>
              </div>
              {userSavedLinks.length > 0 && (
              <div className="space-y-2 pt-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                  {userSavedLinks.map((link, index) => (
                      <div key={index} className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded-md">
                          <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-grow" title={link}>
                          {link.length > 50 ? `${link.substring(0,47)}...` : link}
                          </a>
                          <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveLink(index)} className="h-7 w-7 text-destructive hover:bg-destructive/10" title="Remove Link">
                              <Trash2 className="h-4 w-4"/>
                          </Button>
                      </div>
                  ))}
              </div>
              )}
            </div>
          )}


        </CardContent>
        <CardFooter className="border-t border-border/20 p-6">
          <Button type="submit" className="ml-auto btn-gradient py-2.5 px-6 rounded-md text-sm" disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
            {isSaving ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

    