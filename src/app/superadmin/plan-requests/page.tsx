"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
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
  Send,
  Check,
  AlertCircle,
  Key,
  Copy,
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
  const [emailSendingId, setEmailSendingId] = useState<string | null>(null);
  const [sentEmailIds, setSentEmailIds] = useState<string[]>([]);
  const [emailStatusMsg, setEmailStatusMsg] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyPassword = (pwd: string, id: string) => {
    navigator.clipboard.writeText(pwd);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("presivox_last_approved_plan");
      if (saved) {
        try {
          setApprovedResult(JSON.parse(saved));
        } catch {}
      }
    }

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
          if (typeof window !== "undefined") {
            localStorage.setItem("presivox_last_approved_plan", JSON.stringify(data.item));
          }
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

  const handleSendEmail = async (requestId: string) => {
    try {
      setEmailSendingId(requestId);
      setEmailStatusMsg(null);

      const res = await fetch("/api/superadmin/send-plan-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });

      const data = await res.json();
      if (data.success) {
        setSentEmailIds((prev) => [...prev, requestId]);
        setEmailStatusMsg({
          id: requestId,
          success: true,
          message: data.message || "Email sent successfully to client!",
        });
        alert(data.message || "Official login credentials successfully emailed to client!");
      } else {
        const errorText = data.error || data.details || "Failed to send email. Please check SMTP configuration.";
        setEmailStatusMsg({
          id: requestId,
          success: false,
          message: errorText,
        });
        alert(`Email Error: ${errorText}`);
      }
    } catch (err: any) {
      console.error("Error sending email:", err);
      const errMsg = err.message || "Network error while sending email.";
      setEmailStatusMsg({
        id: requestId,
        success: false,
        message: errMsg,
      });
      alert(`Network Error: ${errMsg}`);
    } finally {
      setEmailSendingId(null);
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
          <h2 style={{ color: "#0f172a", marginBottom: "12px", fontWeight: 800 }}>Super Admin Restricted</h2>
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
          <div className="glass-panel" style={{ padding: "20px", borderRadius: "14px", background: "#ffffff", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 650, marginBottom: "6px" }}>Pending Approvals</div>
            <div style={{ fontSize: "2rem", fontWeight: 850, color: "#d97706" }}>{pendingCount}</div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Awaiting ID & password setup</div>
          </div>
          <div className="glass-panel" style={{ padding: "20px", borderRadius: "14px", background: "#ffffff", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 650, marginBottom: "6px" }}>Active Approved Plans</div>
            <div style={{ fontSize: "2rem", fontWeight: 850, color: "#059669" }}>{approvedCount}</div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Provisioned companies</div>
          </div>
        </div>

        {/* Success Modal / Credentials Box */}
        {approvedResult && (
          <div style={{
            padding: "24px",
            borderRadius: "16px",
            marginBottom: "28px",
            border: "1px solid #a7f3d0",
            background: "#f0fdf4",
            boxShadow: "0 4px 16px rgba(16, 185, 129, 0.08)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#065f46", fontWeight: 800, fontSize: "1.15rem" }}>
                <CheckCircle size={24} color="#059669" />
                Plan Request Approved & Ready for Dispatch!
              </div>
              <button
                onClick={() => {
                  setApprovedResult(null);
                  setEmailStatusMsg(null);
                  if (typeof window !== "undefined") {
                    localStorage.removeItem("presivox_last_approved_plan");
                  }
                }}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}
              >
                ✕ Dismiss
              </button>
            </div>
            <p style={{ color: "#334155", fontSize: "0.9rem", marginBottom: "16px" }}>
              The company record has been provisioned. Click <strong>Send Mail</strong> to automatically deliver login credentials to the client:
            </p>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              padding: "18px",
              borderRadius: "12px",
              fontSize: "0.88rem",
            }}>
              <div><strong style={{ color: "#64748b" }}>Company:</strong> <div style={{ color: "#0f172a", fontWeight: 750, marginTop: "2px" }}>{approvedResult.companyName}</div></div>
              <div><strong style={{ color: "#64748b" }}>Plan Limit:</strong> <div style={{ color: "#0f172a", fontWeight: 750, marginTop: "2px" }}>{approvedResult.employeeLimit >= 999990 ? "Unlimited" : `${approvedResult.employeeLimit} Employees`}</div></div>
              <div><strong style={{ color: "#64748b" }}>Login ID / Email:</strong> <div style={{ color: "#2563eb", fontWeight: 750, marginTop: "2px" }}>{approvedResult.adminEmail}</div></div>
              <div><strong style={{ color: "#64748b" }}>Generated Password:</strong> <div style={{ marginTop: "2px" }}><span style={{ color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", padding: "2px 8px", borderRadius: "6px", fontFamily: "monospace", fontWeight: 750 }}>{approvedResult.generatedPassword}</span></div></div>
            </div>

            {/* Status Message (if any) */}
            {emailStatusMsg && emailStatusMsg.id === approvedResult.id && (
              <div style={{
                marginTop: "14px",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: emailStatusMsg.success ? "#ecfdf5" : "#fef2f2",
                border: emailStatusMsg.success ? "1px solid #a7f3d0" : "1px solid #fca5a5",
                color: emailStatusMsg.success ? "#065f46" : "#991b1b",
              }}>
                {emailStatusMsg.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span>{emailStatusMsg.message}</span>
              </div>
            )}

            {/* Single Send Mail Button */}
            <div style={{ marginTop: "16px", display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => handleSendEmail(approvedResult.id)}
                disabled={emailSendingId === approvedResult.id}
                className="btn btn-primary"
                style={{
                  padding: "10px 24px",
                  fontSize: "0.92rem",
                  fontWeight: 700,
                  background: sentEmailIds.includes(approvedResult.id) ? "#059669" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "#ffffff",
                  borderRadius: "10px",
                  border: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
                }}
              >
                {emailSendingId === approvedResult.id ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Sending Mail...
                  </>
                ) : sentEmailIds.includes(approvedResult.id) ? (
                  <>
                    <Check size={16} /> Mail Sent Successfully
                  </>
                ) : (
                  <>
                    <Send size={16} /> Send Mail
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Requests Table */}
        <div className={`${styles.contentCard} glass-panel`} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", overflow: "hidden" }}>
          <div className={styles.cardHeader} style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
            <h2 className={styles.cardTitle} style={{ color: "#0f172a", fontWeight: 800, fontSize: "1.2rem", margin: 0 }}>
              Client Order Submissions
            </h2>
          </div>

          {loading ? (
            <p style={{ textAlign: "center", color: "#64748b", padding: "40px" }}>Loading requests...</p>
          ) : requests.length === 0 ? (
            <p style={{ textAlign: "center", color: "#64748b", padding: "40px" }}>No plan requests found.</p>
          ) : (
            <div className={styles.tableWrapper} style={{ overflowX: "auto" }}>
              <table className={styles.table} style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ color: "#475569", fontWeight: 700, fontSize: "0.76rem", textTransform: "uppercase", letterSpacing: "0.6px", padding: "14px 18px", textAlign: "left" }}>
                      Company &amp; Contact
                    </th>
                    <th style={{ color: "#475569", fontWeight: 700, fontSize: "0.76rem", textTransform: "uppercase", letterSpacing: "0.6px", padding: "14px 18px", textAlign: "left" }}>
                      Selected Plan
                    </th>
                    <th style={{ color: "#475569", fontWeight: 700, fontSize: "0.76rem", textTransform: "uppercase", letterSpacing: "0.6px", padding: "14px 18px", textAlign: "left" }}>
                      Pricing Breakdown (+18% GST)
                    </th>
                    <th style={{ color: "#475569", fontWeight: 700, fontSize: "0.76rem", textTransform: "uppercase", letterSpacing: "0.6px", padding: "14px 18px", textAlign: "left" }}>
                      Mode &amp; Address
                    </th>
                    <th style={{ color: "#475569", fontWeight: 700, fontSize: "0.76rem", textTransform: "uppercase", letterSpacing: "0.6px", padding: "14px 18px", textAlign: "left" }}>
                      Status
                    </th>
                    <th style={{ color: "#475569", fontWeight: 700, fontSize: "0.76rem", textTransform: "uppercase", letterSpacing: "0.6px", padding: "14px 18px", textAlign: "left" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => {
                    const isPlanA = req.planId === "plan-a";
                    const isPlanB = req.planId === "plan-b";
                    const isPlanC = req.planId === "plan-c";

                    const badgeStyle = isPlanA
                      ? { background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" }
                      : isPlanB
                      ? { background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe" }
                      : { background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a" };

                    return (
                      <tr key={req.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "16px 18px", verticalAlign: "top" }}>
                          <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.98rem" }}>{req.companyName}</div>
                          <div style={{ fontSize: "0.82rem", color: "#334155", display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                            <User size={13} color="#2563eb" /> {req.adminName}
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "#2563eb", display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                            <Mail size={12} /> {req.adminEmail}
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "#64748b", display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                            <Phone size={12} /> {req.adminPhone}
                          </div>
                          {req.status === "approved" && (
                            <div style={{
                              marginTop: "8px",
                              padding: "4px 8px",
                              background: "#eff6ff",
                              border: "1px solid #bfdbfe",
                              borderRadius: "6px",
                              fontSize: "0.76rem",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                            }}>
                              <Key size={12} color="#2563eb" />
                              <span style={{ color: "#475569" }}>Pass:</span>
                              <span style={{ color: "#1d4ed8", fontWeight: 750, fontFamily: "monospace" }}>
                                {req.generatedPassword || "Smart@123456"}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyPassword(req.generatedPassword || "Smart@123456", req.id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: "0 2px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  color: copiedId === req.id ? "#059669" : "#64748b",
                                }}
                                title="Copy Password"
                              >
                                {copiedId === req.id ? <Check size={12} /> : <Copy size={12} />}
                              </button>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "16px 18px", verticalAlign: "top" }}>
                          <div style={{ display: "inline-block", padding: "4px 10px", borderRadius: "6px", fontWeight: 800, fontSize: "0.84rem", ...badgeStyle }}>
                            {req.planName}
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: "5px", fontWeight: 600 }}>
                            {req.employeeLimit >= 999990 ? "Unlimited Employees" : `Up to ${req.employeeLimit} Employees`}
                          </div>
                        </td>
                        <td style={{ padding: "16px 18px", verticalAlign: "top" }}>
                          <div style={{ fontWeight: 850, color: "#0f172a", fontSize: "1.05rem" }}>
                            ₹{req.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "3px" }}>
                            Base: ₹{req.basePrice.toLocaleString("en-IN")} + 18% GST (₹{req.gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })})
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "#2563eb", fontWeight: 700, marginTop: "3px" }}>
                            Per Year Basis
                          </div>
                        </td>
                        <td style={{ padding: "16px 18px", verticalAlign: "top" }}>
                          <div style={{ fontSize: "0.82rem", color: "#0f172a", fontWeight: 700 }}>
                            {req.attendanceMode === "with_photo" ? "📸 With Photo (AI Face)" : "⚡ Without Photo"}
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: "4px", display: "flex", alignItems: "center", gap: "5px", maxWidth: "220px" }}>
                            <MapPin size={13} color="#64748b" style={{ flexShrink: 0 }} />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {req.address || "No address provided"}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "16px 18px", verticalAlign: "top" }}>
                          {req.status === "pending" ? (
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "5px 12px",
                              borderRadius: "20px",
                              background: "#fef3c7",
                              color: "#92400e",
                              border: "1px solid #fcd34d",
                              fontWeight: 750,
                              fontSize: "0.78rem"
                            }}>
                              <Clock size={12} /> Pending Review
                            </span>
                          ) : req.status === "approved" ? (
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "5px 12px",
                              borderRadius: "20px",
                              background: "#ecfdf5",
                              color: "#065f46",
                              border: "1px solid #6ee7b7",
                              fontWeight: 750,
                              fontSize: "0.78rem"
                            }}>
                              <CheckCircle size={12} /> Approved
                            </span>
                          ) : (
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "5px 12px",
                              borderRadius: "20px",
                              background: "#fef2f2",
                              color: "#991b1b",
                              border: "1px solid #fca5a5",
                              fontWeight: 750,
                              fontSize: "0.78rem"
                            }}>
                              <XCircle size={12} /> Rejected
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "16px 18px", verticalAlign: "top" }}>
                          {req.status === "pending" ? (
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                onClick={() => handleAction(req.id, "approve")}
                                disabled={actionLoadingId === req.id}
                                className="btn btn-primary"
                                style={{
                                  padding: "7px 16px",
                                  fontSize: "0.82rem",
                                  fontWeight: 700,
                                  background: "linear-gradient(135deg, #10b981, #059669)",
                                  color: "#ffffff",
                                  borderRadius: "8px",
                                  border: "none",
                                  cursor: "pointer",
                                }}
                              >
                                {actionLoadingId === req.id ? <Loader2 className="animate-spin" size={14} /> : "Accept"}
                              </button>
                              <button
                                onClick={() => handleAction(req.id, "reject")}
                                disabled={actionLoadingId === req.id}
                                className="btn btn-outline"
                                style={{
                                  padding: "7px 16px",
                                  fontSize: "0.82rem",
                                  fontWeight: 650,
                                  color: "#ef4444",
                                  borderColor: "#fca5a5",
                                  background: "#ffffff",
                                  borderRadius: "8px",
                                  cursor: "pointer",
                                }}
                              >
                                Reject
                              </button>
                            </div>
                          ) : req.status === "approved" ? (
                            <div>
                              <button
                                type="button"
                                onClick={() => handleSendEmail(req.id)}
                                disabled={emailSendingId === req.id}
                                style={{
                                  padding: "7px 14px",
                                  fontSize: "0.8rem",
                                  fontWeight: 700,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  background: sentEmailIds.includes(req.id) ? "#ecfdf5" : "#eff6ff",
                                  color: sentEmailIds.includes(req.id) ? "#065f46" : "#1d4ed8",
                                  border: sentEmailIds.includes(req.id) ? "1px solid #a7f3d0" : "1px solid #bfdbfe",
                                  borderRadius: "8px",
                                  cursor: "pointer",
                                }}
                              >
                                {emailSendingId === req.id ? (
                                  <>
                                    <Loader2 className="animate-spin" size={13} /> Sending...
                                  </>
                                ) : sentEmailIds.includes(req.id) ? (
                                  <>
                                    <Check size={13} color="#059669" /> Sent
                                  </>
                                ) : (
                                  <>
                                    <Send size={13} /> Send Mail
                                  </>
                                )}
                              </button>
                              {emailStatusMsg && emailStatusMsg.id === req.id && (
                                <div style={{
                                  marginTop: "6px",
                                  fontSize: "0.74rem",
                                  fontWeight: 600,
                                  color: emailStatusMsg.success ? "#059669" : "#dc2626",
                                  maxWidth: "200px",
                                  lineHeight: "1.3",
                                }}>
                                  {emailStatusMsg.message}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                              Closed
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <footer style={{
          marginTop: "48px",
          padding: "24px 0",
          borderTop: "1px solid #e2e8f0",
          textAlign: "center",
          color: "#94a3b8",
          fontSize: "0.82rem",
          letterSpacing: "0.3px",
        }}>
          A Product of{" "}
          <a
            href="https://www.solutionplanets.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#2563eb", textDecoration: "underline", textUnderlineOffset: "3px", fontWeight: 700 }}
          >
            Solution Planets
          </a>
        </footer>
      </main>
    </div>
  );
}
