"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2, Sparkles } from "lucide-react";
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
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("200");

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
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to complete onboarding.");
        return;
      }

      localStorage.setItem("selectedCompanyId", data.companyId);
      window.location.href = "/admin";
    } catch (err) {
      console.error(err);
      setError("Failed to complete onboarding.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.adminLayout}>
      <main style={{ flex: 1, padding: "40px 24px", maxWidth: "580px", margin: "0 auto" }}>
        <div className={styles.brand} style={{ marginBottom: "20px" }}>
          <Sparkles className={styles.brandIcon} size={22} />
          <span className="glow-text-purple">SmartOffice</span>
        </div>

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
