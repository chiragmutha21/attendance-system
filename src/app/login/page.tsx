"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck, Sparkles, Mail, Lock, LogIn, UserPlus } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

function LoginContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  // Clear any existing session on mount so repeat users must sign in
  useEffect(() => {
    const handleLoginMount = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
      } catch (err) {
        console.error("Error clearing session on mount:", err);
      }
    };
    handleLoginMount();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
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
    } catch (err: any) {
      setError(err.message || "Failed to start Google sign in");
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const supabase = getSupabaseBrowserClient();
      
      if (isSignUp) {
        // Sign Up Mode
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }

        if (data.session) {
          const next = searchParams.get("next") || "";
          window.location.href = `/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;
        } else {
          setMessage("Registration successful! Please check your email for a confirmation link.");
          setLoading(false);
        }
      } else {
        // Sign In Mode
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
      }
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
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
      <div className="glass-panel" style={{ width: "100%", maxWidth: "440px", padding: "40px 32px", position: "relative", overflow: "hidden" }}>
        {/* Decorative background glow inside the card */}
        <div style={{
          position: "absolute",
          top: "-50px",
          left: "-50px",
          width: "150px",
          height: "150px",
          borderRadius: "50%",
          background: "var(--color-primary-glow)",
          filter: "blur(50px)",
          opacity: 0.5,
          pointerEvents: "none"
        }} />
        
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "54px",
            height: "54px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
            boxShadow: "0 0 20px rgba(139, 92, 246, 0.4)"
          }}>
            <Sparkles size={26} color="#fff" />
          </div>
        </div>
        
        <h1 className="glow-text-purple" style={{ color: "#fff", fontSize: "1.85rem", fontWeight: 800, marginBottom: "6px" }}>SmartOffice</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "32px" }}>
          Workforce & Attendance Tracking Portal
        </p>

        {/* Tab Headers */}
        <div style={{
          display: "flex",
          background: "rgba(255, 255, 255, 0.03)",
          padding: "4px",
          borderRadius: "10px",
          border: "1px solid var(--border-light)",
          marginBottom: "24px"
        }}>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setError("");
              setMessage("");
            }}
            style={{
              flex: 1,
              padding: "10px",
              background: !isSignUp ? "rgba(139, 92, 246, 0.15)" : "transparent",
              border: "none",
              borderRadius: "8px",
              color: !isSignUp ? "#fff" : "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.88rem",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setError("");
              setMessage("");
            }}
            style={{
              flex: 1,
              padding: "10px",
              background: isSignUp ? "rgba(139, 92, 246, 0.15)" : "transparent",
              border: "none",
              borderRadius: "8px",
              color: isSignUp ? "#fff" : "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.88rem",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            Create Account
          </button>
        </div>

        {/* Email & Password Authentication Form */}
        <form onSubmit={handleEmailAuth} style={{ display: "flex", flexDirection: "column", gap: "18px", textAlign: "left" }}>
          <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
              <Mail size={14} /> Email Address
            </label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              style={{ paddingLeft: "16px" }}
            />
          </div>
          
          <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
              <Lock size={14} /> Password
            </label>
            <input
              type="password"
              required
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              style={{ paddingLeft: "16px" }}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", marginTop: "6px", height: "46px" }}>
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : isSignUp ? (
              <>
                <UserPlus size={18} /> Register Now
              </>
            ) : (
              <>
                <LogIn size={18} /> Enter Portal
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          display: "flex",
          alignItems: "center",
          margin: "24px 0",
          color: "var(--text-muted)",
          fontSize: "0.75rem",
          textTransform: "uppercase",
          letterSpacing: "1px"
        }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
          <span style={{ padding: "0 10px" }}>or continue with</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
        </div>

        {/* Google Authentication Button */}
        <button
          type="button"
          className="btn btn-outline"
          onClick={signInWithGoogle}
          disabled={loading}
          style={{
            width: "100%",
            height: "46px",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--border-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            color: "#f3f4f6",
            fontSize: "0.92rem",
            fontWeight: 600
          }}
        >
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <ShieldCheck size={18} color="var(--color-secondary)" />
          )}
          Google Identity
        </button>

        {/* Feedback Messages */}
        {error && (
          <div style={{
            marginTop: "20px",
            padding: "12px",
            borderRadius: "8px",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            color: "#fca5a5",
            fontSize: "0.82rem",
            lineHeight: "1.4"
          }}>
            {error}
          </div>
        )}
        
        {message && (
          <div style={{
            marginTop: "20px",
            padding: "12px",
            borderRadius: "8px",
            background: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            color: "#a7f3d0",
            fontSize: "0.82rem",
            lineHeight: "1.4"
          }}>
            {message}
          </div>
        )}
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
