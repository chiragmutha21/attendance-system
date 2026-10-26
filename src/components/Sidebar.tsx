"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users, MapPin, CheckCircle, XCircle,
  Sparkles, CalendarDays, Gift, Menu, X,
  ShieldCheck, Building2, KeyRound, Image,
  QrCode, Clock, CreditCard
} from "lucide-react";
import styles from "../app/admin/admin.module.css";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

interface Company {
  id: string;
  name: string;
  status: string;
}

interface SidebarProps {
  activeKey: "dashboard" | "checkin" | "checkout" | "attendance" | "employees" | "sandbox" | "festivals" | "superadmin" | "company-admin" | "credentials" | "branches" | "company-logos" | "qr" | "timesheet" | "plan-requests";
  onCompanyChange?: (companyId: string) => void;
  isSuperAdmin?: boolean;
}

export default function Sidebar({ activeKey, onCompanyChange, isSuperAdmin }: SidebarProps) {
  const [companies, setCompanies] = useState<Company[]>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("sidebar_companies");
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {}
      }
    }
    return [];
  });
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedCompanyId") || "";
    }
    return "";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) return; // Super Admin doesn't need company selector
    const fetchCompanies = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();

        const adminEmail = (localStorage.getItem("adminEmail") || "").toLowerCase().trim();
        const storedCompanyId = localStorage.getItem("selectedCompanyId") || "";

        const headers: Record<string, string> = {};
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
        if (adminEmail) headers["x-admin-email"] = adminEmail;
        if (storedCompanyId) headers["x-company-id"] = storedCompanyId;

        const res = await fetch("/api/admin/companies", { headers });
        const data = await res.json();
        if (data.success && Array.isArray(data.companies)) {
          // Extra safety: Filter out any other companies if admin email or company id is set
          let userCompanies = data.companies;
          if (adminEmail || storedCompanyId) {
            const strictlyMatched = data.companies.filter((c: any) => 
              (adminEmail && c.adminEmail && c.adminEmail.toLowerCase() === adminEmail) ||
              (storedCompanyId && c.id === storedCompanyId)
            );
            if (strictlyMatched.length > 0) {
              userCompanies = strictlyMatched;
            }
          }

          setCompanies(userCompanies);
          localStorage.setItem("sidebar_companies", JSON.stringify(userCompanies));
          const active = userCompanies.find((c: Company) => c.id === storedCompanyId) || userCompanies[0];
          if (active) {
            setSelectedCompanyId(active.id);
            localStorage.setItem("selectedCompanyId", active.id);
            if (onCompanyChange) {
              onCompanyChange(active.id);
            }
          }
        }
      } catch (err) {
        console.error("Sidebar fetch companies error:", err);
      }
    };
    fetchCompanies();
  }, []);

  // Close mobile sidebar on route change
  const pathname = usePathname();
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedCompanyId(newId);
    localStorage.setItem("selectedCompanyId", newId);
    if (onCompanyChange) {
      onCompanyChange(newId);
    }
  };

  const closeMobile = () => setMobileOpen(false);

  const adminLinks = [
    { key: "dashboard", href: "/admin", icon: <MapPin size={18} />, label: "Dashboard" },
    { key: "qr", href: "/admin/qr", icon: <QrCode size={18} />, label: "Direct QR Station" },
    { key: "timesheet", href: "/admin/timesheet", icon: <Clock size={18} />, label: "Timesheet & Hours" },
    { key: "branches", href: "/admin/branches", icon: <Building2 size={18} />, label: "Branches" },
    { key: "checkin", href: "/admin/checkin", icon: <CheckCircle size={18} />, label: "Check-In Logs" },
    { key: "checkout", href: "/admin/checkout", icon: <XCircle size={18} />, label: "Check-Out Logs" },
    { key: "attendance", href: "/admin/attendance", icon: <CalendarDays size={18} />, label: "Check Attendance" },
    { key: "employees", href: "/admin/employees", icon: <Users size={18} />, label: "Employee Registry" },
    { key: "festivals", href: "/admin/festivals", icon: <Gift size={18} />, label: "Festivals" },
    { key: "credentials", href: "/admin/credentials", icon: <KeyRound size={18} />, label: "Credentials" },
  ];

  const superAdminLinks = [
    { key: "superadmin", href: "/superadmin", icon: <ShieldCheck size={18} />, label: "Super Admin" },
    { key: "plan-requests", href: "/superadmin/plan-requests", icon: <CreditCard size={18} />, label: "Plan Requests" },
    { key: "company-admin", href: "/superadmin/company-admin", icon: <Building2 size={18} />, label: "Company Details" },
    { key: "company-logos", href: "/superadmin/company-logos", icon: <Image size={18} />, label: "Logo Submissions" },
  ];

  const navLinks = isSuperAdmin ? superAdminLinks : adminLinks;

  return (
    <>
      {/* Mobile Top Header */}
      <div className={styles.mobileHeader}>
        <Link href="/" className={styles.mobileHeaderBrand}>
          <img
            src="/images/presivox-logo.png"
            alt="Presivox"
            style={{ width: "135px", height: "auto", display: "block" }}
          />
        </Link>
        <button
          className={styles.hamburgerBtn}
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Sidebar Overlay (mobile) */}
      <div
        className={`${styles.sidebarOverlay} ${mobileOpen ? styles.sidebarOverlayVisible : ""}`}
        onClick={closeMobile}
      />

      {/* Sidebar Drawer */}
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ""}`}>
        {/* Close button (mobile only) */}
        <button
          className={styles.sidebarCloseBtn}
          onClick={closeMobile}
          aria-label="Close navigation menu"
        >
          <X size={18} />
        </button>

        <div className={styles.brand}>
          <Link href="/" style={{ display: "block", textDecoration: "none" }}>
            <img
              src="/images/presivox-logo.png"
              alt="Presivox"
              style={{ width: "175px", height: "auto", display: "block" }}
            />
          </Link>
        </div>

        {!isSuperAdmin && companies.length > 0 && (
          <div style={{ marginBottom: "24px", padding: "0 8px" }}>
            <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: "6px" }}>
              Active Company
            </label>
            {companies.length === 1 ? (
              <div style={{
                width: "100%",
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "10px 14px",
                color: "#0f172a",
                fontSize: "0.88rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
              }}>
                <Building2 size={16} color="#2563eb" />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {companies[0].name}
                </span>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <select
                  value={selectedCompanyId}
                  onChange={handleCompanyChange}
                  style={{
                    width: "100%",
                    background: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    color: "#0f172a",
                    fontSize: "0.88rem",
                    outline: "none",
                    cursor: "pointer",
                    appearance: "none",
                    WebkitAppearance: "none",
                    paddingRight: "30px",
                    fontWeight: 700,
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                  }}
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id} style={{ background: "#ffffff", color: "#0f172a", fontWeight: 600 }}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: "5px solid #475569",
                }} />
              </div>
            )}
          </div>
        )}

        <nav className={styles.navMenu}>
          {navLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={`${styles.navLink} ${activeKey === link.key ? styles.navLinkActive : ""}`}
              onClick={closeMobile}
            >
              {link.icon} {link.label}
            </Link>
          ))}
        </nav>
        {isSuperAdmin && (
          <div className={styles.sidebarFooter}>
            <div className={styles.statusIndicator}>
              <div className={`${styles.statusDot} ${styles.statusDotPulse}`} />
              <span>Super Admin View</span>
            </div>
          </div>
        )}
        <div style={{
          marginTop: "auto",
          paddingTop: "14px",
          borderTop: "1px solid var(--border-light)",
          textAlign: "center",
          fontSize: "0.76rem",
          color: "var(--blue)",
          fontWeight: 750
        }}>
          A Product of{" "}
          <a
            href="https://www.solutionplanets.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--blue)", textDecoration: "underline", textUnderlineOffset: "2px", fontWeight: 800 }}
          >
            Solution Planets
          </a>
        </div>
      </aside>
    </>
  );
}
