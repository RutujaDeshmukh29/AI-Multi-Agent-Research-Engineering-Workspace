// ========================
// app/page.tsx
// Root page — redirects based on auth
// Full landing page in Phase 4
// ========================

import { redirect } from "next/navigation";

export default function RootPage() {
  // For now, redirect to dashboard
  // Auth middleware will handle unauthenticated users → /auth/login
  redirect("/dashboard");
}
