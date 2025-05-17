
// src/app/api/generate-seb-token/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { getSafeErrorMessage, logErrorToBackend } from '@/lib/error-logging';

const initLogPrefix = '[API GenerateSEBToken Init]';
const serverSideJwtSecret = process.env.JWT_SECRET;

if (!serverSideJwtSecret) {
  const errorMsg = "CRITICAL: JWT_SECRET environment variable is not defined on the server at module initialization.";
  console.error(`${initLogPrefix} ${errorMsg}`);
  // Non-blocking at init, but POST will fail if still not present.
  // We could log this to backend if a logging mechanism independent of this API was available.
}

export async function POST(request: NextRequest) {
  const operationId = `[API GenerateSEBToken POST ${Date.now().toString().slice(-5)}]`;
  console.log(`${operationId} Received request. JWT_SECRET available at runtime: ${!!process.env.JWT_SECRET}`);

  const currentJwtSecret = process.env.JWT_SECRET; // Re-check at runtime

  if (!currentJwtSecret) {
    const errorMsg = "Server configuration error: JWT secret not set on the server at runtime, cannot generate token.";
    console.error(`${operationId} ${errorMsg}`);
    // Try to log to backend, but this itself might fail if dependent services are down.
    await logErrorToBackend(new Error(errorMsg), 'API-GenerateSEBToken-Runtime-MissingSecret');
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch (e: any) {
    const errorMsg = "Failed to parse request body as JSON.";
    console.error(`${operationId} ${errorMsg}`, e);
    // Attempt to log the raw body text if parsing failed
    const rawBodyText = await request.text().catch(() => "Could not read raw request body.");
    await logErrorToBackend(e, 'API-GenerateSEBToken-ParseBodyError', { rawBody: rawBodyText });
    return NextResponse.json({ error: errorMsg, detail: getSafeErrorMessage(e) }, { status: 400 });
  }

  try {
    const { studentId, examId } = body;

    if (!studentId || !examId) {
      const errorMsg = "Missing studentId or examId in request body.";
      console.warn(`${operationId} ${errorMsg} Body:`, body);
      await logErrorToBackend(new Error(errorMsg), 'API-GenerateSEBToken-MissingParams', { requestBody: body });
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const payload = {
      studentId,
      examId,
      // You could add other claims here if needed, like 'iat' (issued at) or specific permissions
    };
    
    console.log(`${operationId} Attempting to sign JWT with payload:`, payload);
    let token;
    try {
      token = jwt.sign(payload, currentJwtSecret, {
        expiresIn: "1h", // Token expiry set to 1 hour
      });
    } catch (signError: any) {
        const errorMsg = "Failed to sign JWT.";
        console.error(`${operationId} ${errorMsg}`, signError);
        await logErrorToBackend(signError, 'API-GenerateSEBToken-JWTSignError', { payload });
        return NextResponse.json({ error: errorMsg, detail: getSafeErrorMessage(signError) }, { status: 500 });
    }
    
    console.log(`${operationId} JWT generated successfully for student: ${studentId}, exam: ${examId}`);
    return NextResponse.json({ token }, { status: 200 });

  } catch (e: any) {
    // This is a fallback catch for any other unexpected errors in the main logic
    const errorMessage = getSafeErrorMessage(e, 'An unexpected error occurred while generating the SEB token.');
    console.error(`${operationId} Exception during token generation:`, errorMessage, e);
    await logErrorToBackend(e, 'API-GenerateSEBToken-GeneralException', { requestBody: body }); // body might be defined here
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
    