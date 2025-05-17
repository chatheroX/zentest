
// src/app/api/generate-seb-token/route.ts
import { NextResponse, type NextRequest } from 'next/server';

// Module scope log for initial load check
console.log('[API GenerateSEBToken MODULE SCOPE] Module loading...');

// Helper for safe error message extraction (local to this file)
function getLocalSafeErrorMessage(e: any, defaultMessage = "An unknown error occurred."): string {
  if (e && typeof e === 'object') {
    if (e.name === 'AbortError') { // Specifically for fetch timeouts
      return "The request timed out.";
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
  return defaultMessage;
}


let jwt: any = null;
let jwtImportError: string | null = null;

try {
  // Attempt to load jsonwebtoken using require for diagnostics
  const jwtModule = require('jsonwebtoken');
  jwt = jwtModule;
  console.log('[API GenerateSEBToken MODULE SCOPE] jsonwebtoken module loaded successfully using require().');
} catch (e: any) {
  jwtImportError = getLocalSafeErrorMessage(e, "Failed to load 'jsonwebtoken' module using require().");
  console.error(`[API GenerateSEBToken MODULE SCOPE] CRITICAL: ${jwtImportError}`, e);
  // jwt remains null
}


export async function POST(request: NextRequest) {
  const operationId = `[API GenerateSEBToken POST ${Date.now().toString().slice(-5)}]`;
  console.log(`${operationId} Handler started.`);

  if (jwtImportError || !jwt) {
    console.error(`${operationId} Error: jsonwebtoken module not available. Import error was: ${jwtImportError}`);
    console.log(`${operationId} Preparing to send 500 response due to JWT module import failure.`);
    // Ensure this path returns a valid NextResponse object
    return NextResponse.json({ error: `Server configuration error (JWT module unavailable): ${jwtImportError || 'Unknown import error'}` }, { status: 500 });
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    const errorMsg = 'CRITICAL: JWT_SECRET is not configured on the server for token generation.';
    console.error(`${operationId} ${errorMsg} Current process.env.JWT_SECRET is undefined or empty.`);
    console.log(`${operationId} Preparing to send 500 response due to missing JWT_SECRET.`);
    return NextResponse.json({ error: 'Server configuration error (JWT secret missing for generation).' }, { status: 500 });
  }
  console.log(`${operationId} JWT_SECRET is available (length: ${jwtSecret.length}).`);

  let body;
  try {
    console.log(`${operationId} Attempting to parse request body...`);
    body = await request.json();
    console.log(`${operationId} Request body parsed:`, body);
  } catch (parseError: any) {
    const errorMsg = getLocalSafeErrorMessage(parseError, "Failed to parse request body as JSON.");
    console.error(`${operationId} Error parsing request body: ${errorMsg}`, parseError);
    console.log(`${operationId} Preparing to send 400 response due to request body parsing error.`);
    return NextResponse.json({ error: `Invalid request body: ${errorMsg}` }, { status: 400 });
  }

  const { studentId, examId } = body;

  if (!studentId || !examId) {
    const errorMsg = "Missing studentId or examId in request body.";
    console.warn(`${operationId} ${errorMsg} Body:`, body);
    console.log(`${operationId} Preparing to send 400 response due to missing parameters.`);
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
  console.log(`${operationId} Extracted studentId: ${studentId}, examId: ${examId}`);

  const payload = { studentId, examId };
  let token;

  try {
    console.log(`${operationId} Attempting to sign JWT with payload:`, payload);
    token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });
    console.log(`${operationId} JWT signed successfully. Token (first 20 chars): ${token.substring(0,20)}...`);
  } catch (signError: any) {
    const errorMsg = getLocalSafeErrorMessage(signError, "JWT signing process failed.");
    console.error(`${operationId} Error during jwt.sign: ${errorMsg}`, signError);
    console.log(`${operationId} Preparing to send 500 response due to JWT signing error.`);
    return NextResponse.json({ error: `Token generation failed internally: ${errorMsg}` }, { status: 500 });
  }

  try {
    console.log(`${operationId} Preparing to send 200 response with token.`);
    return NextResponse.json({ token }, { status: 200 });
  } catch (responseError: any) {
    // This is a last resort if NextResponse.json itself fails, though highly unlikely for a simple object.
    const errorMsg = getLocalSafeErrorMessage(responseError, "Failed to construct JSON response.");
    console.error(`${operationId} Error constructing successful JSON response: ${errorMsg}`, responseError);
    // Fallback to a plain text response if JSON response fails
    const backupResponse = new Response(JSON.stringify({ error: "Server error constructing response" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
    return backupResponse;
  }
}
