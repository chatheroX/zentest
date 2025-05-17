
// src/app/api/generate-seb-token/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { getSafeErrorMessage, logErrorToBackend } from '@/lib/error-logging';

export async function POST(request: NextRequest) {
  const operationId = `[API GenerateSEBToken ${Date.now().toString().slice(-5)}]`;
  console.log(`${operationId} Handler started.`);

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    const errorMsg = "CRITICAL: JWT_SECRET is not defined in server environment variables.";
    console.error(`${operationId} ${errorMsg}`);
    // Do not await logErrorToBackend here to ensure response is sent
    logErrorToBackend(new Error(errorMsg), 'API-GenerateSEBToken-NoSecret', { location: operationId });
    return NextResponse.json({ error: 'Server configuration error: JWT secret missing.' }, { status: 500 });
  }
  console.log(`${operationId} JWT_SECRET is available.`);

  try {
    const body = await request.json();
    console.log(`${operationId} Request body parsed:`, body);

    const { studentId, examId } = body;

    if (!studentId || !examId) {
      const errorMsg = "Missing studentId or examId in request body.";
      console.warn(`${operationId} ${errorMsg} Request body:`, body);
      // Do not await logErrorToBackend
      logErrorToBackend(new Error(errorMsg), 'API-GenerateSEBToken-MissingParams', { body, location: operationId });
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }
    console.log(`${operationId} studentId: ${studentId}, examId: ${examId}`);

    const payload = { studentId, examId };
    console.log(`${operationId} Attempting to sign JWT with payload:`, payload);

    const token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });
    console.log(`${operationId} JWT signed successfully. Token (first 20 chars): ${token.substring(0, 20)}...`);

    return NextResponse.json({ token }, { status: 200 });

  } catch (error: any) {
    // Use the robust error message extraction pattern
    const errorMessage = (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string')
      ? error.message
      : String(error);

    console.error(`${operationId} Error during token generation:`, errorMessage, error);
    // Do not await logErrorToBackend
    logErrorToBackend(error, 'API-GenerateSEBToken-CatchAll', { rawError: error, extractedMessage: errorMessage, location: operationId });
    
    return NextResponse.json({ error: `Failed to generate token: ${errorMessage}` }, { status: 500 });
  }
}
