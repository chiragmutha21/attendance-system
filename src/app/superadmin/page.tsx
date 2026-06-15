"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ExternalLink,
  LogIn,
  Loader2,
  LockKeyhole,
  Mail,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import styles from "../admin/admin.module.css";

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
  _count?: {
    employees: number;
  };
}

const inferCountryCode = () => {
  const locale = navigator.language || "";
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  if (locale.endsWith("-IN") || timezone === "Asia/Calcutta" || timezone === "Asia/Kolkata") return "+91";
  if (locale.endsWith("-US")) return "+1";
  if (locale.endsWith("-GB")) return "+44";
  if (locale.endsWith("-AE")) return "+971";
  return "+91";
};

export default function SuperAdminPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("+91");
  const [countryCode, setCountryCode] = useState("+91");
  const [employeeLimit, setEmployeeLimit] = useState("25");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("200");

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

  useEffect(() => {
    const checkSuperAdminSession = async () => {
      try {
        const res = await fetch("/api/superadmin/session");
        if (res.ok) {
          setAuthenticated(true);
          await fetchCompanies();
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

  const loginSuperAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await fetch("/api/superadmin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || "Invalid super admin credentials.");
        return;
      }

      setAuthenticated(true);
      setLoginPassword("");
      await fetchCompanies();
    } catch (err) {
      console.error(err);
      setLoginError("Unable to login right now.");
    } finally {
      setLoginLoading(false);
    }
  };

  const logoutSuperAdmin = async () => {
    await fetch("/api/superadmin/session", { method: "DELETE" });
    setAuthenticated(false);
    setCompanies([]);
    setLoading(false);
  };

  const openCreateModal = () => {
    const code = inferCountryCode();
    setCompanyName("");
    setAdminName("");
    setAdminEmail("");
    setAdminPhone(code);
    setCountryCode(code);
    setEmployeeLimit("25");
    setLatitude("");
    setLongitude("");
    setRadius("200");
    setError("");
    setModalOpen(true);
  };

  const fillOfficeLocation = () => {
    setError("");
    const code = inferCountryCode();
    setCountryCode(code);
    setAdminPhone((phone) => (phone === "" || phone === "+91" ? code : phone));

    if (!navigator.geolocation) {
      setError("Location is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
      },
      () => setError("Location permission denied. Enter office coordinates manually."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const createCompany = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setModalLoading(true);

    try {
      const res = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: companyName,
          adminName,
          adminEmail,
          adminPhone,
          countryCode,
          employeeLimit,
          subscription: "trial",
          status: "active",
          latitude,
          longitude,
          radius,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create company.");
        return;
      }

      setModalOpen(false);
      await fetchCompanies();
    } catch (err) {
      console.error(err);
      setError("Failed to submit company form.");
    } finally {
      setModalLoading(false);
    }
  };

  const updateCompany = async (company: Company) => {
    setSavingId(company.id);
    try {
      const res = await fetch("/api/admin/companies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: company.id,
          employeeLimit: company.employeeLimit,
          subscription: company.subscription,
          status: company.status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update company");
      } else {
        await fetchCompanies();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update company.");
    } finally {
      setSavingId("");
    }
  };

  const deleteCompany = async (company: Company) => {
    if (!confirm(`Delete company "${company.name}" and all its employees/attendance data?`)) return;

    try {
      const res = await fetch(`/api/admin/companies?id=${company.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete company");
        return;
      }
      await fetchCompanies();
    } catch (err) {
      console.error(err);
      alert("Failed to delete company.");
    }
  };

  const openCompanyAdmin = (company: Company) => {
    localStorage.setItem("selectedCompanyId", company.id);
    window.location.href = "/admin";
  };

  const updateLocalCompany = (id: string, patch: Partial<Company>) => {
    setCompanies((prev) => prev.map((company) => (company.id === id ? { ...company, ...patch } : company)));
  };

  const activeCompanies = companies.filter((company) => company.status === "active").length;
  const totalEmployees = companies.reduce((sum, company) => sum + (company._count?.employees || 0), 0);

  if (authChecking) {
    return (
      <div className="flex-center" style={{ minHeight: "100vh", color: "var(--text-secondary)" }}>
        <Loader2 className="animate-spin" size={34} />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex-center" style={{ minHeight: "100vh", padding: "24px" }}>
        <form
          onSubmit={loginSuperAdmin}
          className="glass-panel"
          style={{ width: "100%", maxWidth: "440px", padding: "32px", display: "grid", gap: "18px" }}
        >
          <div style={{ display: "grid", gap: "10px", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div className="flex-center" style={{ width: "56px", height: "56px", borderRadius: "14px", background: "rgba(139, 92, 246, 0.16)" }}>
                <LockKeyhole size={26} color="var(--color-primary)" />
              </div>
            </div>
            <h1 style={{ color: "#fff", fontSize: "1.75rem" }}>Super Admin Login</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem" }}>
              Sign in here to open the super admin dashboard.
            </p>
          </div>

          <label className={styles.formGroup}>
            <span className={styles.formLabel}>Email</span>
            <div style={{ position: "relative" }}>
              <Mail size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="email"
                className="form-input"
                required
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                style={{ paddingLeft: "42px" }}
              />
            </div>
          </label>

          <label className={styles.formGroup}>
            <span className={styles.formLabel}>Password</span>
            <div style={{ position: "relative" }}>
              <LockKeyhole size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="password"
                className="form-input"
                required
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                style={{ paddingLeft: "42px" }}
              />
            </div>
          </label>

          {loginError && <span className={styles.formError}>{loginError}</span>}

          <button type="submit" className="btn btn-primary" disabled={loginLoading} style={{ width: "100%" }}>
            {loginLoading ? <Loader2 className="animate-spin" size={16} /> : <LogIn size={16} />}
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={styles.adminLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Sparkles className={styles.brandIcon} size={22} />
          <span className="glow-text-purple">SmartOffice</span>
        </div>
        <nav className={styles.navMenu}>
          <Link href="/superadmin" className={`${styles.navLink} ${styles.navLinkActive}`}>
            <ShieldCheck size={18} /> Super Admin
          </Link>
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.statusIndicator}>
            <div className={`${styles.statusDot} ${styles.statusDotPulse}`} />
            <span>Super Admin View</span>
          </div>
        </div>
      </aside>

      <main className={styles.mainContainer}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.headerTitle}>Super Admin</h1>
            <p className={styles.headerSubtitle}>Manage all companies, subscriptions, and employee limits</p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" onClick={openCreateModal}>
              <Plus size={16} /> Create Company
            </button>
            <Link href="/superadmin/company-admin" className="btn btn-outline">
              <Building2 size={16} /> Company Admin Details
            </Link>
            <button type="button" className="btn btn-outline" onClick={logoutSuperAdmin}>
              Logout
            </button>
          </div>
        </div>

        <section className={styles.statsGrid}>
          <div className={`${styles.statCard} glass-panel`}>
            <div className={styles.statHeader}>
              <span>Total Companies</span>
              <Building2 size={16} color="var(--color-primary)" />
            </div>
            <div className={styles.statValue}>{companies.length}</div>
          </div>
          <div className={`${styles.statCard} glass-panel`}>
            <div className={styles.statHeader}>
              <span>Active Companies</span>
              <ShieldCheck size={16} color="var(--color-success)" />
            </div>
            <div className={styles.statValue}>{activeCompanies}</div>
          </div>
          <div className={`${styles.statCard} glass-panel`}>
            <div className={styles.statHeader}>
              <span>Registered Employees</span>
              <Users size={16} color="var(--color-secondary)" />
            </div>
            <div className={styles.statValue}>{totalEmployees}</div>
          </div>
        </section>

        <div className={`${styles.contentCard} glass-panel`}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Companies</h2>
              <p className={styles.cardMeta}>Open any company admin panel without mixing company data.</p>
            </div>
            <Building2 size={16} color="var(--text-secondary)" />
          </div>

          {loading ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px" }}>Loading companies...</p>
          ) : companies.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px" }}>No companies found.</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Admin</th>
                    <th>Country</th>
                    <th>Employee Limit</th>
                    <th>Subscription</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr key={company.id}>
                      <td>
                         <strong>{company.name}</strong>
                        <div className={styles.formHint}>{company.id}</div>
                      </td>
                      <td>
                        {company.adminName}
                        <div className={styles.formHint}>{company.adminEmail}</div>
                      </td>
                      <td>{company.countryCode}</td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="form-input"
                          style={{ width: "110px" }}
                          value={company.employeeLimit}
                          onChange={(event) => updateLocalCompany(company.id, { employeeLimit: Number(event.target.value) })}
                        />
                      </td>
                      <td>
                        <select
                          className={styles.filterSelect}
                          value={company.subscription}
                          onChange={(event) => updateLocalCompany(company.id, { subscription: event.target.value })}
                        >
                          <option value="trial">Trial</option>
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td>
                        <select
                          className={styles.filterSelect}
                          value={company.status}
                          onChange={(event) => updateLocalCompany(company.id, { status: event.target.value })}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>
                      <td className={styles.actionsCell}>
                        <button className="btn btn-outline" style={{ padding: "8px 10px" }} onClick={() => updateCompany(company)}>
                          {savingId === company.id ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                        </button>
                        <button className="btn btn-outline" style={{ padding: "8px 10px" }} onClick={() => openCompanyAdmin(company)}>
                          <ExternalLink size={14} />
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ padding: "8px 10px", borderColor: "rgba(239, 68, 68, 0.2)", color: "var(--color-danger)" }}
                          onClick={() => deleteCompany(company)}
                        >
                          <Trash2 size={14} />
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

      {modalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ textAlign: "left", maxWidth: "620px" }}>
            <button className={styles.modalClose} onClick={() => setModalOpen(false)}>
              <X size={20} />
            </button>
            <h2 className={styles.stateTitle} style={{ marginBottom: "8px" }}>Create Company</h2>
            <p className={styles.formHint} style={{ marginBottom: "20px" }}>
              This creates a company admin and isolates all company data under a separate tenant.
            </p>

            <form onSubmit={createCompany} className={styles.settingsForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Company Name</label>
                <input className="form-input" required value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
              </div>

              <div className={styles.formGridTwo}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Admin Name</label>
                  <input className="form-input" required value={adminName} onChange={(event) => setAdminName(event.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Admin Email</label>
                  <input type="email" className="form-input" required value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} />
                </div>
              </div>

              <div className={styles.formGridTwo}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Country Code</label>
                  <input className="form-input" required value={countryCode} onChange={(event) => setCountryCode(event.target.value.replace(/[^\d+]/g, ""))} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Admin WhatsApp Number</label>
                  <input className="form-input" required value={adminPhone} onChange={(event) => setAdminPhone(event.target.value.replace(/[^\d+]/g, ""))} />
                </div>
              </div>

              <div className={styles.formGridTwo}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Employee Limit</label>
                  <input type="number" min="1" className="form-input" required value={employeeLimit} onChange={(event) => setEmployeeLimit(event.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Office Radius (Meters)</label>
                  <input type="number" min="25" className="form-input" required value={radius} onChange={(event) => setRadius(event.target.value)} />
                </div>
              </div>

              <div className={styles.formGridTwo}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Office Latitude</label>
                  <input type="number" step="0.000001" className="form-input" required value={latitude} onChange={(event) => setLatitude(event.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Office Longitude</label>
                  <input type="number" step="0.000001" className="form-input" required value={longitude} onChange={(event) => setLongitude(event.target.value)} />
                </div>
              </div>

              {error && <span className={styles.formError}>{error}</span>}

              <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                <button type="button" className="btn btn-outline" onClick={fillOfficeLocation} style={{ flex: 1 }}>
                  Use My Location
                </button>
                <button type="submit" className="btn btn-primary" disabled={modalLoading} style={{ flex: 1 }}>
                  {modalLoading ? <Loader2 className="animate-spin" size={16} /> : "Create Company"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
  );
}
