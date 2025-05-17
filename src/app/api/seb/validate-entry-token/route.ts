
// src/app/api/seb/validate-entry-token/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { parseISO, isValid as isValidDate } from 'date-fns'; // Import date-fns helpers

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Enhanced logging for environment variables
const initLogPrefix = '[API ValidateEntryToken Init]';
console.log(`${initLogPrefix} NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'NOT SET'}`);
console.log(`${initLogPrefix} SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? 'SET (value hidden)' : 'NOT SET'}`);

if (!supabaseUrl || !supabaseServiceKey) {
  let missingVarsMessage = "CRITICAL: Required Supabase environment variable(s) are missing: ";
  if (!supabaseUrl) missingVarsMessage += "NEXT_PUBLIC_SUPABASE_URL ";
  if (!supabaseServiceKey) missingVarsMessage += "SUPABASE_SERVICE_ROLE_KEY ";
  missingVarsMessage += "Please check server environment configuration.";
  console.error(`${initLogPrefix} ${missingVarsMessage}`);
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request: NextRequest) {
  const operationId = `[API ValidateEntryToken ${Date.now().toString().slice(-5)}]`;
  console.log(`${operationId} Received request.`);

  if (!supabaseAdmin) {
    let detailedErrorForLog = "Supabase admin client not initialized for validation. ";
    if (!supabaseUrl) detailedErrorForLog += "NEXT_PUBLIC_SUPABASE_URL is missing. ";
    if (!supabaseServiceKey) detailedErrorForLog += "SUPABASE_SERVICE_ROLE_KEY is missing. ";
    detailedErrorForLog += "Check server environment variables.";
    console.error(`${operationId} ${detailedErrorForLog}`);
    return NextResponse.json({ error: 'Server configuration error for token validation.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { token } = body;
    console.log(`${operationId} Token received for validation:`, token ? token.substring(0,10) + "..." : "UNDEFINED");


    if (!token || typeof token !== 'string') {
      console.warn(`${operationId} Invalid or missing token in request body.`);
      return NextResponse.json({ error: 'Invalid token provided.' }, { status: 400 });
    }

    console.log(`${operationId} Querying SebEntryTokens for token: ${token}`);
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('SebEntryTokens')
      .select('student_user_id, exam_id, status, expires_at, created_at') 
      .eq('token', token)
      .single();

    if (tokenError) {
      console.error(`${operationId} Supabase error fetching token ${token.substring(0,10) + "..."}:`, tokenError.message, tokenError);
      if (tokenError.code === 'PGRST116') { // Not found
        return NextResponse.json({ error: 'Entry token not found or already claimed/expired.' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Error validating token. ' + tokenError.message }, { status: 500 });
    }
    
    if (!tokenData) {
      console.warn(`${operationId} Token not found in database: ${token.substring(0,10) + "..."}`);
      return NextResponse.json({ error: 'Invalid or expired entry token (not found).' }, { status: 404 });
    }

    console.log(`${operationId} Token data found:`, { ...tokenData, token: token.substring(0,10) + "..." });


    if (tokenData.status !== 'pending') {
      console.warn(`${operationId} Token ${token.substring(0,10) + "..."} has already been used or invalidated. Status: ${tokenData.status}`);
      return NextResponse.json({ error: 'Entry token has already been used or invalidated.' }, { status: 403 });
    }

    if (!tokenData.expires_at || !isValidDate(parseISO(tokenData.expires_at)) || new Date(tokenData.expires_at) < new Date()) {
      console.warn(`${operationId} Token ${token.substring(0,10) + "..."} has expired. Expires at: ${tokenData.expires_at}`);
      // Optionally update status to 'expired' in DB
      const { error: expireUpdateError } = await supabaseAdmin.from('SebEntryTokens').update({ status: 'expired' }).eq('token', token);
      if (expireUpdateError) console.error(`${operationId} Failed to update token ${token.substring(0,10) + "..."} to expired:`, expireUpdateError.message);
      return NextResponse.json({ error: 'Entry token has expired.' }, { status: 403 });
    }

    // Mark token as claimed
    console.log(`${operationId} Attempting to mark token ${token.substring(0,10) + "..."} as claimed.`);
    const { error: updateError } = await supabaseAdmin
      .from('SebEntryTokens')
      .update({ status: 'claimed' })
      .eq('token', token);

    if (updateError) {
      console.error(`${operationId} Failed to update token status for ${token.substring(0,10) + "..."}:`, updateError.message, updateError);
      return NextResponse.json({ error: 'Failed to process token (update failed).' }, { status: 500 });
    }

    console.log(`${operationId} Token ${token.substring(0,10) + "..."} successfully validated and claimed.`);
    return NextResponse.json({
      student_user_id: tokenData.student_user_id,
      exam_id: tokenData.exam_id,
    }, { status: 200 });

  } catch (e: any) {
    console.error(`${operationId} Exception during token validation:`, e.message, e);
    return NextResponse.json({ error: 'An unexpected error occurred during token validation.' }, { status: 500 });
  }
}

