
// /src/lib/crypto-utils.ts
'use client';

// Helper to get a safe error message
function getSafeErrorMessage(e: any, fallbackMessage = "An unknown error occurred."): string {
    if (e && typeof e === 'object') {
        if (e.name === 'AbortError') {
            return "The request timed out. Please check your connection and try again.";
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


// WARNING: THIS IS A DEMONSTRATION AND USES A HARDCODED KEY.
// DO NOT USE THIS IN PRODUCTION WITHOUT A PROPER KEY MANAGEMENT STRATEGY.
// A securely managed, non-extractable key is crucial for real security.
const VERY_INSECURE_HARDCODED_KEY = 'abcdefghijklmnopqrstuvwxyz123456'; // Exactly 32 ASCII characters

async function getKeyMaterial(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyStringForLog = VERY_INSECURE_HARDCODED_KEY; 
  const keyData = enc.encode(keyStringForLog);

  if (keyData.byteLength !== 32) {
    const errorMessage = `CRITICAL: Encryption key is not 32 bytes long. Expected 32 bytes, but got ${keyData.byteLength} bytes for key string "${keyStringForLog}" (character length ${keyStringForLog.length}). Please check configuration.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false, 
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(data: Record<string, any>): Promise<string | null> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    console.error('Web Crypto API not available. Cannot encrypt.');
    // No logErrorToBackend
    return null;
  }
  try {
    const key = await getKeyMaterial();
    const iv = crypto.getRandomValues(new Uint8Array(12)); 
    const encodedData = new TextEncoder().encode(JSON.stringify(data));

    const encryptedContent = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encodedData
    );

    const encryptedBuffer = new Uint8Array(encryptedContent);
    const resultBuffer = new Uint8Array(iv.length + encryptedBuffer.length);
    resultBuffer.set(iv);
    resultBuffer.set(encryptedBuffer, iv.length);

    return btoa(String.fromCharCode.apply(null, Array.from(resultBuffer)));
  } catch (error: any) {
    const errorMessage = getSafeErrorMessage(error, 'Encryption failed.');
    console.error(errorMessage, error); 
    // No logErrorToBackend
    return null;
  }
}

export async function decryptData<T = Record<string, any>>(encryptedBase64: string): Promise<T | null> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    console.error('Web Crypto API not available. Cannot decrypt.');
    // No logErrorToBackend
    return null;
  }
  try {
    const key = await getKeyMaterial();
    
    const encryptedDataWithIv = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    
    if (encryptedDataWithIv.length < 12) { // IV is 12 bytes
        const shortDataError = "Decryption failed: Encrypted data is too short to contain IV.";
        console.error(shortDataError);
        // No logErrorToBackend
        return null;
    }

    const iv = encryptedDataWithIv.slice(0, 12);
    const encryptedContent = encryptedDataWithIv.slice(12);

    const decryptedContent = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encryptedContent
    );

    const decodedData = new TextDecoder().decode(decryptedContent);
    return JSON.parse(decodedData) as T;
  } catch (error: any) {
    let errorMessage = getSafeErrorMessage(error, 'Decryption failed.');
    let isOperationError = false;

    if (error && typeof error === 'object' && error.name === 'OperationError') {
      isOperationError = true;
      errorMessage = "Decryption failed: Likely incorrect key or tampered/corrupt data (OperationError).";
    }
    
    console.error(errorMessage, error); 
    // No logErrorToBackend
    return null;
  }
}
