
import { NextResponse, type NextRequest } from 'next/server';
// Removed getSafeErrorMessage and logErrorToBackend imports

// Module scope logging for JWT import
let jwt: any = null;
let jwtModuleError: string | null = null;
const moduleLoadLogPrefix = '[API GenerateSEBToken MODULE SCOPE]';

try {
  console.log(`${moduleLoadLogPrefix} Attempting to load 'jsonwebtoken' module...`);
  jwt = require('jsonwebtoken'); // Using require for more direct error handling in this context
  if (typeof jwt.sign !== 'function') {
    throw new Error('jwt.sign is not a function. jsonwebtoken module might be corrupted or not loaded correctly.');
  }
  console.log(`${moduleLoadLogPrefix} jsonwebtoken module loaded successfully using require().`);
} catch (e: any) {
  const safeMessage = (e && typeof e === 'object' && typeof e.message === 'string') ? e.message : String(e);
  jwtModuleError = `Failed to initialize or verify 'jsonwebtoken' module at load time: ${safeMessage}`;
  console.error(`${moduleLoadLogPrefix} CRITICAL: ${jwtModuleError}`, e);
  // No further action here, error will be handled in POST if jwt is null
}

// Local helper for safe error message extraction, simplified as error-logging.ts was removed
function getLocalSafeErrorMessage(e: any, defaultMessage = "An unknown error occurred."): string {
  if (e && typeof e === 'object') {
    if (e.name === 'AbortError') { // Common for fetch timeouts
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

    if (jwtModuleError || !jwt) {
        console.error(`${operationId} CRITICAL: jsonwebtoken module not available. Import error was: ${jwtModuleError || 'jwt module is null post-load'}`);
        // Attempt to send a JSON response even if JWT module failed to load
        return NextResponse.json({ error: `Server configuration error (JWT library unavailable): ${jwtModuleError || 'jwt not available'}` }, { status: 500 });
    }

    const currentJwtSecretValue = process.env.NEXT_PUBLIC_JWT_SECRET;
    console.log(`${operationId} Value of process.env.NEXT_PUBLIC_JWT_SECRET at runtime: '${currentJwtSecretValue}' (Type: ${typeof currentJwtSecretValue})`);

    if (!currentJwtSecretValue) {
        const errorMsg = 'Server configuration error (JWT secret missing for generation).';
        console.error(`${operationId} CRITICAL: NEXT_PUBLIC_JWT_SECRET is not configured on the server for token generation. Verified value is undefined or empty.`);
        console.log(`${operationId} Preparing to send 500 response due to missing NEXT_PUBLIC_JWT_SECRET.`);
        return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
    console.log(`${operationId} NEXT_PUBLIC_JWT_SECRET is available (length: ${currentJwtSecretValue.length}).`);

    let body;
    try {
        console.log(`${operationId} Attempting to parse request body...`);
        body = await request.json();
        console.log(`${operationId} Request body parsed:`, body);
    } catch (parseError: any) {
        const errorMsg = getLocalSafeErrorMessage(parseError, "Failed to parse request body as JSON.");
        console.error(`${operationId} Error parsing request body: ${errorMsg}`, parseError);
        console.log(`${operationId} Preparing to send 400 response due to body parsing error.`);
        return NextResponse.json({ error: `Invalid request body: ${errorMsg}` }, { status: 400 });
    }

    const { studentId, examId } = body;

    if (!studentId || !examId) {
        const errorMsg = "Missing studentId or examId in request body.";
        console.warn(`${operationId} ${errorMsg} Body:`, body);
        console.log(`${operationId} Preparing to send 400 response due to missing params.`);
        return NextResponse.json({ error: errorMsg }, { status: 400 });
    }
    console.log(`${operationId} Extracted studentId: ${studentId}, examId: ${examId}`);

    const payload = { studentId, examId };
    let token;

    try {
        console.log(`${operationId} Attempting to sign JWT with payload:`, payload);
        token = jwt.sign(payload, currentJwtSecretValue, { expiresIn: '1h' });
        console.log(`${operationId} JWT signed successfully. Token (first 20 chars): ${token ? token.substring(0,20) + "..." : "TOKEN_GENERATION_FAILED"}`);
    } catch (signError: any) {
        const errorMsg = getLocalSafeErrorMessage(signError, "JWT signing process failed.");
        console.error(`${operationId} Error during jwt.sign: ${errorMsg}`, signError);
        console.log(`${operationId} Preparing to send 500 response due to JWT signing error.`);
        return NextResponse.json({ error: `Token generation failed internally: ${errorMsg}` }, { status: 500 });
    }

    console.log(`${operationId} Preparing to send 200 response with token.`);
    return NextResponse.json({ token }, { status: 200 });
}
