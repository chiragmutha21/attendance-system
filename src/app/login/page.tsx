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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.")) {
        setIsLocalhost(true);
      }
    }
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError("");

    const supabase = getSupabaseBrowserClient();
    const next = searchParams.get("next") || "";
    const appUrl = window.location.origin.replace(/\/$/, "");
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

  const signInWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      const next = searchParams.get("next") || "";
      window.location.href = `/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
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
          Access your company attendance dashboard.
        </p>

        {!showEmailForm ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button type="button" className="btn btn-primary" onClick={signInWithGoogle} disabled={loading} style={{ width: "100%" }}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
              Continue with Google
            </button>
            {isLocalhost && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowEmailForm(true)}
                style={{ width: "100%", fontSize: "0.85rem" }}
              >
                Sign in with Email
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={signInWithEmail} style={{ display: "flex", flexDirection: "column", gap: "14px", textAlign: "left" }}>
            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>Email Address</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>Password</label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", marginTop: "8px" }}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : "Sign In"}
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowEmailForm(false)}
              style={{ width: "100%", fontSize: "0.85rem" }}
            >
              Back to Google Sign In
            </button>
          </form>
        )}

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
