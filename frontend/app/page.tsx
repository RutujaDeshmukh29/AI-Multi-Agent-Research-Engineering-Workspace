// app/page.tsx — root redirects to dashboard
// middleware handles auth: unauthenticated → /auth/login
import { redirect } from "next/navigation";
export default function RootPage() { redirect("/dashboard"); }
