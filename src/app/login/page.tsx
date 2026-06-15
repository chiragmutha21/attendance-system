"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

function LoginContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const redirectIfLoggedIn = async () => {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        window.location.href = "/auth/callback";
      }
    };

    redirectIfLoggedIn();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError("");

    const supabase = getSupabaseBrowserClient();
    const next = searchParams.get("next") || "";
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, "");
    const redirectTo = `${appUrl}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      background: "radial-gradient(circle at center, #111322 0%, #06070a 100%)",
    }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "420px", padding: "32px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "18px" }}>
          <Sparkles size={28} color="var(--color-primary)" />
        </div>
        <h1 style={{ color: "#fff", fontSize: "1.8rem", marginBottom: "8px" }}>SmartOffice Login</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "28px" }}>
          Continue with Google to access your company attendance dashboard.
        </p>
        <button type="button" className="btn btn-primary" onClick={signInWithGoogle} disabled={loading} style={{ width: "100%" }}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
          Continue with Google
        </button>
        {error && <p style={{ color: "#fca5a5", marginTop: "16px", fontSize: "0.85rem" }}>{error}</p>}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
