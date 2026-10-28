"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2, Sparkles, CheckCircle, ShieldCheck, Lock } from "lucide-react";
import AuthGate from "@/components/AuthGate";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import styles from "../admin/admin.module.css";

export default function OnboardingPage() {
  return (
    <AuthGate allowOnboarding>
      <OnboardingContent />
    </AuthGate>
  );
}

function OnboardingContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adminName, setAdminName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [employeeLimit, setEmployeeLimit] = useState("25");
  const [address, setAddress] = useState("");
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [logoName, setLogoName] = useState("");
  const [logoError, setLogoError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successCompanyId, setSuccessCompanyId] = useState("");
  const [attendanceMode, setAttendanceMode] = useState<"with_photo" | "without_photo">("with_photo");
  const [geofenceMode, setGeofenceMode] = useState<"strict" | "flexible">("strict");
  const [shiftStandard, setShiftStandard] = useState("8_hours");

  // Keep location coordinates internally with reliable defaults (removed from form UI)
  const [latitude] = useState("28.6139");
  const [longitude] = useState("77.2090");
  const [radius] = useState("200");

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError("");
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setLogoError("Logo size must be less than 1MB.");
      e.target.value = "";
      setLogoBase64(null);
      setLogoName("");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoBase64(reader.result as string);
      setLogoName(file.name);
    };
    reader.onerror = () => {
      setLogoError("Failed to read file.");
    };
    reader.readAsDataURL(file);
  };

  // Auto-fill from payment / plan selection cached data & backend request
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Read from discrete keys
    const storedCompany = localStorage.getItem("companyName") || "";
    if (storedCompany) setCompanyName(storedCompany);

    const storedAdminName = localStorage.getItem("adminName") || "";
    if (storedAdminName) setAdminName(storedAdminName);

    const storedPhone = localStorage.getItem("adminPhone") || "";
    if (storedPhone) {
      const digits = storedPhone.replace(/\D/g, "").slice(-10);
      setPhoneDigits(digits);
    }

    const storedAddress = localStorage.getItem("address") || "";
    if (storedAddress) setAddress(storedAddress);

    const storedLimit = localStorage.getItem("employeeLimit") || "";
    if (storedLimit) setEmployeeLimit(storedLimit);

    const storedMode = localStorage.getItem("attendanceMode") as any;
    if (storedMode === "with_photo" || storedMode === "without_photo") {
      setAttendanceMode(storedMode);
    }

    // 2. Read from presivox_user_cache
    const cached = localStorage.getItem("presivox_user_cache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.companyName && !storedCompany) setCompanyName(parsed.companyName);
        if (parsed.adminName && !storedAdminName) setAdminName(parsed.adminName);
        if (parsed.adminPhone && !storedPhone) {
          const digits = parsed.adminPhone.replace(/\D/g, "").slice(-10);
          setPhoneDigits(digits);
        }
        if (parsed.address && !storedAddress) setAddress(parsed.address);
        if (parsed.employeeLimit && !storedLimit) setEmployeeLimit(String(parsed.employeeLimit));
        if (parsed.attendanceMode && !storedMode) setAttendanceMode(parsed.attendanceMode);
      } catch (e) {
        console.warn("Failed to parse cached details");
      }
    }

    // 3. Fallback: Query by logged-in admin email from plan requests
    const adminEmail = (localStorage.getItem("adminEmail") || "").toLowerCase().trim();
    if (adminEmail) {
      fetch(`/api/plan-requests?email=${encodeURIComponent(adminEmail)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.planRequest) {
            const pr = data.planRequest;
            if (pr.companyName) setCompanyName((prev) => prev || pr.companyName);
            if (pr.adminName) setAdminName((prev) => prev || pr.adminName);
            if (pr.adminPhone) {
              const digits = pr.adminPhone.replace(/\D/g, "").slice(-10);
              setPhoneDigits((prev) => prev || digits);
            }
            if (pr.address) setAddress((prev) => prev || pr.address);
            if (pr.employeeLimit) setEmployeeLimit(String(pr.employeeLimit));
            if (pr.attendanceMode) setAttendanceMode(pr.attendanceMode);
          }
        })
        .catch(() => {});
    }
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    if (phoneDigits.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      setLoading(false);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      let accessToken = "";
      try {
        const { data: { session } } = await supabase.auth.getSession();
        accessToken = session?.access_token || "";
      } catch (e) {}

      const adminEmail = (localStorage.getItem("adminEmail") || "").toLowerCase().trim();
      const selectedCompanyId = localStorage.getItem("selectedCompanyId") || "";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      if (adminEmail) headers["x-admin-email"] = adminEmail;
      if (selectedCompanyId) headers["x-company-id"] = selectedCompanyId;

      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: companyName,
          adminName,
          adminEmail,
          companyId: selectedCompanyId,
          adminPhone: "+91" + phoneDigits,
          countryCode: "+91",
          employeeLimit,
          subscription: "trial",
          status: "active",
          latitude,
          longitude,
          radius,
          logo: logoBase64,
          address,
          attendanceMode,
          geofenceMode,
          shiftStandard,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to complete onboarding.");
        return;
      }

      const compId = data.companyId || selectedCompanyId;
      localStorage.setItem("selectedCompanyId", compId);
      localStorage.setItem("companyName", companyName);
      localStorage.setItem("attendanceMode", attendanceMode);
      localStorage.setItem("onboarded_" + compId, "true");
      if (adminEmail) localStorage.setItem("onboarded_" + adminEmail, "true");
      document.cookie = "admin_onboarded=true; path=/; max-age=31536000; SameSite=Lax";
      document.cookie = `admin_company_id=${encodeURIComponent(compId)}; path=/; max-age=31536000; SameSite=Lax`;

      setSuccessCompanyId(compId);
      setShowSuccessModal(true);
    } catch (err) {
      console.error(err);
      setError("Failed to complete onboarding.");
    } finally {
      setLoading(false);
    }
  };

  const handleRedirect = () => {
    const finalCompId = successCompanyId || localStorage.getItem("selectedCompanyId") || "";
    if (finalCompId) {
      localStorage.setItem("selectedCompanyId", finalCompId);
    }
    window.location.href = "/admin";
  };

  return (
    <div className={styles.adminLayout}>
      <main style={{ flex: 1, padding: "40px 24px", maxWidth: "580px", margin: "0 auto" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
          <img
            src="/presivox_logo.png"
            alt="Presivox"
            style={{ width: "190px", height: "auto", display: "block", marginBottom: "6px" }}
          />
          <a
            href="https://www.solutionplanets.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "0.78rem", color: "#64748b", textDecoration: "none", fontWeight: 600 }}
          >
            A Product of <span style={{ color: "#2563eb", textDecoration: "underline" }}>Solution Planets</span>
          </a>
        </div>

        {showSuccessModal ? (
          <div className={`${styles.contentCard} glass-panel`} style={{ padding: "40px 32px", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
              <div style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-success)",
                boxShadow: "0 0 20px rgba(16, 185, 129, 0.2)"
              }}>
                <CheckCircle size={32} />
              </div>
            </div>
            <h1 style={{ color: "#0f172a", fontSize: "1.6rem", fontWeight: 800, marginBottom: "12px" }}>Company Setup Complete!</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.6", marginBottom: "28px" }}>
              Your company details have been saved. You can now access your admin dashboard.
            </p>
            <button type="button" className="btn btn-primary" onClick={handleRedirect} style={{ width: "100%", height: "46px", fontWeight: 700 }}>
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className={`${styles.contentCard} glass-panel`} style={{ padding: "28px" }}>
            <div className={styles.cardHeader} style={{ marginBottom: "24px" }}>
              <div>
                <h1 className={styles.headerTitle} style={{ fontSize: "1.5rem" }}>Company Setup</h1>
                <p className={styles.headerSubtitle} style={{ fontSize: "0.85rem" }}>
                  Review your company account details before opening the dashboard.
                </p>
              </div>
              <Building2 size={20} color="var(--color-primary)" />
            </div>

            <form onSubmit={submit} className={styles.settingsForm} style={{ gap: "16px" }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Company Name *</label>
                <input 
                  className="form-input" 
                  required 
                  value={companyName} 
                  onChange={(event) => setCompanyName(event.target.value)} 
                  placeholder="Enter company name"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Office Address *</label>
                <input 
                  className="form-input" 
                  required 
                  value={address} 
                  onChange={(event) => setAddress(event.target.value)} 
                  placeholder="Enter main office address" 
                />
              </div>

              <div className={styles.formGridTwo}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Your Name *</label>
                  <input 
                    className="form-input" 
                    required 
                    value={adminName} 
                    onChange={(event) => setAdminName(event.target.value)} 
                    placeholder="Enter your full name"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Admin WhatsApp Number *</label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ 
                      padding: "12px 14px", 
                      background: "rgba(255, 255, 255, 0.04)", 
                      border: "1px solid var(--border-light)", 
                      borderRadius: "8px",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                      fontSize: "0.95rem",
                      userSelect: "none"
                    }}>
                      +91
                    </span>
                    <input 
                      type="tel"
                      className="form-input" 
                      required 
                      placeholder="Enter 10-digit number"
                      value={phoneDigits} 
                      onChange={(event) => {
                        const digits = event.target.value.replace(/\D/g, "");
                        if (digits.length <= 10) {
                          setPhoneDigits(digits);
                        }
                      }} 
                    />
                  </div>
                </div>
              </div>

              {/* Employee Limit - Auto set based on Plan, non-editable */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Employee Capacity Limit</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-primary)", display: "flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                    <Lock size={12} /> Auto-fixed by Plan
                  </span>
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  readOnly 
                  disabled
                  value={
                    parseInt(employeeLimit) >= 999990
                      ? "Unlimited Employees (Plan C)"
                      : `${employeeLimit} Employees (Plan Limit)`
                  } 
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    color: "var(--text-primary)",
                    cursor: "not-allowed",
                    fontWeight: 600,
                    letterSpacing: "0.3px",
                  }}
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  Fixed to your selected subscription plan. You cannot change this capacity here.
                </span>
              </div>

              <div className={styles.formGroup} style={{ marginBottom: "6px" }}>
                <label className={styles.formLabel}>Company Logo (Optional)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="form-input" 
                  onChange={handleLogoChange}
                  style={{ padding: "8px 12px", fontSize: "0.85rem" }}
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                  Max file size: 1MB. Format: PNG, JPG, JPEG.
                </span>
                {logoError && <span style={{ color: "var(--color-danger)", fontSize: "0.75rem", display: "block", marginTop: "4px" }}>{logoError}</span>}
                {logoName && <span style={{ color: "var(--color-success)", fontSize: "0.75rem", display: "block", marginTop: "4px" }}>Selected: {logoName}</span>}
              </div>

              {error && <span className={styles.formError}>{error}</span>}

              {/* Company Setup Configuration */}
              <div style={{
                background: "rgba(139, 92, 246, 0.06)",
                border: "1px solid rgba(139, 92, 246, 0.2)",
                borderRadius: "12px",
                padding: "18px",
                display: "grid",
                gap: "14px",
                margin: "8px 0",
              }}>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sparkles size={16} color="var(--color-primary)" />
                  Attendance Verification Configuration
                </div>

                {/* Inherited Verification Mode from Payment */}
                <div style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid var(--border-light)",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "8px",
                }}>
                  <div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "2px" }}>
                      Selected Attendance Mode (From Plan Payment)
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                      <ShieldCheck size={16} color="var(--color-success)" />
                      {attendanceMode === "without_photo"
                        ? "⚡ Without Photo (Fast 1-Tap QR & Mobile Number)"
                        : "📸 With Photo (AI Face Verification & Selfie)"}
                    </div>
                  </div>
                  <span style={{
                    fontSize: "0.72rem",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    background: "rgba(16, 185, 129, 0.12)",
                    color: "var(--color-success)",
                    fontWeight: 600,
                  }}>
                    Active from Payment
                  </span>
                </div>

                {/* Question 1: GPS Enforcement */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Office Geofence Enforcement</label>
                  <select
                    className="form-input"
                    value={geofenceMode}
                    onChange={(e) => setGeofenceMode(e.target.value as any)}
                  >
                    <option value="strict">🔒 Strict GPS Geofence (Must be within office radius)</option>
                    <option value="flexible">🌐 Flexible / Remote (Allowed outside radius with GPS logging)</option>
                  </select>
                </div>

                {/* Question 2: Shift Hours */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Daily Standard Shift Hours</label>
                  <select
                    className="form-input"
                    value={shiftStandard}
                    onChange={(e) => setShiftStandard(e.target.value)}
                  >
                    <option value="8_hours">Standard 8 Hours / Day</option>
                    <option value="9_hours">Standard 9 Hours / Day</option>
                    <option value="flexible">Flexible Timing</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: "12px" }}>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", height: "46px", fontWeight: 700 }}>
                  {loading ? <Loader2 className="animate-spin" size={16} /> : "Complete Company Setup →"}
                </button>
              </div>
            </form>
          </div>
        )}

        <footer style={{
          marginTop: "36px",
          padding: "16px 0",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "0.8rem",
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
  );
}
