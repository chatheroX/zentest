
'use client';
// SEB Utility Functions - Simplified for Compatibility Checker

export function isSebEnvironment(): boolean {
  if (typeof window !== 'undefined' && window.navigator) {
    const sebKeywords = ['SEB', 'SafeExamBrowser'];
    const userAgent = window.navigator.userAgent;
    return sebKeywords.some(keyword => userAgent.includes(keyword));
  }
  return false;
}

export function isOnline(): boolean {
  if (typeof window !== 'undefined' && window.navigator) {
    return window.navigator.onLine;
  }
  return true; 
}

// The following checks are less critical for a simple compatibility/link checker
// but can be kept for robustness or if more advanced checks are desired later.

export function areDevToolsLikelyOpen(): boolean {
  if (typeof window !== 'undefined') {
    const threshold = 170; 
    const devtoolsOpen = (window.outerWidth - window.innerWidth > threshold) ||
                         (window.outerHeight - window.innerHeight > threshold);
    if (devtoolsOpen) {
      console.warn('[SEB Utils] Warning: Developer tools might be open.');
    }
    return devtoolsOpen;
  }
  return false;
}

export function isWebDriverActive(): boolean {
  if (typeof window !== 'undefined' && window.navigator) {
    const webDriverActive = !!(navigator as any).webdriver;
    if (webDriverActive) {
      console.warn('[SEB Utils] Warning: WebDriver (automation tool) detected.');
    }
    return webDriverActive;
  }
  return false;
}

// Basic shortcut blocking, can be expanded if specific restrictions are needed
// For a link checker, this might be overly restrictive.
export function attemptBlockShortcuts(event: KeyboardEvent): void {
  const key = event.key.toLowerCase();
  const ctrlOrMeta = event.ctrlKey || event.metaKey;

  // Example: Block Ctrl/Cmd + P (Print), Ctrl/Cmd + S (Save)
  if (ctrlOrMeta && (key === 'p' || key === 's')) {
    console.warn(`[SEB Utils] Attempted to block shortcut: ${event.ctrlKey ? 'Ctrl' : 'Cmd'} + ${key}`);
    event.preventDefault();
    event.stopPropagation();
    // onFlagEvent?.({ type: 'shortcut_attempt', details: `Blocked: ${key}` }); // If flagging is needed
  }
}

export function disableContextMenu(event: MouseEvent): void {
  console.warn('[SEB Utils] Context menu (right-click) attempted and blocked.');
  event.preventDefault();
  // onFlagEvent?.({ type: 'shortcut_attempt', details: 'Context menu disabled' });
}

export function disableCopyPaste(event: ClipboardEvent): void {
  const eventType = event.type as 'copy' | 'paste';
  console.warn(`[SEB Utils] Clipboard event (${eventType}) attempted and blocked.`);
  event.preventDefault();
  // onFlagEvent?.({ type: eventType === 'copy' ? 'copy_attempt' : 'paste_attempt', details: `Clipboard ${eventType} blocked` });
}
