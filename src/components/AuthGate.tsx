"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

interface AuthGateProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
  allowOnboarding?: boolean;
}

export default function AuthGate({ children, requireSuperAdmin = false, allowOnboarding = false }: AuthGateProps) {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (requireSuperAdmin) {
        const res = await fetch("/api/superadmin/session");
        if (!res.ok) {
          window.location.href = "/superadmin";
          return;
        }

        setChecking(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?next=${next}`;
        return;
      }

      const res = await fetch("/api/auth/profile", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        await supabase.auth.signOut();
        window.location.href = "/login";
        return;
      }

      const profile = await res.json();

      if (profile.companyId) {
        localStorage.setItem("selectedCompanyId", profile.companyId);
      }

      if (profile.needsOnboarding && !allowOnboarding) {
        window.location.href = "/onboarding";
        return;
      }

      setChecking(false);
    };

    checkAuth();
  }, [allowOnboarding, requireSuperAdmin]);

  if (checking) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-secondary)",
        background: "var(--bg-primary)",
      }}>
        <Loader2 className="animate-spin" size={34} />
      </div>
    );
  }

  return <>{children}</>;
}
