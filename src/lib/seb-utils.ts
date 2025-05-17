
'use client';

export function isSebEnvironment(): boolean {
  if (typeof window !== 'undefined' && window.navigator) {
    const sebKeywords = ['SEB', 'SafeExamBrowser'];
    const userAgent = window.navigator.userAgent;
    // console.log('[SEB Utils] User Agent:', userAgent);
    return sebKeywords.some(keyword => userAgent.includes(keyword));
  }
  return false;
}

export function isOnline(): boolean {
  if (typeof window !== 'undefined' && window.navigator) {
    return window.navigator.onLine;
  }
  return true; // Default to true in non-browser env or if navigator is missing
}

export function areDevToolsLikelyOpen(): boolean {
  if (typeof window !== 'undefined') {
    const threshold = 170; // Increased threshold slightly
    const devtoolsOpen = (window.outerWidth - window.innerWidth > threshold) ||
                         (window.outerHeight - window.innerHeight > threshold);
    if (devtoolsOpen) {
      // console.warn('[SEB Utils] Developer tools likely open.');
    }
    // A more direct check that sometimes works, but can be bypassed
    // const element = new Image();
    // Object.defineProperty(element, 'id', {
    //   get: () => {
    //     // console.warn('[SEB Utils] Developer tools detected via getter.');
    //     // This only works if devtools are open AND inspecting this specific object
    //     return 'devtools';
    //   },
    // });
    // console.log('%c', element); // Log the element to trigger the getter if inspected
    return devtoolsOpen;
  }
  return false;
}

export function isWebDriverActive(): boolean {
  if (typeof window !== 'undefined' && window.navigator) {
    const webDriverActive = !!(navigator as any).webdriver;
    if (webDriverActive) {
      // console.warn('[SEB Utils] WebDriver (automation) detected.');
    }
    return webDriverActive;
  }
  return false;
}

// This function attempts to block common shortcuts.
// Key blocking is primarily SEB's responsibility via .seb config.
export function attemptBlockShortcuts(event: KeyboardEvent): void {
  const key = event.key.toLowerCase();
  const ctrlOrMeta = event.ctrlKey || event.metaKey;

  // Block common Ctrl/Cmd shortcuts
  if (ctrlOrMeta && ['c', 'v', 'x', 'a', 'p', 's', 'f', 'r', 't', 'w', 'u', 'i', 'j', 'o'].includes(key)) {
    console.warn(`[SEB Utils] Blocked Ctrl/Cmd+${key} shortcut`);
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  // Block function keys F1-F12
  if (key.startsWith('f') && !isNaN(parseInt(key.substring(1)))) {
    console.warn(`[SEB Utils] Blocked function key: ${event.key}`);
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  // Block Alt key combinations (e.g., Alt+Tab, Alt+F4)
  if (event.altKey && (key === 'tab' || key === 'f4')) {
    console.warn(`[SEB Utils] Blocked Alt+${key} shortcut`);
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  // Block specific keys like Escape, Tab (if not combined with Alt, which SEB should handle better)
  if (['escape', 'tab'].includes(key) && !event.altKey) {
    console.warn(`[SEB Utils] Blocked key: ${event.key}`);
    event.preventDefault();
    event.stopPropagation();
    return;
  }
}


export function disableContextMenu(event: MouseEvent): void {
  // console.warn('[SEB Utils] Context menu (right-click) blocked.');
  event.preventDefault();
}

export function disableCopyPaste(event: ClipboardEvent): void {
  // console.warn(`[SEB Utils] Clipboard event (${event.type}) blocked.`);
  event.preventDefault();
}

// Additional checks (conceptual, reliability varies)
export function isVMLikely(): boolean {
  // This is very heuristic and unreliable. SEB's own VM detection is better.
  const suspiciousConcurrency = typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency < 2;
  if (suspiciousConcurrency) {
    // console.warn('[SEB Utils] Low hardware concurrency detected, possibly a VM.');
  }
  return suspiciousConcurrency;
}
