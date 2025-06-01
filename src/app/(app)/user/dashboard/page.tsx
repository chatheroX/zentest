
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Link as LinkIconLucide, PlusCircle, Trash2, ExternalLink, PlayCircle, ShieldCheck, Info, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function UserDashboardPage() {
  const { user, updateUserLinks, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [currentLinkInput, setCurrentLinkInput] = useState('');
  const [userLinks, setUserLinks] = useState<string[]>([]);
  const [isSavingLinks, setIsSavingLinks] = useState(false);
  const [isLaunchingSEB, setIsLaunchingSEB] = useState(false);


  useEffect(() => {
    if (user?.saved_links) {
      setUserLinks(user.saved_links);
    }
  }, [user?.saved_links]);

  const handleAddLink = () => {
    if (currentLinkInput.trim()) {
      try {
        new URL(currentLinkInput.trim()); // Validate URL
        if (userLinks.length >= 10) {
          toast({ title: "Limit Reached", description: "You can save a maximum of 10 links.", variant: "default" });
          return;
        }
        setUserLinks(prev => [...prev, currentLinkInput.trim()]);
        setCurrentLinkInput('');
      } catch (_) {
        toast({ title: "Invalid Link", description: "Please enter a valid URL.", variant: "destructive" });
      }
    }
  };

  const handleRemoveLink = (indexToRemove: number) => {
    setUserLinks(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSaveChanges = async () => {
    if (!user?.id) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }
    setIsSavingLinks(true);
    const result = await updateUserLinks(user.id, userLinks);
    if (result.success) {
      toast({ title: "Success", description: "Your links have been saved." });
    } else {
      toast({ title: "Error", description: result.error || "Failed to save links.", variant: "destructive" });
    }
    setIsSavingLinks(false);
  };
  
  const handleRunSEB = async () => {
    if (!user || !user.id) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }
    setIsLaunchingSEB(true);
    try {
      // Generate a simple token carrying user ID.
      // In a real scenario, this token might include more context for the SEB session.
      const tokenResponse = await fetch('/api/generate-seb-token', { // This API will need to be simplified
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }), // Simplified payload
      });

      if (!tokenResponse.ok) {
        const errorBody = await tokenResponse.json().catch(() => ({ error: `API Error: ${tokenResponse.status}` }));
        throw new Error(errorBody.error || `Failed to get SEB token: ${tokenResponse.statusText}`);
      }
      const { token: sebEntryTokenValue } = await tokenResponse.json();
      if (!sebEntryTokenValue) throw new Error("SEB token generation failed.");

      const appDomain = window.location.origin;
      const sebEntryPageUrl = `${appDomain}/seb/entry?token=${sebEntryTokenValue}`; // Using query param for simplicity
      const domainAndPathForSeb = sebEntryPageUrl.replace(/^https?:\/\//, '');
      const sebLaunchUrl = `sebs://${domainAndPathForSeb}`;
      
      toast({ title: "Launching SEB", description: "Safe Exam Browser should start. Ensure SEB is installed.", duration: 8000 });
      window.location.href = sebLaunchUrl;

      // Fallback if SEB doesn't launch
      setTimeout(() => {
        if (window.location.pathname.includes('user/dashboard')) { // Check if still on the same page
          setIsLaunchingSEB(false);
          toast({ title: "SEB Launch Issue?", description: "If SEB did not open, check pop-up blockers and SEB installation.", variant: "destructive", duration: 10000 });
        }
      }, 7000);

    } catch (e: any) {
      toast({ title: "SEB Launch Error", description: e.message || "Could not initiate SEB session.", variant: "destructive" });
      setIsLaunchingSEB(false);
    }
  };


  if (authLoading || !user) {
    return (
      <div className="flex justify-center items-center h-full py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading user dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-left">
        <h1 className="text-3xl font-bold text-foreground">Welcome, {user.username}!</h1>
        <p className="mt-1 text-md text-muted-foreground">Manage your saved links and check system compatibility.</p>
      </div>

      <Card className="ui-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><LinkIconLucide className="h-5 w-5 text-primary" /> Manage Your Saved Links</CardTitle>
          <CardDescription>Add or remove links that you want to access during SEB compatibility checks. (Max 10 links)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-grow space-y-1">
              <Label htmlFor="linkInput">Enter Link URL</Label>
              <Input
                id="linkInput"
                type="url"
                value={currentLinkInput}
                onChange={(e) => setCurrentLinkInput(e.target.value)}
                placeholder="https://example.com/resource"
                className="ui-input"
                disabled={isSavingLinks}
              />
            </div>
            <Button type="button" variant="outline" size="icon" onClick={handleAddLink} className="h-10 w-10 border-primary text-primary hover:bg-primary/10" title="Add Link" disabled={isSavingLinks || userLinks.length >= 10}>
              <PlusCircle className="h-5 w-5" />
            </Button>
          </div>
          {userLinks.length > 0 && (
            <div className="space-y-2 pt-3 border-t mt-3 max-h-60 overflow-y-auto scrollbar-thin">
              <p className="text-sm font-medium text-muted-foreground">Your saved links:</p>
              {userLinks.map((link, index) => (
                <div key={index} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                  <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-grow" title={link}>
                    {link.length > 60 ? `${link.substring(0, 57)}...` : link}
                  </a>
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveLink(index)} className="h-7 w-7 text-destructive hover:bg-destructive/10" title="Remove Link" disabled={isSavingLinks}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {userLinks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-3">No links saved yet.</p>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveChanges} className="ml-auto btn-primary" disabled={isSavingLinks || authLoading}>
            {isSavingLinks ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
            {isSavingLinks ? 'Saving...' : 'Save Link Changes'}
          </Button>
        </CardFooter>
      </Card>

      <Card className="ui-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> System Compatibility Check</CardTitle>
          <CardDescription>Launch Safe Exam Browser (SEB) to check your system&apos;s compatibility and access your saved links.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="default" className="bg-primary/5 border-primary/20 text-primary/90">
            <Info className="h-5 w-5 text-primary" />
            <AlertTitle className="font-semibold">SEB Required</AlertTitle>
            <AlertDescription>
              This will attempt to launch Safe Exam Browser. Ensure SEB is installed on your system.
              <a href="https://safeexambrowser.org/download_en.html" target="_blank" rel="noopener noreferrer" className="font-medium underline ml-1 hover:text-primary/70">
                Download SEB <ExternalLink className="inline h-3 w-3"/>
              </a>
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button onClick={handleRunSEB} className="w-full sm:w-auto btn-gradient text-base py-3" disabled={isLaunchingSEB || authLoading}>
            {isLaunchingSEB ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <PlayCircle className="mr-2 h-5 w-5" />}
            {isLaunchingSEB ? 'Launching SEB...' : 'Run SEB Compatibility Check'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
