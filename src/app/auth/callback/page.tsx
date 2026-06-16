"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Completing Google sign in...");

  useEffect(() => {
    const finishAuth = async () => {
      const supabase = getSupabaseBrowserClient();
      const code = searchParams.get("code");
      const next = searchParams.get("next");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage(error.message);
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        window.location.href = "/login";
        return;
      }

      const res = await fetch("/api/auth/profile", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const profile = await res.json();

      if (!res.ok) {
        const details = profile.details ? ` (${profile.details})` : "";
        setMessage(`${profile.error || "Unable to resolve account."}${details}`);
        return;
      }

      if (profile.companyId) {
        localStorage.setItem("selectedCompanyId", profile.companyId);
      }

      if (profile.role === "SUPER_ADMIN") {
        window.location.href = "/superadmin";
        return;
      }

      if (profile.needsOnboarding) {
        window.location.href = "/onboarding";
        return;
      }

      window.location.href = next || "/admin";
    };

    finishAuth();
  }, [searchParams]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "12px",
      color: "var(--text-secondary)",
      background: "var(--bg-primary)",
    }}>
      <Loader2 className="animate-spin" size={30} />
      <span>{message}</span>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackContent />
    </Suspense>
  );
}
