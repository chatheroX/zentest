
// src/app/api/generate-seb-token/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { getSafeErrorMessage, logErrorToBackend } from '@/lib/error-logging';

const jwtSecret = process.env.JWT_SECRET;

const initLogPrefix = '[API GenerateSEBToken Init]';
if (!jwtSecret) {
  const errorMsg = "CRITICAL: JWT_SECRET environment variable is not defined on the server.";
  console.error(`${initLogPrefix} ${errorMsg}`);
  // Log this critical configuration error (non-blocking for server start, but endpoint will fail)
  // No await here for logErrorToBackend as it's init phase
  logErrorToBackend(new Error(errorMsg), 'API-GenerateSEBToken-Init-MissingSecret');
}

export async function POST(request: NextRequest) {
  const operationId = `[API GenerateSEBToken POST ${Date.now().toString().slice(-5)}]`;
  console.log(`${operationId} Received request.`);

  if (!jwtSecret) {
    const errorMsg = "Server configuration error: JWT secret not set, cannot generate token.";
    console.error(`${operationId} ${errorMsg}`);
    await logErrorToBackend(new Error(errorMsg), 'API-GenerateSEBToken-Runtime-MissingSecret');
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }

  try {
    const body = await request.json();
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

    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: "1h", // Token expiry set to 1 hour
    });
    
    console.log(`${operationId} JWT generated successfully for student: ${studentId}, exam: ${examId}`);
    return NextResponse.json({ token }, { status: 200 });

  } catch (e: any) {
    const errorMessage = getSafeErrorMessage(e, 'An unexpected error occurred while generating the SEB token.');
    console.error(`${operationId} Exception during token generation:`, errorMessage, e);
    await logErrorToBackend(e, 'API-GenerateSEBToken-Exception');
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

    