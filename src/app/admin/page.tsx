"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { 
  Users, MapPin, CheckCircle, XCircle, AlertTriangle, ShieldAlert,
  Settings, Image, Search, Filter, Download, ExternalLink, Menu, Sparkles, CalendarDays, X, Plus, Loader2
} from "lucide-react";
import AuthGate from "@/components/AuthGate";
import Sidebar from "@/components/Sidebar";
import styles from "./admin.module.css";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

interface Record {
  id: string;
  employeeId: string;
  employeeName: string;
  selfieUrl: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  distanceFromOffice: number;
  status: string;
  checkInTime: string;
  checkoutTime?: string | null;
  workHours?: string | null;
  timezone: string;
  deviceInfo: string;
  festival?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  distanceFromBranch?: number | null;
  checkInBranchName?: string | null;
  checkOutBranchName?: string | null;
  type?: string | null;
}

const formatDateToDDMMYYYY = (dateInput: string | Date | null | undefined) => {
  if (!dateInput) return "-";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateTimeToDDMMYYYY = (dateInput: string | Date | null | undefined) => {
  if (!dateInput) return "-";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  
  let tempHours = date.getHours();
  const ampm = tempHours >= 12 ? "PM" : "AM";
  tempHours = tempHours % 12;
  tempHours = tempHours ? tempHours : 12;
  const hourStr = String(tempHours).padStart(2, "0");
  const minStr = String(minutes).padStart(2, "0");
  
  return `${day}/${month}/${year} ${hourStr}:${minStr} ${ampm}`;
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<Record[]>([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  
  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [mounted, setMounted] = useState(false);

  // Office Geofence Config
  const [officeConfig, setOfficeConfig] = useState({
    latitude: 28.6139,
    longitude: 77.2090,
    radius: 200,
  });
  const [configSaving, setConfigSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  // Modal for Selfie View
  const [activeSelfie, setActiveSelfie] = useState<string | null>(null);

  // Branches Config State
  const [branches, setBranches] = useState<any[]>([]);

  // Map instance reference
  const mapRef = useRef<any>(null);
  const selectedCompanyHeaders: { [key: string]: string } = selectedCompanyId ? { "x-company-id": selectedCompanyId } : {};

  // Company logo upload state
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [showLogoPrompt, setShowLogoPrompt] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [logoSuccessMsg, setLogoSuccessMsg] = useState("");

  const checkCompanyLogo = async (companyId: string) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch("/api/admin/companies", {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const data = await res.json();
      if (data.success && data.companies) {
        const current = data.companies.find((c: any) => c.id === companyId);
        if (current) {
          setCompanyLogo(current.logoUrl);
          
          const dismissed = sessionStorage.getItem(`dismissed_logo_prompt_${companyId}`);
          if (!current.logoUrl && dismissed !== "true") {
            setShowLogoPrompt(true);
          }
        }
      }
    } catch (err) {
      console.error("Error checking company logo:", err);
    }
  };

  const handleUploadLogo = async (base64Image: string) => {
    setLogoUploading(true);
    setLogoError("");
    setLogoSuccessMsg("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch("/api/admin/company/logo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
          "x-company-id": selectedCompanyId
        },
        body: JSON.stringify({ logo: base64Image })
      });

      const data = await res.json();
      if (!res.ok) {
        setLogoError(data.error || "Failed to upload logo.");
      } else {
        setCompanyLogo(data.logoUrl);
        setLogoSuccessMsg("Your check-in and check-out images will be sent to your company email in 48 hours.");
        setTimeout(() => {
          setShowLogoPrompt(false);
          setLogoSuccessMsg("");
        }, 4000);
      }
    } catch (err) {
      console.error(err);
      setLogoError("Network error. Failed to upload logo.");
    } finally {
      setLogoUploading(false);
    }
  };

  useEffect(() => {
    setSelectedCompanyId(localStorage.getItem("selectedCompanyId") || "");
    
    // Default start and end dates to today's local date
    const getTodayString = () => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const today = getTodayString();
    setStartDate(today);
    setEndDate(today);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !selectedCompanyId) return;
    fetchDashboardData();
    fetchOfficeConfig();
    fetchEmployeesCount();
    fetchBranches();
    checkCompanyLogo(selectedCompanyId);
  }, [mounted, selectedCompanyId, search, statusFilter, startDate, endDate]);

  // Load Map when Leaflet scripts are injected and ready
  useEffect(() => {
    if (typeof window === "undefined" || loading) return;

    const loadLeafletMap = () => {
      // Check if Leaflet L is already loaded
      if ((window as any).L) {
        initMap();
        return;
      }

      // Load Leaflet CSS
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);

      // Load Leaflet JS
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => initMap();
      document.head.appendChild(script);
    };

    loadLeafletMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [loading, records, officeConfig, branches]);

  const fetchDashboardData = async () => {
    try {
      const query = new URLSearchParams({
        search,
        status: statusFilter,
        startDate,
        endDate,
        type: "check-in"
      });
      const res = await fetch(`/api/admin/records?${query.toString()}`, { headers: selectedCompanyHeaders });
      const data = await res.json();
      if (data.success) {
        setRecords(data.records);
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOfficeConfig = async () => {
    try {
      const res = await fetch("/api/admin/settings", { headers: selectedCompanyHeaders });
      const data = await res.json();
      if (data.success && data.officeConfig) {
        setOfficeConfig(data.officeConfig);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch("/api/admin/branches", { headers: selectedCompanyHeaders });
      const data = await res.json();
      if (data.success && data.branches) {
        setBranches(data.branches);
      }
    } catch (err) {
      console.error(err);
    }
  };



  const fetchEmployeesCount = async () => {
    try {
      const res = await fetch("/api/admin/employees", { headers: selectedCompanyHeaders });
      const data = await res.json();
      if (data.success && data.employees) {
        setTotalEmployees(data.employees.length);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveOfficeConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...selectedCompanyHeaders },
        body: JSON.stringify(officeConfig),
      });
      const data = await res.json();
      if (data.success) {
        alert("Office Geofence configuration updated successfully.");
        fetchBranches();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save geofence config.");
    } finally {
      setConfigSaving(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOfficeConfig((prev) => ({
          ...prev,
          latitude: parseFloat(position.coords.latitude.toFixed(6)),
          longitude: parseFloat(position.coords.longitude.toFixed(6)),
        }));
        setLocating(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert(`Failed to retrieve location: ${error.message}`);
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Initialize Map
  const initMap = () => {
    const L = (window as any).L;
    if (!L) return;

    const mapContainer = document.getElementById("admin-map");
    if (!mapContainer) return;

    // Remove old map instance
    if (mapRef.current) {
      mapRef.current.remove();
    }

    const { latitude, longitude, radius } = officeConfig;
    const mainOfficeBranch = branches.find(b => b.isMainOffice) || { latitude, longitude, radiusMeters: radius };

    // Create Map centered at main office
    const map = L.map("admin-map").setView([mainOfficeBranch.latitude, mainOfficeBranch.longitude], 14);
    mapRef.current = map;

    // Add Tile Layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20
    }).addTo(map);

    // Draw all branches
    branches.forEach((b) => {
      const isMain = b.isMainOffice;
      const branchColor = isMain ? "var(--color-primary)" : "#3b82f6";
      const branchGlow = isMain ? "var(--color-primary-glow)" : "rgba(59, 130, 246, 0.4)";

      const branchIcon = L.divIcon({
        html: `<div style="background-color: ${branchColor}; width: 14px; height: 14px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px ${branchGlow}"></div>`,
        className: `custom-branch-pin-${b.id}`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const marker = L.marker([b.latitude, b.longitude], { icon: branchIcon })
        .addTo(map)
        .bindPopup(`<strong>${b.name}</strong>${isMain ? " (Main Office)" : ""}<br/>${b.address || ""}`);

      if (isMain) {
        marker.openPopup();
      }

      L.circle([b.latitude, b.longitude], {
        color: branchColor,
        fillColor: branchGlow,
        fillOpacity: 0.12,
        radius: b.radiusMeters
      }).addTo(map);
    });

    // Draw employee pins
    records.forEach((rec) => {
      if (!rec.latitude || !rec.longitude) return;

      const isOutside = rec.status === "outside_radius";
      const pinColor = isOutside ? "var(--color-danger)" : "var(--color-success)";
      const pinGlow = isOutside ? "var(--color-danger-glow)" : "var(--color-success-glow)";

      const employeeIcon = L.divIcon({
        html: `<div style="background-color: ${pinColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 8px ${pinGlow}"></div>`,
        className: `custom-employee-pin-${rec.id}`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });

      const formattedTime = new Date(rec.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const popupText = `
        <div style="color: #111; font-size: 12px;">
          <strong>${rec.employeeName}</strong> (${rec.employeeId})<br/>
          Checked In: ${formattedTime}<br/>
          Distance: ${Math.round(rec.distanceFromOffice)}m<br/>
          Status: <span style="color: ${isOutside ? 'red' : 'green'}; font-weight:bold">${rec.status}</span>
        </div>
      `;

      L.marker([rec.latitude, rec.longitude], { icon: employeeIcon })
        .addTo(map)
        .bindPopup(popupText);
    });
  };

  // Stats computation
  const todayPresent = records.filter(r => r.status === "present").length;
  const todayOutside = records.filter(r => r.status === "outside_radius").length;

  // Export to simple CSV
  const exportToCSV = () => {
    if (records.length === 0) return;
    
    const headers = ["Employee ID", "Employee Name", "Date/Time (Check-In)", "Checkout Time", "Work Hours", "Latitude", "Longitude", "Distance (m)", "Status", "Festival", "Device"];
    const rows = records.map(r => [
      r.employeeId,
      r.employeeName,
      formatDateTimeToDDMMYYYY(r.checkInTime),
      r.checkoutTime ? formatDateTimeToDDMMYYYY(r.checkoutTime) : "-",
      r.workHours || "-",
      r.latitude,
      r.longitude,
      Math.round(r.distanceFromOffice),
      r.status,
      r.festival || "-",
      r.deviceInfo.replace(/,/g, " ")
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AuthGate>
      <div className={styles.adminLayout}>
      {/* Sidebar Navigation */}
      <Sidebar activeKey="dashboard" onCompanyChange={(id) => setSelectedCompanyId(id)} />

      {/* Main Content */}
      <main className={styles.mainContainer}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.headerTitle}>Overview Dashboard</h1>
            <p className={styles.headerSubtitle}>Real-time employee check-in logs & radius tracking</p>
          </div>
          <button onClick={exportToCSV} disabled={records.length === 0} className="btn btn-primary">
            <Download size={16} /> Export CSV
          </button>
        </div>

        {/* Stats Grid */}
        <section className={styles.statsGrid}>
          <div className={`${styles.statCard} glass-panel`}>
            <div className={styles.statHeader}>
              <span>Registered Staff</span>
              <Users size={16} color="var(--color-primary)" />
            </div>
            <div className={styles.statValue}>{totalEmployees}</div>
          </div>
          <div className={`${styles.statCard} glass-panel`}>
            <div className={styles.statHeader}>
              <span>Present Today</span>
              <CheckCircle size={16} color="var(--color-success)" />
            </div>
            <div className={styles.statValue}>{todayPresent}</div>
          </div>
          <div className={`${styles.statCard} glass-panel`}>
            <div className={styles.statHeader}>
              <span>Outside Boundary</span>
              <AlertTriangle size={16} color="var(--color-danger)" />
            </div>
            <div className={styles.statValue} style={{ color: "var(--color-danger)" }}>{todayOutside}</div>
          </div>
        </section>

        {/* Dashboard Grid (Map & Config Settings) */}
        <div className={styles.dashboardGrid}>
          {/* Map Column */}
          <div className={`${styles.contentCard} glass-panel`}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Live Attendance Map</h2>
              <MapPin size={16} color="var(--color-secondary)" />
            </div>
            <div id="admin-map" className={styles.leafletContainer} style={{ minHeight: "300px" }}></div>
          </div>

          {/* Config Settings Column */}
          <div className={`${styles.contentCard} glass-panel`}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Geofence Settings</h2>
              <Settings size={16} color="var(--text-secondary)" />
            </div>
            <form onSubmit={saveOfficeConfig} className={styles.settingsForm}>
              <div className={styles.formGridTwo}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Office Latitude</label>
                  <input 
                    type="number" 
                    step="0.000001"
                    className="form-input" 
                    value={officeConfig.latitude} 
                    onChange={(e) => setOfficeConfig({...officeConfig, latitude: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Office Longitude</label>
                  <input 
                    type="number" 
                    step="0.000001"
                    className="form-input" 
                    value={officeConfig.longitude} 
                    onChange={(e) => setOfficeConfig({...officeConfig, longitude: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locating}
                className="btn btn-outline"
                style={{ width: "100%", padding: "10px" }}
              >
                <MapPin size={16} />
                {locating ? "Fetching Location..." : "Use My Current Location"}
              </button>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Allowed Radius (Meters)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={officeConfig.radius} 
                  onChange={(e) => setOfficeConfig({...officeConfig, radius: parseInt(e.target.value) || 0})}
                />
              </div>
              <button type="submit" disabled={configSaving} className="btn btn-secondary" style={{ marginTop: "8px" }}>
                Save Settings
              </button>
            </form>
          </div>


        </div>

        {/* Records Table Card */}
        <div className={`${styles.contentCard} glass-panel`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Check-In Logs</h2>
            <div style={{ display: "flex", gap: "8px" }}>
              <Search size={16} color="var(--text-muted)" />
            </div>
          </div>

          {/* Table Search & Filter Bar */}
          <div className={styles.logsFilterBar}>
            <input 
              type="text" 
              placeholder="Search by Employee Name or ID..." 
              className="form-input id-search-filter" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select 
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Logs</option>
              <option value="present">Within Radius</option>
              <option value="outside_radius">Outside Radius</option>
            </select>
            <div className={styles.logsDateRow}>
              <div style={{ position: "relative", flex: 1 }}>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ width: "100%", cursor: "pointer" }}
                  value={formatDateToDDMMYYYY(startDate)}
                  readOnly
                  onClick={(e) => {
                    const dateInput = e.currentTarget.nextElementSibling as HTMLInputElement;
                    if (dateInput) {
                      try {
                        dateInput.showPicker();
                      } catch (err) {
                        dateInput.focus();
                      }
                    }
                  }}
                />
                <input 
                  type="date" 
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    opacity: 0,
                    zIndex: -1,
                  }}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div style={{ position: "relative", flex: 1 }}>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ width: "100%", cursor: "pointer" }}
                  value={formatDateToDDMMYYYY(endDate)}
                  readOnly
                  onClick={(e) => {
                    const dateInput = e.currentTarget.nextElementSibling as HTMLInputElement;
                    if (dateInput) {
                      try {
                        dateInput.showPicker();
                      } catch (err) {
                        dateInput.focus();
                      }
                    }
                  }}
                />
                <input 
                  type="date" 
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    opacity: 0,
                    zIndex: -1,
                  }}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px" }}>Loading records...</p>
          ) : records.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px" }}>No attendance logs found matching filters.</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Selfie</th>
                    <th>ID</th>
                    <th>Employee Name</th>
                    <th>Check-In Time</th>
                    <th>Checkout Time</th>
                    <th>Work Hours</th>
                    <th>Check-In Branch</th>
                    <th>Check-Out Branch</th>
                    <th>Distance</th>
                    <th>Status</th>
                    <th>Festival</th>
                    <th>Device Info</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => (
                    <tr key={rec.id}>
                      <td>
                        <img 
                          src={rec.selfieUrl} 
                          alt="Selfie" 
                          className={styles.thumbnail}
                          onClick={() => setActiveSelfie(rec.selfieUrl)}
                        />
                      </td>
                      <td style={{ fontWeight: 600 }}>{rec.employeeId}</td>
                      <td>{rec.employeeName}</td>
                      <td>
                        {formatDateToDDMMYYYY(rec.checkInTime)}{" "}
                        <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                          {new Date(rec.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td>
                        {rec.checkoutTime ? (
                          <>
                            {formatDateToDDMMYYYY(rec.checkoutTime)}{" "}
                            <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                              {new Date(rec.checkoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </>
                        ) : (
                          <span style={{ color: "var(--text-secondary)" }}>-</span>
                        )}
                      </td>
                      <td style={{ fontWeight: rec.workHours ? 600 : 400, color: rec.workHours ? "var(--color-success)" : "inherit" }}>
                        {rec.workHours || "-"}
                      </td>
                      <td>
                        {rec.checkInBranchName || (rec.branchName && rec.type === 'check-in' ? rec.branchName : "-")}
                      </td>
                      <td>
                        {rec.checkOutBranchName || (rec.branchName && rec.type === 'check-out' ? rec.branchName : "-")}
                      </td>
                      <td>
                        {Math.round(rec.distanceFromOffice)}m
                      </td>
                      <td>
                        <span className={`${styles.badge} ${
                          rec.status === "present" ? styles.badgePresent : styles.badgeOutside
                        }`}>
                          {rec.status === "present" ? "Present" : "Outside Radius"}
                        </span>
                      </td>
                      <td>
                        {rec.festival ? (
                          <span style={{ color: "var(--color-danger)", fontWeight: "bold", fontSize: "0.85rem" }}>
                            Festival Day Login ({rec.festival})
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                            -
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: "0.75rem", color: "var(--text-secondary)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={rec.deviceInfo}>
                        {rec.deviceInfo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Selfie Preview Modal */}
      {activeSelfie && (
        <div className={styles.modalOverlay} onClick={() => setActiveSelfie(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setActiveSelfie(null)}>×</button>
            <img src={activeSelfie} alt="Employee Selfie Preview" className={styles.modalImage} />
            <a href={activeSelfie} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ display: "inline-flex" }}>
              Open in New Tab <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}


      {showLogoPrompt && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(6, 7, 10, 0.8)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "24px"
        }}>
          <div className="glass-panel" style={{
            width: "100%",
            maxWidth: "480px",
            padding: "32px",
            textAlign: "center",
            position: "relative",
            border: "1px solid rgba(139, 92, 246, 0.2)",
            boxShadow: "0 0 30px rgba(139, 92, 246, 0.15)"
          }}>
            <button
              onClick={() => {
                sessionStorage.setItem(`dismissed_logo_prompt_${selectedCompanyId}`, "true");
                setShowLogoPrompt(false);
              }}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                outline: "none"
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
              <div style={{
                width: "50px",
                height: "50px",
                borderRadius: "12px",
                background: "rgba(139, 92, 246, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-primary)"
              }}>
                <Sparkles size={24} />
              </div>
            </div>

            <h3 style={{ color: "#fff", fontSize: "1.4rem", fontWeight: 700, marginBottom: "8px" }}>Add Company Logo</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: "1.5", marginBottom: "24px" }}>
              Please upload your company logo for check-in and check-out logs. This will help brand your employee registry dashboard.
            </p>

            {logoSuccessMsg ? (
              <div style={{
                padding: "16px",
                borderRadius: "8px",
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                color: "#a7f3d0",
                fontSize: "0.88rem",
                lineHeight: "1.5",
                marginBottom: "16px",
                textAlign: "left"
              }}>
                <strong>Success!</strong> {logoSuccessMsg}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left", marginBottom: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>Select Logo Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="form-input"
                    style={{ padding: "8px 12px", fontSize: "0.85rem" }}
                    disabled={logoUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 1024 * 1024) {
                        setLogoError("Logo size must be less than 1MB.");
                        e.target.value = "";
                        return;
                      }
                      setLogoError("");
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        handleUploadLogo(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    Max file size: 1MB. Format: PNG, JPG, JPEG.
                  </span>
                </div>

                {logoError && (
                  <div style={{ color: "#fca5a5", fontSize: "0.82rem", background: "rgba(239, 68, 68, 0.08)", padding: "10px", borderRadius: "6px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                    {logoError}
                  </div>
                )}

                {logoUploading && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Uploading company logo...</span>
                  </div>
                )}
              </div>
            )}

            {!logoSuccessMsg && (
              <button
                type="button"
                className="btn btn-outline"
                style={{ width: "100%", fontSize: "0.88rem" }}
                disabled={logoUploading}
                onClick={() => {
                  sessionStorage.setItem(`dismissed_logo_prompt_${selectedCompanyId}`, "true");
                  setShowLogoPrompt(false);
                }}
              >
                Skip for Now
              </button>
            )}
          </div>
        </div>
      )}

      </div>
    </AuthGate>
  );
}
