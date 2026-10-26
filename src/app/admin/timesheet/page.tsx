"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Search,
  Users,
  Sparkles,
  TrendingUp,
  BarChart2,
  Calendar,
  Filter,
} from "lucide-react";
import AuthGate from "@/components/AuthGate";
import Sidebar from "@/components/Sidebar";
import styles from "../admin.module.css";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  selfieUrl: string;
  checkInTime: string;
  checkoutTime?: string | null;
  workHours?: string | null;
  status: string;
  branchName?: string | null;
}

type Period = "daily" | "weekly" | "monthly" | "custom";

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

const formatTimeToAMPM = (dateInput: string | Date | null | undefined) => {
  if (!dateInput) return "Pending";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Pending";
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
};

export default function TimesheetPage() {
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<Period>("daily");

  const today = useMemo(() => new Date(), []);
  const [startDate, setStartDate] = useState(() => toDateInputValue(today));
  const [endDate, setEndDate] = useState(() => toDateInputValue(today));

  useEffect(() => {
    const start = new Date(today);
    const end = new Date(today);

    if (period === "daily") {
      setStartDate(toDateInputValue(start));
      setEndDate(toDateInputValue(end));
    } else if (period === "weekly") {
      const day = today.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      start.setDate(today.getDate() + diffToMonday);
      end.setDate(start.getDate() + 6);
      setStartDate(toDateInputValue(start));
      setEndDate(toDateInputValue(end));
    } else if (period === "monthly") {
      start.setDate(1);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
      setStartDate(toDateInputValue(start));
      setEndDate(toDateInputValue(end));
    }
  }, [period, today]);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);

        const res = await fetch(`/api/admin/records?${params.toString()}`, {
          headers: selectedCompanyId ? { "x-company-id": selectedCompanyId } : {},
        });
        const data = await res.json();
        if (data.success && data.records) {
          setRecords(data.records);
        }
      } catch (err) {
        console.error("Failed to fetch timesheet records:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [selectedCompanyId, search, startDate, endDate]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const query = search.toLowerCase();
      return (
        r.employeeName.toLowerCase().includes(query) ||
        r.employeeId.toLowerCase().includes(query)
      );
    });
  }, [records, search]);

  // Aggregate statistics
  const stats = useMemo(() => {
    let totalMinutes = 0;
    let completedShifts = 0;
    let activeNow = 0;

    filteredRecords.forEach((r) => {
      if (r.workHours) {
        const match = r.workHours.match(/(\d+)h\s*(\d+)m/);
        if (match) {
          const h = parseInt(match[1]);
          const m = parseInt(match[2]);
          totalMinutes += h * 60 + m;
          completedShifts++;
        }
      } else {
        activeNow++;
      }
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMins = totalMinutes % 60;
    const avgMinutesPerShift = completedShifts > 0 ? Math.round(totalMinutes / completedShifts) : 0;
    const avgHours = Math.floor(avgMinutesPerShift / 60);
    const avgMins = avgMinutesPerShift % 60;

    return {
      totalHoursString: `${totalHours}h ${remainingMins}m`,
      avgHoursString: `${avgHours}h ${avgMins}m`,
      completedShifts,
      activeNow,
      totalEntries: filteredRecords.length,
    };
  }, [filteredRecords]);

  const exportCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = ["Employee ID", "Employee Name", "Date", "Check-In Time", "Check-Out Time", "Hours Worked", "Status"];
    const rows = filteredRecords.map((r) => [
      r.employeeId,
      `"${r.employeeName}"`,
      formatDateToDDMMYYYY(r.checkInTime),
      formatTimeToAMPM(r.checkInTime),
      formatTimeToAMPM(r.checkoutTime),
      r.workHours || "In Progress",
      r.checkoutTime ? "Completed" : "Active Shift",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `timesheet_${period}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AuthGate>
      <div className={styles.adminLayout}>
        <Sidebar activeKey={"attendance" as any} onCompanyChange={(id) => setSelectedCompanyId(id)} />

        <main className={styles.mainContainer}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.headerTitle}>Timesheet & Work Hours</h1>
              <p className={styles.headerSubtitle}>
                Employee daily, weekly & monthly working hours tracking with verified check-in/out stamps
              </p>
            </div>
            <button onClick={exportCSV} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Download size={16} /> Export Timesheet CSV
            </button>
          </div>

          {/* Period Selector Tabs: Daily, Weekly, Monthly */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "24px",
          }}>
            <div style={{
              display: "flex",
              gap: "8px",
              background: "rgba(255, 255, 255, 0.04)",
              padding: "6px",
              borderRadius: "12px",
              border: "1px solid var(--border-light)",
            }}>
              {(["daily", "weekly", "monthly", "custom"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "8px",
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    textTransform: "capitalize",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    background: period === p ? "var(--color-primary)" : "transparent",
                    color: period === p ? "#fff" : "var(--text-secondary)",
                    boxShadow: period === p ? "0 4px 12px var(--color-primary-glow)" : "none",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Date Pickers */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Calendar size={16} color="var(--text-secondary)" />
              <input
                type="date"
                className="form-input"
                style={{ padding: "8px 12px", fontSize: "0.85rem" }}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPeriod("custom");
                }}
              />
              <span style={{ color: "var(--text-muted)" }}>to</span>
              <input
                type="date"
                className="form-input"
                style={{ padding: "8px 12px", fontSize: "0.85rem" }}
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPeriod("custom");
                }}
              />
            </div>
          </div>

          {/* Stats KPI Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "18px",
            marginBottom: "28px",
          }}>
            <div className="glass-panel" style={{ padding: "20px", borderRadius: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>Total Hours Logged</span>
                <Clock size={18} color="var(--color-primary)" />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fff" }}>{stats.totalHoursString}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>In selected {period} period</div>
            </div>

            <div className="glass-panel" style={{ padding: "20px", borderRadius: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>Average Shift Length</span>
                <BarChart2 size={18} color="var(--color-secondary)" />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fff" }}>{stats.avgHoursString}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>Per completed work shift</div>
            </div>

            <div className="glass-panel" style={{ padding: "20px", borderRadius: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>Completed Shifts</span>
                <CheckCircle size={18} color="var(--color-success)" />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fff" }}>{stats.completedShifts}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--color-muted)", marginTop: "4px" }}>Full IN & OUT recorded</div>
            </div>

            <div className="glass-panel" style={{ padding: "20px", borderRadius: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>Currently Working</span>
                <Users size={18} color="#eab308" />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fff" }}>{stats.activeNow}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>Checked in, shift in progress</div>
            </div>
          </div>

          {/* Timesheet Table Card */}
          <div className={`${styles.contentCard} glass-panel`}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Employee Timesheet Logs</h2>
              <div style={{ display: "flex", position: "relative", width: "280px" }}>
                <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="Search by employee name or ID..."
                  className="form-input"
                  style={{ paddingLeft: "36px", fontSize: "0.85rem" }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "40px" }}>Loading timesheet data...</p>
            ) : filteredRecords.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "40px" }}>No attendance records found for this period.</p>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Date</th>
                      <th>Check-In (IN)</th>
                      <th>Check-Out (OUT)</th>
                      <th>Hours Worked</th>
                      <th>Shift Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r) => {
                      const hasCompleted = Boolean(r.checkoutTime);
                      let isOvertime = false;
                      let isFullDay = false;
                      if (r.workHours) {
                        const m = r.workHours.match(/(\d+)h/);
                        if (m) {
                          const h = parseInt(m[1]);
                          if (h >= 9) isOvertime = true;
                          else if (h >= 8) isFullDay = true;
                        }
                      }

                      return (
                        <tr key={r.id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              {r.selfieUrl ? (
                                <img
                                  src={r.selfieUrl}
                                  alt={r.employeeName}
                                  style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border-light)", background: "#fff" }}
                                />
                              ) : (
                                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(139, 92, 246, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff" }}>
                                  {r.employeeName.charAt(0)}
                                </div>
                              )}
                              <div>
                                <div style={{ fontWeight: 700, color: "#fff" }}>{r.employeeName}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ID: {r.employeeId}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{formatDateToDDMMYYYY(r.checkInTime)}</td>
                          <td>
                            <span style={{ color: "var(--color-success)", fontWeight: 700 }}>
                              {formatTimeToAMPM(r.checkInTime)}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: r.checkoutTime ? "#f87171" : "var(--text-muted)", fontWeight: 700 }}>
                              {formatTimeToAMPM(r.checkoutTime)}
                            </span>
                          </td>
                          <td>
                            {r.workHours ? (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255, 255, 255, 0.04)", padding: "4px 10px", borderRadius: "6px", fontWeight: 800, color: "#fff" }}>
                                <Clock size={13} color="var(--color-primary)" />
                                {r.workHours}
                              </div>
                            ) : (
                              <span style={{ color: "#eab308", fontSize: "0.8rem", fontWeight: 600 }}>
                                Shift in progress...
                              </span>
                            )}
                          </td>
                          <td>
                            {isOvertime ? (
                              <span className="badge" style={{ background: "rgba(139, 92, 246, 0.15)", color: "#c4b5fd", border: "1px solid rgba(139, 92, 246, 0.3)" }}>
                                ⚡ Overtime (9h+)
                              </span>
                            ) : isFullDay ? (
                              <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#6ee7b7", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                                ✓ Full Day (8h+)
                              </span>
                            ) : hasCompleted ? (
                              <span className="badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fcd34d", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                                Half Day
                              </span>
                            ) : (
                              <span className="badge" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#93c5fd", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
                                Active Now
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <footer style={{
            marginTop: "48px",
            padding: "24px 0",
            borderTop: "1px solid rgba(255, 255, 255, 0.05)",
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: "0.82rem",
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
    </AuthGate>
  );
}
