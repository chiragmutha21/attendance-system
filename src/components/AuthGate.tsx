"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

interface AuthGateProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
  allowOnboarding?: boolean;
}

let globalIsAuthed = false;

export default function AuthGate({ children, requireSuperAdmin = false, allowOnboarding = false }: AuthGateProps) {
  const [checking, setChecking] = useState(() => !globalIsAuthed);

  useEffect(() => {
    const checkAuth = async () => {
      if (requireSuperAdmin) {
        const res = await fetch("/api/superadmin/session");
        if (!res.ok) {
          window.location.href = "/superadmin";
          return;
        }

        globalIsAuthed = true;
        setChecking(false);
        return;
      }

      // Check local session for offline / localhost testing
      const isLocal = typeof window !== "undefined" && (
        document.cookie.includes("local_admin_session=admin") ||
        document.cookie.includes("local_admin_session=superadmin") ||
        localStorage.getItem("local_admin_session") === "1"
      );

      if (isLocal) {
        const storedCompanyId = localStorage.getItem("selectedCompanyId") || "00000000-0000-0000-0000-000000000000";
        if (!localStorage.getItem("selectedCompanyId")) {
          localStorage.setItem("selectedCompanyId", storedCompanyId);
        }

        const isSuperAdminLocal = 
          document.cookie.includes("local_admin_session=superadmin") || 
          localStorage.getItem("local_admin_session") === "superadmin";

        // Check if onboarding is needed for 1st time new company admin
        if (!isSuperAdminLocal && !allowOnboarding) {
          const adminEmail = (localStorage.getItem("adminEmail") || "").toLowerCase().trim();
          const isMarkedOnboarded = 
            localStorage.getItem("onboarded_" + storedCompanyId) === "true" ||
            (adminEmail && localStorage.getItem("onboarded_" + adminEmail) === "true") ||
            document.cookie.includes("admin_onboarded=true");

          if (!isMarkedOnboarded && adminEmail && adminEmail !== "admin@example.com") {
            try {
              const res = await fetch("/api/auth/profile", {
                headers: {
                  "x-admin-email": adminEmail,
                  "x-company-id": storedCompanyId,
                },
              });
              if (res.ok) {
                const profile = await res.json();
                if (profile.needsOnboarding) {
                  window.location.href = "/onboarding";
                  return;
                }
              }
            } catch (err) {
              console.warn("AuthGate profile check fallback:", err);
            }
          }
        }

        globalIsAuthed = true;
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

      globalIsAuthed = true;
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
