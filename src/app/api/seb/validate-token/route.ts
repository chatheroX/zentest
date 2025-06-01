
// src/app/api/seb/validate-token/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import type { Database, UserTableType } from '@/types/supabase'; // Updated types

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
    const errorMsg = 'Server config error (JWT_SECRET).';
    console.error(`${operationId} CRITICAL: JWT_SECRET missing.`);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }

  if (!supabaseAdmin) {
    console.error(`${operationId} Supabase admin client not initialized. Init Error: ${initErrorDetails}`);
    return NextResponse.json({ error: 'Server config error (Supabase client).' }, { status: 500 });
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
    
    const { userId, sessionSpecificLinks } = decoded; // Expecting userId and optional sessionSpecificLinks
    if (!userId) {
      return NextResponse.json({ error: 'Token payload incomplete (missing userId).' }, { status: 400 });
    }

    let validSessionSpecificLinks: string[] = [];
    if (sessionSpecificLinks && Array.isArray(sessionSpecificLinks) && sessionSpecificLinks.every(l => typeof l === 'string')) {
        validSessionSpecificLinks = sessionSpecificLinks;
    } else if (sessionSpecificLinks !== undefined) {
        console.warn(`${operationId} Invalid 'sessionSpecificLinks' format in token. Received:`, sessionSpecificLinks);
    }

    // Fetch user's persistent saved_links from the 'users' table
    const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('id, username, saved_links, avatar_url') // Include avatar_url if needed on entry page
        .eq('id', userId)
        .single();

    if (profileError || !userProfile) {
        const profileDbErrorMsg = getLocalSafeErrorMessage(profileError, 'Database error fetching user profile.');
        console.error(`${operationId} Supabase error fetching user profile:`, profileDbErrorMsg, profileError);
        return NextResponse.json({ error: 'Error fetching user details: ' + profileDbErrorMsg }, { status: 500 });
    }
    const profileSavedLinks: string[] = userProfile.saved_links || [];
    
    console.log(`${operationId} Token validated for userId: ${userId}. Profile links: ${profileSavedLinks.length}, Session links: ${validSessionSpecificLinks.length}`);
    return NextResponse.json({
      userId: userProfile.id,
      username: userProfile.username, // Pass username for display
      avatarUrl: userProfile.avatar_url, // Pass avatar URL
      profileSavedLinks: profileSavedLinks,
      sessionSpecificLinks: validSessionSpecificLinks, // These are for this specific session
    }, { status: 200 });

  } catch (e: any) {
    const errorMessage = getLocalSafeErrorMessage(e, 'Unexpected error during token validation.');
    console.error(`${operationId} General exception:`, errorMessage, e);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
