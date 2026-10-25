"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Mail,
  Phone,
  Building2,
  MapPin,
  Sparkles,
  ShieldCheck,
  User,
  AlertTriangle,
  Key,
  Copy,
  Check,
  ExternalLink,
  Send,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import styles from "../../admin/admin.module.css";
import { PlanRequestItem } from "@/lib/plans";

export default function SuperAdminPlanRequestsPage() {
  const [requests, setRequests] = useState<PlanRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [approvedResult, setApprovedResult] = useState<PlanRequestItem | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getEmailContent = (item: PlanRequestItem) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const subject = `Welcome to Presivox - Your ${item.planName} Attendance Portal is Active!`;
    const body = `Dear ${item.adminName},

Congratulations! Your subscription request for ${item.companyName} has been approved by the Super Admin.

Here are your official company login credentials:
--------------------------------------------------
Company Name : ${item.companyName}
Subscription : ${item.planName} (${item.employeeLimit >= 999990 ? "Unlimited" : `Up to ${item.employeeLimit}`} Employees)
Login Portal : ${origin}/login
Admin Email  : ${item.adminEmail}
Password     : ${item.generatedPassword || "admin123"}
--------------------------------------------------

Next Steps to Get Started:
1. Open the Login Portal: ${origin}/login
2. Sign in with your registered email and password above.
3. Access your dedicated QR Standee (IN & OUT) to print or display at your workplace.
4. Add your employee profiles in the Employee Registry.

If you have any questions or require custom setup assistance, feel free to reply directly to presivox@gmail.com.

Best Regards,
Presivox Attendance Team
The product of Solution Planets
Support: presivox@gmail.com`;
    return { subject, body };
  };

  const openGmail = (item: PlanRequestItem) => {
    const { subject, body } = getEmailContent(item);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(item.adminEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, "_blank");
  };

  const copyEmailText = (item: PlanRequestItem) => {
    const { body } = getEmailContent(item);
    navigator.clipboard.writeText(body);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/superadmin/plan-requests");
      const data = await res.json();
      if (data.success && data.requests) {
        setRequests(data.requests);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkSuperAdminSession = async () => {
      try {
        const res = await fetch("/api/superadmin/session");
        if (res.ok) {
          setAuthenticated(true);
          await fetchRequests();
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      } finally {
        setAuthChecking(false);
      }
    };

    checkSuperAdminSession();
  }, []);

  const handleAction = async (requestId: string, action: "approve" | "reject") => {
    if (action === "reject" && !confirm("Are you sure you want to reject this subscription request?")) {
      return;
    }

    try {
      setActionLoadingId(requestId);
      const res = await fetch("/api/superadmin/plan-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      const data = await res.json();
      if (data.success) {
        if (action === "approve" && data.item) {
          setApprovedResult(data.item);
        }
        await fetchRequests();
      } else {
        alert(data.error || "Action failed");
      }
    } catch (err) {
      console.error(err);
      alert("Network error processing request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (authChecking) {
    return (
      <div className="flex-center" style={{ minHeight: "100vh", color: "var(--text-secondary)" }}>
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex-center" style={{ minHeight: "100vh", padding: "24px" }}>
        <div className="glass-panel" style={{ padding: "32px", textAlign: "center", maxWidth: "400px" }}>
          <ShieldCheck size={48} color="var(--color-primary)" style={{ margin: "0 auto 16px auto" }} />
          <h2 style={{ color: "#fff", marginBottom: "12px" }}>Super Admin Restricted</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "20px" }}>
            Please sign in through the Super Admin portal to manage customer plan requests.
          </p>
          <Link href="/superadmin" className="btn btn-primary" style={{ display: "inline-flex", width: "100%" }}>
            Go to Super Admin Login
          </Link>
        </div>
      </div>
    );
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;

  return (
    <div className={styles.adminLayout}>
      <Sidebar activeKey="plan-requests" isSuperAdmin={true} />

      <main className={styles.mainContainer}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.headerTitle}>Subscription Plan Requests</h1>
            <p className={styles.headerSubtitle}>
              Review new company orders, approve credentials dispatch, and enforce plan employee limits
            </p>
          </div>
          <button onClick={fetchRequests} className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            Refresh Requests
          </button>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "28px" }}>
          <div className="glass-panel" style={{ padding: "20px", borderRadius: "14px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "6px" }}>Pending Approvals</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#facc15" }}>{pendingCount}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Awaiting ID & password setup</div>
          </div>
          <div className="glass-panel" style={{ padding: "20px", borderRadius: "14px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "6px" }}>Active Approved Plans</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--color-success)" }}>{approvedCount}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Provisioned companies</div>
          </div>
        </div>

        {/* Success Modal / Credentials Box */}
        {approvedResult && (
          <div className="glass-panel" style={{
            padding: "24px",
            borderRadius: "16px",
            marginBottom: "28px",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            background: "rgba(16, 185, 129, 0.08)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--color-success)", fontWeight: 700, fontSize: "1.1rem" }}>
                <CheckCircle size={22} />
                Plan Request Approved & Dispatched!
              </div>
              <button onClick={() => setApprovedResult(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                ✕ Dismiss
              </button>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "16px" }}>
              An official email confirmation has been issued with the following company login credentials:
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
              background: "rgba(0,0,0,0.4)",
              padding: "16px",
              borderRadius: "10px",
              fontSize: "0.85rem",
            }}>
              <div><strong style={{ color: "#fff" }}>Company:</strong> {approvedResult.companyName}</div>
              <div><strong style={{ color: "#fff" }}>Plan Limit:</strong> {approvedResult.employeeLimit >= 999990 ? "Unlimited" : `${approvedResult.employeeLimit} Employees`}</div>
              <div><strong style={{ color: "#fff" }}>Login ID / Email:</strong> {approvedResult.adminEmail}</div>
              <div><strong style={{ color: "#fff" }}>Generated Password:</strong> <span style={{ color: "#38bdf8", fontFamily: "monospace", fontWeight: 700 }}>{approvedResult.generatedPassword}</span></div>
            </div>

            {/* Email Dispatch Buttons */}
            <div style={{ marginTop: "14px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => openGmail(approvedResult)}
                className="btn btn-primary"
                style={{ padding: "8px 16px", fontSize: "0.85rem", background: "var(--blue)", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Send size={15} /> Send via Gmail (presivox@gmail.com)
              </button>
              <a
                href={`mailto:${approvedResult.adminEmail}?subject=${encodeURIComponent(getEmailContent(approvedResult).subject)}&body=${encodeURIComponent(getEmailContent(approvedResult).body)}`}
                className="btn btn-outline"
                style={{ padding: "8px 16px", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Mail size={15} /> Open Mail Client
              </a>
              <button
                type="button"
                onClick={() => copyEmailText(approvedResult)}
                className="btn btn-outline"
                style={{ padding: "8px 16px", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                {copiedId === approvedResult.id ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
                {copiedId === approvedResult.id ? "Email Text Copied!" : "Copy Email Template"}
              </button>
            </div>
          </div>
        )}

        {/* Requests Table */}
        <div className={`${styles.contentCard} glass-panel`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Client Order Submissions</h2>
          </div>

          {loading ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "40px" }}>Loading requests...</p>
          ) : requests.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "40px" }}>No plan requests found.</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Company & Contact</th>
                    <th>Selected Plan</th>
                    <th>Pricing Breakdown (+18% GST)</th>
                    <th>Mode & Address</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem" }}>{req.companyName}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                          <User size={13} /> {req.adminName}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                          <Mail size={12} /> {req.adminEmail}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                          <Phone size={12} /> {req.adminPhone}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "inline-block", padding: "4px 10px", borderRadius: "6px", background: "rgba(139, 92, 246, 0.15)", border: "1px solid rgba(139, 92, 246, 0.3)", fontWeight: 800, color: "#c4b5fd", fontSize: "0.85rem" }}>
                          {req.planName}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px", fontWeight: 600 }}>
                          {req.employeeLimit >= 999990 ? "Unlimited Employees" : `Up to ${req.employeeLimit} Employees`}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, color: "#fff", fontSize: "1rem" }}>
                          ₹{req.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          Base: ₹{req.basePrice.toLocaleString("en-IN")} + 18% GST (₹{req.gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })})
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "var(--color-primary-light)", fontWeight: 600, marginTop: "2px" }}>
                          Per Year Basis
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: "0.8rem", color: "#fff", fontWeight: 600 }}>
                          {req.attendanceMode === "with_photo" ? "📸 With Photo (AI Face)" : "⚡ Without Photo"}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          📍 {req.address || "No address provided"}
                        </div>
                      </td>
                      <td>
                        {req.status === "pending" ? (
                          <span className="badge" style={{ background: "rgba(234, 179, 8, 0.15)", color: "#fef08a", border: "1px solid rgba(234, 179, 8, 0.3)" }}>
                            Pending Review
                          </span>
                        ) : req.status === "approved" ? (
                          <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#a7f3d0", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                            ✓ Accepted & Mail Sent
                          </span>
                        ) : (
                          <span className="badge" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#fecaca", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                            Rejected
                          </span>
                        )}
                      </td>
                      <td>
                        {req.status === "pending" ? (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => handleAction(req.id, "approve")}
                              disabled={actionLoadingId === req.id}
                              className="btn btn-primary"
                              style={{ padding: "6px 14px", fontSize: "0.8rem", background: "linear-gradient(135deg, #10b981, #059669)" }}
                            >
                              {actionLoadingId === req.id ? <Loader2 className="animate-spin" size={14} /> : "Accept"}
                            </button>
                            <button
                              onClick={() => handleAction(req.id, "reject")}
                              disabled={actionLoadingId === req.id}
                              className="btn btn-outline"
                              style={{ padding: "6px 14px", fontSize: "0.8rem", color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.4)" }}
                            >
                              Reject
                            </button>
                          </div>
                        ) : req.status === "approved" ? (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() => openGmail(req)}
                              className="btn btn-outline"
                              title="Send Email via Gmail"
                              style={{ padding: "5px 10px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <Send size={12} color="var(--blue)" /> Mail
                            </button>
                            <button
                              type="button"
                              onClick={() => copyEmailText(req)}
                              className="btn btn-outline"
                              title="Copy Email Template"
                              style={{ padding: "5px 10px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              {copiedId === req.id ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                              {copiedId === req.id ? "Copied" : "Copy"}
                            </button>
                          </div>
                        ) : (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            Closed
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <footer style={{
          marginTop: "48px",
          padding: "24px 0",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "0.82rem",
          letterSpacing: "0.3px",
        }}>
          The product of Solution Planets
        </footer>
      </main>
    </div>
  );
}
