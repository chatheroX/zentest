
'use client';

// Enhanced SEB Utility Functions

/**
 * Checks if the code is running within a Safe Exam Browser environment.
 * It looks for specific keywords in the navigator.userAgent.
 */
export function isSebEnvironment(): boolean {
  if (typeof window !== 'undefined' && window.navigator) {
    const sebKeywords = ['SEB', 'SafeExamBrowser'];
    const userAgent = window.navigator.userAgent;
    // console.log('[SEB Utils] User Agent:', userAgent);
    return sebKeywords.some(keyword => userAgent.includes(keyword));
  }
  return false; // Default to false if not in a browser environment
}

/**
 * Checks if the browser is currently online.
 */
export function isOnline(): boolean {
  if (typeof window !== 'undefined' && window.navigator) {
    return window.navigator.onLine;
  }
  return true; // Assume online in non-browser environments or if navigator is missing
}

/**
 * Heuristic check to see if developer tools are likely open.
 * This is not foolproof and can be bypassed.
 * SEB client configuration is the primary way to block DevTools.
 */
export function areDevToolsLikelyOpen(): boolean {
  if (typeof window !== 'undefined') {
    const threshold = 170; // Difference in pixels between outer and inner dimensions
    const devtoolsOpen = (window.outerWidth - window.innerWidth > threshold) ||
                         (window.outerHeight - window.innerHeight > threshold);
    if (devtoolsOpen) {
      console.warn('[SEB Utils] Warning: Developer tools might be open (screen dimension heuristic).');
    }
    // Advanced check attempt (often unreliable due to browser security)
    // try {
    //   const element = new Image();
    //   Object.defineProperty(element, 'id', {
    //     get: () => {
    //       console.warn('[SEB Utils] Developer tools detected via object property inspection (if devtools are inspecting this object).');
    //       return 'devtools-check';
    //     },
    //   });
    //   console.log('%c', element); // Logging the element might trigger the getter if devtools are inspecting it
    // } catch (e) { /* Silently fail if this advanced check is blocked */ }
    return devtoolsOpen;
  }
  return false;
}

/**
 * Checks if WebDriver (used by automation tools like Selenium) is active.
 */
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

/**
 * Tries to block common keyboard shortcuts.
 * Note: Effective shortcut blocking is best handled by SEB client configuration.
 * This JavaScript-based blocking is a supplemental layer.
 * @param event The KeyboardEvent.
 */
export function attemptBlockShortcuts(event: KeyboardEvent): void {
  const key = event.key.toLowerCase();
  const ctrlOrMeta = event.ctrlKey || event.metaKey; // Ctrl on Windows/Linux, Cmd on Mac

  // Examples of shortcuts to potentially block (customize as needed)
  const commonShortcuts = ['c', 'v', 'x', 'a', 'p', 's', 'f', 'r', 't', 'w', 'u', 'i', 'j', 'o', 'n', 'z', 'y'];
  
  if (ctrlOrMeta && commonShortcuts.includes(key)) {
    console.warn(`[SEB Utils] Attempted to block Ctrl/Cmd+${key} shortcut.`);
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  // Block function keys (F1-F12)
  if (key.startsWith('f') && !isNaN(parseInt(key.substring(1)))) {
    console.warn(`[SEB Utils] Attempted to block function key: ${event.key}.`);
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  // Block Alt key combinations (e.g., Alt+Tab, Alt+F4)
  // This is very hard to reliably block from JS; SEB config is essential here.
  if (event.altKey && (key === 'tab' || key === 'f4' || key === 'arrowleft' || key === 'arrowright')) {
    console.warn(`[SEB Utils] Attempted to block Alt+${key} shortcut.`);
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  
  // Block specific keys like Escape, Tab (if not combined with Alt)
  if ((key === 'escape' || key === 'tab') && !event.altKey && !event.ctrlKey && !event.metaKey) {
    // Allow tab for accessibility within forms IF SEB config doesn't handle it.
    // However, for strict proctoring, SEB should disable tabbing out of specific fields.
    // This JS block is aggressive if SEB doesn't already restrict tab.
    // console.warn(`[SEB Utils] Attempted to block standalone key: ${event.key}.`);
    // event.preventDefault();
    // event.stopPropagation();
    // return;
  }
}

/**
 * Disables the context menu (right-click).
 * @param event The MouseEvent.
 */
export function disableContextMenu(event: MouseEvent): void {
  console.warn('[SEB Utils] Context menu (right-click) attempted and blocked.');
  event.preventDefault();
}

/**
 * Disables copy and paste events.
 * @param event The ClipboardEvent.
 */
export function disableCopyPaste(event: ClipboardEvent): void {
  console.warn(`[SEB Utils] Clipboard event (${event.type}) attempted and blocked.`);
  event.preventDefault();
}

/**
 * Heuristic check for Virtual Machine environments.
 * This is highly unreliable from client-side JavaScript.
 * SEB provides more robust VM detection mechanisms.
 */
export function isVMLikely(): boolean {
  // Example heuristic (very basic and can have false positives/negatives):
  // Checking screen resolution or performance metrics is generally not reliable.
  const suspiciousConcurrency = typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency < 2;
  if (suspiciousConcurrency) {
    console.warn('[SEB Utils] Info: Low hardware concurrency detected, which might indicate a VM (unreliable check).');
  }
  // You could add other checks like WebGL renderer info if desired, but they are also spoofable.
  // E.g., const gl = document.createElement('canvas').getContext('webgl');
  // const renderer = gl?.getParameter(gl.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL);
  // if (renderer && /virtual|vmware|vbox/i.test(renderer)) { console.warn('[SEB Utils] Suspicious WebGL renderer.'); return true; }
  return suspiciousConcurrency;
}
