
// src/app/api/generate-seb-token/route.ts
import { NextResponse, type NextRequest } from 'next/server';
// Comment out jwt import for this minimal test
// import jwt from 'jsonwebtoken';

// Module scope log
console.log('[API GenerateSEBToken MODULE SCOPE] Minimal test version loading...');

export async function POST(request: NextRequest) {
  const operationId = `[API GenerateSEBToken POST Minimal ${Date.now().toString().slice(-5)}]`;
  console.log(`${operationId} Handler started (minimal test version).`);

  try {
    // Directly return a success response without any processing
    console.log(`${operationId} Attempting to return hardcoded success response.`);
    return NextResponse.json({ token: "test_minimal_api_works" }, { status: 200 });

  } catch (error: any) {
    // This catch block should ideally not be reached if the above try is just a return
    console.error(`${operationId} CRITICAL UNEXPECTED EXCEPTION in minimal handler:`, error);
    // Fallback error response
    return NextResponse.json(
      { error: 'Minimal API handler encountered an unexpected critical error.' },
      { status: 500 }
    );
  }
}

console.log('[API GenerateSEBToken MODULE SCOPE] Minimal test version loaded successfully.');
