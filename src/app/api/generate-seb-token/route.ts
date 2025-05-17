
// src/app/api/generate-seb-token/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

// Module scope log for initial load check
console.log('[API GenerateSEBToken MODULE SCOPE] Minimal test version loading...');

// Local helper for safe error message extraction
function getLocalSafeErrorMessage(e: any, defaultMessage = "An unknown error occurred."): string {
  if (e && typeof e === 'object') {
    if (e.name === 'AbortError') { // Specifically for fetch timeouts (though not used here)
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

export async function POST(request: NextRequest) {
  const operationId = `[API GenerateSEBToken POST ${Date.now().toString().slice(-5)}]`;
  console.log(`${operationId} Handler started.`);

  // IMPORTANT: Using NEXT_PUBLIC_JWT_SECRET as per user's .env configuration for deployment.
  // For better security, consider using a non-public server-side variable if your deployment allows.
  const jwtSecret = process.env.NEXT_PUBLIC_JWT_SECRET;

  if (!jwtSecret) {
    const errorMsg = 'CRITICAL: NEXT_PUBLIC_JWT_SECRET is not configured on the server. This is required for token generation.';
    console.error(`${operationId} ${errorMsg}`);
    // Do not call logErrorToBackend here as it was removed
    return NextResponse.json({ error: 'Server configuration error (JWT secret missing for generation).' }, { status: 500 });
  }
  console.log(`${operationId} NEXT_PUBLIC_JWT_SECRET is available (length: ${jwtSecret.length}).`);

  try {
    console.log(`${operationId} Attempting to parse request body...`);
    const body = await request.json();
    console.log(`${operationId} Request body parsed:`, body);

    const { studentId, examId } = body;

    if (!studentId || !examId) {
      console.warn(`${operationId} Missing studentId or examId in request body. Body:`, body);
      return NextResponse.json({ error: 'Missing studentId or examId in request.' }, { status: 400 });
    }
    console.log(`${operationId} Extracted studentId: ${studentId}, examId: ${examId}`);

    const payload = { studentId, examId };
    console.log(`${operationId} Attempting to sign JWT with payload:`, payload);

    const token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });
    console.log(`${operationId} JWT signed successfully. Token (first 20 chars): ${token.substring(0,20)}...`);

    return NextResponse.json({ token }, { status: 200 });

  } catch (error: any) {
    const errorMessage = getLocalSafeErrorMessage(error, 'An unexpected error occurred during token generation.');
    console.error(`${operationId} Exception during token generation:`, errorMessage, error);
    // Do not call logErrorToBackend here as it was removed
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

console.log('[API GenerateSEBToken MODULE SCOPE] Minimal test version loaded successfully.');
