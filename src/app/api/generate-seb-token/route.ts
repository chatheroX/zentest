
// src/app/api/generate-seb-token/route.ts
import { NextResponse, type NextRequest } from 'next/server';
// Using require for jsonwebtoken as it might be causing issues with ES module resolution in some environments or with specific Next.js builds for API routes.
// This is a diagnostic step as well.

// Module scope logging to check if the module itself is loaded
const moduleLoadLogPrefix = '[API GenerateSEBToken MODULE SCOPE]';
let localJwt: any = null; // Use 'any' for dynamic require for diagnostics
let jwtModuleError: string | null = null;

try {
  console.log(`${moduleLoadLogPrefix} Attempting to load 'jsonwebtoken' module...`);
  localJwt = require('jsonwebtoken');
  if (typeof localJwt.sign !== 'function') {
    throw new Error('localJwt.sign is not a function. jsonwebtoken module might be corrupted or not loaded correctly.');
  }
  console.log(`${moduleLoadLogPrefix} jsonwebtoken module loaded successfully using require().`);
} catch (e: any) {
  const safeMessage = (e && typeof e === 'object' && typeof e.message === 'string') ? e.message : String(e);
  jwtModuleError = `Failed to initialize or verify 'jsonwebtoken' module at load time: ${safeMessage}`;
  console.error(`${moduleLoadLogPrefix} CRITICAL: ${jwtModuleError}`, e);
}

// Simplified local helper for safe error message extraction for server-side logging
function getLocalSafeServerErrorMessage(e: any, defaultMessage = "An unknown server error occurred."): string {
  if (e && typeof e === 'object') {
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


export async function POST(request: NextRequest) {
  const operationId = `[API GenerateSEBToken POST ${Date.now().toString().slice(-5)}]`;
  console.log(`${operationId} Handler started.`);

  // Outermost try-catch to ensure a JSON response is always attempted
  try {
    if (jwtModuleError || !localJwt) {
      const errorMsg = `Server configuration error (JWT library unavailable): ${jwtModuleError || 'jsonwebtoken module not available'}`;
      console.error(`${operationId} CRITICAL: ${errorMsg}`);
      console.log(`${operationId} Preparing to send 500 response due to JWT library issue.`);
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    const currentJwtSecretValue = process.env.NEXT_PUBLIC_JWT_SECRET; // As per user's last instruction for deployment
    console.log(`${operationId} Value of process.env.NEXT_PUBLIC_JWT_SECRET at runtime: '${currentJwtSecretValue}' (Type: ${typeof currentJwtSecretValue})`);

    if (!currentJwtSecretValue) {
      const errorMsg = 'Server configuration error (JWT secret missing for generation).';
      console.error(`${operationId} CRITICAL: NEXT_PUBLIC_JWT_SECRET is not configured on the server for token generation. Verified value is undefined or empty: '${currentJwtSecretValue}'`);
      console.log(`${operationId} Preparing to send 500 response due to missing NEXT_PUBLIC_JWT_SECRET.`);
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
    console.log(`${operationId} NEXT_PUBLIC_JWT_SECRET is available (length: ${currentJwtSecretValue?.length || 0}).`);

    let body;
    try {
      console.log(`${operationId} Attempting to parse request body...`);
      body = await request.json();
      console.log(`${operationId} Request body parsed:`, body);
    } catch (parseError: any) {
      const errorMsg = getLocalSafeServerErrorMessage(parseError, "Failed to parse request body as JSON.");
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

    const payload = { studentId, examId, type: 'sebEntry' }; // Added a type for clarity
    let token;

    try {
      console.log(`${operationId} Attempting to sign JWT with payload:`, payload);
      token = localJwt.sign(payload, currentJwtSecretValue, { expiresIn: '1h' }); // Using 1h expiry as per latest user context
      console.log(`${operationId} JWT signed successfully. Token (first 20 chars): ${token ? token.substring(0,20) + "..." : "TOKEN_GENERATION_FAILED"}`);
    } catch (signError: any) {
      const errorMsg = getLocalSafeServerErrorMessage(signError, "JWT signing process failed.");
      console.error(`${operationId} Error during jwt.sign: ${errorMsg}`, signError);
      console.log(`${operationId} Preparing to send 500 response due to JWT signing error.`);
      return NextResponse.json({ error: `Token generation failed internally: ${errorMsg}` }, { status: 500 });
    }

    console.log(`${operationId} Preparing to send 200 response with token.`);
    return NextResponse.json({ token }, { status: 200 });

  } catch (e: any) {
    // This is the outermost catch block to ensure *something* is returned if an unexpected error occurs
    const errorMessage = getLocalSafeServerErrorMessage(e, "A critical unhandled server error occurred in token generation.");
    console.error(`${operationId} CRITICAL UNHANDLED EXCEPTION: ${errorMessage}`, e);
    console.log(`${operationId} Preparing to send 500 response due to critical unhandled exception.`);
    return NextResponse.json({ error: "Critical server error during token generation. Please contact support." }, { status: 500 });
  }
}
