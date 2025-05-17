
// src/app/api/generate-seb-token/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

// Simplified safe error message getter, as the shared one was removed.
function getLocalSafeErrorMessage(e: any, fallbackMessage = "An unknown error occurred."): string {
    if (e && typeof e === 'object') {
        if (e.name === 'AbortError') {
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
    return fallbackMessage;
}

export async function POST(request: NextRequest) {
  const operationId = `[API GenerateSEBToken POST ${Date.now().toString().slice(-5)}]`;
  console.log(`${operationId} Handler started.`);

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    const errorMsg = "CRITICAL: JWT_SECRET is not defined in server environment variables.";
    console.error(`${operationId} ${errorMsg}`);
    // No logErrorToBackend, directly return response
    return NextResponse.json({ error: 'Server configuration error: JWT secret missing.' }, { status: 500 });
  }
  console.log(`${operationId} JWT_SECRET is available (length: ${jwtSecret.length}).`);

  let studentId: string | undefined;
  let examId: string | undefined;

  try {
    console.log(`${operationId} Attempting to parse request body...`);
    const body = await request.json();
    console.log(`${operationId} Request body parsed:`, body);

    studentId = body.studentId;
    examId = body.examId;

    if (!studentId || !examId) {
      const errorMsg = "Missing studentId or examId in request body.";
      console.warn(`${operationId} ${errorMsg} Request body:`, body);
      // No logErrorToBackend
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }
    console.log(`${operationId} studentId: ${studentId}, examId: ${examId}`);

    const payload = { studentId, examId };
    console.log(`${operationId} Attempting to sign JWT with payload:`, payload);

    const token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });
    console.log(`${operationId} JWT signed successfully. Token (first 20 chars): ${token.substring(0, 20)}...`);

    return NextResponse.json({ token }, { status: 200 });

  } catch (error: any) {
    const errorMessage = getLocalSafeErrorMessage(error, 'Failed to generate token due to an unexpected server error.');
    console.error(`${operationId} Exception during token generation. StudentId: ${studentId}, ExamId: ${examId}. Raw Error:`, error);
    console.error(`${operationId} Extracted error message:`, errorMessage);
    
    // No logErrorToBackend
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
