
// src/app/api/generate-seb-token/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import jwt from 'jsonwebtoken'; // If this line throws, the module isn't found or installed
import { getSafeErrorMessage, logErrorToBackend } from '@/lib/error-logging';

// No module-scoped process.env access here, do it inside POST

export async function POST(request: NextRequest) {
  const operationId = `[API GenerateSEBToken POST ${Date.now().toString().slice(-5)}]`;
  console.log(`${operationId} Handler started.`); // VERY FIRST LOG

  const currentJwtSecret = process.env.JWT_SECRET;

  if (!currentJwtSecret) {
    const errorMsg = "Server configuration error: JWT_SECRET not set on server at runtime. Cannot generate token.";
    console.error(`${operationId} ${errorMsg}`);
    // Not awaiting logErrorToBackend here to ensure response is sent
    logErrorToBackend(new Error(errorMsg), 'API-GenerateSEBToken-Runtime-MissingSecret');
    console.log(`${operationId} Attempting to return 500 JSON for missing JWT_SECRET:`, { error: errorMsg });
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
  console.log(`${operationId} JWT_SECRET is available.`);

  let body;
  try {
    body = await request.json();
    console.log(`${operationId} Request body parsed successfully:`, body);
  } catch (e: any) {
    const errorMsg = "Failed to parse request body as JSON.";
    console.error(`${operationId} ${errorMsg}`, e);
    const rawBodyText = await request.text().catch(() => "Could not read raw request body.");
    logErrorToBackend(e, 'API-GenerateSEBToken-ParseBodyError', { rawBody: rawBodyText });
    console.log(`${operationId} Attempting to return 400 JSON for body parse error:`, { error: errorMsg, detail: getSafeErrorMessage(e) });
    return NextResponse.json({ error: errorMsg, detail: getSafeErrorMessage(e) }, { status: 400 });
  }

  try {
    const { studentId, examId } = body;

    if (!studentId || !examId) {
      const errorMsg = "Missing studentId or examId in request body.";
      console.warn(`${operationId} ${errorMsg} Body:`, body);
      logErrorToBackend(new Error(errorMsg), 'API-GenerateSEBToken-MissingParams', { requestBody: body });
      console.log(`${operationId} Attempting to return 400 JSON for missing params:`, { error: errorMsg });
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }
    console.log(`${operationId} studentId and examId extracted:`, { studentId, examId });

    const payload = { studentId, examId };
    
    console.log(`${operationId} Attempting to sign JWT with payload:`, payload);
    let token;
    try {
      token = jwt.sign(payload, currentJwtSecret, { expiresIn: "1h" }); // Ensure jwt is imported
      console.log(`${operationId} JWT signed successfully.`);
    } catch (signError: any) {
        const errorMsg = "Failed to sign JWT.";
        console.error(`${operationId} ${errorMsg}`, signError);
        logErrorToBackend(signError, 'API-GenerateSEBToken-JWTSignError', { payload });
        console.log(`${operationId} Attempting to return 500 JSON for JWT sign error:`, { error: errorMsg, detail: getSafeErrorMessage(signError) });
        return NextResponse.json({ error: errorMsg, detail: getSafeErrorMessage(signError) }, { status: 500 });
    }
    
    console.log(`${operationId} JWT generated. Attempting to return 200 JSON with token.`);
    return NextResponse.json({ token }, { status: 200 });

  } catch (e: any) {
    // This is a fallback catch for any other unexpected errors in the main logic
    const errorMessage = getSafeErrorMessage(e, 'An unexpected error occurred while generating the SEB token.');
    console.error(`${operationId} General exception during token generation:`, errorMessage, e);
    // Pass the actual error 'e' to logErrorToBackend for more detailed logging
    logErrorToBackend(e, 'API-GenerateSEBToken-GeneralException', { requestBodyContent: body });
    console.log(`${operationId} Attempting to return 500 JSON for general exception:`, { error: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
    
