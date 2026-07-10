"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, ExternalLink, ShieldCheck, Sparkles, Image as ImageIcon, Mail } from "lucide-react";
import AuthGate from "@/components/AuthGate";
import Sidebar from "@/components/Sidebar";
import styles from "../../admin/admin.module.css";

interface Company {
  id: string;
  name: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  countryCode: string;
  logoUrl?: string | null;
  createdAt: string;
}

export default function CompanyLogosPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/companies");
        const data = await res.json();
        if (data.success) {
          setCompanies(data.companies);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  return (
    <AuthGate requireSuperAdmin>
      <div className={styles.adminLayout}>
        <Sidebar activeKey="company-logos" isSuperAdmin />

        <main className={styles.mainContainer}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.headerTitle}>Logo Submissions</h1>
              <p className={styles.headerSubtitle}>View and manage company logos submitted for attendance branding</p>
            </div>
            <Link href="/superadmin" className="btn btn-outline">
              Back to Super Admin
            </Link>
          </div>

          <div className={`${styles.contentCard} glass-panel`}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>Uploaded Logos</h2>
                <p className={styles.cardMeta}>Superadmins can review these logos to email the custom attendance reports.</p>
              </div>
              <ImageIcon size={16} color="var(--text-secondary)" />
            </div>

            {loading ? (
              <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px" }}>Loading company logos...</p>
            ) : companies.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px" }}>No companies registered.</p>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: "100px" }}>Logo</th>
                      <th>Company Name</th>
                      <th>Company Email</th>
                      <th>Admin Details</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => (
                      <tr key={company.id}>
                        <td>
                          {company.logoUrl ? (
                            <img
                              src={company.logoUrl}
                              alt={`${company.name} Logo`}
                              style={{
                                width: "48px",
                                height: "48px",
                                objectFit: "contain",
                                borderRadius: "8px",
                                background: "rgba(255, 255, 255, 0.05)",
                                border: "1px solid var(--border-light)"
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "48px",
                                height: "48px",
                                borderRadius: "8px",
                                background: "rgba(255, 255, 255, 0.03)",
                                border: "1px dashed var(--border-light)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--text-muted)",
                                fontSize: "0.75rem",
                                fontWeight: 600
                              }}
                            >
                              No Logo
                            </div>
                          )}
                        </td>
                        <td>
                          <strong style={{ fontSize: "0.95rem" }}>{company.name}</strong>
                          <div className={styles.formHint}>ID: {company.id}</div>
                        </td>
                        <td>
                          <a
                            href={`mailto:${company.adminEmail}`}
                            style={{
                              color: "var(--color-secondary)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              textDecoration: "none",
                              fontWeight: 500
                            }}
                          >
                            <Mail size={13} /> {company.adminEmail}
                          </a>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{company.adminName}</div>
                          <div className={styles.formHint}>{company.adminPhone}</div>
                        </td>
                        <td>
                          <a
                            href={`mailto:${company.adminEmail}?subject=Your Check-in Check-out Images&body=Hi ${company.adminName},%0D%0A%0D%0APlease find attached the check-in and check-out images for ${company.name}.`}
                            className="btn btn-outline"
                            style={{ padding: "8px 12px", fontSize: "0.8rem", display: "inline-flex", gap: "6px" }}
                          >
                            Send Email <Mail size={12} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGate>
  );
}
