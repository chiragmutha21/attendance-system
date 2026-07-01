"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle,
  XCircle,
  Download,
  MapPin,
  MessageCircle,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import AuthGate from "@/components/AuthGate";
import Sidebar from "@/components/Sidebar";
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
  originalCheckInTime?: string | null;
  workHours?: string | null;
  deviceInfo: string;
  festival?: string | null;
}

type Period = "daily" | "weekly" | "monthly";

const toDateInputValue = (date: Date) => {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
};

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

export default function CheckOutLogsPage() {
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
        type: "check-out", // Only fetch check-outs
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
    if (selectedCompanyId) {
      fetchEmployees();
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchRecords();
    }
  }, [selectedCompanyId, selectedEmployeeId, selectedRange.startDate, selectedRange.endDate, search]);

  const presentCount = records.filter((record) => record.status === "present").length;
  const outsideCount = records.filter((record) => record.status === "outside_radius").length;
  const uniqueEmployeeCount = new Set(records.map((record) => record.employeeId)).size;

  const selectedEmployee = employees.find((employee) => employee.employeeId === selectedEmployeeId);

  const exportToCSV = () => {
    if (records.length === 0) return;

    const headers = ["Employee ID", "Employee Name", "Check-In Time", "Check-Out Time", "Work Hours", "Distance (m)", "Status", "Festival", "Device"];
    const rows = records.map((record) => [
      record.employeeId,
      record.employeeName,
      record.originalCheckInTime ? formatDateTimeToDDMMYYYY(record.originalCheckInTime) : "-",
      formatDateTimeToDDMMYYYY(record.checkInTime),
      record.workHours || "-",
      Math.round(record.distanceFromOffice),
      record.status,
      record.festival || "-",
      record.deviceInfo.replace(/,/g, " "),
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `CheckOut_Logs_${period}_${selectedRange.startDate}_to_${selectedRange.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <AuthGate>
      <div className={styles.adminLayout}>
      {/* Sidebar Navigation */}
      <Sidebar activeKey="checkout" onCompanyChange={(id) => setSelectedCompanyId(id)} />

      <main className={styles.mainContainer}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.headerTitle}>Check-Out Logs</h1>
            <p className={styles.headerSubtitle}>
              View and export employee check-out entries and location verification
            </p>
          </div>
          <button onClick={exportToCSV} disabled={records.length === 0} className="btn btn-primary">
            <Download size={16} /> Export CSV
          </button>
        </div>

        <section className={styles.statsGrid}>
          <div className={`${styles.statCard} glass-panel`}>
            <div className={styles.statHeader}>
              <span>Total Check-Outs</span>
              <CalendarDays size={16} color="var(--color-primary)" />
            </div>
            <div className={styles.statValue}>{records.length}</div>
          </div>
          <div className={`${styles.statCard} glass-panel`}>
            <div className={styles.statHeader}>
              <span>Within Boundary</span>
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
              <span>Employees Checked Out</span>
              <Users size={16} color="var(--color-secondary)" />
            </div>
            <div className={styles.statValue}>{uniqueEmployeeCount}</div>
          </div>
        </section>

        <div className={`${styles.contentCard} glass-panel`}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Filter Records</h2>
              <p className={styles.cardMeta}>
                {formatDateToDDMMYYYY(selectedRange.startDate)} to {formatDateToDDMMYYYY(selectedRange.endDate)}
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
              Loading logs...
            </p>
          ) : records.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px" }}>
              No check-out logs found.
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
                    <th>Check-Out Time</th>
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
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <img
                          src={record.selfieUrl}
                          alt="Selfie"
                          className={styles.thumbnail}
                          onClick={() => setActiveSelfie(record.selfieUrl)}
                        />
                      </td>
                      <td style={{ fontWeight: 700 }}>{record.employeeId}</td>
                      <td>{record.employeeName}</td>
                      <td>
                        {record.originalCheckInTime ? (
                          <>
                            {formatDateToDDMMYYYY(record.originalCheckInTime)}{" "}
                            <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                              {new Date(record.originalCheckInTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </>
                        ) : (
                          <span style={{ color: "var(--text-secondary)" }}>-</span>
                        )}
                      </td>
                      <td>
                        {formatDateToDDMMYYYY(record.checkInTime)}{" "}
                        <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                          {new Date(record.checkInTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td style={{ fontWeight: record.workHours ? 600 : 400, color: record.workHours ? "var(--color-success)" : "inherit" }}>
                        {record.workHours || "-"}
                      </td>
                      <td>
                        {record.checkInBranchName || (record.branchName && record.type === 'check-in' ? record.branchName : "-")}
                      </td>
                      <td>
                        {record.checkOutBranchName || (record.branchName && record.type === 'check-out' ? record.branchName : "-")}
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
                      <td>
                        {record.festival ? (
                          <span style={{ color: "var(--color-danger)", fontWeight: "bold", fontSize: "0.85rem" }}>
                            Festival Day Login ({record.festival})
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                            -
                          </span>
                        )}
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
