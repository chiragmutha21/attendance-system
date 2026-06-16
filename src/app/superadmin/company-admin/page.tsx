"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, ExternalLink, ShieldCheck, Sparkles, Users } from "lucide-react";
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
  employeeLimit: number;
  subscription: string;
  status: string;
  createdAt: string;
}

export default function CompanyAdminDetailsPage() {
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

  const openCompanyAdmin = (company: Company) => {
    localStorage.setItem("selectedCompanyId", company.id);
    window.location.href = "/admin";
  };

  return (
    <AuthGate requireSuperAdmin>
      <div className={styles.adminLayout}>
      <Sidebar activeKey="company-admin" isSuperAdmin />

      <main className={styles.mainContainer}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.headerTitle}>Company Admin Details</h1>
            <p className={styles.headerSubtitle}>Registered company admins and company account information</p>
          </div>
          <Link href="/superadmin" className="btn btn-outline">
            Back to Super Admin
          </Link>
        </div>

        <div className={`${styles.contentCard} glass-panel`}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Registered Companies</h2>
              <p className={styles.cardMeta}>Use Open Admin to enter that company context.</p>
            </div>
            <Users size={16} color="var(--text-secondary)" />
          </div>

          {loading ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px" }}>Loading company details...</p>
          ) : companies.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px" }}>No companies registered.</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Company Admin</th>
                    <th>Contact</th>
                    <th>Country</th>
                    <th>Limit</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr key={company.id}>
                      <td>
                        <strong>{company.name}</strong>
                        <div className={styles.formHint}>{company.id}</div>
                      </td>
                      <td>{company.adminName}</td>
                      <td>
                        {company.adminPhone}
                        <div className={styles.formHint}>{company.adminEmail}</div>
                      </td>
                      <td>{company.countryCode}</td>
                      <td>{company.employeeLimit}</td>
                      <td>{company.subscription}</td>
                      <td>
                        <span className={`${styles.badge} ${company.status === "active" ? styles.badgeActive : styles.badgeInactive}`}>
                          {company.status}
                        </span>
                      </td>
                      <td>
                        {new Date(company.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td>
                        <button className="btn btn-outline" style={{ padding: "8px 10px" }} onClick={() => openCompanyAdmin(company)}>
                          <ExternalLink size={14} />
                        </button>
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
