
// src/app/api/seb/validate-token/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import type { Database, UserTableType } from '@/types/supabase';

// Local helper for safe error message extraction
function getLocalSafeErrorMessage(e: any, defaultMessage = "An unknown error occurred."): string {
  if (e && typeof e === 'object') {
    if (e.name === 'TokenExpiredError') return "Session token has expired.";
    if (e.name === 'JsonWebTokenError') return "Invalid or malformed session token.";
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for server-side DB access

let criticalInitError = false;
let initErrorDetails = "CRITICAL: Server env var(s) missing for token validation: ";
if (!supabaseUrl) { initErrorDetails += "NEXT_PUBLIC_SUPABASE_URL "; criticalInitError = true; }
if (!supabaseServiceKey) { initErrorDetails += "SUPABASE_SERVICE_ROLE_KEY "; criticalInitError = true; }
if (criticalInitError) console.error(`[API ValidateToken Init] ${initErrorDetails}`);

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey)
  : null;

export async function GET(request: NextRequest) {
  const operationId = `[API ValidateToken GET ${Date.now().toString().slice(-5)}]`;
  console.log(`${operationId} Handler started.`);

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    const errorMsg = 'Server config error (JWT_SECRET missing).';
    console.error(`${operationId} CRITICAL: JWT_SECRET missing.`);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }

  if (!supabaseAdmin) {
    console.error(`${operationId} Supabase admin client not initialized. Init Error: ${initErrorDetails}`);
    return NextResponse.json({ error: 'Server config error (Supabase client not initialized).' }, { status: 500 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid token provided.' }, { status: 400 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (jwtError: any) {
      const errorMessage = getLocalSafeErrorMessage(jwtError, 'Token validation failed.');
      console.warn(`${operationId} JWT verification failed:`, errorMessage, jwtError);
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
    
    const { userId, sessionSpecificLinks } = decoded; 
    if (!userId) {
      return NextResponse.json({ error: 'Token payload incomplete (missing userId).' }, { status: 400 });
    }

    let validSessionSpecificLinks: string[] = [];
    if (sessionSpecificLinks && Array.isArray(sessionSpecificLinks) && sessionSpecificLinks.every(l => typeof l === 'string')) {
        validSessionSpecificLinks = sessionSpecificLinks;
    } else if (sessionSpecificLinks !== undefined) {
        console.warn(`${operationId} Invalid 'sessionSpecificLinks' format in token. Received:`, sessionSpecificLinks);
    }

    // Attempt to fetch user profile
    let userProfileData: { id: string; username: string; saved_links: string[] | null; avatar_url?: string | null } | null = null;
    let fetchError: any = null;

    // Attempt 1: Fetch with avatar_url
    const { data: profileWithAvatar, error: errorWithAvatar } = await supabaseAdmin
        .from('users')
        .select('id, username, saved_links, avatar_url')
        .eq('id', userId)
        .single();

    if (errorWithAvatar) {
        const errorMsg = getLocalSafeErrorMessage(errorWithAvatar);
        if (errorMsg.includes('column') && errorMsg.includes('avatar_url') && (errorMsg.includes('does not exist') || errorMsg.includes('doesn\'t exist'))) {
            console.warn(`${operationId} 'avatar_url' column missing or inaccessible. Attempting to fetch user data without it. DB Error: ${errorMsg}`);
            const { data: profileWithoutAvatar, error: errorWithoutAvatar } = await supabaseAdmin
                .from('users')
                .select('id, username, saved_links')
                .eq('id', userId)
                .single();

            if (errorWithoutAvatar) {
                fetchError = errorWithoutAvatar;
            } else if (profileWithoutAvatar) {
                userProfileData = { ...profileWithoutAvatar, avatar_url: null };
            } else {
                 fetchError = new Error('User record not found after fallback.');
            }
        } else {
            fetchError = errorWithAvatar; // Different error, not related to missing avatar_url column
        }
    } else if (profileWithAvatar) {
        userProfileData = profileWithAvatar;
    } else {
        fetchError = new Error('User record not found.');
    }

    if (fetchError || !userProfileData) {
        const detail = fetchError ? getLocalSafeErrorMessage(fetchError) : 'User record not found for the ID in token.';
        console.error(`${operationId} Failed to fetch user profile for user ID ${userId}: ${detail}`, fetchError);
        return NextResponse.json({ error: `User data retrieval failed: ${detail}` }, { status: 404 });
    }
    
    console.log(`${operationId} Token validated for userId: ${userProfileData.id}. Profile links: ${userProfileData.saved_links?.length || 0}, Session links: ${validSessionSpecificLinks.length}. Avatar URL: ${userProfileData.avatar_url ? 'present' : 'null'}`);
    return NextResponse.json({
      userId: userProfileData.id,
      username: userProfileData.username,
      avatarUrl: userProfileData.avatar_url || null, // Ensure it's null if undefined or explicitly set to null
      profileSavedLinks: userProfileData.saved_links || [],
      sessionSpecificLinks: validSessionSpecificLinks,
    }, { status: 200 });

  } catch (e: any) {
    const errorMessage = getLocalSafeErrorMessage(e, 'Unexpected error during token validation.');
    console.error(`${operationId} General exception:`, errorMessage, e);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
