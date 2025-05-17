// src/app/api/generate-seb-token/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import jwt from 'jsonwebtoken'; // This import could be problematic if the module is corrupted or not found

console.log('[API GenerateSEBToken MODULE SCOPE] Module loading...'); // Log module load attempt

// Local helper to get a safe error message
function getLocalSafeErrorMessage(e: any, fallbackMessage = "An unknown error occurred."): string {
    if (e && typeof e === 'object') {
        if (e.name === 'AbortError') { // Common for fetch timeouts
            return "The request timed out. Please check your connection and try again.";
        }
        if (typeof e.message === 'string' && e.message.trim() !== '') {
            return e.message;
        }
        try {
            // Avoid overly long stringifications if the object is huge or circular
            // A more robust approach for complex objects might involve specific property checks
            const strError = JSON.stringify(e, Object.getOwnPropertyNames(e), 2); // Limit depth if needed
            if (strError !== '{}' && strError.length > 2 && strError.length < 1024) return `Error object: ${strError}`;
            else if (strError.length >= 1024) return "Error object too large to stringify for this context.";
        } catch (stringifyError) { 
            // Fall through if stringify fails (e.g., circular structure not handled by getOwnPropertyNames)
        }
    }
    // If it's not a typical error object, or if stringify failed, try String() conversion
    if (e !== null && e !== undefined) {
        const stringifiedError = String(e);
        if (stringifiedError.trim() !== '' && stringifiedError.trim() !== '[object Object]') {
            return stringifiedError;
        }
    }
    return fallbackMessage;
}


export async function POST(request: NextRequest) {
    const operationId = `[API GenerateSEBToken POST ${Date.now().toString().slice(-5)}]`;
    console.log(`${operationId} Handler started.`);

    let jwtSecret: string | undefined;
    try {
        jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error(`${operationId} CRITICAL: JWT_SECRET is not defined in server environment variables.`);
            return NextResponse.json({ error: 'Server configuration error: JWT secret missing.' }, { status: 500 });
        }
        console.log(`${operationId} JWT_SECRET is available (length: ${jwtSecret.length}).`);
    } catch (envError: any) {
        const errMsg = getLocalSafeErrorMessage(envError, 'Server configuration error accessing environment.');
        console.error(`${operationId} Error accessing environment variables:`, errMsg, envError);
        return NextResponse.json({ error: errMsg }, { status: 500 });
    }

    let studentId: string | undefined;
    let examId: string | undefined;
    let requestBody;

    try {
        console.log(`${operationId} Attempting to parse request body...`);
        requestBody = await request.json();
        console.log(`${operationId} Request body parsed successfully:`, requestBody);

        studentId = requestBody.studentId;
        examId = requestBody.examId;

        if (!studentId || !examId) {
            const errorMsg = "Missing studentId or examId in request body.";
            console.warn(`${operationId} ${errorMsg} Request body:`, requestBody);
            return NextResponse.json({ error: errorMsg }, { status: 400 });
        }
        console.log(`${operationId} studentId: ${studentId}, examId: ${examId}`);

        const payload = { studentId, examId };
        console.log(`${operationId} Attempting to sign JWT with payload:`, payload);

        const token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });
        console.log(`${operationId} JWT signed successfully. Token (first 20 chars): ${token.substring(0, 20)}...`);

        console.log(`${operationId} Attempting to return successful token response.`);
        return NextResponse.json({ token }, { status: 200 });

    } catch (error: any) {
        const errorMessage = getLocalSafeErrorMessage(error, 'Failed to generate token due to an unexpected server error.');
        console.error(`${operationId} CRITICAL EXCEPTION during token generation. StudentId: ${studentId}, ExamId: ${examId}. Raw Error:`, error);
        console.error(`${operationId} Extracted error message for response:`, errorMessage);
        
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
console.log('[API GenerateSEBToken MODULE SCOPE] Module loaded successfully.'); // Log successful module load
