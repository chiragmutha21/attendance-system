"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck, Sparkles, Mail, Lock, LogIn } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

function LoginContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
      const emailTrimmed = email.trim();
      const emailLower = emailTrimmed.toLowerCase();
      
      // If SuperAdmin
      if (emailLower === "presivox@gmail.com" || emailLower === "superadmin@example.com") {
        const res = await fetch("/api/superadmin/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailTrimmed, password }),
        });
        if (res.ok) {
          window.location.href = "/superadmin";
          return;
        }
      }

      // Call backend helper to verify approval and plan status
      const helperRes = await fetch("/api/auth/login-helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTrimmed, password }),
      });

      const helperData = await helperRes.json();
      if (!helperRes.ok) {
        setError(helperData.error || "Login failed. Please verify credentials or approval status.");
        setLoading(false);
        return;
      }

      // If approved, store their specific company ID, active plan, and mode
      if (helperData.companyId) {
        localStorage.setItem("selectedCompanyId", helperData.companyId);
      }
      if (helperData.planId) {
        localStorage.setItem("activePlanId", helperData.planId);
      }
      if (helperData.attendanceMode) {
        localStorage.setItem("attendanceMode", helperData.attendanceMode);
      }
      if (helperData.employeeLimit) {
        localStorage.setItem("employeeLimit", String(helperData.employeeLimit));
      }

      localStorage.setItem("local_admin_session", "1");
      document.cookie = "local_admin_session=admin; path=/; max-age=86400";

      const next = searchParams.get("next") || "";
      window.location.href = next || "/admin";
      return;
    } catch (err: any) {
      setError(err.message || "Failed to log in");
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
      background: "radial-gradient(circle at 80% 20%, #dce7ff 0, transparent 40%), linear-gradient(140deg, #f7faff, #ffffff)",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "460px",
        padding: "44px 36px",
        background: "#ffffff",
        border: "1px solid #dfe6f0",
        borderRadius: "24px",
        boxShadow: "0 20px 60px rgba(53, 102, 236, 0.1)",
        position: "relative",
        textAlign: "center"
      }}>
        
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <img
            src="/images/presivox-logo.png"
            alt="Presivox Logo"
            style={{ width: "230px", height: "auto", display: "block" }}
          />
        </div>
        
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginBottom: "22px" }}>
          Admin &amp; Workforce Attendance Portal
        </p>

        {/* English Notice Banner for New Organizations */}
        <div style={{
          background: "#eef4ff",
          border: "1.5px solid #c7d8fe",
          borderRadius: "14px",
          padding: "14px 16px",
          marginBottom: "24px",
          fontSize: "0.82rem",
          color: "#1e3a8a",
          lineHeight: "1.5",
          textAlign: "left",
          display: "flex",
          gap: "10px",
          alignItems: "flex-start",
          boxShadow: "0 4px 14px rgba(53, 102, 236, 0.06)"
        }}>
          <Sparkles size={18} style={{ color: "var(--blue)", flexShrink: 0, marginTop: "2px" }} />
          <div>
            <strong style={{ color: "#112850", display: "block", marginBottom: "3px" }}>First time here?</strong>
            First select your plan and fill the process. In 24 hours you will get an email from our team with your ID and Password once approved by Super Admin.
            <div style={{ marginTop: "8px" }}>
              <a
                href="/#pricing"
                style={{
                  color: "#3566ec",
                  fontWeight: 750,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  textDecoration: "none",
                }}
              >
                Select an Annual Plan &amp; Register →
              </a>
            </div>
          </div>
        </div>

        {/* Email & Password Authentication Form */}
        <form onSubmit={handleEmailAuth} style={{ display: "flex", flexDirection: "column", gap: "18px", textAlign: "left" }}>
          <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
              <Mail size={14} /> Registered Work Email
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

          <div style={{
            fontSize: "0.78rem",
            color: "#64748b",
            lineHeight: "1.4",
            padding: "0 2px"
          }}>
            Enter the Admin ID and Password delivered to your email upon Super Admin approval.
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", marginTop: "6px", height: "46px" }}>
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <LogIn size={18} /> Enter Admin Portal
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          display: "flex",
          alignItems: "center",
          margin: "24px 0 16px",
          color: "var(--text-muted)",
          fontSize: "0.75rem",
          textTransform: "uppercase",
          letterSpacing: "1px"
        }}>
          <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
          <span style={{ padding: "0 10px" }}>New Organization?</span>
          <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
        </div>

        {/* Action button redirecting new clients to plan pricing */}
        <a
          href="/#pricing"
          className="btn btn-secondary"
          style={{
            width: "100%",
            height: "46px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontSize: "0.92rem",
            fontWeight: 700,
            textDecoration: "none",
            color: "var(--ink)",
            background: "#f8fafc",
            border: "1px solid #cbd5e1"
          }}
        >
          <Sparkles size={17} color="var(--blue)" />
          Choose Plan &amp; Register Organization →
        </a>


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

        {/* Solution Planets Footer Branding */}
        <div style={{
          marginTop: "28px",
          paddingTop: "14px",
          borderTop: "1px solid #e2e8f0",
          textAlign: "center",
          fontSize: "0.82rem",
          color: "var(--blue)",
          fontWeight: 750
        }}>
          A Product of{" "}
          <a
            href="https://www.solutionplanets.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "inherit",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
              fontWeight: 800,
            }}
          >
            Solution Planets
          </a>
        </div>
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
