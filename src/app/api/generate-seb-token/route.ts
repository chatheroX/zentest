
// src/app/api/generate-seb-token/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import jwt from 'jsonwebtoken'; // Using standard import

// Helper for safe error message extraction for server-side logging
function getLocalSafeServerErrorMessage(e: any, defaultMessage = "An unknown server error occurred."): string {
  if (e && typeof e === 'object') {
    if (typeof e.message === 'string' && e.message.trim() !== '') return e.message;
    try {
      const strError = JSON.stringify(e);
      if (strError !== '{}' && strError.length > 2) return `Error object: ${strError}`;
    } catch (stringifyError) { /* Fall through */ }
  }
  if (e !== null && e !== undefined) {
    const stringifiedError = String(e);
    if (stringifiedError.trim() !== '' && stringifiedError !== '[object Object]') return stringifiedError;
  }
  return defaultMessage;
}

export async function POST(request: NextRequest) {
  const operationId = `[API GenerateSEBToken POST ${Date.now().toString().slice(-5)}]`;
  console.log(`${operationId} Handler started.`);

  try {
    const jwtSecretValue = process.env.JWT_SECRET;
    if (!jwtSecretValue) {
      const errorMsg = 'Server configuration error (JWT_SECRET missing).';
      console.error(`${operationId} CRITICAL: ${errorMsg}`);
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
    console.log(`${operationId} JWT_SECRET is available.`);

    let body;
    try {
      body = await request.json();
    } catch (parseError: any) {
      const errorMsg = getLocalSafeServerErrorMessage(parseError, "Failed to parse request body.");
      console.error(`${operationId} Error parsing request body: ${errorMsg}`, parseError);
      return NextResponse.json({ error: `Invalid request body: ${errorMsg}` }, { status: 400 });
    }

    const { userId, sessionSpecificLinks } = body; // Expecting userId and optional session-specific links

    if (!userId) {
      const errorMsg = "Missing userId in request body.";
      console.warn(`${operationId} ${errorMsg} Body:`, body);
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }
    console.log(`${operationId} Extracted userId: ${userId}, SessionSpecificLinks:`, sessionSpecificLinks);

    // Simplified payload for SEB token, primarily carrying userId
    const payload: Record<string, any> = { userId, type: 'sebEntry' };
    if (sessionSpecificLinks && Array.isArray(sessionSpecificLinks) && sessionSpecificLinks.every(l => typeof l === 'string')) {
        payload.sessionSpecificLinks = sessionSpecificLinks;
    } else if (sessionSpecificLinks !== undefined) {
        console.warn(`${operationId} Invalid 'sessionSpecificLinks' format. Expected array of strings. Received:`, sessionSpecificLinks);
    }
    
    let token;
    try {
      token = jwt.sign(payload, jwtSecretValue, { expiresIn: '2h' }); // Token valid for 2 hours
    } catch (signError: any) {
      const errorMsg = getLocalSafeServerErrorMessage(signError, "JWT signing process failed.");
      console.error(`${operationId} Error during jwt.sign: ${errorMsg}`, signError);
      return NextResponse.json({ error: `Token generation failed internally: ${errorMsg}` }, { status: 500 });
    }

    console.log(`${operationId} SEB token generated successfully for userId: ${userId}.`);
    return NextResponse.json({ token }, { status: 200 });

  } catch (e: any) {
    const errorMessage = getLocalSafeServerErrorMessage(e, "Critical unhandled server error in token generation.");
    console.error(`${operationId} CRITICAL UNHANDLED EXCEPTION: ${errorMessage}`, e);
    return NextResponse.json({ error: "Critical server error during token generation." }, { status: 500 });
  }
}
