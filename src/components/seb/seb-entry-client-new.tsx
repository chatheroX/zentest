
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image'; // Keep for potential logo
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, AlertTriangle, ShieldCheck, XCircle, LogOut, Link as LinkIconLucide, ExternalLink, Wifi, Info } from 'lucide-react';
import { useToast as useGlobalToast } from '@/hooks/use-toast';
import { isSebEnvironment, isOnline } from '@/lib/seb-utils';
import { useAuth } from '@/contexts/AuthContext'; // Only for supabase client, not user session here
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Helper for safe error message extraction
function getSafeErrorMessage(e: any, defaultMessage = "An unknown error occurred."): string {
  if (e && typeof e === 'object') {
    if (e.name === 'AbortError') return "The request timed out.";
    if (typeof e.message === 'string' && e.message.trim() !== '') return e.message;
    try {
      const strError = JSON.stringify(e);
      if (strError !== '{}' && strError.length > 2) return `Error object: ${strError}`;
    } catch (stringifyError) { /* Fall through */ }
  }
  if (e !== null && e !== undefined) {
    const stringifiedError = String(e);
    if (stringifiedError.trim() !== '' && stringifiedError !== '[object Object]') return stringifiedError;
  }
  return defaultMessage;
}

const TOKEN_VALIDATION_TIMEOUT_MS = 15000;

interface ValidatedData {
  userId: string;
  username: string;
  avatarUrl: string | null;
  profileSavedLinks: string[];
  sessionSpecificLinks: string[];
}

const compatibilityRules = [
  { text: "Ensure you are using Safe Exam Browser (SEB) for this check.", icon: ShieldCheck },
  { text: "A stable internet connection is required.", icon: Wifi },
  { text: "This environment allows you to test access to your saved links.", icon: LinkIconLucide },
  { text: "For actual exams, specific rules provided by your institution will apply.", icon: Info },
];


export function SebEntryClientNew() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { supabase, isLoading: authContextLoading } = useAuth(); // For DB access via service role key potentially
  const { toast: globalToast } = useGlobalToast();

  const [stage, setStage] = useState<string>('initializing'); // initializing, validatingToken, fetchingDetails, ready, error
  const [pageError, setPageError] = useState<string | null>(null);
  const [validatedData, setValidatedData] = useState<ValidatedData | null>(null);
  
  const isDevModeActive = process.env.NEXT_PUBLIC_DEV_MODE_SKIP_SEB_LAUNCH === "true";

  const handleExitSeb = useCallback(() => {
    globalToast({ title: "Exiting SEB", description: "Safe Exam Browser will attempt to close.", duration: 3000 });
    if (typeof window !== 'undefined') window.location.href = "seb://quit";
  }, [globalToast]);

  useEffect(() => {
    const effectId = `[SebEntryClientNew InitEffect ${Date.now().toString().slice(-5)}]`;
    console.log(`${effectId} Stage: ${stage}. DevMode: ${isDevModeActive}. Query:`, searchParams?.toString());

    async function validateAndFetch() {
      if (authContextLoading && stage === 'initializing') {
        console.log(`${effectId} AuthContext (for Supabase client) loading. Waiting.`);
        return;
      }
      
      if (stage === 'initializing' || (stage === 'validatingToken' && !validatedData)) {
        const tokenFromQuery = searchParams?.get('token');
        console.log(`${effectId} Token from query:`, tokenFromQuery ? tokenFromQuery.substring(0,10)+"..." : "No Token");

        if (!tokenFromQuery) {
          setPageError("CRITICAL: SEB entry token missing from URL."); setStage('error'); return;
        }
        if (!isDevModeActive && !isSebEnvironment()) {
          setPageError("This page must be accessed within Safe Exam Browser (production mode)."); setStage('error'); return;
        }
        
        if (stage !== 'validatingToken') setStage('validatingToken');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TOKEN_VALIDATION_TIMEOUT_MS);

        try {
          const res = await fetch(`/api/seb/validate-token?token=${encodeURIComponent(tokenFromQuery)}`, {
            method: 'GET', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          });
          clearTimeout(timeoutId);
          const responseBody = await res.json().catch(() => ({ error: "Failed to parse server response."}));
          
          if (!res.ok || responseBody.error) {
            throw new Error(responseBody.error || `Token validation failed with status: ${res.status}`);
          }
          
          setValidatedData({
            userId: responseBody.userId,
            username: responseBody.username,
            avatarUrl: responseBody.avatarUrl,
            profileSavedLinks: responseBody.profileSavedLinks || [],
            sessionSpecificLinks: responseBody.sessionSpecificLinks || [],
          });
          setStage('ready'); // No separate fetchingDetails stage needed if validate-token returns all
          console.log(`${effectId} Token validated. Data:`, responseBody);

        } catch (e: any) {
          const errorMsg = getSafeErrorMessage(e, "Error during token validation.");
          setPageError(`Token Validation Error: ${errorMsg}`); setStage('error');
        }
        return;
      }
    }

    if (stage === 'initializing' || stage === 'validatingToken') {
      validateAndFetch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, searchParams, isDevModeActive, supabase, authContextLoading]);


  if (stage === 'initializing' || stage === 'validatingToken') {
    let message = "Initializing Secure Environment...";
    if (stage === 'validatingToken') message = "Validating session token...";
    return (
      <div className="flex flex-col items-center justify-center text-center min-h-screen w-full bg-seb-entry p-2">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-6 stroke-width-1.5" />
        <h2 className="text-xl font-medium text-foreground mb-2">{message}</h2>
      </div>
    );
  }

  if (stage === 'error' || !validatedData && stage !== 'initializing' && stage !== 'validatingToken') {
    const displayError = pageError || "An unknown error occurred. Could not prepare the session.";
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center bg-seb-entry p-2">
        <Card className="w-full max-w-lg text-center glass-pane p-6 sm:p-8 rounded-xl">
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-5 stroke-width-1.5" />
          <h2 className="text-2xl font-semibold mb-3 text-destructive-foreground">Access Error</h2>
          <p className="text-sm mb-6 whitespace-pre-wrap text-muted-foreground">{displayError}</p>
          <Button onClick={handleExitSeb} className="w-full btn-gradient-destructive">Exit SEB</Button>
        </Card>
      </main>
    );
  }
  
  // Stage is 'ready' and validatedData is available
  const { username, avatarUrl, profileSavedLinks, sessionSpecificLinks } = validatedData;
  const allLinks = Array.from(new Set([...profileSavedLinks, ...sessionSpecificLinks]));


  return (
    <div className="min-h-screen w-full flex flex-col bg-seb-entry text-foreground">
      {/* Header */}
      <header className="h-20 px-4 sm:px-6 flex items-center justify-between border-b border-border/30 bg-card/80 backdrop-blur-sm shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-primary stroke-width-1.5" />
          <span className="text-xl font-semibold">ProctorChecker - SEB Mode</span>
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-primary/60">
            <AvatarImage src={avatarUrl || undefined} alt={username} />
            <AvatarFallback className="bg-muted text-muted-foreground">
                {(username || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-foreground">{username}</p>
            <p className="text-xs text-muted-foreground">User ID: {validatedData.userId.substring(0,8)}...</p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col py-6 px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24 overflow-y-auto">
        <Card className="w-full max-w-3xl mx-auto glass-pane p-6 sm:p-8">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl sm:text-3xl font-semibold text-foreground">System Compatibility Check</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              This environment simulates secure proctoring conditions. Use the links below to test accessibility.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-t border-border/30 pt-4">
                <h3 className="text-lg font-medium mb-3 text-foreground">General Guidelines:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground list-none pl-0">
                    {compatibilityRules.map((rule, index) => {
                    const RuleIcon = rule.icon;
                    return (
                        <li key={`rule-${index}`} className="flex items-start gap-2 p-2 bg-background/30 rounded-md border border-border/20"> 
                        <RuleIcon className="h-5 w-5 text-primary shrink-0 mt-0.5 stroke-width-1.5" />
                        <span>{rule.text}</span>
                        </li>
                    );
                    })}
                </ul>
            </div>

            {allLinks.length > 0 ? (
              <div className="border-t border-border/30 pt-4">
                <h3 className="text-lg font-medium mb-3 text-foreground">Your Saved Reference Links:</h3>
                <ScrollArea className="max-h-72 pr-2 scrollbar-thin">
                  <ul className="space-y-2">
                    {allLinks.map((link, index) => (
                      <li key={`link-${index}`} className="flex items-center justify-between gap-2 p-3 bg-background/30 rounded-md border border-border/20 hover:bg-accent/10 seb-link-card">
                        <LinkIconLucide className="h-5 w-5 text-primary shrink-0 stroke-width-1.5" />
                        <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-grow text-sm" title={link}>
                          {link}
                        </a>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-auto py-1.5 px-3 text-xs border-primary text-primary hover:bg-primary/10 hover:text-primary"
                          onClick={() => window.open(link, '_blank', 'noopener,noreferrer')}
                        >
                          Open <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No saved links found for your profile or this session.</p>
            )}
          </CardContent>
           <CardFooter className="pt-6 border-t border-border/30">
            <p className="text-xs text-muted-foreground text-center w-full">
              If you encounter any issues, please note them down and contact your administrator or IT support.
            </p>
          </CardFooter>
        </Card>
      </main>

      {/* Footer */}
      <footer className="h-16 px-4 sm:px-6 flex items-center justify-end border-t border-border/30 bg-card/80 backdrop-blur-sm shadow-sm shrink-0">
        <Button variant="outline" onClick={handleExitSeb} className="btn-outline border-destructive text-destructive hover:bg-destructive/10">
          <LogOut className="mr-2 h-4 w-4" /> Exit SEB
        </Button>
      </footer>
    </div>
  );
}
