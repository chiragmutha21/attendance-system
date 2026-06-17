"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { 
  Users, MapPin, CheckCircle, XCircle, AlertTriangle, ShieldAlert,
  Settings, Image, Search, Filter, Download, ExternalLink, Menu, Sparkles, CalendarDays
} from "lucide-react";
import AuthGate from "@/components/AuthGate";
import Sidebar from "@/components/Sidebar";
import styles from "./admin.module.css";

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

  // Map instance reference
  const mapRef = useRef<any>(null);
  const selectedCompanyHeaders: { [key: string]: string } = selectedCompanyId ? { "x-company-id": selectedCompanyId } : {};

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
    if (!mounted) return;
    fetchDashboardData();
    fetchOfficeConfig();
    fetchEmployeesCount();
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
  }, [loading, records, officeConfig]);

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

    // Create Map centered at office
    const map = L.map("admin-map").setView([latitude, longitude], 15);
    mapRef.current = map;

    // Add Tile Layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20
    }).addTo(map);

    // Office Location Pin & Radius Circle
    const officeIcon = L.divIcon({
      html: `<div style="background-color: var(--color-primary); width: 14px; height: 14px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px var(--color-primary-glow)"></div>`,
      className: "custom-office-pin",
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    L.marker([latitude, longitude], { icon: officeIcon })
      .addTo(map)
      .bindPopup("<strong>Headquarters Office</strong>")
      .openPopup();

    L.circle([latitude, longitude], {
      color: "var(--color-primary)",
      fillColor: "var(--color-primary-glow)",
      fillOpacity: 0.15,
      radius: radius
    }).addTo(map);

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
                      <td>{Math.round(rec.distanceFromOffice)}m</td>
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
      </div>
    </AuthGate>
  );
}
