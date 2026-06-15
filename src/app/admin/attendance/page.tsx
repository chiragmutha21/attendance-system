"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle,
  Download,
  MapPin,
  MessageCircle,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import AuthGate from "@/components/AuthGate";
import styles from "../admin.module.css";

interface Employee {
  id: string;
  employeeId: string;
  fullName: string;
  mobileNumber: string;
  department: string;
  role: string;
  status: string;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  selfieUrl: string;
  distanceFromOffice: number;
  status: string;
  checkInTime: string;
  deviceInfo: string;
}

type Period = "daily" | "weekly" | "monthly";

const toDateInputValue = (date: Date) => {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
};

const getPeriodRange = (period: Period) => {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  if (period === "weekly") {
    const day = today.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    start.setDate(today.getDate() + diffToMonday);
    end.setDate(start.getDate() + 6);
  }

  if (period === "monthly") {
    start.setDate(1);
    end.setMonth(start.getMonth() + 1, 0);
  }

  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
};

export default function CheckAttendancePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [period, setPeriod] = useState<Period>("daily");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("all");
  const [search, setSearch] = useState("");
  const [activeSelfie, setActiveSelfie] = useState<string | null>(null);

  const selectedRange = useMemo(() => getPeriodRange(period), [period]);
  const selectedCompanyHeaders: Record<string, string> = selectedCompanyId ? { "x-company-id": selectedCompanyId } : {};

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const res = await fetch("/api/admin/employees", { headers: selectedCompanyHeaders });
      const data = await res.json();
      if (data.success && data.employees) {
        setEmployees(data.employees);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchRecords = async () => {
    try {
      setLoadingRecords(true);
      const query = new URLSearchParams({
        employeeId: selectedEmployeeId,
        status: "all",
        search,
        startDate: selectedRange.startDate,
        endDate: selectedRange.endDate,
      });
      const res = await fetch(`/api/admin/records?${query.toString()}`, { headers: selectedCompanyHeaders });
      const data = await res.json();
      if (data.success && data.records) {
        setRecords(data.records);
      }
    } catch (err) {
      console.error("Error fetching attendance:", err);
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    setSelectedCompanyId(localStorage.getItem("selectedCompanyId") || "");
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [selectedCompanyId]);

  useEffect(() => {
    fetchRecords();
  }, [selectedCompanyId, selectedEmployeeId, selectedRange.startDate, selectedRange.endDate, search]);

  const presentCount = records.filter((record) => record.status === "present").length;
  const outsideCount = records.filter((record) => record.status === "outside_radius").length;
  const uniqueEmployeeCount = new Set(records.map((record) => record.employeeId)).size;

  const selectedEmployee = employees.find((employee) => employee.employeeId === selectedEmployeeId);

  const exportToCSV = () => {
    if (records.length === 0) return;

    const headers = ["Employee ID", "Employee Name", "Date/Time", "Distance (m)", "Status", "Device"];
    const rows = records.map((record) => [
      record.employeeId,
      record.employeeName,
      new Date(record.checkInTime).toLocaleString(),
      Math.round(record.distanceFromOffice),
      record.status,
      record.deviceInfo.replace(/,/g, " "),
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Check_Attendance_${period}_${selectedRange.startDate}_to_${selectedRange.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <AuthGate>
      <div className={styles.adminLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Sparkles className={styles.brandIcon} size={22} />
          <span className="glow-text-purple">SmartOffice</span>
        </div>
        <nav className={styles.navMenu}>
          <Link href="/admin" className={styles.navLink}>
            <MapPin size={18} /> Dashboard
          </Link>
          <Link href="/admin/attendance" className={`${styles.navLink} ${styles.navLinkActive}`}>
            <CalendarDays size={18} /> Check Attendance
          </Link>
          <Link href="/admin/employees" className={styles.navLink}>
            <Users size={18} /> Employee Registry
          </Link>
          <Link href="/admin/sandbox" className={styles.navLink}>
            <MessageCircle size={18} /> WhatsApp Sandbox
          </Link>
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.statusIndicator}>
            <div className={`${styles.statusDot} ${styles.statusDotPulse}`} />
            <span>Mock Sandbox Active</span>
          </div>
        </div>
      </aside>

      <main className={styles.mainContainer}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.headerTitle}>Check Attendance</h1>
            <p className={styles.headerSubtitle}>
              Daily, weekly, and monthly attendance by employee
            </p>
          </div>
          <button onClick={exportToCSV} disabled={records.length === 0} className="btn btn-primary">
            <Download size={16} /> Export CSV
          </button>
        </div>

        <section className={styles.statsGrid}>
          <div className={`${styles.statCard} glass-panel`}>
            <div className={styles.statHeader}>
              <span>Total Check-Ins</span>
              <CalendarDays size={16} color="var(--color-primary)" />
            </div>
            <div className={styles.statValue}>{records.length}</div>
          </div>
          <div className={`${styles.statCard} glass-panel`}>
            <div className={styles.statHeader}>
              <span>Present</span>
              <CheckCircle size={16} color="var(--color-success)" />
            </div>
            <div className={styles.statValue}>{presentCount}</div>
          </div>
          <div className={`${styles.statCard} glass-panel`}>
            <div className={styles.statHeader}>
              <span>Outside Boundary</span>
              <AlertTriangle size={16} color="var(--color-danger)" />
            </div>
            <div className={styles.statValue} style={{ color: "var(--color-danger)" }}>
              {outsideCount}
            </div>
          </div>
          <div className={`${styles.statCard} glass-panel`}>
            <div className={styles.statHeader}>
              <span>Employees Seen</span>
              <Users size={16} color="var(--color-secondary)" />
            </div>
            <div className={styles.statValue}>{uniqueEmployeeCount}</div>
          </div>
        </section>

        <div className={`${styles.contentCard} glass-panel`}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Attendance Filters</h2>
              <p className={styles.cardMeta}>
                {selectedRange.startDate} to {selectedRange.endDate}
                {selectedEmployee ? ` | ${selectedEmployee.fullName}` : " | All employees"}
              </p>
            </div>
            <Search size={16} color="var(--text-muted)" />
          </div>

          <div className={styles.filterBar}>
            <select
              className={styles.filterSelect}
              value={period}
              onChange={(event) => setPeriod(event.target.value as Period)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>

            <select
              className={styles.filterSelect}
              value={selectedEmployeeId}
              onChange={(event) => setSelectedEmployeeId(event.target.value)}
              disabled={loadingEmployees}
            >
              <option value="all">All Employees</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.employeeId}>
                  {employee.fullName} ({employee.employeeId})
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Search name or employee ID..."
              className="form-input"
              style={{ flex: 2 }}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {loadingRecords ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px" }}>
              Loading attendance...
            </p>
          ) : records.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px" }}>
              No attendance found for this filter.
            </p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Selfie</th>
                    <th>ID</th>
                    <th>Employee</th>
                    <th>Check-In Time</th>
                    <th>Distance</th>
                    <th>Status</th>
                    <th>Device Info</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <img
                          src={record.selfieUrl}
                          alt="Attendance selfie"
                          className={styles.thumbnail}
                          onClick={() => setActiveSelfie(record.selfieUrl)}
                        />
                      </td>
                      <td style={{ fontWeight: 700 }}>{record.employeeId}</td>
                      <td>{record.employeeName}</td>
                      <td>
                        {new Date(record.checkInTime).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                          {new Date(record.checkInTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td>{Math.round(record.distanceFromOffice)}m</td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            record.status === "present" ? styles.badgePresent : styles.badgeOutside
                          }`}
                        >
                          {record.status === "present" ? "Present" : "Outside Radius"}
                        </span>
                      </td>
                      <td
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-secondary)",
                          maxWidth: "180px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={record.deviceInfo}
                      >
                        {record.deviceInfo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {activeSelfie && (
        <div className={styles.modalOverlay} onClick={() => setActiveSelfie(null)}>
          <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setActiveSelfie(null)}>
              X
            </button>
            <img src={activeSelfie} alt="Employee selfie preview" className={styles.modalImage} />
            <a
              href={activeSelfie}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline"
              style={{ display: "inline-flex" }}
            >
              Open in New Tab
            </a>
          </div>
        </div>
      )}
      </div>
    </AuthGate>
  );
}
