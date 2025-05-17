
// src/app/api/generate-seb-token/route.ts
import { NextResponse, type NextRequest } from 'next/server';
// Removed: import jwt from 'jsonwebtoken';
// Removed: import { getSafeErrorMessage, logErrorToBackend } from '@/lib/error-logging';

export async function POST(request: NextRequest) {
  const operationId = `[API GenerateSEBToken MinimalTest ${Date.now().toString().slice(-5)}]`;
  console.log(`${operationId} Minimal test handler invoked.`);

  try {
    // Attempt to parse the body just to see if this part works, but don't rely on its content for this test.
    try {
      await request.json();
      console.log(`${operationId} Request body parsed (or was empty).`);
    } catch (parseError) {
      console.warn(`${operationId} Could not parse request body, but proceeding with minimal response. Error:`, parseError);
    }

    console.log(`${operationId} Attempting to return a hardcoded success response.`);
    return NextResponse.json({ token: "test_token_from_minimal_api" }, { status: 200 });

  } catch (e: any) {
    // This catch is for truly unexpected errors even in this minimal setup.
    console.error(`${operationId} Unhandled exception in minimal handler:`, e);
    // Try to send a JSON response, but this might also fail if the issue is fundamental.
    return NextResponse.json({ error: "Minimal API handler failed unexpectedly.", details: (e && typeof e.message === 'string') ? e.message : String(e) }, { status: 500 });
  }
}
