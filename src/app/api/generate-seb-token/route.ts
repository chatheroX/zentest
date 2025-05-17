
// src/app/api/generate-seb-token/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import jwt from 'jsonwebtoken'; // Using standard import

// Module scope log for initial load check
console.log('[API GenerateSEBToken MODULE SCOPE] Module loading...');
let jwtModuleError: string | null = null;
try {
  if (typeof jwt.sign !== 'function') {
    throw new Error('jwt.sign is not a function. jsonwebtoken module might be corrupted or not loaded correctly.');
  }
  console.log('[API GenerateSEBToken MODULE SCOPE] jsonwebtoken module seems loaded and jwt.sign is a function.');
} catch (e: any) {
  const safeMessage = (e && typeof e === 'object' && typeof e.message === 'string') ? e.message : String(e);
  jwtModuleError = `Failed to initialize or verify 'jsonwebtoken' module at load time: ${safeMessage}`;
  console.error(`[API GenerateSEBToken MODULE SCOPE] CRITICAL: ${jwtModuleError}`, e);
}

// Local helper for safe error message extraction
function getLocalSafeErrorMessage(e: any, defaultMessage = "An unknown error occurred."): string {
  if (e && typeof e === 'object') {
    if (e.name === 'AbortError') {
      return "The request timed out.";
    } else if (typeof e.message === 'string' && e.message.trim() !== '') {
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

export async function POST(request: NextRequest) {
  const operationId = `[API GenerateSEBToken POST ${Date.now().toString().slice(-5)}]`;
  console.log(`${operationId} Handler started.`);

  if (jwtModuleError || typeof jwt.sign !== 'function') {
    console.error(`${operationId} Error: jsonwebtoken module not available or jwt.sign is not a function. Import error was: ${jwtModuleError || 'jwt.sign is not a function post-load'}`);
    return NextResponse.json({ error: `Server configuration error (JWT module unavailable): ${jwtModuleError || 'jwt.sign not available'}` }, { status: 500 });
  }

  const jwtSecret = process.env.NEXT_PUBLIC_JWT_SECRET;

  if (!jwtSecret) {
    const errorMsg = 'Server configuration error (JWT secret missing for generation).';
    // More detailed server-side log for this specific case
    console.error(`${operationId} CRITICAL: NEXT_PUBLIC_JWT_SECRET is not configured on the server. This variable is required by the token generation API. Value found: '${jwtSecret === undefined ? "undefined" : jwtSecret}'. Please check your .env file and ensure the server was restarted.`);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
  console.log(`${operationId} NEXT_PUBLIC_JWT_SECRET is available (length: ${jwtSecret.length}).`);

  let body;
  try {
    console.log(`${operationId} Attempting to parse request body...`);
    body = await request.json();
    console.log(`${operationId} Request body parsed:`, body);
  } catch (parseError: any) {
    const errorMsg = getLocalSafeErrorMessage(parseError, "Failed to parse request body as JSON.");
    console.error(`${operationId} Error parsing request body: ${errorMsg}`, parseError);
    return NextResponse.json({ error: `Invalid request body: ${errorMsg}` }, { status: 400 });
  }

  const { studentId, examId } = body;

  if (!studentId || !examId) {
    const errorMsg = "Missing studentId or examId in request body.";
    console.warn(`${operationId} ${errorMsg} Body:`, body);
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
  console.log(`${operationId} Extracted studentId: ${studentId}, examId: ${examId}`);

  const payload = { studentId, examId }; // Ensure these match what /api/seb/validate-token expects
  let token;

  try {
    console.log(`${operationId} Attempting to sign JWT with payload:`, payload);
    token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' }); // Standard expiry for SEB tokens
    console.log(`${operationId} JWT signed successfully. Token (first 20 chars): ${token ? token.substring(0,20) + "..." : "TOKEN_GENERATION_FAILED"}`);
  } catch (signError: any) {
    const errorMsg = getLocalSafeErrorMessage(signError, "JWT signing process failed.");
    console.error(`${operationId} Error during jwt.sign: ${errorMsg}`, signError);
    return NextResponse.json({ error: `Token generation failed internally: ${errorMsg}` }, { status: 500 });
  }

  console.log(`${operationId} Preparing to send 200 response with token.`);
  return NextResponse.json({ token }, { status: 200 });
}
