"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  KeyRound, Copy, Check, ExternalLink, Loader2 
} from "lucide-react";
import AuthGate from "@/components/AuthGate";
import Sidebar from "@/components/Sidebar";
import styles from "../admin.module.css";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

interface Company {
  id: string;
  name: string;
  companyCode: string;
  status: string;
}

export default function CredentialsPage() {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [origin, setOrigin] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
      setSelectedCompanyId(localStorage.getItem("selectedCompanyId") || "");
    }
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch("/api/admin/companies", {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setCompanies(data.companies);
        const stored = localStorage.getItem("selectedCompanyId");
        const active = data.companies.find((c: Company) => c.id === stored) || data.companies[0];
        if (active) {
          setSelectedCompanyId(active.id);
          localStorage.setItem("selectedCompanyId", active.id);
        }
      }
    } catch (err) {
      console.error("Fetch companies error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const activeCompany = companies.find(c => c.id === selectedCompanyId);
  const companyCode = activeCompany?.companyCode || "01";
  
  // Format the company name into a clean URL slug (e.g. "Solution Planets" -> "solution-planets")
  const companySlug = activeCompany
    ? activeCompany.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    : "company-name";

  // Use origin dynamically so that links automatically match localhost or production environments
  const baseUrl = origin;

  const checkInLink = `${baseUrl}/checkin-${companySlug}/${companyCode}`;
  const checkOutLink = `${baseUrl}/checkout-${companySlug}/${companyCode}`;

  return (
    <AuthGate>
      <div className={styles.adminLayout}>
        <Sidebar activeKey="credentials" onCompanyChange={(id) => setSelectedCompanyId(id)} />

        <main className={styles.mainContainer}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.headerTitle}>Portal Credentials & Links</h1>
              <p className={styles.headerSubtitle}>Scope and access company check-in & check-out portals</p>
            </div>
          </div>

          {loading ? (
            <div className="flex-center" style={{ padding: "40px 0" }}>
              <Loader2 className="animate-spin" size={30} color="var(--color-primary)" />
            </div>
          ) : (
            <div className={styles.statsGrid} style={{ marginBottom: "28px" }}>
              {/* Check-In Card */}
              <div className={`${styles.statCard} glass-panel`} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "16px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: "-15px", right: "-15px", width: "80px", height: "80px", background: "rgba(16, 185, 129, 0.04)", borderRadius: "50%" }}></div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-success)" }}></div>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Check-In Portal</span>
                  </div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", margin: "6px 0 12px" }}>
                    {activeCompany ? `${activeCompany.name} Check-In` : "Loading Check-In..."}
                  </h3>
                  <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-light)", borderRadius: "6px", padding: "10px", fontSize: "0.8rem", color: "var(--text-secondary)", fontFamily: "monospace", overflowX: "auto", whiteSpace: "nowrap" }}>
                    {checkInLink}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => handleCopy(checkInLink, "company-in")}
                    className={`btn ${copiedKey === "company-in" ? "btn-secondary" : "btn-primary"}`}
                    style={{ flex: 1, padding: "8px", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  >
                    {copiedKey === "company-in" ? (
                      <>
                        <Check size={14} />
                        <span>Copied Link!</span>
                      </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Link</span>
                    </>
                  )}
                  </button>
                  <a
                    href={checkInLink}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline"
                    style={{ padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "center" }}
                    title="Open Portal Link"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>

              {/* Check-Out Card */}
              <div className={`${styles.statCard} glass-panel`} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "16px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: "-15px", right: "-15px", width: "80px", height: "80px", background: "rgba(239, 68, 68, 0.04)", borderRadius: "50%" }}></div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-danger)" }}></div>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Check-Out Portal</span>
                  </div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", margin: "6px 0 12px" }}>
                    {activeCompany ? `${activeCompany.name} Check-Out` : "Loading Check-Out..."}
                  </h3>
                  <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-light)", borderRadius: "6px", padding: "10px", fontSize: "0.8rem", color: "var(--text-secondary)", fontFamily: "monospace", overflowX: "auto", whiteSpace: "nowrap" }}>
                    {checkOutLink}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => handleCopy(checkOutLink, "company-out")}
                    className={`btn ${copiedKey === "company-out" ? "btn-secondary" : "btn-primary"}`}
                    style={{ flex: 1, padding: "8px", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  >
                    {copiedKey === "company-out" ? (
                      <>
                        <Check size={14} />
                        <span>Copied Link!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                  <a
                    href={checkOutLink}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline"
                    style={{ padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "center" }}
                    title="Open Portal Link"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGate>
  );
}
