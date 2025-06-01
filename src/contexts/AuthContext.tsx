
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import type { CustomUser, ProctorXTableType } from '@/types/supabase';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';

// Helper to get a safe error message
function getSafeErrorMessage(e: any, fallbackMessage = "An unknown error occurred."): string {
    if (e && typeof e === 'object') {
        if (e.name === 'AbortError') {
            return "The request timed out. Please check your connection and try again.";
        }
        if (typeof e.message === 'string' && e.message.trim() !== '') {
            return e.message;
        }
        try {
            const strError = JSON.stringify(e);
            if (strError !== '{}' && strError.length > 2) return `Error object: ${strError}`;
        } catch (stringifyError) { /* Fall through */ }
    }
    if (e !== null && e !== undefined) {
        const stringifiedError = String(e);
        if (stringifiedError.trim() !== '' && stringifiedError !== '[object Object]') {
            return stringifiedError;
        }
    }
    return fallbackMessage;
}

const SESSION_COOKIE_NAME = 'proctorprep-user-email';
const ROLE_COOKIE_NAME = 'proctorprep-user-role';

const AUTH_ROUTE = '/auth';
const STUDENT_DASHBOARD_ROUTE = '/student/dashboard/overview';
const TEACHER_DASHBOARD_ROUTE = '/teacher/dashboard/overview';
const DEFAULT_DASHBOARD_ROUTE = STUDENT_DASHBOARD_ROUTE;

export const DICEBEAR_STYLES: string[] = ['micah', 'adventurer', 'bottts-neutral', 'pixel-art-neutral'];
export const DICEBEAR_TECH_KEYWORDS: string[] = ['coder', 'debugger', 'techie', 'pixelninja', 'cswizard', 'binary', 'script', 'stack', 'keyboard', 'neonbyte', 'glitch', 'algorithm', 'syntax', 'kernel'];

export const generateEnhancedDiceBearAvatar = (role: CustomUser['role'] | null, userId: string, styleOverride?: string, keywordsOverride?: string[]): string => {
  const selectedStyle = styleOverride || DICEBEAR_STYLES[Math.floor(Math.random() * DICEBEAR_STYLES.length)];
  const selectedKeywords = keywordsOverride || DICEBEAR_TECH_KEYWORDS;
  const randomKeyword = selectedKeywords[Math.floor(Math.random() * selectedKeywords.length)];
  const userRoleStr = role || 'user';
  const timestamp = Date.now().toString().slice(-5);
  const seed = `${randomKeyword}-${userRoleStr}-${userId}-${timestamp}`;
  return `https://api.dicebear.com/8.x/${selectedStyle}/svg?seed=${encodeURIComponent(seed)}`;
};

const SUPABASE_URL_CONFIG_ERROR_MSG = "CRITICAL: Supabase URL is missing, a placeholder, or invalid. Please set NEXT_PUBLIC_SUPABASE_URL in your .env file with your actual Supabase project URL.";
const SUPABASE_ANON_KEY_CONFIG_ERROR_MSG = "CRITICAL: Supabase Anon Key is missing, a placeholder, or invalid. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file with your actual Supabase anon key.";

function SupabaseConfigErrorDisplay({ errorMessage }: { errorMessage: string }) {
  const isUrlError = errorMessage.includes("NEXT_PUBLIC_SUPABASE_URL");
  const isKeyError = errorMessage.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const varName = isUrlError ? "NEXT_PUBLIC_SUPABASE_URL" : isKeyError ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : "Supabase environment variables";
  const exampleValue = isUrlError ? "https://your-project-ref.supabase.co" : "your-actual-anon-key";

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#F0F4F8', // Light theme background
      color: '#1E293B', // Dark text
      padding: '20px',
      fontFamily: '"Inter", "Space Grotesk", sans-serif',
      textAlign: 'center',
      boxSizing: 'border-box'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF', // White card
        padding: '30px 40px',
        borderRadius: '16px',
        boxShadow: '0px 10px 20px rgba(30, 41, 59, 0.1), 0px 4px 8px rgba(30, 41, 59, 0.05)',
        maxWidth: '600px',
        width: '100%'
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 20px auto' }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#DC2626', marginBottom: '15px' }}>Application Configuration Error</h1>
        <p style={{ fontSize: '1rem', color: '#334155', marginBottom: '10px' }}>
          The application cannot start correctly because a critical configuration for connecting to our backend services (Supabase) is missing or invalid.
        </p>
        <p style={{ fontSize: '1rem', fontWeight: '600', color: '#1E293B', marginBottom: '20px' }}>
          <strong>Error Detail:</strong> {errorMessage}
        </p>
        <div style={{ backgroundColor: '#F1F5F9', padding: '15px', borderRadius: '8px', textAlign: 'left', marginBottom: '25px', border: '1px solid #E2E8F0' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1E293B', marginBottom: '10px' }}>How to Fix:</h2>
          <p style={{ fontSize: '0.95rem', color: '#475569', marginBottom: '8px' }}>
            1. Locate or create a <strong><code>.env</code></strong> file in the root directory of your project.
          </p>
          <p style={{ fontSize: '0.95rem', color: '#475569', marginBottom: '8px' }}>
            2. Ensure the following variable is correctly set in this file:
          </p>
          <code style={{
            display: 'block',
            backgroundColor: '#0F172A',
            color: '#E2E8F0',
            padding: '10px 15px',
            borderRadius: '6px',
            fontSize: '0.9rem',
            fontFamily: '"Space Grotesk", monospace',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}>
            {varName}=&quot;{exampleValue}&quot;
          </code>
          <p style={{ fontSize: '0.95rem', color: '#475569', marginTop: '10px', marginBottom: '8px' }}>
            (Replace <code>{exampleValue}</code> with your actual Supabase project value. Ensure both URL and Anon Key are correctly set if this is a general message.)
          </p>
          <p style={{ fontSize: '0.95rem', color: '#475569' }}>
            3. **Save the <code>.env</code> file and restart your Next.js development server.**
          </p>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#64748B' }}>
          If you continue to see this error after correcting the <code>.env</code> file, please check your project documentation or contact support.
        </p>
      </div>
    </div>
  );
}


type AuthContextType = {
  user: CustomUser | null;
  isLoading: boolean;
  authError: string | null;
  supabase: ReturnType<typeof createSupabaseBrowserClient> | null;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string; user?: CustomUser | null }>;
  signUp: (email: string, pass: string, name: string, role: CustomUser['role']) => Promise<{ success: boolean; error?: string; user?: CustomUser | null }>;
  signOut: () => Promise<void>;
  updateUserProfile: (data: { name: string; password?: string; avatar_url?: string; saved_links?: string[] }) => Promise<{ success: boolean; error?: string }>;
  showSignOutDialog: boolean;
  setShowSignOutDialog: React.Dispatch<React.SetStateAction<boolean>>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [configError, setConfigError] = useState<string | null>(null);
  const [initialConfigCheckDone, setInitialConfigCheckDone] = useState(false);

  const [supabase, setSupabase] = useState<ReturnType<typeof createSupabaseBrowserClient> | null>(null);
  const [user, setUser] = useState<CustomUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); // True until initial config check AND user load attempt complete
  const [authError, setAuthError] = useState<string | null>(null);
  const initialLoadAttempted = React.useRef(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  // Step 1: Perform initial critical config check (runs once on mount)
  useEffect(() => {
    const effectId = `[AuthContext ConfigCheckEffect ${Date.now().toString().slice(-4)}]`;
    console.log(`${effectId} Running initial config check.`);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    let currentConfigError: string | null = null;

    if (!supabaseUrl || supabaseUrl.includes('your_supabase_url') || supabaseUrl.trim() === '' || supabaseUrl === 'YOUR_SUPABASE_URL_HERE' || supabaseUrl === 'https://<YOUR_PROJECT_REF>.supabase.co') {
      currentConfigError = SUPABASE_URL_CONFIG_ERROR_MSG;
    } else if (!supabaseAnonKey || supabaseAnonKey.includes('your_supabase_anon_key') || supabaseAnonKey.trim() === '' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY_HERE' || supabaseAnonKey === 'your-anon-key') {
      currentConfigError = SUPABASE_ANON_KEY_CONFIG_ERROR_MSG;
    }

    if (currentConfigError) {
      console.error(`${effectId} ${currentConfigError}`); // This is the console.error the user is seeing
      setConfigError(currentConfigError);
      setAuthError(currentConfigError); // Also set general authError for consistency
      setSupabase(null);
      setIsLoading(false); // Stop loading as we've hit a critical config error
    }
    setInitialConfigCheckDone(true); // Mark initial check as done
  }, []);

  // Step 2: Initialize Supabase client if config check passed
  useEffect(() => {
    const effectId = `[AuthContext SupabaseClientSetupEffect ${Date.now().toString().slice(-4)}]`;

    if (!initialConfigCheckDone) {
      console.log(`${effectId} Waiting: Initial config check not yet done.`);
      return; // Wait for the config check to complete
    }
    if (configError) {
      console.log(`${effectId} Aborted: Config error detected: ${configError}. Supabase client will not be initialized.`);
      if (isLoading) setIsLoading(false); // Ensure loading stops if config error found
      return; // Don't try to init client if there's a config error
    }
    if (supabase) {
        console.log(`${effectId} Supabase client already initialized. Skipping.`);
        return; // Client already initialized
    }

    console.log(`${effectId} Initial config check passed. Attempting to initialize Supabase client.`);
    try {
      const client = createSupabaseBrowserClient(); // This can throw if env vars are malformed beyond placeholders
      setSupabase(client);
      console.log(`${effectId} Supabase client initialized successfully.`);
      setAuthError(null); // Clear any previous general auth errors
      // setIsLoading(false) will be handled by loadUserFromCookie or its error path
    } catch (e: any) {
      const errorMsg = getSafeErrorMessage(e, "Failed to initialize Supabase client (runtime).");
      console.error(`${effectId} CRITICAL: ${errorMsg}`, e);
      setAuthError(errorMsg);
      setConfigError(errorMsg); // Also set configError for consistent UI
      setSupabase(null);
      setIsLoading(false);
    }
  }, [initialConfigCheckDone, configError, supabase, isLoading]);


  const loadUserFromCookie = useCallback(async () => {
    const effectId = `[AuthContext loadUserFromCookie ${Date.now().toString().slice(-4)}]`;

    if (!initialConfigCheckDone || configError) {
      console.log(`${effectId} Aborted: Initial config check not done or config error present.`);
      if (isLoading) setIsLoading(false);
      return;
    }
    if (!supabase) {
      console.warn(`${effectId} Aborted: Supabase client not available for session loading.`);
      if (isLoading) setIsLoading(false);
      if (!authError && !configError) setAuthError("Supabase client not available for session loading.");
      return;
    }

    console.log(`${effectId} Starting. Supabase client available.`);
    const userEmailFromCookie = Cookies.get(SESSION_COOKIE_NAME);

    if (user && user.email === userEmailFromCookie && !isLoading) {
      console.log(`${effectId} User already in context and matches cookie. Skipping DB re-fetch.`);
      return;
    }

    if (!isLoading) setIsLoading(true); // Set loading true specifically for this async operation
    setAuthError(null); // Clear previous auth errors before attempting to load

    try {
      if (!userEmailFromCookie) {
        console.log(`${effectId} No session cookie found.`);
        setUser(null); Cookies.remove(ROLE_COOKIE_NAME);
        return;
      }
      const { data, error: dbError } = await supabase
        .from('proctorX')
        .select('user_id, email, name, role, avatar_url, saved_links')
        .eq('email', userEmailFromCookie)
        .single();

      if (dbError || !data) {
        let errorDetail = 'User from session cookie not found or DB error.';
        if (dbError?.code === 'PGRST116') errorDetail = 'User from session cookie not found in database.';
        else if (dbError) errorDetail = getSafeErrorMessage(dbError, 'Failed to fetch user data.');
        console.warn(`${effectId} ${errorDetail} Email: ${userEmailFromCookie}. Clearing session.`);
        setUser(null); Cookies.remove(SESSION_COOKIE_NAME); Cookies.remove(ROLE_COOKIE_NAME); setAuthError(errorDetail);
        return;
      }
      const loadedUser: CustomUser = {
        user_id: data.user_id, email: data.email, name: data.name ?? null, role: data.role as CustomUser['role'] || null,
        avatar_url: data.avatar_url || generateEnhancedDiceBearAvatar(data.role as CustomUser['role'], data.user_id),
        saved_links: data.saved_links || [],
      };
      setUser(loadedUser);
      if (loadedUser.role) Cookies.set(ROLE_COOKIE_NAME, loadedUser.role, { expires: 7, path: '/' }); else Cookies.remove(ROLE_COOKIE_NAME);
      console.log(`${effectId} User loaded from cookie and DB: ${loadedUser.email}, Role: ${loadedUser.role}`);
    } catch (e: any) {
      const errorMsg = getSafeErrorMessage(e, "Error processing user session.");
      console.error(`${effectId} Exception during user session processing:`, errorMsg, e);
      setUser(null); Cookies.remove(SESSION_COOKIE_NAME); Cookies.remove(ROLE_COOKIE_NAME); setAuthError(errorMsg);
    } finally {
      console.log(`${effectId} Finished user loading attempt. Setting isLoading to false.`);
      setIsLoading(false);
    }
  }, [supabase, user, isLoading, authError, initialConfigCheckDone, configError]);

  // Step 3: Load user from cookie if Supabase client is ready and no config error
  useEffect(() => {
    const effectId = `[AuthContext UserLoadTriggerEffect ${Date.now().toString().slice(-4)}]`;
    if (initialConfigCheckDone && !configError && supabase) {
      if (!initialLoadAttempted.current) {
        initialLoadAttempted.current = true;
        console.log(`${effectId} Conditions met for first user load attempt. Calling loadUserFromCookie.`);
        loadUserFromCookie();
      }
    } else if (initialConfigCheckDone && !configError && !supabase && isLoading) {
        // This case might happen if supabase client init fails silently in its own effect after config check passed
        console.warn(`${effectId} Initial config check done, no config error, but Supabase client still null. Setting isLoading false.`);
        setIsLoading(false);
    }
  }, [initialConfigCheckDone, configError, supabase, loadUserFromCookie, isLoading]);


  const getRedirectPathForRole = useCallback((userRole: CustomUser['role'] | null) => {
    if (userRole === 'teacher') return TEACHER_DASHBOARD_ROUTE;
    return STUDENT_DASHBOARD_ROUTE;
  }, []);

  useEffect(() => {
    const effectId = `[AuthContext Route Guard Effect ${Date.now().toString().slice(-4)}]`;
    if (!initialConfigCheckDone || isLoading || configError) {
      console.log(`${effectId} Waiting: InitialCheckDone: ${initialConfigCheckDone}, isLoading: ${isLoading}, configError: ${!!configError}. No routing yet.`);
      return;
    }
    console.log(`${effectId} Running. Path: ${pathname}, User: ${user?.email}, Role: ${user?.role}, ContextAuthError: ${authError}`);

    const isAuthPg = pathname === AUTH_ROUTE;
    const isStudentDashboardArea = pathname?.startsWith('/student/dashboard');
    const isTeacherDashboardArea = pathname?.startsWith('/teacher/dashboard');
    const isSebSpecificRoute = pathname?.startsWith('/seb/');
    const PUBLIC_ROUTES_FOR_CLIENT = ['/', '/privacy', '/terms', '/supabase-test', '/unsupported-browser'];
    const isPublicRoute = PUBLIC_ROUTES_FOR_CLIENT.includes(pathname);
    const isProtectedRoute = isStudentDashboardArea || isTeacherDashboardArea;

    if (user && user.user_id) {
      const targetDashboard = getRedirectPathForRole(user.role);
      if (isAuthPg && pathname !== targetDashboard) {
        router.replace(targetDashboard); return;
      }
      if (user.role === 'student' && isTeacherDashboardArea && pathname !== STUDENT_DASHBOARD_ROUTE) {
        router.replace(STUDENT_DASHBOARD_ROUTE); return;
      }
      if (user.role === 'teacher' && isStudentDashboardArea && pathname !== TEACHER_DASHBOARD_ROUTE) {
        router.replace(TEACHER_DASHBOARD_ROUTE); return;
      }
    } else {
      if (isProtectedRoute && !isAuthPg && !isSebSpecificRoute) {
        router.replace(AUTH_ROUTE); return;
      }
    }
    console.log(`${effectId} End of effect run. No redirect initiated.`);
  }, [user, isLoading, pathname, router, authError, getRedirectPathForRole, initialConfigCheckDone, configError]);


  const generateShortId = useCallback(() => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }, []);

  const signIn = useCallback(async (email: string, pass: string): Promise<{ success: boolean; error?: string; user?: CustomUser | null }> => {
    const operationId = `[AuthContext signIn ${Date.now().toString().slice(-4)}]`;
    if (!supabase) { /* ... */ return { success: false, error: "Service connection error." }; }
    setIsLoading(true); setAuthError(null);
    try {
      const { data, error: dbError } = await supabase.from('proctorX').select('user_id, email, pass, name, role, avatar_url, saved_links').eq('email', email).single();
      if (dbError || !data) { /* ... */ setIsLoading(false); return { success: false, error: 'User not found or DB error.' }; }
      if (data.pass === pass) {
        const userData: CustomUser = { /* ... */ user_id: data.user_id, email: data.email, name: data.name ?? null, role: data.role as CustomUser['role'] || null, avatar_url: data.avatar_url || generateEnhancedDiceBearAvatar(data.role as CustomUser['role'], data.user_id), saved_links: data.saved_links || [], };
        setUser(userData); Cookies.set(SESSION_COOKIE_NAME, userData.email, { expires: 7, path: '/' }); if (userData.role) Cookies.set(ROLE_COOKIE_NAME, userData.role, { expires: 7, path: '/' }); else Cookies.remove(ROLE_COOKIE_NAME);
        setIsLoading(false); return { success: true, user: userData };
      } else { /* ... */ setIsLoading(false); return { success: false, error: 'Incorrect password.' }; }
    } catch (e: any) { /* ... */ setAuthError(getSafeErrorMessage(e)); setIsLoading(false); return { success: false, error: getSafeErrorMessage(e) }; }
  }, [supabase]);

  const signUp = useCallback(async (email: string, pass: string, name: string, role: CustomUser['role']): Promise<{ success: boolean; error?: string; user?: CustomUser | null }> => {
    const operationId = `[AuthContext signUp ${Date.now().toString().slice(-4)}]`;
    if (!supabase) { /* ... */ return { success: false, error: "Service connection error." }; }
    if (!role) { /* ... */ return { success: false, error: "Role must be selected." }; }
    setIsLoading(true); setAuthError(null);
    try {
      const { data: existingUser, error: selectError } = await supabase.from('proctorX').select('email').eq('email', email).maybeSingle();
      if (selectError && selectError.code !== 'PGRST116') { /* ... */ setIsLoading(false); throw new Error(getSafeErrorMessage(selectError)); }
      if (existingUser) { /* ... */ setIsLoading(false); return { success: false, error: 'User with this email already exists.' }; }
      const newUserId = generateShortId(); const defaultAvatar = generateEnhancedDiceBearAvatar(role, newUserId);
      const newUserRecord: ProctorXTableType['Insert'] = { user_id: newUserId, email, pass, name, role, avatar_url: defaultAvatar, saved_links: [], };
      const { data: insertedData, error: insertError } = await supabase.from('proctorX').insert(newUserRecord).select('user_id, email, name, role, avatar_url, saved_links').single();
      if (insertError || !insertedData) { /* ... */ setIsLoading(false); return { success: false, error: `Registration failed: ${getSafeErrorMessage(insertError)}` }; }
      const newUserData: CustomUser = { /* ... */ user_id: insertedData.user_id, email: insertedData.email, name: insertedData.name ?? null, role: insertedData.role as CustomUser['role'], avatar_url: insertedData.avatar_url || defaultAvatar, saved_links: insertedData.saved_links || [], };
      setUser(newUserData); Cookies.set(SESSION_COOKIE_NAME, newUserData.email, { expires: 7, path: '/' }); Cookies.set(ROLE_COOKIE_NAME, newUserData.role, { expires: 7, path: '/' });
      setIsLoading(false); return { success: true, user: newUserData };
    } catch (e: any) { /* ... */ setAuthError(getSafeErrorMessage(e)); setIsLoading(false); return { success: false, error: getSafeErrorMessage(e) }; }
  }, [supabase, generateShortId]);

  const performSignOut = useCallback(async () => {
    setUser(null); Cookies.remove(SESSION_COOKIE_NAME, { path: '/' }); Cookies.remove(ROLE_COOKIE_NAME, { path: '/' });
    setAuthError(null); setIsLoading(false); setShowSignOutDialog(false);
    if (pathname !== AUTH_ROUTE) router.replace(AUTH_ROUTE);
  }, [pathname, router]);

  const updateUserProfile = useCallback(async (profileData: { name: string; password?: string; avatar_url?: string; saved_links?: string[] }): Promise<{ success: boolean; error?: string }> => {
    if (!supabase || !user?.user_id) { /* ... */ return { success: false, error: "User not authenticated or service error." }; }
    setIsLoading(true); setAuthError(null);
    try {
      const updates: Partial<Omit<ProctorXTableType['Update'], 'user_id' | 'email' | 'role'>> = { name: profileData.name, saved_links: profileData.saved_links !== undefined ? profileData.saved_links : user.saved_links || [], };
      if (profileData.password) { if (profileData.password.length < 6) { setIsLoading(false); return { success: false, error: "New password must be at least 6 characters." }; } updates.pass = profileData.password; }
      if (profileData.avatar_url !== undefined) updates.avatar_url = profileData.avatar_url;
      const { error: updateError } = await supabase.from('proctorX').update(updates).eq('user_id', user.user_id);
      if (updateError) { /* ... */ setIsLoading(false); return { success: false, error: getSafeErrorMessage(updateError) }; }
      setUser(prevUser => prevUser ? ({ ...prevUser, name: updates.name ?? prevUser.name, avatar_url: updates.avatar_url !== undefined ? updates.avatar_url : prevUser.avatar_url, saved_links: updates.saved_links !== undefined ? updates.saved_links : prevUser.saved_links, }) : null);
      setIsLoading(false); return { success: true };
    } catch (e: any) { /* ... */ setAuthError(getSafeErrorMessage(e)); setIsLoading(false); return { success: false, error: getSafeErrorMessage(e) }; }
  }, [supabase, user]);

  const contextValue = useMemo(() => ({
    user, isLoading, authError, supabase, signIn, signUp,
    signOut: () => setShowSignOutDialog(true),
    updateUserProfile,
    showSignOutDialog, setShowSignOutDialog
  }), [user, isLoading, authError, supabase, signIn, signUp, updateUserProfile, showSignOutDialog, setShowSignOutDialog]);

  if (!initialConfigCheckDone && !configError) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#F0F4F8', color: '#1E293B', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ textAlign: 'center' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#3B82F6" style={{ margin: '0 auto 20px auto', animation: 'spin 1s linear infinite' }}>
                    <path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"/>
                    <path d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z"/>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </svg>
                <p style={{ fontSize: '1.125rem', fontWeight: '500' }}>Initializing Application...</p>
            </div>
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
        <AlertDialogContent className="bg-popover border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to log out?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="btn-outline-subtle" onClick={() => setShowSignOutDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performSignOut} className="btn-gradient-destructive">
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

    