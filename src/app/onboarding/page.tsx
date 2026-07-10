"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2, Sparkles, CheckCircle } from "lucide-react";
import AuthGate from "@/components/AuthGate";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import styles from "../admin/admin.module.css";

const inferCountryCode = () => {
  const locale = navigator.language || "";
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  if (locale.endsWith("-IN") || timezone === "Asia/Calcutta" || timezone === "Asia/Kolkata") return "+91";
  if (locale.endsWith("-US")) return "+1";
  if (locale.endsWith("-GB")) return "+44";
  if (locale.endsWith("-AE")) return "+971";
  return "+91";
};

function OnboardingContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adminName, setAdminName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [employeeLimit, setEmployeeLimit] = useState("25");
  const [latitude, setLatitude] = useState("28.6139");
  const [longitude, setLongitude] = useState("77.2090");
  const [radius, setRadius] = useState("200");
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [logoName, setLogoName] = useState("");
  const [logoError, setLogoError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successCompanyId, setSuccessCompanyId] = useState("");

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

  const fillOfficeLocation = () => {
    setError("");
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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        window.location.href = "/login";
        return;
      }

      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: companyName,
          adminName,
          adminPhone: "+91" + phoneDigits,
          countryCode: "+91",
          employeeLimit,
          subscription: "trial",
          status: "active",
          latitude,
          longitude,
          radius,
          logo: logoBase64,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to complete onboarding.");
        return;
      }

      setSuccessCompanyId(data.companyId);
      setShowSuccessModal(true);
    } catch (err) {
      console.error(err);
      setError("Failed to complete onboarding.");
    } finally {
      setLoading(false);
    }
  };

  const handleRedirect = () => {
    if (successCompanyId) {
      localStorage.setItem("selectedCompanyId", successCompanyId);
      window.location.href = "/admin";
    }
  };

  return (
    <div className={styles.adminLayout}>
      <main style={{ flex: 1, padding: "40px 24px", maxWidth: "580px", margin: "0 auto" }}>
        <div className={styles.brand} style={{ marginBottom: "20px" }}>
          <Sparkles className={styles.brandIcon} size={22} />
          <span className="glow-text-purple">SmartOffice</span>
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
            <h1 className="glow-text-purple" style={{ color: "#fff", fontSize: "1.6rem", fontWeight: 800, marginBottom: "12px" }}>Company Setup Complete!</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.6", marginBottom: "28px" }}>
              Your check-in and check-out images will be sent to your company email in 48 hours.
            </p>
            <button type="button" className="btn btn-primary" onClick={handleRedirect} style={{ width: "100%", height: "46px" }}>
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className={`${styles.contentCard} glass-panel`} style={{ padding: "28px" }}>
            <div className={styles.cardHeader} style={{ marginBottom: "24px" }}>
              <div>
                <h1 className={styles.headerTitle} style={{ fontSize: "1.5rem" }}>Company Setup</h1>
                <p className={styles.headerSubtitle} style={{ fontSize: "0.85rem" }}>Create your company account before opening the dashboard.</p>
              </div>
              <Building2 size={20} color="var(--color-primary)" />
            </div>

            <form onSubmit={submit} className={styles.settingsForm} style={{ gap: "14px" }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Company Name</label>
                <input className="form-input" required value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
              </div>

              <div className={styles.formGridTwo}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Your Name</label>
                  <input className="form-input" required value={adminName} onChange={(event) => setAdminName(event.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Admin WhatsApp Number</label>
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

              <div className={styles.formGridTwo}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Employee Limit</label>
                  <input type="number" min="1" className="form-input" required value={employeeLimit} onChange={(event) => setEmployeeLimit(event.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Allowed Office Radius (Meters)</label>
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

              <div className={styles.formGroup} style={{ marginBottom: "12px" }}>
                <label className={styles.formLabel}>Company Logo (For Check-in/Check-out screens)</label>
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

              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button type="button" className="btn btn-outline" onClick={fillOfficeLocation} style={{ flex: 1 }}>
                  Use My Location
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>
                  {loading ? <Loader2 className="animate-spin" size={16} /> : "Create Company"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <AuthGate allowOnboarding>
      <OnboardingContent />
    </AuthGate>
  );
}
