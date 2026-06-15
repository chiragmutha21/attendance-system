import Link from "next/link";
import { Sparkles, ArrowRight, Shield, UserCheck } from "lucide-react";

export default function Home() {
  const isMock = process.env.MOCK_MODE === "true";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "40px 24px",
      background: "radial-gradient(circle at center, #111322 0%, #06070a 100%)",
      color: "var(--text-primary)"
    }}>
      <div style={{
        maxWidth: "680px",
        width: "100%",
        textAlign: "center"
      }}>
        {/* Logo and Branding Status Badge */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: isMock ? "rgba(139, 92, 246, 0.08)" : "rgba(16, 185, 129, 0.08)",
          border: isMock ? "1px solid rgba(139, 92, 246, 0.2)" : "1px solid rgba(16, 185, 129, 0.2)",
          padding: "6px 14px",
          borderRadius: "30px",
          marginBottom: "32px",
          boxShadow: isMock ? "0 0 15px rgba(139, 92, 246, 0.05)" : "0 0 15px rgba(16, 185, 129, 0.05)"
        }}>
          <div style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: isMock ? "var(--color-primary)" : "var(--color-success)",
            boxShadow: isMock ? "0 0 8px var(--color-primary)" : "0 0 8px var(--color-success)"
          }} />
          <span style={{ 
            fontSize: "0.78rem", 
            fontWeight: 700, 
            letterSpacing: "0.8px", 
            color: isMock ? "var(--color-primary)" : "var(--color-success)",
            textTransform: "uppercase"
          }}>
            {isMock ? "Sandbox Demo Mode Active" : "Enterprise Secure Cloud Active"}
          </span>
        </div>

        <h1 style={{
          fontSize: "3.2rem",
          fontWeight: 800,
          lineHeight: "1.15",
          color: "#fff",
          marginBottom: "20px",
          letterSpacing: "-1.5px"
        }}>
          WhatsApp Employee <br />
          <span style={{
            background: "linear-gradient(135deg, var(--color-secondary), var(--color-primary))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 0 30px rgba(6, 182, 212, 0.15)"
          }}>
            Attendance Geofence
          </span>
        </h1>

        <p style={{
          fontSize: "1.1rem",
          color: "var(--text-secondary)",
          maxWidth: "560px",
          margin: "0 auto 40px auto",
          lineHeight: "1.6"
        }}>
          An enterprise-grade attendance tracker featuring precise GPS boundary validation, secure selfie uploads, face matching, and instant WhatsApp check-in confirmations.
        </p>

        {/* Centered Admin Card */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "48px"
        }}>
          <div className="glass-panel" style={{ 
            padding: "40px 32px", 
            maxWidth: "460px",
            width: "100%",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "rgba(6, 182, 212, 0.1)",
              color: "var(--color-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "24px",
              boxShadow: "0 0 15px rgba(6, 182, 212, 0.15)"
            }}>
              <UserCheck size={28} />
            </div>
            <h3 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#fff", marginBottom: "12px" }}>
              Admin Control Panel
            </h3>
            <p style={{ fontSize: "0.92rem", color: "var(--text-secondary)", marginBottom: "28px", lineHeight: "1.6" }}>
              Configure office geofence coordinates, register employees with face validation templates, generate secure check-in links, and monitor live attendance logs.
            </p>
            <Link href="/login?next=%2Fadmin" className="btn btn-secondary" style={{ width: "100%" }}>
              Enter Admin Portal <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Info Footer */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          fontSize: "0.8rem",
          color: "var(--text-muted)"
        }}>
          <Shield size={12} />
          <span>Equipped with 5-minute link expiration & one-time check-in enforcement</span>
        </div>
      </div>
    </div>
  );
}
