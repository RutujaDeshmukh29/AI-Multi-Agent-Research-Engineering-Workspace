// Edge Runtime Polyfills
// This file MUST be imported before any other imports in middleware.ts
// to ensure it executes before Next.js internals load and throw ReferenceError.

if (typeof (globalThis as any).__dirname === "undefined") {
  (globalThis as any).__dirname = "/";
}

if (typeof (globalThis as any).__filename === "undefined") {
  (globalThis as any).__filename = "/";
}
