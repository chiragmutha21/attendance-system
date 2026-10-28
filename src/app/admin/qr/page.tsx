"use client";

import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import Link from "next/link";
import { 
  QrCode, Download, Printer, Copy, Check, ExternalLink, 
  Sparkles, CheckCircle, XCircle, Building2, MapPin, Plus, ArrowRight, Shield, Loader2 
} from "lucide-react";
import AuthGate from "@/components/AuthGate";
import Sidebar from "@/components/Sidebar";
import styles from "../admin.module.css";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

interface Company {
  id: string;
  name: string;
  companyCode?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  status: string;
  officeLatitude?: number | null;
  officeLongitude?: number | null;
  officeRadiusMeters?: number | null;
}

interface Branch {
  id: string;
  name: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  isMainOffice?: boolean;
}

export default function QrTerminalPage() {
  // Pre-load from cache to eliminate demo QR flash
  const [companies, setCompanies] = useState<Company[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("sidebar_companies");
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedCompanyId") || "";
    }
    return "";
  });

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"in" | "out">("in");
  const [inQrDataUrl, setInQrDataUrl] = useState<string>("");
  const [outQrDataUrl, setOutQrDataUrl] = useState<string>("");
  const [branchQrs, setBranchQrs] = useState<Record<string, { in: string; out: string }>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState(typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      const adminEmail = (typeof window !== "undefined" ? localStorage.getItem("adminEmail") || "" : "").toLowerCase().trim();
      const stored = typeof window !== "undefined" ? localStorage.getItem("selectedCompanyId") || "" : "";

      const headers: Record<string, string> = {};
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
      if (adminEmail) headers["x-admin-email"] = adminEmail;
      if (stored) headers["x-company-id"] = stored;

      const res = await fetch("/api/admin/companies", { headers });
      const data = await res.json();
      if (data.success && data.companies && data.companies.length > 0) {
        setCompanies(data.companies);
        const active = data.companies.find((c: Company) => c.id === stored) || data.companies[0];
        if (active) {
          setSelectedCompanyId(active.id);
          localStorage.setItem("selectedCompanyId", active.id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch branches whenever selected company changes
  useEffect(() => {
    if (!selectedCompanyId) return;

    // Check branch cache first for zero latency
    if (typeof window !== "undefined") {
      try {
        const cachedBranches = localStorage.getItem("branches_" + selectedCompanyId);
        if (cachedBranches) {
          const parsed = JSON.parse(cachedBranches);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setBranches(parsed);
            if (!selectedBranchId || !parsed.some((b: Branch) => b.id === selectedBranchId)) {
              setSelectedBranchId(parsed[0].id);
            }
          }
        }
      } catch {}
    }

    const fetchBranches = async () => {
      try {
        const res = await fetch("/api/admin/branches", {
          headers: { "x-company-id": selectedCompanyId },
        });
        const data = await res.json();
        if (data.success && data.branches && data.branches.length > 0) {
          setBranches(data.branches);
          localStorage.setItem("branches_" + selectedCompanyId, JSON.stringify(data.branches));
          if (!selectedBranchId || !data.branches.some((b: Branch) => b.id === selectedBranchId)) {
            const main = data.branches.find((b: Branch) => b.isMainOffice) || data.branches[0];
            setSelectedBranchId(main.id);
          }
        } else {
          // Fallback single main branch
          const fallbackBranch: Branch = {
            id: "main",
            name: "Head Office",
            isMainOffice: true,
            latitude: 28.6139,
            longitude: 77.2090,
            radiusMeters: 200,
          };
          setBranches([fallbackBranch]);
          setSelectedBranchId(fallbackBranch.id);
        }
      } catch (err) {
        console.error("Fetch branches error:", err);
      }
    };

    fetchBranches();
  }, [selectedCompanyId]);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) || companies[0];

  const activeBranch: Branch = branches.find((b) => b.id === selectedBranchId) || branches[0] || {
    id: "main",
    name: "Head Office",
    isMainOffice: true,
    latitude: 28.6139,
    longitude: 77.2090,
    radiusMeters: 200,
  };

  const currentHost = baseUrl || "http://localhost:3000";
  const inUrl = selectedCompany ? `${currentHost}/checkin?companyId=${selectedCompany.id}&branchId=${activeBranch.id}` : "";
  const outUrl = selectedCompany ? `${currentHost}/checkout?companyId=${selectedCompany.id}&branchId=${activeBranch.id}` : "";
  const activeUrl = activeTab === "in" ? inUrl : outUrl;

  // Generate QR for active branch
  useEffect(() => {
    if (!inUrl || !outUrl) return;

    QRCode.toDataURL(inUrl, {
      width: 480,
      margin: 2,
      color: { dark: "#10b981", light: "#ffffff" },
      errorCorrectionLevel: "H",
    }).then(setInQrDataUrl).catch(console.error);

    QRCode.toDataURL(outUrl, {
      width: 480,
      margin: 2,
      color: { dark: "#ef4444", light: "#ffffff" },
      errorCorrectionLevel: "H",
    }).then(setOutQrDataUrl).catch(console.error);
  }, [inUrl, outUrl]);

  // Generate QR previews for all branches in parallel
  useEffect(() => {
    if (!selectedCompany || branches.length === 0) return;

    const generateAll = async () => {
      const qrs: Record<string, { in: string; out: string }> = {};
      for (const b of branches) {
        const bInUrl = `${currentHost}/checkin?companyId=${selectedCompany.id}&branchId=${b.id}`;
        const bOutUrl = `${currentHost}/checkout?companyId=${selectedCompany.id}&branchId=${b.id}`;
        try {
          const inData = await QRCode.toDataURL(bInUrl, {
            width: 320,
            margin: 2,
            color: { dark: "#10b981", light: "#ffffff" },
            errorCorrectionLevel: "M",
          });
          const outData = await QRCode.toDataURL(bOutUrl, {
            width: 320,
            margin: 2,
            color: { dark: "#ef4444", light: "#ffffff" },
            errorCorrectionLevel: "M",
          });
          qrs[b.id] = { in: inData, out: outData };
        } catch (e) {
          console.error(e);
        }
      }
      setBranchQrs(qrs);
    };

    generateAll();
  }, [selectedCompany?.id, branches, currentHost]);

  const copyToClipboard = (url: string, key: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadQr = (dataUrl: string, branchName: string, tab: "IN" | "OUT") => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${selectedCompany?.name || "Company"}-${branchName}-${tab}-QR.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AuthGate>
      <div className={styles.adminLayout}>
        <Sidebar activeKey="qr" onCompanyChange={(id) => setSelectedCompanyId(id)} />

        <main className={styles.mainContainer}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.headerTitle}>Direct QR Code Station</h1>
              <p className={styles.headerSubtitle}>
                Branch-specific touch-free QR scanning for Employee Check-In (IN) & Check-Out (OUT)
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button onClick={handlePrint} className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Printer size={16} /> Print Standee
              </button>
              <button 
                onClick={() => downloadQr(activeTab === "in" ? inQrDataUrl : outQrDataUrl, activeBranch.name, activeTab === "in" ? "IN" : "OUT")} 
                className="btn btn-primary" 
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Download size={16} /> Download QR Image
              </button>
            </div>
          </div>

          {/* Branch Switcher Tabs */}
          <div style={{
            marginBottom: "24px",
            background: "rgba(255, 255, 255, 0.03)",
            padding: "16px",
            borderRadius: "14px",
            border: "1px solid var(--border-light)"
          }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              marginBottom: "12px",
              flexWrap: "wrap",
              gap: "8px"
            }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                <Building2 size={16} color="var(--color-primary)" />
                Select Branch QR Station:
              </span>
              <Link
                href="/admin/branches"
                className="btn btn-outline"
                style={{ padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px", textDecoration: "none" }}
              >
                <Plus size={14} /> Add New Branch
              </Link>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {branches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBranchId(b.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 18px",
                    borderRadius: "10px",
                    fontSize: "0.9rem",
                    fontWeight: activeBranch.id === b.id ? 700 : 500,
                    border: activeBranch.id === b.id ? "1px solid var(--color-primary)" : "1px solid rgba(255, 255, 255, 0.08)",
                    background: activeBranch.id === b.id ? "linear-gradient(135deg, rgba(124, 58, 237, 0.25), rgba(79, 70, 229, 0.2))" : "rgba(255, 255, 255, 0.04)",
                    color: activeBranch.id === b.id ? "#fff" : "var(--text-secondary)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: activeBranch.id === b.id ? "0 4px 12px rgba(124, 58, 237, 0.2)" : "none"
                  }}
                >
                  <MapPin size={15} color={activeBranch.id === b.id ? "var(--color-primary-light, #c4b5fd)" : "var(--text-muted)"} />
                  <span>{b.name}</span>
                  {b.isMainOffice && (
                    <span style={{
                      fontSize: "0.72rem",
                      padding: "2px 6px",
                      borderRadius: "6px",
                      background: activeBranch.id === b.id ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)",
                      color: activeBranch.id === b.id ? "#fff" : "var(--text-muted)",
                      fontWeight: 600
                    }}>
                      Main
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Mode Switcher Tabs (IN / OUT) */}
          <div style={{
            display: "flex",
            gap: "12px",
            marginBottom: "24px",
            background: "rgba(255, 255, 255, 0.03)",
            padding: "6px",
            borderRadius: "12px",
            border: "1px solid var(--border-light)",
            width: "fit-content"
          }}>
            <button
              onClick={() => setActiveTab("in")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 24px",
                borderRadius: "8px",
                fontSize: "0.95rem",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                background: activeTab === "in" ? "linear-gradient(135deg, #10b981, #059669)" : "transparent",
                color: activeTab === "in" ? "#ffffff" : "var(--text-secondary)",
                boxShadow: activeTab === "in" ? "0 4px 14px rgba(16, 185, 129, 0.3)" : "none",
              }}
            >
              <CheckCircle size={18} />
              Check-In QR (IN)
            </button>

            <button
              onClick={() => setActiveTab("out")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 24px",
                borderRadius: "8px",
                fontSize: "0.95rem",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                background: activeTab === "out" ? "linear-gradient(135deg, #ef4444, #dc2626)" : "transparent",
                color: activeTab === "out" ? "#ffffff" : "var(--text-secondary)",
                boxShadow: activeTab === "out" ? "0 4px 14px rgba(239, 68, 68, 0.3)" : "none",
              }}
            >
              <XCircle size={18} />
              Check-Out QR (OUT)
            </button>
          </div>

          {/* Main QR Display Card / Printable Standee */}
          <div className="printable-qr-station" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "28px",
            alignItems: "flex-start",
            marginBottom: "40px"
          }}>
            {/* The QR Standee Card */}
            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "36px 28px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              boxShadow: activeTab === "in" ? "0 20px 40px rgba(16, 185, 129, 0.15)" : "0 20px 40px rgba(239, 68, 68, 0.15)",
              border: activeTab === "in" ? "3px solid #10b981" : "3px solid #ef4444",
              maxWidth: "460px",
              margin: "0 auto",
              width: "100%",
            }}>
              {/* Brand & Company Details */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                {selectedCompany?.logoUrl ? (
                  <img 
                    src={selectedCompany.logoUrl} 
                    alt="Company Logo" 
                    style={{ width: "46px", height: "46px", objectFit: "contain", borderRadius: "10px" }} 
                  />
                ) : (
                  <div style={{
                    width: "46px",
                    height: "46px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: "1.2rem"
                  }}>
                    {selectedCompany?.name?.charAt(0) || "C"}
                  </div>
                )}
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111827", lineHeight: "1.2" }}>
                    {selectedCompany?.name || "Company Attendance"}
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "#6b7280", fontWeight: 600 }}>
                    Smart Attendance Management
                  </div>
                </div>
              </div>

              {/* Branch Badge Prominently Above QR Code */}
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 16px",
                borderRadius: "30px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
                fontSize: "0.88rem",
                fontWeight: 700,
                marginBottom: "16px",
                boxShadow: "0 2px 6px rgba(22, 101, 52, 0.08)"
              }}>
                <MapPin size={15} color="#16a34a" />
                <span>Branch: <strong>{activeBranch.name}</strong></span>
              </div>

              {/* Status Badge */}
              <div style={{
                display: "inline-block",
                padding: "6px 18px",
                borderRadius: "20px",
                fontSize: "0.85rem",
                fontWeight: 800,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                marginBottom: "20px",
                background: activeTab === "in" ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                color: activeTab === "in" ? "#047857" : "#b91c1c",
                border: activeTab === "in" ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
              }}>
                {activeTab === "in" ? "👉 SCAN TO CHECK IN (IN)" : "👋 SCAN TO CHECK OUT (OUT)"}
              </div>

              {/* QR Image Frame */}
              <div style={{
                padding: "16px",
                borderRadius: "16px",
                background: "#f9fafb",
                border: "2px dashed #e5e7eb",
                marginBottom: "20px",
                display: "flex",
                justifyContent: "center",
              }}>
                {(activeTab === "in" ? inQrDataUrl : outQrDataUrl) ? (
                  <img 
                    src={activeTab === "in" ? inQrDataUrl : outQrDataUrl} 
                    alt={`${selectedCompany?.name || "Company"} ${activeBranch.name} Attendance QR Code`}
                    style={{ width: "260px", height: "260px", display: "block" }} 
                  />
                ) : (
                  <div style={{ width: "260px", height: "260px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#9ca3af", gap: "10px" }}>
                    <Loader2 className="animate-spin" size={28} color="#7c3aed" />
                    <span style={{ fontSize: "0.85rem" }}>Generating your Company QR...</span>
                  </div>
                )}
              </div>

              {/* Step instructions */}
              <div style={{ fontSize: "0.82rem", color: "#4b5563", lineHeight: "1.5", marginBottom: "16px" }}>
                1. Point your mobile phone camera at this QR code.<br />
                2. Tap the link to verify GPS geofence & submit attendance.
              </div>

              <div style={{
                fontSize: "0.72rem",
                color: "#9ca3af",
                fontWeight: 600,
                borderTop: "1px solid #f3f4f6",
                paddingTop: "12px",
                width: "100%",
              }}>
                A Product of{" "}
                <a
                  href="https://www.solutionplanets.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#2563eb", textDecoration: "underline", fontWeight: 700 }}
                >
                  Solution Planets
                </a>
              </div>
            </div>

            {/* Instruction & Link Settings Column */}
            <div className="glass-panel" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <h2 style={{ fontSize: "1.25rem", color: "#fff", display: "flex", alignItems: "center", gap: "10px" }}>
                <QrCode size={22} color="var(--color-primary)" />
                Station Instructions & Direct Link
              </h2>

              <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: "1.6" }}>
                Print and display this QR code at your <strong>{activeBranch.name}</strong> entrance for <strong>Check-In</strong> and at the exit for <strong>Check-Out</strong>.
                When employees scan the code, their attendance interface will open directly locked to <strong>{selectedCompany?.name}</strong> ({activeBranch.name}).
              </p>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: "8px" }}>
                  Direct {activeTab === "in" ? "Check-In" : "Check-Out"} Web URL ({activeBranch.name})
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    readOnly
                    value={activeUrl}
                    className="form-input"
                    style={{ flex: 1, fontSize: "0.85rem", background: "rgba(0,0,0,0.3)" }}
                  />
                  <button onClick={() => copyToClipboard(activeUrl, "main")} className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {copiedKey === "main" ? <Check size={16} color="var(--color-success)" /> : <Copy size={16} />}
                    {copiedKey === "main" ? "Copied" : "Copy"}
                  </button>
                  <a href={activeUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <ExternalLink size={16} /> Open
                  </a>
                </div>
              </div>

              <div style={{
                padding: "16px",
                borderRadius: "12px",
                background: "rgba(139, 92, 246, 0.08)",
                border: "1px solid rgba(139, 92, 246, 0.2)",
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                lineHeight: "1.5",
              }}>
                <div style={{ fontWeight: 700, color: "#fff", marginBottom: "4px" }}>💡 Multi-Branch Geofencing</div>
                Each branch has its own dedicated QR station encoded with its branch ID. If you add multiple branches (e.g. Mumbai, Pune, Bangalore), employees assigned to those branches can scan their respective branch QR code for accurate location verification.
              </div>
            </div>
          </div>

          {/* All Branches QR Codes Gallery */}
          <div style={{ marginTop: "40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: "10px" }}>
                  <Building2 size={22} color="var(--color-primary)" />
                  All Branch QR Stations ({branches.length})
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginTop: "4px" }}>
                  Individual QR codes generated for each registered office branch of {selectedCompany?.name || "your company"}
                </p>
              </div>
              <Link
                href="/admin/branches"
                className="btn btn-primary"
                style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}
              >
                <Plus size={16} /> Add Another Branch
              </Link>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "24px",
            }}>
              {branches.map((branch, index) => {
                const bInUrl = `${currentHost}/checkin?companyId=${selectedCompany?.id || ""}&branchId=${branch.id}`;
                const bOutUrl = `${currentHost}/checkout?companyId=${selectedCompany?.id || ""}&branchId=${branch.id}`;
                const bQr = branchQrs[branch.id];

                return (
                  <div 
                    key={branch.id} 
                    className="glass-panel" 
                    style={{
                      padding: "24px",
                      borderRadius: "16px",
                      border: activeBranch.id === branch.id ? "2px solid var(--color-primary)" : "1px solid var(--border-light)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "16px"
                    }}
                  >
                    <div>
                      {/* Branch Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                        <div>
                          <div style={{ fontSize: "0.78rem", color: "var(--color-primary-light, #c4b5fd)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Branch #{index + 1} {branch.isMainOffice ? "• Main Office" : ""}
                          </div>
                          <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#fff", marginTop: "2px" }}>
                            {branch.name}
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                            {selectedCompany?.name}
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedBranchId(branch.id)}
                          className="btn btn-outline"
                          style={{
                            padding: "6px 12px",
                            fontSize: "0.78rem",
                            background: activeBranch.id === branch.id ? "var(--color-primary)" : "transparent",
                            color: activeBranch.id === branch.id ? "#fff" : "var(--text-secondary)",
                            borderColor: activeBranch.id === branch.id ? "var(--color-primary)" : "var(--border-light)"
                          }}
                        >
                          {activeBranch.id === branch.id ? "Active Standee" : "Select Standee"}
                        </button>
                      </div>

                      {/* QR Preview Grid */}
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px",
                        background: "rgba(0, 0, 0, 0.2)",
                        padding: "12px",
                        borderRadius: "12px",
                        textAlign: "center"
                      }}>
                        {/* IN QR */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#10b981", marginBottom: "6px" }}>
                            Check-In (IN)
                          </span>
                          <div style={{ background: "#fff", padding: "6px", borderRadius: "8px" }}>
                            {bQr?.in ? (
                              <img src={bQr.in} alt={`${branch.name} IN QR`} style={{ width: "100px", height: "100px", display: "block" }} />
                            ) : (
                              <div style={{ width: "100px", height: "100px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Loader2 className="animate-spin" size={18} />
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => downloadQr(bQr?.in || "", branch.name, "IN")}
                            className="btn btn-outline"
                            style={{ marginTop: "8px", padding: "4px 8px", fontSize: "0.72rem", width: "100%" }}
                          >
                            <Download size={12} /> IN QR
                          </button>
                        </div>

                        {/* OUT QR */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#ef4444", marginBottom: "6px" }}>
                            Check-Out (OUT)
                          </span>
                          <div style={{ background: "#fff", padding: "6px", borderRadius: "8px" }}>
                            {bQr?.out ? (
                              <img src={bQr.out} alt={`${branch.name} OUT QR`} style={{ width: "100px", height: "100px", display: "block" }} />
                            ) : (
                              <div style={{ width: "100px", height: "100px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Loader2 className="animate-spin" size={18} />
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => downloadQr(bQr?.out || "", branch.name, "OUT")}
                            className="btn btn-outline"
                            style={{ marginTop: "8px", padding: "4px 8px", fontSize: "0.72rem", width: "100%" }}
                          >
                            <Download size={12} /> OUT QR
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quick Link Copy for this branch */}
                    <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "12px", display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => copyToClipboard(bInUrl, `in_${branch.id}`)}
                        className="btn btn-outline"
                        style={{ flex: 1, fontSize: "0.76rem", padding: "6px 8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                      >
                        {copiedKey === `in_${branch.id}` ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} />}
                        Copy IN Link
                      </button>
                      <button
                        onClick={() => copyToClipboard(bOutUrl, `out_${branch.id}`)}
                        className="btn btn-outline"
                        style={{ flex: 1, fontSize: "0.76rem", padding: "6px 8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                      >
                        {copiedKey === `out_${branch.id}` ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} />}
                        Copy OUT Link
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
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
            A Product of{" "}
            <a
              href="https://www.solutionplanets.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--blue, #2563eb)", textDecoration: "underline", textUnderlineOffset: "3px", fontWeight: 700 }}
            >
              Solution Planets
            </a>
          </footer>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-qr-station, .printable-qr-station * {
            visibility: visible;
          }
          .printable-qr-station {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: flex !important;
            justify-content: center;
            align-items: center;
            background: white !important;
          }
        }
      `}} />
    </AuthGate>
  );
}
