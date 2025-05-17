
'use client';
import type { FlaggedEvent, FlaggedEventType } from '@/types/supabase';

// Enhanced SEB Utility Functions

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
  return true; 
}

export function areDevToolsLikelyOpen(): boolean {
  if (typeof window !== 'undefined') {
    const threshold = 170; 
    const devtoolsOpen = (window.outerWidth - window.innerWidth > threshold) ||
                         (window.outerHeight - window.innerHeight > threshold);
    if (devtoolsOpen) {
      console.warn('[SEB Utils] Warning: Developer tools might be open (screen dimension heuristic).');
    }
    // A more involved check (less reliable due to browser variations):
    // let devtoolsDetected = false;
    // const el = document.createElement('div');
    // Object.defineProperty(el, 'id', {
    //   get: () => { devtoolsDetected = true; }
    // });
    // console.log(el); // Trigger the getter if devtools are inspecting console.log
    // return devtoolsOpen || devtoolsDetected;
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

export function attemptBlockShortcuts(event: KeyboardEvent, onFlagEvent?: (eventData: Pick<FlaggedEvent, 'type' | 'details'>) => void): void {
  const key = event.key.toLowerCase();
  const ctrlOrMeta = event.ctrlKey || event.metaKey;

  // More comprehensive list of shortcuts often used for cheating/exiting
  const commonShortcutsToBlock = [
    'c', 'v', 'x', 'a', // Clipboard & Select all
    'p', 's', // Print, Save
    'f', 'g', // Find, Find next
    'r', 't', 'w', 'n', // Refresh, New Tab/Window, Close Tab/Window
    'u', 'i', 'j', 'o', // View Source, DevTools variations, Downloads, History
    'insert', 'printscreen', 'contextmenu', 'escape', // Other problematic keys
    'home', 'end', 'pageup', 'pagedown', // Navigation that could be disruptive
  ];
  const functionKeysToBlock = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12'];
  
  let blocked = false;
  let detail = '';

  if (ctrlOrMeta && commonShortcutsToBlock.includes(key)) {
    blocked = true;
    detail = `Ctrl/Cmd + ${key}`;
  } else if (functionKeysToBlock.includes(key)) {
    blocked = true;
    detail = event.key;
  } else if (event.altKey && (key === 'tab' || key === 'f4' || key === 'arrowleft' || key === 'arrowright' || key === 'escape')) {
    blocked = true;
    detail = `Alt + ${key}`;
  } else if (key === 'escape' && !ctrlOrMeta && !event.altKey) { // Standalone Escape
    blocked = true;
    detail = 'Escape';
  }
  // Windows key / Command key (alone or with other keys) is very hard to block from JS.
  // This needs to be handled by SEB configuration (e.g., "Hooked Keys").

  if (blocked) {
    console.warn(`[SEB Utils] Attempted to block shortcut: ${detail}`);
    event.preventDefault();
    event.stopPropagation();
    onFlagEvent?.({ type: 'shortcut_attempt', details: `Blocked: ${detail}` });
  }
}

export function disableContextMenu(event: MouseEvent, onFlagEvent?: (eventData: Pick<FlaggedEvent, 'type' | 'details'>) => void): void {
  console.warn('[SEB Utils] Context menu (right-click) attempted and blocked.');
  event.preventDefault();
  onFlagEvent?.({ type: 'shortcut_attempt', details: 'Context menu disabled' });
}

export function disableCopyPaste(event: ClipboardEvent, onFlagEvent?: (eventData: Pick<FlaggedEvent, 'type' | 'details'>) => void): void {
  const eventType = event.type as 'copy' | 'paste';
  console.warn(`[SEB Utils] Clipboard event (${eventType}) attempted and blocked.`);
  event.preventDefault();
  onFlagEvent?.({ type: eventType === 'copy' ? 'copy_attempt' : 'paste_attempt', details: `Clipboard ${eventType} blocked` });
}

// Stricter input restriction for "A–Z, Arrow Keys, and Mouse" as per prompt.
// Mouse input is handled by browser naturally. This focuses on keyboard.
export function addInputRestrictionListeners(
  onFlagEvent: (eventData: Pick<FlaggedEvent, 'type' | 'details'>) => void
): () => void {
  const handleKeyDown = (event: KeyboardEvent) => {
    const key = event.key;
    const keyCode = event.keyCode; // Using keyCode for broader compatibility with some special keys if needed.

    // Allow letters (A-Z, a-z)
    if ((keyCode >= 65 && keyCode <= 90)) {
      return;
    }
    // Allow Arrow keys
    if (keyCode >= 37 && keyCode <= 40) {
      return;
    }
    // Allow Backspace and Delete for text editing (implicitly required for typing answers)
    if (key === 'Backspace' || key === 'Delete' ) {
        return;
    }
    // Allow Space
    if (key === ' ') {
        return;
    }
    // Allow Tab for navigating between options (accessibility) - though SEB should control tabbing out of exam
    if (key === 'Tab') {
        return;
    }
    // Allow Enter (e.g., if a question type needed it, or for accessibility with radio buttons)
    if (key === 'Enter') {
        return;
    }

    // Block anything else if no modifier keys (Ctrl, Alt, Meta) are pressed.
    // Modifiers are allowed through because SEB might allow specific OS shortcuts or for accessibility.
    // The attemptBlockShortcuts function would handle specific ctrl/meta/alt + key combos.
    if (!event.ctrlKey && !event.metaKey && !event.altKey) {
      console.warn(`[SEB Utils - Input Restriction] Disallowed key pressed: ${key} (Code: ${keyCode})`);
      event.preventDefault(); // Prevent the default action of the key press.
      event.stopPropagation(); // Stop the event from bubbling up.
      onFlagEvent({ type: 'disallowed_key_pressed', details: `Key: ${key}` });
    }
  };

  document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
  return () => {
    document.removeEventListener('keydown', handleKeyDown, true);
  };
}


export function isVMLikely(): boolean {
  const suspiciousConcurrency = typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency < 2;
  if (suspiciousConcurrency) {
    console.warn('[SEB Utils] Info: Low hardware concurrency detected, which might indicate a VM (unreliable check).');
  }
  // Add more heuristics here if needed, e.g., checking WebGL renderer string for "VMware", "VirtualBox", "Parallels"
  // const canvas = document.createElement('canvas');
  // const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  // if (gl) {
  //   const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  //   if (debugInfo) {
  //     const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
  //     if (typeof renderer === 'string' && /virtual|vmware|vbox|parallels|qemu|hyper-v/i.test(renderer)) {
  //       console.warn(`[SEB Utils] Suspicious WebGL Renderer: ${renderer}`);
  //       return true;
  //     }
  //   }
  // }
  return suspiciousConcurrency;
}
