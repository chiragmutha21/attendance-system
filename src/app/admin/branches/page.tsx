"use client";

import { useEffect, useState } from "react";
import { Plus, X, Building2, MapPin, Loader2, Edit3, Trash2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import AuthGate from "@/components/AuthGate";
import styles from "../admin.module.css";

export default function BranchesPage() {
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal and Form States
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchLat, setBranchLat] = useState("");
  const [branchLng, setBranchLng] = useState("");
  const [branchRadius, setBranchRadius] = useState("200");
  const [branchIsMain, setBranchIsMain] = useState(false);
  const [branchSaving, setBranchSaving] = useState(false);
  const [locatingBranch, setLocatingBranch] = useState(false);
  const [error, setError] = useState("");

  const selectedCompanyHeaders: { [key: string]: string } = selectedCompanyId
    ? { "x-company-id": selectedCompanyId }
    : {};

  useEffect(() => {
    setSelectedCompanyId(localStorage.getItem("selectedCompanyId") || "");
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchBranches();
    }
  }, [selectedCompanyId]);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/branches", { headers: selectedCompanyHeaders });
      const data = await res.json();
      if (data.success && data.branches) {
        setBranches(data.branches);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddBranchModal = () => {
    setEditingBranch(null);
    setBranchName("");
    setBranchAddress("");
    setBranchLat("");
    setBranchLng("");
    setBranchRadius("200");
    setBranchIsMain(false);
    setError("");
    setBranchModalOpen(true);
  };

  const openEditBranchModal = (b: any) => {
    setEditingBranch(b);
    setBranchName(b.name);
    setBranchAddress(b.address || "");
    setBranchLat(String(b.latitude));
    setBranchLng(String(b.longitude));
    setBranchRadius(String(b.radiusMeters));
    setBranchIsMain(b.isMainOffice);
    setError("");
    setBranchModalOpen(true);
  };

  const fillBranchLocation = () => {
    setLocatingBranch(true);
    setError("");
    if (!navigator.geolocation) {
      setError("Location is not supported by this browser.");
      setLocatingBranch(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBranchLat(position.coords.latitude.toFixed(6));
        setBranchLng(position.coords.longitude.toFixed(6));
        setLocatingBranch(false);
      },
      () => {
        setError("Location permission denied. Enter coordinates manually.");
        setLocatingBranch(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const saveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBranchSaving(true);
    setError("");
    try {
      const payload = {
        id: editingBranch?.id,
        name: branchName,
        address: branchAddress,
        latitude: parseFloat(branchLat) || 0,
        longitude: parseFloat(branchLng) || 0,
        radiusMeters: parseInt(branchRadius) || 200,
        isMainOffice: branchIsMain,
      };

      const res = await fetch("/api/admin/branches", {
        method: editingBranch ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...selectedCompanyHeaders },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setBranchModalOpen(false);
        fetchBranches();
      } else {
        setError(data.error || "Failed to save branch");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
    } finally {
      setBranchSaving(false);
    }
  };

  const deleteBranch = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the branch "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/branches?id=${id}`, {
        method: "DELETE",
        headers: selectedCompanyHeaders,
      });
      const data = await res.json();
      if (data.success) {
        fetchBranches();
      } else {
        alert(data.error || "Failed to delete branch");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete branch");
    }
  };

  return (
    <AuthGate>
      <div className={styles.adminLayout}>
        <Sidebar activeKey="branches" onCompanyChange={(id) => setSelectedCompanyId(id)} />

        <main className={styles.mainContent}>
          <header className={styles.header}>
            <div>
              <h1 className={styles.headerTitle}>Branch Management</h1>
              <p className={styles.headerSubtitle}>Configure and manage office locations and check-in radius</p>
            </div>
            <button onClick={openAddBranchModal} className="btn btn-primary" style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
              <Plus size={18} /> Add New Branch
            </button>
          </header>

          <div className={`${styles.contentCard} glass-panel`} style={{ marginTop: "24px" }}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Configured Branches</h2>
            </div>

            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                <Loader2 className="animate-spin" size={32} color="var(--color-primary)" />
              </div>
            ) : branches.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px 0" }}>No branches configured for this company.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px", marginTop: "16px" }}>
                {branches.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "12px",
                      padding: "20px",
                      borderRadius: "12px",
                      background: b.isMainOffice ? "rgba(139, 92, 246, 0.06)" : "rgba(255, 255, 255, 0.02)",
                      border: b.isMainOffice ? "1px solid rgba(139, 92, 246, 0.4)" : "1px solid var(--border-light)",
                      position: "relative",
                      transition: "transform 0.2s, border-color 0.2s",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                          <Building2 size={18} color={b.isMainOffice ? "var(--color-primary)" : "var(--text-secondary)"} />
                          {b.name}
                        </div>
                        {b.isMainOffice && (
                          <span style={{
                            color: "var(--color-primary)",
                            fontSize: "0.7rem",
                            background: "rgba(139, 92, 246, 0.15)",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontWeight: 600
                          }}>
                            Main Office
                          </span>
                        )}
                      </div>

                      {b.address && (
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
                          {b.address}
                        </p>
                      )}

                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <span><strong>Latitude:</strong> {b.latitude.toFixed(6)}</span>
                          <span><strong>Longitude:</strong> {b.longitude.toFixed(6)}</span>
                        </div>
                        <div>
                          <span><strong>Allowed Radius:</strong> {b.radiusMeters} meters</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px", borderTop: "1px solid var(--border-light)", paddingTop: "12px", marginTop: "8px" }}>
                      <button
                        onClick={() => openEditBranchModal(b)}
                        className="btn btn-outline"
                        style={{ flex: 1, padding: "6px 12px", fontSize: "0.8rem", height: "auto", display: "inline-flex", gap: "6px", justifyContent: "center" }}
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                      {!b.isMainOffice && (
                        <button
                          onClick={() => deleteBranch(b.id, b.name)}
                          className="btn btn-outline"
                          style={{ flex: 1, padding: "6px 12px", fontSize: "0.8rem", height: "auto", color: "var(--color-danger)", borderColor: "rgba(239, 68, 68, 0.2)", display: "inline-flex", gap: "6px", justifyContent: "center" }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Add / Edit Modal */}
        {branchModalOpen && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent} style={{ textAlign: "left", maxWidth: "480px" }}>
              <button className={styles.modalClose} onClick={() => setBranchModalOpen(false)}>
                <X size={20} />
              </button>
              <h2 className={styles.stateTitle} style={{ marginBottom: "20px" }}>
                {editingBranch ? "Edit Branch" : "Add New Branch"}
              </h2>

              <form onSubmit={saveBranch} className={styles.settingsForm}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Branch Name (Required)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Mumbai Office"
                    required
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Address</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Bandra Kurla Complex"
                    value={branchAddress}
                    onChange={(e) => setBranchAddress(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <button
                    type="button"
                    onClick={fillBranchLocation}
                    className="btn btn-outline"
                    style={{ width: "100%", padding: "10px", display: "flex", gap: "8px", alignItems: "center", justifyContent: "center" }}
                    disabled={locatingBranch}
                  >
                    <MapPin size={16} />
                    {locatingBranch ? "Locating..." : "Use My Current Location"}
                  </button>
                </div>

                <div className={styles.formGridTwo}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      className="form-input"
                      required
                      value={branchLat}
                      onChange={(e) => setBranchLat(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      className="form-input"
                      required
                      value={branchLng}
                      onChange={(e) => setBranchLng(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Allowed Radius (Meters)</label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    value={branchRadius}
                    onChange={(e) => setBranchRadius(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup} style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                  <input
                    type="checkbox"
                    id="branchIsMain"
                    checked={branchIsMain}
                    disabled={editingBranch && editingBranch.isMainOffice}
                    onChange={(e) => setBranchIsMain(e.target.checked)}
                  />
                  <label htmlFor="branchIsMain" className={styles.formLabel} style={{ marginBottom: 0, cursor: "pointer" }}>
                    Designate as Main Office
                  </label>
                </div>

                {error && <span className={styles.formError} style={{ display: "block", marginBottom: "12px" }}>{error}</span>}

                <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                  <button type="submit" disabled={branchSaving} className="btn btn-primary" style={{ flex: 1 }}>
                    {branchSaving ? "Saving..." : "Save Branch"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setBranchModalOpen(false)}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  );
}
