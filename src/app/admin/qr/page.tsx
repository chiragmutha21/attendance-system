"use client";

import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { 
  QrCode, Download, Printer, Copy, Check, ExternalLink, 
  Sparkles, CheckCircle, XCircle, Building2, ArrowRight, Shield 
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
}

export default function QrTerminalPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [activeTab, setActiveTab] = useState<"in" | "out">("in");
  const [inQrDataUrl, setInQrDataUrl] = useState<string>("");
  const [outQrDataUrl, setOutQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState(typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch("/api/admin/companies", {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const data = await res.json();
      if (data.success && data.companies && data.companies.length > 0) {
        setCompanies(data.companies);
        const stored = localStorage.getItem("selectedCompanyId");
        const active = data.companies.find((c: Company) => c.id === stored) || data.companies[0];
        if (active) {
          setSelectedCompanyId(active.id);
        }
      } else {
        // Fallback default company
        const defaultComp: Company = {
          id: "00000000-0000-0000-0000-000000000000",
          name: "Demo Company",
          status: "active",
        };
        setCompanies([defaultComp]);
        setSelectedCompanyId(defaultComp.id);
      }
    } catch (err) {
      console.error(err);
      const defaultComp: Company = {
        id: "00000000-0000-0000-0000-000000000000",
        name: "Demo Company",
        status: "active",
      };
      setCompanies([defaultComp]);
      setSelectedCompanyId(defaultComp.id);
    }
  };

  const fallbackCompany: Company = {
    id: "00000000-0000-0000-0000-000000000000",
    name: "Demo Company",
    status: "active",
  };

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) || companies[0] || fallbackCompany;

  const currentHost = baseUrl || "http://localhost:3000";
  const inUrl = `${currentHost}/checkin?companyId=${selectedCompany.id}`;
  const outUrl = `${currentHost}/checkout?companyId=${selectedCompany.id}`;

  const activeUrl = activeTab === "in" ? inUrl : outUrl;

  useEffect(() => {
    if (!inUrl || !outUrl) return;

    // Generate IN QR Code
    QRCode.toDataURL(inUrl, {
      width: 480,
      margin: 2,
      color: {
        dark: "#10b981", // Emerald green for IN
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    }).then(setInQrDataUrl).catch(console.error);

    // Generate OUT QR Code
    QRCode.toDataURL(outUrl, {
      width: 480,
      margin: 2,
      color: {
        dark: "#ef4444", // Red for OUT
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    }).then(setOutQrDataUrl).catch(console.error);
  }, [inUrl, outUrl]);

  const copyToClipboard = () => {
    if (!activeUrl) return;
    navigator.clipboard.writeText(activeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQr = () => {
    const dataUrl = activeTab === "in" ? inQrDataUrl : outQrDataUrl;
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${selectedCompany?.name || "Company"}-${activeTab === "in" ? "CHECK-IN" : "CHECK-OUT"}-QR.png`;
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
        <Sidebar activeKey={"dashboard" as any} onCompanyChange={(id) => setSelectedCompanyId(id)} />

        <main className={styles.mainContainer}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.headerTitle}>Direct QR Code Terminal</h1>
              <p className={styles.headerSubtitle}>
                Instant touch-free QR scanning for Employee Check-In (IN) & Check-Out (OUT)
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button onClick={handlePrint} className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Printer size={16} /> Print Standee
              </button>
              <button onClick={downloadQr} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Download size={16} /> Download QR Image
              </button>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
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
            alignItems: "center"
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
              maxWidth: "440px",
              margin: "0 auto",
              width: "100%",
            }}>
              {/* Brand & Company Logo */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                {selectedCompany?.logoUrl ? (
                  <img 
                    src={selectedCompany.logoUrl} 
                    alt="Company Logo" 
                    style={{ width: "42px", height: "42px", objectFit: "contain", borderRadius: "8px" }} 
                  />
                ) : (
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 800,
                  }}>
                    {selectedCompany?.name?.charAt(0) || "C"}
                  </div>
                )}
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#111827", lineHeight: "1.2" }}>
                    {selectedCompany?.name || "Company Attendance"}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 600 }}>
                    Official Smart Attendance Station
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div style={{
                display: "inline-block",
                padding: "6px 18px",
                borderRadius: "20px",
                fontSize: "0.88rem",
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
                    alt="Attendance QR Code"
                    style={{ width: "260px", height: "260px", display: "block" }} 
                  />
                ) : (
                  <div style={{ width: "260px", height: "260px", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
                    Generating QR...
                  </div>
                )}
              </div>

              {/* Step instructions */}
              <div style={{ fontSize: "0.82rem", color: "#4b5563", lineHeight: "1.5", marginBottom: "16px" }}>
                1. Point your mobile phone camera at this QR code.<br />
                2. Tap the link to confirm attendance & auto-whiten selfie.
              </div>

              <div style={{
                fontSize: "0.72rem",
                color: "#9ca3af",
                fontWeight: 600,
                borderTop: "1px solid #f3f4f6",
                paddingTop: "12px",
                width: "100%",
              }}>
                The product of Solution Planets
              </div>
            </div>

            {/* Instruction & Link Settings Column */}
            <div className="glass-panel" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <h2 style={{ fontSize: "1.25rem", color: "#fff", display: "flex", alignItems: "center", gap: "10px" }}>
                <QrCode size={22} color="var(--color-primary)" />
                Station Instructions & Direct Link
              </h2>

              <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: "1.6" }}>
                Print and display this QR code at your office entrance for <strong>Check-In</strong> and at the exit for <strong>Check-Out</strong>.
                When employees scan the code, their attendance interface will open directly locked to <strong>{selectedCompany?.name}</strong>.
              </p>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: "8px" }}>
                  Direct {activeTab === "in" ? "Check-In" : "Check-Out"} Web URL
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    readOnly
                    value={activeUrl}
                    className="form-input"
                    style={{ flex: 1, fontSize: "0.85rem", background: "rgba(0,0,0,0.3)" }}
                  />
                  <button onClick={copyToClipboard} className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {copied ? <Check size={16} color="var(--color-success)" /> : <Copy size={16} />}
                    {copied ? "Copied" : "Copy"}
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
                <div style={{ fontWeight: 700, color: "#fff", marginBottom: "4px" }}>💡 Kiosk / Tablet Display Tip</div>
                You can leave this page open on an iPad, tablet, or reception monitor in fullscreen mode. Employees can scan as they arrive and leave without contacting any physical surface.
              </div>
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
            The product of Solution Planets
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
