
// src/app/api/log/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database, ErrorLogInsert } from '@/types/supabase';
import { getSafeErrorMessage } from '@/lib/error-logging';

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
  // Cannot use logErrorToBackend here as this IS the logging mechanism
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
    // Avoid infinite loop if logging itself fails due to config
    return NextResponse.json({ error: 'Server configuration error for logging prevented actual log storage.' }, { status: 500 });
  }

  try {
    const logData = (await request.json()) as Omit<ErrorLogInsert, 'timestamp' | 'log_id'>; 

    if (!logData.location || !logData.error_message) {
      console.warn(`${operationId} Invalid log data received:`, logData);
      return NextResponse.json({ error: 'Missing location or error_message in log data.' }, { status: 400 });
    }
    
    // Construct the final payload ensuring all parts are handled safely
    const dataToInsert: Omit<ErrorLogInsert, 'log_id' | 'timestamp'> = {
      location: typeof logData.location === 'string' ? logData.location : 'UnknownLocation',
      error_message: typeof logData.error_message === 'string' ? logData.error_message : 'NoErrorMessageProvided',
      error_details: logData.error_details || null, // Already JSONB, should be fine
      user_context: logData.user_context || null, // Already JSONB
    };
    
    console.log(`${operationId} Attempting to insert log:`, dataToInsert);

    const { error: insertError } = await supabaseAdmin
      .from('ErrorLogs')
      .insert(dataToInsert); // log_id and timestamp have defaults in DB

    if (insertError) {
      const insertErrorMsg = getSafeErrorMessage(insertError, 'Supabase insert failed.');
      console.error(`${operationId} Supabase error during log insert:`, insertErrorMsg, insertError);
      return NextResponse.json({ error: 'Failed to save error log to database: ' + insertErrorMsg }, { status: 500 });
    }
    
    console.log(`${operationId} Error log successfully inserted.`);
    return NextResponse.json({ message: 'Error logged successfully.' }, { status: 200 });

  } catch (e: any) {
    // If the /api/log itself has an error, we can only console.error it.
    const errorMessage = getSafeErrorMessage(e, 'An unexpected error occurred during log processing in /api/log.');
    console.error(`${operationId} Exception during error log processing:`, errorMessage, e);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
