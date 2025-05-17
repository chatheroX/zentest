// src/app/api/seb/validate-entry-token/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { parseISO, isValid as isValidDate } from 'date-fns'; // Import date-fns helpers

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("CRITICAL: Supabase URL or Service Key missing for API route /api/seb/validate-entry-token.");
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient<Database>(supabaseUrl, supabaseServiceKey) 
  : null;

export async function POST(request: NextRequest) {
  const operationId = `[API ValidateEntryToken ${Date.now().toString().slice(-5)}]`;
  console.log(`${operationId} Received request.`);

  if (!supabaseAdmin) {
    console.error(`${operationId} Supabase admin client not initialized. Check server environment variables.`);
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
      .select('student_user_id, exam_id, status, expires_at, created_at') // Include created_at for logging
      .eq('token', token)
      .single();

    if (tokenError) {
      console.error(`${operationId} Supabase error fetching token ${token}:`, tokenError.message, tokenError);
      return NextResponse.json({ error: 'Error validating token. ' + tokenError.message }, { status: 500 });
    }
    
    if (!tokenData) {
      console.warn(`${operationId} Token not found in database: ${token}`);
      return NextResponse.json({ error: 'Invalid or expired entry token (not found).' }, { status: 404 });
    }

    console.log(`${operationId} Token data found:`, { ...tokenData, token: token.substring(0,10) + "..." });


    if (tokenData.status !== 'pending') {
      console.warn(`${operationId} Token ${token} has already been used or invalidated. Status: ${tokenData.status}`);
      return NextResponse.json({ error: 'Entry token has already been used or invalidated.' }, { status: 403 });
    }

    if (!isValidDate(parseISO(tokenData.expires_at)) || new Date(tokenData.expires_at) < new Date()) {
      console.warn(`${operationId} Token ${token} has expired. Expires at: ${tokenData.expires_at}`);
      // Optionally update status to 'expired' in DB
      const { error: expireUpdateError } = await supabaseAdmin.from('SebEntryTokens').update({ status: 'expired' }).eq('token', token);
      if (expireUpdateError) console.error(`${operationId} Failed to update token ${token} to expired:`, expireUpdateError.message);
      return NextResponse.json({ error: 'Entry token has expired.' }, { status: 403 });
    }

    // Mark token as claimed
    console.log(`${operationId} Attempting to mark token ${token} as claimed.`);
    const { error: updateError } = await supabaseAdmin
      .from('SebEntryTokens')
      .update({ status: 'claimed' })
      .eq('token', token);

    if (updateError) {
      console.error(`${operationId} Failed to update token status for ${token}:`, updateError.message, updateError);
      return NextResponse.json({ error: 'Failed to process token (update failed).' }, { status: 500 });
    }

    console.log(`${operationId} Token ${token} successfully validated and claimed.`);
    return NextResponse.json({
      student_user_id: tokenData.student_user_id,
      exam_id: tokenData.exam_id,
    }, { status: 200 });

  } catch (e: any) {
    console.error(`${operationId} Exception during token validation:`, e.message, e);
    return NextResponse.json({ error: 'An unexpected error occurred during token validation.' }, { status: 500 });
  }
}
