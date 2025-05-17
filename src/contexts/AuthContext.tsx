
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

type AuthContextType = {
  user: CustomUser | null;
  isLoading: boolean;
  authError: string | null;
  supabase: ReturnType<typeof createSupabaseBrowserClient> | null;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string; user?: CustomUser | null }>;
  signUp: (email: string, pass: string, name: string, role: CustomUser['role']) => Promise<{ success: boolean; error?: string; user?: CustomUser | null }>;
  signOut: () => Promise<void>;
  updateUserProfile: (data: { name: string; password?: string; avatar_url?: string }) => Promise<{ success: boolean; error?: string }>;
  showSignOutDialog: boolean; 
  setShowSignOutDialog: React.Dispatch<React.SetStateAction<boolean>>; 
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase, setSupabase] = useState<ReturnType<typeof createSupabaseBrowserClient> | null>(null);
  const [user, setUser] = useState<CustomUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const initialLoadAttempted = React.useRef(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false); 

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const effectId = `[AuthContext SupabaseClientInitEffect ${Date.now().toString().slice(-4)}]`;
    console.log(`${effectId} Running...`);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      const errorMsg = "CRITICAL: Supabase URL or Anon Key missing. Check .env variables.";
      console.error(`${effectId} ${errorMsg}`);
      setAuthError(errorMsg);
      setSupabase(null);
      setIsLoading(false);
      // No logErrorToBackend
      return;
    }
    try {
      const client = createSupabaseBrowserClient();
      setSupabase(client);
      console.log(`${effectId} Supabase client initialized successfully.`);
      setAuthError(null);
    } catch (e: any) {
      const errorMsg = getSafeErrorMessage(e, "Failed to initialize Supabase client.");
      console.error(`${effectId} CRITICAL: ${errorMsg}`, e);
      setAuthError(errorMsg);
      setSupabase(null);
      setIsLoading(false);
      // No logErrorToBackend
    }
  }, []);

  const loadUserFromCookie = useCallback(async () => {
    const effectId = `[AuthContext loadUserFromCookie ${Date.now().toString().slice(-4)}]`;
    console.log(`${effectId} Starting. Supabase available: ${!!supabase}`);

    if (!supabase) {
      console.warn(`${effectId} Aborted: Supabase client not available. Setting isLoading=false.`);
      setIsLoading(false);
      if (!authError) setAuthError("Supabase client not available for session loading.");
      return;
    }

    const userEmailFromCookie = Cookies.get(SESSION_COOKIE_NAME);
    if (user && user.email === userEmailFromCookie && !isLoading) {
        console.log(`${effectId} User already in context and matches cookie. Skipping DB re-fetch for this load.`);
        if (isLoading) setIsLoading(false);
        return;
    }

    console.log(`${effectId} Setting isLoading=true for cookie check.`);
    setIsLoading(true);
    setAuthError(null);

    try {
      console.log(`${effectId} Cookie '${SESSION_COOKIE_NAME}' value:`, userEmailFromCookie);

      if (!userEmailFromCookie) {
        console.log(`${effectId} No session cookie found.`);
        setUser(null);
        Cookies.remove(ROLE_COOKIE_NAME);
        return; 
      }

      console.log(`${effectId} Session cookie found. Fetching user: ${userEmailFromCookie} from DB...`);
      const { data, error: dbError } = await supabase
        .from('proctorX')
        .select('user_id, email, name, role, avatar_url')
        .eq('email', userEmailFromCookie)
        .single();
      console.log(`${effectId} DB query for ${userEmailFromCookie} - Data:`, data, 'Error:', dbError);

      if (dbError || !data) {
        let errorDetail = 'User from session cookie not found or DB error.';
        if (dbError && dbError.code === 'PGRST116') errorDetail = 'User from session cookie not found in database.';
        else if (dbError) errorDetail = getSafeErrorMessage(dbError, 'Failed to fetch user data.');
        
        console.warn(`${effectId} ${errorDetail} Email: ${userEmailFromCookie}. Clearing session.`);
        // No logErrorToBackend
        setUser(null);
        Cookies.remove(SESSION_COOKIE_NAME);
        Cookies.remove(ROLE_COOKIE_NAME);
        setAuthError(errorDetail);
        return;
      }

      const loadedUser: CustomUser = {
        user_id: data.user_id,
        email: data.email,
        name: data.name ?? null,
        role: data.role as CustomUser['role'] || null,
        avatar_url: data.avatar_url || generateEnhancedDiceBearAvatar(data.role as CustomUser['role'], data.user_id),
      };
      console.log(`${effectId} User loaded from cookie and DB: ${loadedUser.email}, Role: ${loadedUser.role}`);
      setUser(loadedUser);
      if (loadedUser.role) Cookies.set(ROLE_COOKIE_NAME, loadedUser.role, { expires: 7, path: '/' });
      else Cookies.remove(ROLE_COOKIE_NAME);

    } catch (e: any) {
      const errorMsg = getSafeErrorMessage(e, "Error processing user session.");
      console.error(`${effectId} Exception during user session processing:`, errorMsg, e);
      // No logErrorToBackend
      setUser(null);
      Cookies.remove(SESSION_COOKIE_NAME);
      Cookies.remove(ROLE_COOKIE_NAME);
      setAuthError(errorMsg);
    } finally {
      console.log(`${effectId} Finished. Setting isLoading to false.`);
      setIsLoading(false);
    }
  }, [supabase, user, isLoading, authError]);


  useEffect(() => {
    const effectId = `[AuthContext UserLoadTriggerEffect ${Date.now().toString().slice(-4)}]`;
    console.log(`${effectId} Running. Supabase: ${!!supabase}, AuthError: ${authError}, InitialLoadAttempted: ${initialLoadAttempted.current}, isLoading: ${isLoading}`);

    if (authError && isLoading) {
        console.warn(`${effectId} AuthError present ('${authError}'), ensuring isLoading is false.`);
        setIsLoading(false);
        return;
    }

    if (supabase) {
      if (!initialLoadAttempted.current) {
        initialLoadAttempted.current = true;
        console.log(`${effectId} Supabase client available & first attempt. Calling loadUserFromCookie.`);
        loadUserFromCookie();
      } else if (isLoading && !user && Cookies.get(SESSION_COOKIE_NAME) === undefined) {
         console.warn(`${effectId} Post-initial load: isLoading true but no user/cookie. Forcing isLoading to false.`);
         setIsLoading(false);
      }
    } else if (!isLoading && !authError) { 
        console.error(`${effectId} Supabase client not available, no authError, and isLoading is false. Likely init issue.`);
        setAuthError("Supabase client failed to initialize properly.");
        setIsLoading(false); 
    }
  }, [supabase, authError, loadUserFromCookie, user, isLoading]);

  const getRedirectPathForRole = useCallback((userRole: CustomUser['role'] | null) => {
    if (userRole === 'teacher') return TEACHER_DASHBOARD_ROUTE;
    return STUDENT_DASHBOARD_ROUTE;
  }, []);

  useEffect(() => {
    const effectId = `[AuthContext Route Guard Effect ${Date.now().toString().slice(-4)}]`;
    console.log(`${effectId} Running. isLoading: ${isLoading}, Path: ${pathname}, User: ${user?.email}, Role: ${user?.role}, ContextAuthError: ${authError}`);

    if (isLoading) { 
      console.log(`${effectId} Waiting: isLoading is ${isLoading}. No routing yet.`);
      return;
    }
    
    const isAuthPg = pathname === AUTH_ROUTE;
    const isStudentDashboardArea = pathname?.startsWith('/student/dashboard');
    const isTeacherDashboardArea = pathname?.startsWith('/teacher/dashboard');
    const isSebSpecificRoute = pathname?.startsWith('/seb/');
    const PUBLIC_ROUTES_FOR_CLIENT = ['/', '/privacy', '/terms', '/supabase-test', '/unsupported-browser'];
    const isPublicRoute = PUBLIC_ROUTES_FOR_CLIENT.includes(pathname);
    const isProtectedRoute = isStudentDashboardArea || isTeacherDashboardArea;


    if (user && user.user_id) {
      const targetDashboard = getRedirectPathForRole(user.role);
      console.log(`${effectId} User authenticated (${user.email}, Role: ${user.role}). Target dashboard: ${targetDashboard}`);

      if (isAuthPg) {
        if (pathname !== targetDashboard) {
          console.log(`${effectId} User on ${AUTH_ROUTE}, attempting redirect to: ${targetDashboard}`);
          router.replace(targetDashboard);
          return;
        }
      } else {
          if (user.role === 'student' && isTeacherDashboardArea) {
            if (pathname !== STUDENT_DASHBOARD_ROUTE) {
              console.log(`${effectId} Authenticated student on teacher area, redirecting to ${STUDENT_DASHBOARD_ROUTE}`);
              router.replace(STUDENT_DASHBOARD_ROUTE);
              return;
            }
          }
          if (user.role === 'teacher' && isStudentDashboardArea) {
            if (pathname !== TEACHER_DASHBOARD_ROUTE) {
              console.log(`${effectId} Authenticated teacher on student area, redirecting to ${TEACHER_DASHBOARD_ROUTE}`);
              router.replace(TEACHER_DASHBOARD_ROUTE);
              return;
            }
          }
      }
      console.log(`${effectId} Authenticated user on allowed page: ${pathname}. No redirect needed by context guard this cycle.`);

    } else { 
      console.log(`${effectId} User not authenticated. Path: ${pathname}`);
      if (isProtectedRoute && !isAuthPg && !isSebSpecificRoute) {
        console.log(`${effectId} Unauthenticated on protected route ${pathname}, redirecting to ${AUTH_ROUTE}`);
        router.replace(AUTH_ROUTE);
        return;
      }
      console.log(`${effectId} User not authenticated and on public, SEB, or ${AUTH_ROUTE} page: ${pathname}. No redirect by context guard.`);
    }
    console.log(`${effectId} End of effect run. No redirect initiated by this pass or conditions not met.`);
  }, [user, isLoading, pathname, router, authError, getRedirectPathForRole]);


  const generateShortId = useCallback(() => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }, []);

  const signIn = useCallback(async (email: string, pass: string): Promise<{ success: boolean; error?: string; user?: CustomUser | null }> => {
    const operationId = `[AuthContext signIn ${Date.now().toString().slice(-4)}]`;
    console.log(`${operationId} Attempting sign in for:`, email);

    if (!supabase) {
      const errorMsg = "Service connection error. Please try again later.";
      console.error(`${operationId} Aborted: ${errorMsg}`);
      setAuthError(errorMsg); setIsLoading(false); 
      // No logErrorToBackend
      return { success: false, error: errorMsg };
    }
    setIsLoading(true); setAuthError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('proctorX')
        .select('user_id, email, pass, name, role, avatar_url')
        .eq('email', email)
        .single();

      if (dbError || !data) {
        let errorDetail = 'User with this email not found or DB error.';
        if (dbError && dbError.code === 'PGRST116') errorDetail = 'User with this email not found.';
        else if (dbError) errorDetail = getSafeErrorMessage(dbError, 'Failed to fetch user data.');
        
        console.warn(`${operationId} Failed to fetch user. Email:`, email, 'Error:', errorDetail);
        // No logErrorToBackend
        setUser(null); setIsLoading(false); return { success: false, error: errorDetail };
      }
      console.log(`${operationId} User data fetched from DB: ${data.email}, Role: ${data.role}`);

      if (data.pass === pass) { 
        const userData: CustomUser = {
          user_id: data.user_id,
          email: data.email,
          name: data.name ?? null,
          role: data.role as CustomUser['role'] || null,
          avatar_url: data.avatar_url || generateEnhancedDiceBearAvatar(data.role as CustomUser['role'], data.user_id),
        };

        setUser(userData);
        Cookies.set(SESSION_COOKIE_NAME, userData.email, { expires: 7, path: '/' });
        if (userData.role) Cookies.set(ROLE_COOKIE_NAME, userData.role, { expires: 7, path: '/' });
        else Cookies.remove(ROLE_COOKIE_NAME);

        console.log(`${operationId} Success. User set in context: ${userData.email}, Role: ${userData.role}. Routing effect will handle navigation.`);
        setIsLoading(false);
        return { success: true, user: userData };
      } else {
        const incorrectPassError = 'Incorrect password.';
        console.warn(`${operationId} ${incorrectPassError} Email:`, email);
        setUser(null); setIsLoading(false); return { success: false, error: incorrectPassError };
      }
    } catch (e: any) {
      const errorMsg = getSafeErrorMessage(e, 'An unexpected error occurred during sign in.');
      console.error(`${operationId} Exception during sign in:`, errorMsg, e);
      // No logErrorToBackend
      setUser(null); setAuthError(errorMsg); setIsLoading(false); return { success: false, error: errorMsg };
    }
  }, [supabase]);

  const signUp = useCallback(async (email: string, pass: string, name: string, role: CustomUser['role']): Promise<{ success: boolean; error?: string; user?: CustomUser | null }> => {
    const operationId = `[AuthContext signUp ${Date.now().toString().slice(-4)}]`;
    console.log(`${operationId} Attempting sign up for: ${email}, Role: ${role}`);

    if (!supabase) {
      const errorMsg = "Service connection error.";
      setAuthError(errorMsg); setIsLoading(false); 
      // No logErrorToBackend
      return { success: false, error: errorMsg };
    }
    if (!role) {
        const errorMsg = "Role must be selected for registration.";
        setIsLoading(false); return { success: false, error: errorMsg };
    }
    setIsLoading(true); setAuthError(null);

    try {
      const { data: existingUser, error: selectError } = await supabase
        .from('proctorX')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (selectError && selectError.code !== 'PGRST116') { 
        const errorMsg = getSafeErrorMessage(selectError, 'Error checking existing user.');
        console.error(`${operationId} DB Select Error:`, errorMsg);
        // No logErrorToBackend
        setIsLoading(false); throw new Error(errorMsg);
      }
      if (existingUser) {
        const errorMsg = 'User with this email already exists.';
        console.warn(`${operationId} User Exists:`, email);
        setIsLoading(false); return { success: false, error: errorMsg };
      }

      const newUserId = generateShortId();
      const defaultAvatar = generateEnhancedDiceBearAvatar(role, newUserId);
      const newUserRecord: ProctorXTableType['Insert'] = {
        user_id: newUserId, email, pass, name, role, avatar_url: defaultAvatar,
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('proctorX')
        .insert(newUserRecord)
        .select('user_id, email, name, role, avatar_url')
        .single();

      if (insertError || !insertedData) {
        const errorDetail = getSafeErrorMessage(insertError, "Could not retrieve user data after insert.");
        console.error(`${operationId} Insert Error: ${errorDetail}`);
        // No logErrorToBackend
        setUser(null); setIsLoading(false); return { success: false, error: `Registration failed: ${errorDetail}` };
      }

      const newUserData: CustomUser = {
        user_id: insertedData.user_id,
        email: insertedData.email,
        name: insertedData.name ?? null,
        role: insertedData.role as CustomUser['role'],
        avatar_url: insertedData.avatar_url || defaultAvatar,
      };

      setUser(newUserData);
      Cookies.set(SESSION_COOKIE_NAME, newUserData.email, { expires: 7, path: '/' });
      Cookies.set(ROLE_COOKIE_NAME, newUserData.role, { expires: 7, path: '/' });

      console.log(`${operationId} Success. User set: ${newUserData.email}. Routing effect will handle navigation.`);
      setIsLoading(false);
      return { success: true, user: newUserData };

    } catch (e: any) {
      const errorMsg = getSafeErrorMessage(e, 'Unexpected error during sign up.');
      console.error(`${operationId} Exception:`, errorMsg, e);
      // No logErrorToBackend
      setUser(null); setAuthError(errorMsg); setIsLoading(false);
      return { success: false, error: errorMsg };
    }
  }, [supabase, generateShortId]);

  const performSignOut = useCallback(async () => {
    const operationId = `[AuthContext performSignOut ${Date.now().toString().slice(-4)}]`;
    console.log(`${operationId} Signing out. Current path: ${pathname}`);

    setUser(null);
    Cookies.remove(SESSION_COOKIE_NAME, { path: '/' });
    Cookies.remove(ROLE_COOKIE_NAME, { path: '/' });
    setAuthError(null);
    setIsLoading(false); 
    setShowSignOutDialog(false); 

    if (pathname !== AUTH_ROUTE) {
        console.log(`${operationId} Redirecting to ${AUTH_ROUTE} after sign out.`);
        router.replace(AUTH_ROUTE);
    } else {
        console.log(`${operationId} Already on ${AUTH_ROUTE}, no redirect needed after sign out.`);
    }
  }, [pathname, router]);

  const updateUserProfile = useCallback(async (profileData: { name: string; password?: string; avatar_url?: string }): Promise<{ success: boolean; error?: string }> => {
    const operationId = `[AuthContext updateUserProfile ${Date.now().toString().slice(-4)}]`;

    if (!supabase) {
      const errorMsg = "Service connection error.";
      console.error(`${operationId} Aborted: ${errorMsg}`);
      setAuthError(errorMsg); setIsLoading(false); 
      // No logErrorToBackend
      return { success: false, error: errorMsg };
    }
    if (!user || !user.user_id) {
      const errorMsg = "User not authenticated or user_id missing.";
      setAuthError(errorMsg); setIsLoading(false); 
      // No logErrorToBackend
      return { success: false, error: errorMsg };
    }

    console.log(`${operationId} Attempting update for user_id: ${user.user_id} with data:`, {name: profileData.name, password_present: !!profileData.password, avatar_url_present: !!profileData.avatar_url});
    setIsLoading(true); setAuthError(null);

    try {
      const updates: Partial<Omit<ProctorXTableType['Update'], 'user_id' | 'email' | 'role'>> = { name: profileData.name };
      if (profileData.password) {
        if (profileData.password.length < 6) {
          setIsLoading(false);
          return { success: false, error: "New password must be at least 6 characters long." };
        }
        updates.pass = profileData.password;
      }
      if (profileData.avatar_url !== undefined) updates.avatar_url = profileData.avatar_url;

      const { error: updateError } = await supabase
        .from('proctorX')
        .update(updates)
        .eq('user_id', user.user_id);

      if (updateError) {
        const errorMsg = getSafeErrorMessage(updateError, "Failed to update profile.");
        console.error(`${operationId} Error updating DB:`, errorMsg, updateError);
        // No logErrorToBackend
        setIsLoading(false); return { success: false, error: errorMsg };
      }

      setUser(prevUser => prevUser ? ({
        ...prevUser,
        name: updates.name ?? prevUser.name,
        avatar_url: updates.avatar_url !== undefined ? updates.avatar_url : prevUser.avatar_url,
      }) : null);
      console.log(`${operationId} Success. Profile updated and context refreshed.`);
      setIsLoading(false); return { success: true };

    } catch (e: any) {
      const errorMsg = getSafeErrorMessage(e, 'Unexpected error during profile update.');
      console.error(`${operationId} Exception:`, errorMsg, e);
      // No logErrorToBackend
      setAuthError(errorMsg); setIsLoading(false);
      return { success: false, error: errorMsg };
    }
  }, [supabase, user]);

  const contextValue = useMemo(() => ({
    user, isLoading, authError, supabase, signIn, signUp,
    signOut: () => setShowSignOutDialog(true), 
    updateUserProfile,
    showSignOutDialog, setShowSignOutDialog
  }), [user, isLoading, authError, supabase, signIn, signUp, updateUserProfile, showSignOutDialog, setShowSignOutDialog]);

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
