
// src/app/api/log/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database, ErrorLogInsert } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const initLogPrefix = '[API ErrorLog Init]';
let missingVarsMessage = "CRITICAL: Required server environment variable(s) are missing for error logging: ";
let criticalError = false;

if (!supabaseUrl) { missingVarsMessage += "NEXT_PUBLIC_SUPABASE_URL "; criticalError = true; }
if (!supabaseServiceKey) { missingVarsMessage += "SUPABASE_SERVICE_ROLE_KEY "; criticalError = true; }

if (criticalError) {
  missingVarsMessage += "Please check server environment configuration.";
  console.error(`${initLogPrefix} ${missingVarsMessage}`);
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request: NextRequest) {
  const operationId = `[API ErrorLog POST ${Date.now().toString().slice(-5)}]`;
  console.log(`${operationId} Received error log request.`);

  if (criticalError || !supabaseAdmin) {
    let detailedErrorForLog = "Server configuration error for error logging. ";
    if (!supabaseAdmin) detailedErrorForLog += "Supabase admin client not initialized. ";
    detailedErrorForLog += missingVarsMessage;
    console.error(`${operationId} ${detailedErrorForLog}`);
    // Cannot log this error to DB if DB connection itself is the issue.
    return NextResponse.json({ error: 'Server configuration error for logging.' }, { status: 500 });
  }

  try {
    const logData = (await request.json()) as Omit<ErrorLogInsert, 'timestamp'>; // timestamp is auto-generated or set by client

    if (!logData.location || !logData.error_message) {
      console.warn(`${operationId} Invalid log data received:`, logData);
      return NextResponse.json({ error: 'Missing location or error_message in log data.' }, { status: 400 });
    }

    const dataToInsert: ErrorLogInsert = {
      location: logData.location,
      error_message: logData.error_message,
      error_details: logData.error_details || null,
      user_context: logData.user_context || null,
      // timestamp will be handled by DB default or ensure client sends it
    };
    
    console.log(`${operationId} Attempting to insert log:`, dataToInsert);

    const { error: insertError } = await supabaseAdmin
      .from('ErrorLogs')
      .insert(dataToInsert);

    if (insertError) {
      console.error(`${operationId} Supabase error during log insert:`, insertError);
      // Avoid infinite loop if logging this error fails.
      return NextResponse.json({ error: 'Failed to save error log to database: ' + insertError.message }, { status: 500 });
    }
    
    console.log(`${operationId} Error log successfully inserted.`);
    return NextResponse.json({ message: 'Error logged successfully.' }, { status: 200 });

  } catch (e: any) {
    console.error(`${operationId} Exception during error log processing:`, e.message, e);
    // Avoid infinite loop if logging this error fails.
    return NextResponse.json({ error: 'An unexpected error occurred during log processing.' }, { status: 500 });
  }
}
