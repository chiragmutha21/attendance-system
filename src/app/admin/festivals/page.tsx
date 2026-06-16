"use client";

import { useEffect, useState } from "react";
import { 
  Gift, Calendar, Edit2, Check, X, Plus, Trash2, Loader2, AlertCircle
} from "lucide-react";
import AuthGate from "@/components/AuthGate";
import Sidebar from "@/components/Sidebar";
import styles from "../admin.module.css";

interface FestivalItem {
  name: string;
  date: string; // YYYY-MM-DD
}

const PREDEFINED_FESTIVALS: FestivalItem[] = [
  { name: "New Year's Day", date: "2026-01-01" },
  { name: "Republic Day", date: "2026-01-26" },
  { name: "Maha Shivratri", date: "2026-02-15" },
  { name: "Holi", date: "2026-03-04" },
  { name: "Good Friday", date: "2026-04-03" },
  { name: "Eid al-Fitr", date: "2026-03-20" },
  { name: "Ambedkar Jayanti", date: "2026-04-14" },
  { name: "Eid al-Adha", date: "2026-05-27" },
  { name: "Independence Day", date: "2026-08-15" },
  { name: "Raksha Bandhan", date: "2026-08-28" },
  { name: "Ganesh Chaturthi", date: "2026-09-15" },
  { name: "Gandhi Jayanti", date: "2026-10-02" },
  { name: "Dussehra", date: "2026-10-20" },
  { name: "Diwali", date: "2026-11-08" },
  { name: "Guru Nanak Jayanti", date: "2026-11-24" },
  { name: "Christmas", date: "2026-12-25" },
];

function FestivalsContent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Selected festivals (currently saved in DB)
  const [observedFestivals, setObservedFestivals] = useState<FestivalItem[]>([]);
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [checkedPredefined, setCheckedPredefined] = useState<Record<string, boolean>>({});
  const [customFestivals, setCustomFestivals] = useState<FestivalItem[]>([]);

  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  const fetchFestivals = async () => {
    setLoading(true);
    setError("");
    try {
      const companyHeaders: { [key: string]: string } = selectedCompanyId ? { "x-company-id": selectedCompanyId } : {};
      const res = await fetch("/api/admin/festivals", {
        headers: companyHeaders
      });
      const data = await res.json();
      if (data.success) {
        setObservedFestivals(data.festivals);
        
        // Prepare editing states
        const initialChecked: Record<string, boolean> = {};
        const customs: FestivalItem[] = [];
        
        // Map saved ones to predefined checkboxes vs custom list
        data.festivals.forEach((f: FestivalItem) => {
          const isPredefined = PREDEFINED_FESTIVALS.some(
            p => p.name.toLowerCase() === f.name.toLowerCase() && p.date === f.date
          );
          if (isPredefined) {
            initialChecked[`${f.name}:${f.date}`] = true;
          } else {
            customs.push(f);
          }
        });
        
        setCheckedPredefined(initialChecked);
        setCustomFestivals(customs);
      } else {
        setError(data.error || "Failed to load festivals.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while fetching holidays.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedCompany = localStorage.getItem("selectedCompanyId") || "";
    setSelectedCompanyId(storedCompany);
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchFestivals();
    }
  }, [selectedCompanyId]);

  const handleCheckboxChange = (name: string, date: string) => {
    const key = `${name}:${date}`;
    setCheckedPredefined(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const addCustomFestival = () => {
    setCustomFestivals(prev => [...prev, { name: "", date: "" }]);
  };

  const updateCustomFestival = (index: number, field: keyof FestivalItem, value: string) => {
    setCustomFestivals(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeCustomFestival = (index: number) => {
    setCustomFestivals(prev => prev.filter((_, idx) => idx !== index));
  };

  const saveChanges = async () => {
    setError("");
    setSuccess("");
    setSaving(true);

    // Merge checked predefined and custom entries
    const selectedList: FestivalItem[] = [];

    // Predefined items
    PREDEFINED_FESTIVALS.forEach(p => {
      if (checkedPredefined[`${p.name}:${p.date}`]) {
        selectedList.push(p);
      }
    });

    // Custom items validation
    for (const c of customFestivals) {
      const name = c.name.trim();
      const date = c.date.trim();

      if (!name) {
        setError("Custom holiday name cannot be empty.");
        setSaving(false);
        return;
      }
      if (!date) {
        setError(`Please select a valid date for holiday "${name}".`);
        setSaving(false);
        return;
      }

      selectedList.push({ name, date });
    }

    try {
      const companyHeaders: { [key: string]: string } = selectedCompanyId ? { "x-company-id": selectedCompanyId } : {};
      const res = await fetch("/api/admin/festivals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...companyHeaders
        },
        body: JSON.stringify({ festivals: selectedList }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess("Holidays updated successfully!");
        setObservedFestivals(selectedList);
        setIsEditing(false);
        // Refresh to ensure exact DB alignment
        fetchFestivals();
      } else {
        setError(data.error || "Failed to save changes.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while saving changes.");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={styles.adminLayout}>
      <Sidebar activeKey="festivals" onCompanyChange={setSelectedCompanyId} />
      
      <main className={styles.mainContainer}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.headerTitle}>Holidays & Festivals</h1>
            <p className={styles.headerSubtitle}>
              Configure the holidays and festivals observed by your company. Employee check-ins on these days are logged as "Festival Day Login".
            </p>
          </div>
          
          <div>
            {isEditing ? (
              <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  className="btn btn-outline" 
                  onClick={() => {
                    setIsEditing(false);
                    fetchFestivals(); // revert
                  }}
                  disabled={saving}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <X size={16} /> Cancel
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={saveChanges}
                  disabled={saving}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Save Changes
                </button>
              </div>
            ) : (
              <button 
                className="btn btn-primary" 
                onClick={() => setIsEditing(true)}
                disabled={loading}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Edit2 size={16} /> Edit Holidays
              </button>
            )}
          </div>
        </div>

        {error && (
          <div style={{
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            color: "var(--color-danger)",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.9rem"
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            background: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            color: "var(--color-success)",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.9rem"
          }}>
            <Check size={18} />
            <span>{success}</span>
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
            <Loader2 className="animate-spin" size={34} color="var(--color-primary)" />
          </div>
        ) : !isEditing ? (
          // VIEW MODE
          <div className="glass-panel" style={{ padding: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <Gift color="var(--color-primary)" size={24} />
              <h2 className={styles.cardTitle}>Observed Holidays ({observedFestivals.length})</h2>
            </div>
            
            {observedFestivals.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary)" }}>
                <Calendar size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
                <p style={{ fontSize: "1rem" }}>No observed holidays have been selected yet.</p>
                <p style={{ fontSize: "0.85rem", marginTop: "4px" }}>Click "Edit Holidays" above to select festivals observed by your company.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                {observedFestivals.map((f, idx) => (
                  <div 
                    key={idx}
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      borderRadius: "12px",
                      padding: "16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: "#fff", fontSize: "1rem" }}>{f.name}</div>
                      <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Calendar size={13} />
                        {formatDate(f.date)}
                      </div>
                    </div>
                    <div style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "rgba(139, 92, 246, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--color-primary)"
                    }}>
                      <Gift size={16} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // EDIT MODE
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            {/* Standard Predefined Festivals */}
            <div className="glass-panel" style={{ padding: "28px" }}>
              <h3 className={styles.cardTitle} style={{ marginBottom: "8px" }}>Standard Holidays</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px" }}>
                Check the boxes next to the standard holidays observed by your company.
              </p>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "14px" }}>
                {PREDEFINED_FESTIVALS.map((p, idx) => {
                  const key = `${p.name}:${p.date}`;
                  const isChecked = !!checkedPredefined[key];
                  return (
                    <label 
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        background: isChecked ? "rgba(139, 92, 246, 0.06)" : "rgba(255,255,255,0.01)",
                        border: isChecked ? "1px solid rgba(139, 92, 246, 0.2)" : "1px solid rgba(255,255,255,0.04)",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleCheckboxChange(p.name, p.date)}
                        style={{
                          accentColor: "var(--color-primary)",
                          width: "16px",
                          height: "16px",
                          cursor: "pointer"
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, color: "#fff", fontSize: "0.9rem" }}>{p.name}</div>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.78rem", marginTop: "2px" }}>{formatDate(p.date)}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Custom Holidays list */}
            <div className="glass-panel" style={{ padding: "28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                  <h3 className={styles.cardTitle}>Custom Holidays</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
                    Add special, regional, or company-specific holidays.
                  </p>
                </div>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={addCustomFestival}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", fontSize: "0.85rem" }}
                >
                  <Plus size={14} /> Add Holiday
                </button>
              </div>

              {customFestivals.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                  No custom holidays added. Click "Add Holiday" to create one.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {customFestivals.map((custom, idx) => (
                    <div 
                      key={idx}
                      style={{
                        display: "flex",
                        gap: "16px",
                        alignItems: "center",
                        background: "rgba(255,255,255,0.01)",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.04)"
                      }}
                    >
                      <div style={{ flex: 2 }}>
                        <input 
                          type="text"
                          className="form-input"
                          placeholder="Holiday / Festival Name (e.g. Foundation Day)"
                          value={custom.name}
                          onChange={(e) => updateCustomFestival(idx, "name", e.target.value)}
                          style={{ fontSize: "0.9rem", padding: "10px" }}
                        />
                      </div>
                      <div style={{ flex: 1, position: "relative" }}>
                        <input 
                          type="text"
                          className="form-input"
                          value={custom.date ? formatDate(custom.date) : ""}
                          readOnly
                          placeholder="dd/mm/yyyy"
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
                          style={{ fontSize: "0.9rem", padding: "10px", width: "100%", cursor: "pointer" }}
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
                          value={custom.date}
                          onChange={(e) => updateCustomFestival(idx, "date", e.target.value)}
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeCustomFestival(idx)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--color-danger)",
                          cursor: "pointer",
                          padding: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function FestivalsPage() {
  return (
    <AuthGate>
      <FestivalsContent />
    </AuthGate>
  );
}
