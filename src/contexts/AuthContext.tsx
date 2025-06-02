
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
// import Cookies from 'js-cookie'; // Cookies are no longer used for session
import type { AuthenticatedUser, AdminTableType, UserTableType, LicenseKeyTableType } from '@/types/supabase';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';

// Helper to get a safe error message
function getSafeErrorMessage(e: any, fallbackMessage = "An unknown error occurred."): string {
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
    return fallbackMessage;
}

// --- Constants for Auth ---
// const SESSION_COOKIE_NAME = 'proctorchecker-session'; // No longer used
// const ROLE_COOKIE_NAME = 'proctorchecker-role'; // No longer used

const AUTH_ROUTE = '/auth';
const USER_DASHBOARD_ROUTE = '/user/dashboard';
const ADMIN_DASHBOARD_ROUTE = '/admin/dashboard';

// --- Supabase Configuration Error Handling ---
const SUPABASE_URL_CONFIG_ERROR_MSG = "CRITICAL: Supabase URL is missing, a placeholder, or invalid. Please set NEXT_PUBLIC_SUPABASE_URL in your .env file with your actual Supabase project URL.";
const SUPABASE_ANON_KEY_CONFIG_ERROR_MSG = "CRITICAL: Supabase Anon Key is missing, a placeholder, or invalid. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file with your actual Supabase anon key.";

function SupabaseConfigErrorDisplay({ errorMessage }: { errorMessage: string }) {
  const isUrlError = errorMessage.includes("NEXT_PUBLIC_SUPABASE_URL");
  const isKeyError = errorMessage.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const varName = isUrlError ? "NEXT_PUBLIC_SUPABASE_URL" : isKeyError ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : "Supabase environment variables";
  const exampleValue = isUrlError ? "https://your-project-ref.supabase.co" : "your-actual-anon-key";

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))', padding: '20px', fontFamily: 'sans-serif', textAlign: 'center', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: 'hsl(var(--card))', padding: '30px 40px', borderRadius: 'var(--radius)', boxShadow: '0px 10px 20px hsla(var(--foreground), 0.1), 0px 4px 8px hsla(var(--foreground), 0.05)', maxWidth: '600px', width: '100%', border: '1px solid hsl(var(--border))' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--destructive))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 20px auto' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'hsl(var(--destructive))', marginBottom: '15px' }}>Application Configuration Error</h1>
        <p style={{ fontSize: '1rem', color: 'hsl(var(--muted-foreground))', marginBottom: '10px' }}>The application cannot start correctly because a critical configuration for backend services is missing or invalid.</p>
        <p style={{ fontSize: '1rem', fontWeight: '600', color: 'hsl(var(--foreground))', marginBottom: '20px' }}><strong>Error Detail:</strong> {errorMessage}</p>
        <div style={{ backgroundColor: 'hsl(var(--muted))', padding: '15px', borderRadius: 'calc(var(--radius) - 2px)', textAlign: 'left', marginBottom: '25px', border: '1px solid hsl(var(--border))' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'hsl(var(--foreground))', marginBottom: '10px' }}>How to Fix:</h2>
          <p style={{ fontSize: '0.95rem', color: 'hsl(var(--muted-foreground))', marginBottom: '8px' }}>1. Locate or create a <strong><code>.env</code></strong> file in your project root.</p>
          <p style={{ fontSize: '0.95rem', color: 'hsl(var(--muted-foreground))', marginBottom: '8px' }}>2. Ensure the variable <strong><code>{varName}</code></strong> is correctly set (e.g., <code>{varName}=&quot;{exampleValue}&quot;</code>).</p>
          <p style={{ fontSize: '0.95rem', color: 'hsl(var(--muted-foreground))' }}>3. Save the <code>.env</code> file and restart your development server.</p>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Contact support if the issue persists after correction.</p>
      </div>
    </div>
  );
}

// --- Dicebear Avatar Generation ---
export const DICEBEAR_STYLES = [
  "adventurer", "adventurer-neutral", "avataaars", "big-ears", "big-smile",
  "bottts", "croodles", "fun-emoji", "icons", "identicon", "initials",
  "lorelei", "micah", "miniavs", "open-peeps", "personas", "pixel-art",
  "shapes", "thumbs"
];

export const DICEBEAR_TECH_KEYWORDS = [
  "circuit", "binary", "network", "data", "server", "cloud", "code",
  "algorithm", "matrix", "processor", "system", "interface", "digital"
];

export function generateEnhancedDiceBearAvatar(
  role: 'user' | 'admin',
  seed: string,
  style?: string,
  keywords?: string[]
): string {
  const selectedStyle = style || (role === 'admin' ? 'shapes' : DICEBEAR_STYLES[Math.floor(Math.random() * DICEBEAR_STYLES.length)]);
  const randomKeyword = keywords ? keywords[Math.floor(Math.random() * keywords.length)] : '';
  const finalSeed = `${seed}-${role}-${randomKeyword}`;

  const queryParams = new URLSearchParams({
    seed: finalSeed,
    backgroundColor: role === 'admin' ? "2c3e50,3498db" : "00acc1,80deea,f4511e,ff9800", 
    backgroundType: "gradientLinear",
    backgroundRotation: (Math.floor(Math.random() * 360)).toString(),
    shapeColor: "ffffff,f5f5f5", 
    size: "128",
    radius: "50", 
  });

  if (selectedStyle === "identicon") queryParams.set("colorLevel", "600");
  if (selectedStyle === "initials") queryParams.set("chars", "2");


  return `https://api.dicebear.com/8.x/${selectedStyle}/svg?${queryParams.toString()}`;
}


// --- Auth Context Definition ---
type AuthContextType = {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  authError: string | null;
  supabase: ReturnType<typeof createSupabaseBrowserClient> | null;
  signInUser: (username: string, pass: string) => Promise<{ success: boolean; error?: string; user?: AuthenticatedUser | null }>;
  signInAdmin: (username: string, pass: string) => Promise<{ success: boolean; error?: string; user?: AuthenticatedUser | null }>;
  registerUserWithLicense: (licenseKey: string, username: string, pass: string) => Promise<{ success: boolean; error?: string; user?: AuthenticatedUser | null }>;
  signOut: () => Promise<void>;
  updateUserLinks: (userId: string, links: string[]) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (profileData: Partial<Pick<AuthenticatedUser, 'username' | 'avatar_url'>> & { name?: string; password?: string; saved_links?: string[]}) => Promise<{ success: boolean; error?: string; user?: AuthenticatedUser | null }>;
  showSignOutDialog: boolean;
  setShowSignOutDialog: React.Dispatch<React.SetStateAction<boolean>>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [configError, setConfigError] = useState<string | null>(null);
  const [initialConfigCheckDone, setInitialConfigCheckDone] = useState(false);
  const [supabase, setSupabase] = useState<ReturnType<typeof createSupabaseBrowserClient> | null>(null);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const initialLoadAttempted = React.useRef(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const effectId = "[AuthContext SupabaseClientInitEffect]";
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    let currentConfigError: string | null = null;

    if (!supabaseUrl || supabaseUrl.includes('your_supabase_url') || supabaseUrl.trim() === '' || supabaseUrl === 'https://<YOUR_PROJECT_REF>.supabase.co' || supabaseUrl === 'YOUR_SUPABASE_URL_HERE') {
      currentConfigError = SUPABASE_URL_CONFIG_ERROR_MSG;
    } else if (!supabaseAnonKey || supabaseAnonKey.includes('your_supabase_anon_key') || supabaseAnonKey.trim() === '' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY_HERE' || supabaseAnonKey === 'your-anon-key') {
      currentConfigError = SUPABASE_ANON_KEY_CONFIG_ERROR_MSG;
    }
    
    if (currentConfigError) {
      console.error(`${effectId} ${currentConfigError}`);
      setConfigError(currentConfigError);
      setAuthError(currentConfigError); 
      setSupabase(null);
      setIsLoading(false);
    } else {
      try {
        if (!supabase) { 
          const client = createSupabaseBrowserClient();
          setSupabase(client);
          console.log(`${effectId} Supabase client initialized successfully.`);
        }
      } catch (e: any) {
        const errorMsg = getSafeErrorMessage(e, "Failed to initialize Supabase client during initial check.");
        console.error(`${effectId} ${errorMsg}`, e);
        setConfigError(errorMsg); setAuthError(errorMsg); setIsLoading(false);
      }
    }
    setInitialConfigCheckDone(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // loadUserFromCookie is no longer effective as cookies are not being set.
  // It's kept here to show the structure, but it will find no cookies.
  // For a non-cookie-based session, this would need a different persistence mechanism
  // or sessions would be entirely ephemeral (lost on refresh).
  const loadUserFromCookie = useCallback(async () => {
    if (!initialConfigCheckDone || configError || !supabase) {
        if (initialConfigCheckDone && !configError && !supabase && !authError) {
             setAuthError("Service connection not fully ready for session load.");
        }
        setIsLoading(false);
        return;
    }

    // const sessionCookie = Cookies.get(SESSION_COOKIE_NAME); // No longer used
    // const roleCookie = Cookies.get(ROLE_COOKIE_NAME) as 'user' | 'admin' | undefined; // No longer used

    // if (user && user.username === sessionCookie && user.role === roleCookie && !isLoading) return;

    setIsLoading(true); setAuthError(null);

    // Since cookies are not used, we assume no persistent session can be loaded this way.
    // If a different persistence (e.g., localStorage, but not recommended for sensitive data)
    // was used, that logic would go here.
    setUser(null); 
    // Cookies.remove(SESSION_COOKIE_NAME); // Ensure any old cookies are cleared (though we are not setting new ones)
    // Cookies.remove(ROLE_COOKIE_NAME);

    // The original logic to fetch from DB based on cookie is removed
    // as there are no cookies to base it on.
    // The app now starts with no user logged in on refresh.
    console.log(`[AuthContext] loadUserFromCookie: No session cookies used. Initializing with no user.`);
    
    setIsLoading(false);
    
  }, [supabase, user, isLoading, authError, initialConfigCheckDone, configError]);

  useEffect(() => {
    if (initialConfigCheckDone && !configError && supabase && !initialLoadAttempted.current) {
      initialLoadAttempted.current = true;
      // Calling loadUserFromCookie which will now simply initialize with no user.
      loadUserFromCookie(); 
    }
  }, [initialConfigCheckDone, configError, supabase, loadUserFromCookie]);

  useEffect(() => {
    // This effect handles redirection based on current user state.
    // Without cookies, middleware can't protect routes effectively on server-side or hard navigations.
    // Client-side navigation will still work based on the context's `user` state.
    if (isLoading || !initialConfigCheckDone || configError) return;

    const isAuthPg = pathname === AUTH_ROUTE;
    const isUserDashboard = pathname.startsWith(USER_DASHBOARD_ROUTE);
    const isAdminDashboard = pathname.startsWith(ADMIN_DASHBOARD_ROUTE);
    // const isSebSpecificRoute = pathname.startsWith('/seb/'); // SEB flow might need its own session handling
    // const isPublicRoute = ['/', '/privacy', '/terms'].includes(pathname);

    if (user) {
      const targetDashboard = user.role === 'admin' ? ADMIN_DASHBOARD_ROUTE : USER_DASHBOARD_ROUTE;
      if (isAuthPg && pathname !== targetDashboard) router.replace(targetDashboard);
      else if (user.role === 'user' && isAdminDashboard && pathname !== USER_DASHBOARD_ROUTE) router.replace(USER_DASHBOARD_ROUTE);
      else if (user.role === 'admin' && isUserDashboard && pathname !== ADMIN_DASHBOARD_ROUTE) router.replace(ADMIN_DASHBOARD_ROUTE);
    } else {
      // If no user, and trying to access a protected dashboard, redirect to auth.
      // This check is now more reliant on client-side state.
      if ((isUserDashboard || isAdminDashboard) && !isAuthPg) {
        router.replace(AUTH_ROUTE);
      }
    }
  }, [user, isLoading, pathname, router, initialConfigCheckDone, configError]);

  const performSignIn = async (username: string, pass: string, type: 'user' | 'admin'): Promise<{ success: boolean; error?: string; user?: AuthenticatedUser | null }> => {
    if (!supabase) return { success: false, error: "Service connection error." };
    setIsLoading(true); setAuthError(null);
    try {
      const tableName = type === 'user' ? 'users' : 'admins';
      const { data, error: dbError } = await supabase.from(tableName).select('*').eq('username', username).single();

      if (dbError || !data) return { success: false, error: `Login failed: ${getSafeErrorMessage(dbError, 'User/Admin not found.')}` };
      
      if (data.password_hash === pass) { 
        const authUser: AuthenticatedUser = {
          id: data.id,
          username: data.username,
          role: type,
          avatar_url: type === 'user' ? (data as UserTableType['Row']).avatar_url : generateEnhancedDiceBearAvatar(data.id, 'admin'),
          saved_links: type === 'user' ? (data as UserTableType['Row']).saved_links : null,
        };
        setUser(authUser);
        // Cookies.set(SESSION_COOKIE_NAME, authUser.username, { expires: 7, path: '/', sameSite: 'Lax' }); // Removed
        // Cookies.set(ROLE_COOKIE_NAME, authUser.role, { expires: 7, path: '/', sameSite: 'Lax' }); // Removed
        setIsLoading(false); return { success: true, user: authUser };
      } else {
        setIsLoading(false); return { success: false, error: 'Incorrect password.' };
      }
    } catch (e: any) {
      setAuthError(getSafeErrorMessage(e)); setIsLoading(false); return { success: false, error: getSafeErrorMessage(e) };
    }
  };

  const signInUser = (username: string, pass: string) => performSignIn(username, pass, 'user');
  const signInAdmin = (username: string, pass: string) => performSignIn(username, pass, 'admin');

  const registerUserWithLicense = async (licenseKey: string, username: string, pass: string): Promise<{ success: boolean; error?: string; user?: AuthenticatedUser | null }> => {
    if (!supabase) return { success: false, error: "Service connection error." };
    setIsLoading(true); setAuthError(null);
    try {
      const { data: keyData, error: keyError } = await supabase.from('license_keys').select('*').eq('key_value', licenseKey).single();
      if (keyError || !keyData) return { success: false, error: "Invalid license key."};
      if (keyData.is_claimed) return { success: false, error: "License key already claimed."};

      const { data: existingUser } = await supabase.from('users').select('id').eq('username', username).maybeSingle();
      if (existingUser) return { success: false, error: "Username already taken." };

      const initialAvatarUrl = generateEnhancedDiceBearAvatar('user', `${username}-${Date.now()}`);
      const newUserRecord: UserTableType['Insert'] = { 
        username, 
        password_hash: pass, 
        license_key_used_id: keyData.id, 
        saved_links: [],
        avatar_url: initialAvatarUrl,
      };
      const { data: insertedUser, error: insertUserError } = await supabase.from('users').insert(newUserRecord).select().single();
      if (insertUserError || !insertedUser) return { success: false, error: `Registration failed: ${getSafeErrorMessage(insertUserError)}`};
      
      const { error: updateKeyError } = await supabase.from('license_keys').update({ is_claimed: true, claimed_at: new Date().toISOString(), claimed_by_user_id: insertedUser.id }).eq('id', keyData.id);
      if (updateKeyError) console.warn("Failed to mark license as claimed:", updateKeyError);

      const authUser: AuthenticatedUser = {
        id: insertedUser.id, username: insertedUser.username, role: 'user',
        avatar_url: insertedUser.avatar_url, saved_links: insertedUser.saved_links || [],
      };
      setUser(authUser);
      // Cookies.set(SESSION_COOKIE_NAME, authUser.username, { expires: 7, path: '/', sameSite: 'Lax' }); // Removed
      // Cookies.set(ROLE_COOKIE_NAME, authUser.role, { expires: 7, path: '/', sameSite: 'Lax' }); // Removed
      setIsLoading(false); return { success: true, user: authUser };

    } catch (e: any) {
      setAuthError(getSafeErrorMessage(e)); setIsLoading(false); return { success: false, error: getSafeErrorMessage(e) };
    }
  };
  
  const performSignOut = useCallback(async () => {
    setUser(null); 
    // Cookies.remove(SESSION_COOKIE_NAME); // Removed
    // Cookies.remove(ROLE_COOKIE_NAME); // Removed
    setAuthError(null); setIsLoading(false); setShowSignOutDialog(false);
    if (pathname !== AUTH_ROUTE) router.replace(AUTH_ROUTE);
  }, [pathname, router]);

  const updateUserLinks = async (userId: string, links: string[]): Promise<{ success: boolean; error?: string }> => {
    if (!supabase || !user || user.id !== userId || user.role !== 'user') return { success: false, error: "Unauthorized or service error."};
    setIsLoading(true); setAuthError(null);
    try {
      const { error } = await supabase.from('users').update({ saved_links: links }).eq('id', userId);
      if (error) throw error;
      setUser(prev => prev ? ({ ...prev, saved_links: links }) : null);
      setIsLoading(false); return { success: true };
    } catch (e:any) {
      setAuthError(getSafeErrorMessage(e)); setIsLoading(false); return { success: false, error: getSafeErrorMessage(e)};
    }
  };

  const updateUserProfile = async (profileData: Partial<Pick<AuthenticatedUser, 'avatar_url'>> & { name?: string; password?: string; saved_links?: string[] }): Promise<{ success: boolean; error?: string; user?: AuthenticatedUser | null }> => {
    if (!supabase || !user) return { success: false, error: "User not authenticated or service error." };
    
    setIsLoading(true); setAuthError(null);
    
    try {
      const updatePayload: Partial<UserTableType['Update']> = {};
      if (profileData.name) updatePayload.username = profileData.name; 
      if (profileData.password) updatePayload.password_hash = profileData.password; 
      if (profileData.avatar_url) updatePayload.avatar_url = profileData.avatar_url;
      if (profileData.saved_links && user.role === 'user') updatePayload.saved_links = profileData.saved_links;

      if (Object.keys(updatePayload).length === 0) {
        setIsLoading(false); return { success: true, user }; 
      }

      const { data: updatedUser, error } = await supabase
        .from(user.role === 'user' ? 'users' : 'admins')
        .update(updatePayload)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      const newAuthenticatedUser: AuthenticatedUser = {
        ...user,
        username: updatedUser?.username || user.username,
        avatar_url: (updatedUser as UserTableType['Row'])?.avatar_url || user.avatar_url,
        saved_links: user.role === 'user' ? ((updatedUser as UserTableType['Row'])?.saved_links || user.saved_links) : null,
      };
      setUser(newAuthenticatedUser);
      setIsLoading(false);
      return { success: true, user: newAuthenticatedUser };
    } catch (e: any) {
      const errorMsg = getSafeErrorMessage(e, "Failed to update profile.");
      setAuthError(errorMsg);
      setIsLoading(false);
      return { success: false, error: errorMsg };
    }
  };


  const contextValue = useMemo(() => ({
    user, isLoading, authError, supabase,
    signInUser, signInAdmin, registerUserWithLicense,
    signOut: () => setShowSignOutDialog(true),
    updateUserLinks, updateUserProfile,
    showSignOutDialog, setShowSignOutDialog
  }), [user, isLoading, authError, supabase, showSignOutDialog, signInAdmin, registerUserWithLicense, updateUserLinks, updateUserProfile, signInUser]); // Added missing dependencies

  if (!initialConfigCheckDone && !configError) {
    return ( 
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'hsl(var(--background))' }}>
        <p style={{color: 'hsl(var(--foreground))'}}>Initializing Application...</p>
      </div> 
    );
  }
  if (configError) {
    return <SupabaseConfigErrorDisplay errorMessage={configError} />;
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent className="glass-pane">
          <AlertDialogHeader><AlertDialogTitle>Confirm Logout</AlertDialogTitle><AlertDialogDescription>Are you sure you want to log out?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="btn-outline-subtle" onClick={() => setShowSignOutDialog(false)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={performSignOut} className="btn-gradient-destructive">Logout</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

    
