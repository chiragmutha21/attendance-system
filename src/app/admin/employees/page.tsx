"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Users, MapPin, Plus, Edit, Trash2, X, 
  Search, CheckCircle, XCircle, ShieldAlert, Sparkles, Loader2, CalendarDays
} from "lucide-react";
import AuthGate from "@/components/AuthGate";
import Sidebar from "@/components/Sidebar";
import styles from "../admin.module.css";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { processImageWithWhiteBackground } from "@/lib/imageProcessing";

interface Company {
  id: string;
  name: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  countryCode: string;
  employeeLimit: number;
  subscription: string;
  status: string;
}

interface Employee {
  id: string;
  employeeId: string;
  fullName: string;
  mobileNumber: string;
  department: string;
  role: string;
  status: string;
  registeredFaceImage?: string | null;
  createdAt: string;
  assignedBranchIds?: string[];
}

export default function EmployeeRegistry() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal control
  const [modalOpen, setModalOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [photoProcessing, setPhotoProcessing] = useState(false);

  // Form states
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formFullName, setFormFullName] = useState("");
  const [formMobileNumber, setFormMobileNumber] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formStatus, setFormStatus] = useState("active");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [isLocationConfigured, setIsLocationConfigured] = useState<boolean>(true);
  const [showLocationRequiredModal, setShowLocationRequiredModal] = useState<boolean>(false);

  const [companyCountryCode] = useState("+91");

  // Photo states
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [formImageBase64, setFormImageBase64] = useState<string | null>(null);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Photo size must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawBase64 = reader.result as string;
        setPhotoProcessing(true);
        try {
          // Automatically convert background to clean white & enhance face contrast
          const whiteBgImage = await processImageWithWhiteBackground(rawBase64, {
            enhanceFacialContrast: true,
            quality: 0.94,
          });
          setFormImagePreview(whiteBgImage);
          setFormImageBase64(whiteBgImage);
        } catch (err) {
          console.error("Auto white background failed, using original:", err);
          setFormImagePreview(rawBase64);
          setFormImageBase64(rawBase64);
        } finally {
          setPhotoProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const checkLocationStatus = async (compId: string) => {
    if (!compId) return;
    try {
      const stored = localStorage.getItem("locationConfigured_" + compId);
      if (stored === "true") {
        setIsLocationConfigured(true);
        return;
      }
      const res = await fetch("/api/admin/settings", {
        headers: { "x-company-id": compId },
      });
      const data = await res.json();
      if (data.success && data.officeConfig) {
        const isSaved = Boolean(data.officeConfig.locationSaved);
        setIsLocationConfigured(isSaved);
        if (isSaved) {
          localStorage.setItem("locationConfigured_" + compId, "true");
        }
      }
    } catch (err) {
      console.error("Check location error:", err);
    }
  };

  useEffect(() => {
    if (selectedCompanyId) {
      fetchEmployees();
      fetchBranches();
      checkLocationStatus(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  const selectedCompany = companies.find(company => company.id === selectedCompanyId);

  const companyHeaders = () => ({
    "Content-Type": "application/json",
    "x-company-id": selectedCompanyId,
  });

  const fetchCompanies = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch("/api/admin/companies", {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setCompanies(data.companies);
        const storedCompanyId = localStorage.getItem("selectedCompanyId");
        const nextCompany = data.companies.find((company: Company) => company.id === storedCompanyId) || data.companies[0];
        if (nextCompany) {
          setSelectedCompanyId(nextCompany.id);
          localStorage.setItem("selectedCompanyId", nextCompany.id);
          if ((nextCompany as any).locationSaved !== undefined) {
            setIsLocationConfigured(Boolean((nextCompany as any).locationSaved));
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/employees", {
        headers: { "x-company-id": selectedCompanyId },
      });
      const data = await res.json();
      if (data.success) {
        setEmployees(data.employees);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch("/api/admin/branches", {
        headers: { "x-company-id": selectedCompanyId },
      });
      const data = await res.json();
      if (data.success && data.branches) {
        setBranches(data.branches);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openAddModal = () => {
    const isSaved = 
      isLocationConfigured ||
      (selectedCompany as any)?.locationSaved === true ||
      (typeof window !== "undefined" && localStorage.getItem("locationConfigured_" + selectedCompanyId) === "true");

    if (!isSaved) {
      setShowLocationRequiredModal(true);
      return;
    }

    if (selectedCompany && selectedCompany.employeeLimit && selectedCompany.employeeLimit < 999990) {
      if (employees.length >= selectedCompany.employeeLimit) {
        alert(`Plan employee limit reached! Your current plan allows maximum ${selectedCompany.employeeLimit} employees (${employees.length}/${selectedCompany.employeeLimit} active). You cannot add more than ${selectedCompany.employeeLimit} employees on this plan. Please upgrade your plan.`);
        return;
      }
    }
    setEditEmployee(null);
    setFormEmployeeId("");
    setFormFullName("");
    setFormMobileNumber("");
    setFormDepartment("");
    setFormRole("");
    setFormStatus("active");
    setFormImagePreview(null);
    setFormImageBase64(null);
    setFormErrors({});
    setSelectedBranches(branches.length === 1 ? [branches[0].id] : []);
    setModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditEmployee(emp);
    setFormEmployeeId(emp.employeeId);
    setFormFullName(emp.fullName);
    const rawNum = emp.mobileNumber || "";
    setFormMobileNumber(rawNum.startsWith("+91") ? rawNum.slice(3) : rawNum);
    setFormDepartment(emp.department);
    setFormRole(emp.role);
    setFormStatus(emp.status);
    setFormImagePreview(emp.registeredFaceImage || null);
    setFormImageBase64(null);
    setFormErrors({});
    setSelectedBranches(emp.assignedBranchIds || []);
    setModalOpen(true);
  };

  const isWithoutPhoto = 
    (selectedCompany as any)?.attendanceMode === "without_photo" ||
    (selectedCompany?.subscription || "").toLowerCase().includes("without") ||
    (selectedCompany?.subscription || "").toLowerCase().includes("plan a") ||
    (selectedCompany?.subscription || "").toLowerCase().includes("plan-a") ||
    (typeof window !== "undefined" && localStorage.getItem("attendanceMode") === "without_photo");

  const validateEmployeeForm = () => {
    const errors: Record<string, string> = {};
    const employeeId = formEmployeeId.trim();
    const fullName = formFullName.trim();
    const mobileNumber = formMobileNumber.trim();
    const department = formDepartment.trim();
    const role = formRole.trim();

    if (!/^[A-Z0-9_-]{2,24}$/i.test(employeeId)) {
      errors.employeeId = "Use 2-24 letters, numbers, hyphen, or underscore.";
    }
    if (!/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(fullName)) {
      errors.fullName = "Enter a valid full name.";
    }
    if (!/^\d{10}$/.test(mobileNumber)) {
      errors.mobileNumber = "Enter a valid 10-digit mobile number.";
    }
    if (department.length < 2) {
      errors.department = "Department is required.";
    }
    if (role.length < 2) {
      errors.role = "Designation / role is required.";
    }
    // Enforce face image upload ONLY when NOT in without_photo mode
    if (!isWithoutPhoto && !editEmployee && !formImageBase64) {
      errors.registeredFaceImage = "An employee face photo is required for registration.";
    }
    if (branches.length > 0 && selectedBranches.length === 0) {
      errors.branches = "Please assign at least one branch.";
    }
 
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmployeeForm()) {
      return;
    }

    setModalLoading(true);

    try {
      const isEdit = !!editEmployee;
      const url = "/api/admin/employees";
      const method = isEdit ? "PUT" : "POST";
      const payload = {
        id: editEmployee?.id,
        employeeId: formEmployeeId.trim().toUpperCase(),
        fullName: formFullName.trim(),
        mobileNumber: "+91" + formMobileNumber.trim(),
        department: formDepartment.trim(),
        role: formRole.trim(),
        status: formStatus,
        registeredFaceImage: formImageBase64 || undefined, // only send if a new image has been selected
        assignedBranchIds: selectedBranches,
      };

      const res = await fetch(url, {
        method,
        headers: companyHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to save employee");
      } else {
        fetchEmployees();
        setModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to submit form.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete employee "${name}"? This will not delete past attendance logs but removes their registry login.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/employees?id=${id}`, {
        method: "DELETE",
        headers: { "x-company-id": selectedCompanyId },
      });
      const data = await res.json();
      if (data.success) {
        fetchEmployees();
      } else {
        alert(data.error || "Failed to delete employee");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter list
  const filteredEmployees = employees.filter(emp => 
    emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AuthGate>
      <div className={styles.adminLayout}>
      {/* Sidebar Navigation */}
      <Sidebar activeKey="employees" onCompanyChange={(id) => setSelectedCompanyId(id)} />

      {/* Main Content */}
      <main className={styles.mainContainer}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.headerTitle}>Employee Registry</h1>
            <p className={styles.headerSubtitle}>Manage staff authorization records & WhatsApp numbers</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            {selectedCompany && (
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: 600,
                background: (selectedCompany.employeeLimit && selectedCompany.employeeLimit < 999990 && employees.length >= selectedCompany.employeeLimit)
                  ? "rgba(239, 68, 68, 0.15)"
                  : "rgba(139, 92, 246, 0.12)",
                border: (selectedCompany.employeeLimit && selectedCompany.employeeLimit < 999990 && employees.length >= selectedCompany.employeeLimit)
                  ? "1px solid rgba(239, 68, 68, 0.3)"
                  : "1px solid rgba(139, 92, 246, 0.25)",
                color: (selectedCompany.employeeLimit && selectedCompany.employeeLimit < 999990 && employees.length >= selectedCompany.employeeLimit)
                  ? "#fca5a5"
                  : "var(--color-primary-light, #c4b5fd)",
              }}>
                <Users size={15} />
                <span>
                  {employees.length} / {selectedCompany.employeeLimit >= 999990 ? "Unlimited" : selectedCompany.employeeLimit} Employees
                  {selectedCompany.employeeLimit < 999990 && employees.length >= selectedCompany.employeeLimit ? " (Limit Reached)" : " (Plan Limit)"}
                </span>
              </div>
            )}
            <button 
              onClick={openAddModal} 
              className="btn btn-primary"
              disabled={Boolean(selectedCompany && selectedCompany.employeeLimit && selectedCompany.employeeLimit < 999990 && employees.length >= selectedCompany.employeeLimit)}
              style={selectedCompany && selectedCompany.employeeLimit && selectedCompany.employeeLimit < 999990 && employees.length >= selectedCompany.employeeLimit ? { opacity: 0.5, cursor: "not-allowed" } : {}}
            >
              <Plus size={16} /> Add Employee
            </button>
          </div>
        </div>

        {/* Office Location Mandatory Notice */}
        {!isLocationConfigured && (
          <div style={{
            marginBottom: "20px",
            padding: "16px 20px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.05))",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            boxShadow: "0 4px 20px rgba(239, 68, 68, 0.15)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "rgba(239, 68, 68, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f87171",
                flexShrink: 0
              }}>
                <MapPin size={22} />
              </div>
              <div>
                <h4 style={{ margin: "0 0 4px 0", color: "#fca5a5", fontSize: "0.95rem", fontWeight: 700 }}>
                  Action Required: Office Location Setup
                </h4>
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  Please configure and save your office location on the Dashboard before registering employees. Setting office location is mandatory for attendance geofencing.
                </p>
              </div>
            </div>
            <Link
              href="/admin"
              className="btn btn-primary"
              style={{ whiteSpace: "nowrap", flexShrink: 0, background: "#ef4444", borderColor: "#ef4444", textDecoration: "none" }}
            >
              Configure on Dashboard
            </Link>
          </div>
        )}

        {/* Registry Card */}
        <div className={`${styles.contentCard} glass-panel`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Registered Staff Members</h2>
            <div style={{ display: "flex", gap: "8px" }}>
              <Users size={16} color="var(--color-primary)" />
            </div>
          </div>

          {/* Search bar */}
          <div className={styles.filterBar}>
            <div style={{ display: "flex", position: "relative", flex: 1 }}>
              <input 
                type="text" 
                placeholder="Search employees by name, ID, or department..." 
                className="form-input" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px" }}>Loading registry...</p>
          ) : filteredEmployees.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px" }}>No employee records found.</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Emp ID</th>
                    <th>Photo & Name</th>
                    <th>Mobile Number</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id}>
                      <td style={{ fontWeight: 700 }}>{emp.employeeId}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {emp.registeredFaceImage ? (
                            <img 
                              src={emp.registeredFaceImage} 
                              alt={emp.fullName} 
                              style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", border: "1.5px solid var(--color-primary)" }} 
                            />
                          ) : (
                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(139, 92, 246, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: "var(--color-primary)", fontWeight: 700 }}>
                              {emp.fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span>{emp.fullName}</span>
                        </div>
                      </td>
                      <td style={{ letterSpacing: "0.5px" }}>{emp.mobileNumber}</td>
                      <td>{emp.department}</td>
                      <td>{emp.role}</td>
                      <td>
                        <span className={`${styles.badge} ${
                          emp.status === "active" ? styles.badgeActive : styles.badgeInactive
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className={styles.actionsCell}>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: "6px 12px" }}
                          onClick={() => openEditModal(emp)}
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: "6px 12px", borderColor: "rgba(239, 68, 68, 0.2)", color: "var(--color-danger)" }}
                          onClick={() => handleDelete(emp.id, emp.fullName)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
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

      {/* Add / Edit Modal Overlay */}
      {modalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ textAlign: "left", maxWidth: "480px" }}>
            <button className={styles.modalClose} onClick={() => setModalOpen(false)}>
              <X size={20} />
            </button>
            <h2 className={styles.stateTitle} style={{ marginBottom: "20px" }}>
              {editEmployee ? "Edit Employee Records" : "Register New Employee"}
            </h2>

            <form onSubmit={handleSubmit} className={styles.settingsForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Employee ID (Unique) <span style={{ color: "var(--color-danger, #ef4444)" }}>*</span>
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. EMP105"
                  required
                  disabled={!!editEmployee} // Prevent changing ID on edit
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value.toUpperCase().trim())}
                />
                {formErrors.employeeId && <span className={styles.formError}>{formErrors.employeeId}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Full Name <span style={{ color: "var(--color-danger, #ef4444)" }}>*</span>
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. John Doe"
                  required
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                />
                {formErrors.fullName && <span className={styles.formError}>{formErrors.fullName}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  {isWithoutPhoto ? (
                    <span>Employee Photo <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "normal" }}>(Optional - Without Photo Plan)</span></span>
                  ) : (
                    <span>Employee Photo (For Face Matching) <span style={{ color: "var(--color-danger, #ef4444)" }}>*</span></span>
                  )}
                </label>
                <div className={styles.photoUploaderContainer}>
                  {formImagePreview ? (
                    <div className={styles.photoPreviewWrapper}>
                      <img 
                        src={formImagePreview} 
                        alt="Preview" 
                        className={styles.photoPreviewImage}
                      />
                      <button 
                        type="button" 
                        onClick={() => { setFormImagePreview(null); setFormImageBase64(null); }}
                        className={styles.photoDeleteButton}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => document.getElementById("employeePhotoInput")?.click()}
                      className={styles.photoUploadPlaceholder}
                    >
                      <Plus size={20} />
                      <span style={{ fontSize: "0.7rem", marginTop: "4px" }}>Upload</span>
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <input 
                      id="employeePhotoInput"
                      type="file" 
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handlePhotoChange}
                    />
                    <span className={styles.formHint} style={{ color: "var(--text-secondary)", lineHeight: "1.4" }}>
                      {isWithoutPhoto 
                        ? "Photo upload is optional since your company operates in Without Photo mode."
                        : "Upload a front-facing profile photo. Background is automatically whitened to pure white (#FFF) for optimal face matching."
                      }
                    </span>
                    {photoProcessing && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-primary)", fontSize: "0.78rem", marginTop: "6px" }}>
                        <Loader2 className="animate-spin" size={14} /> Auto-whitening background & enhancing selfie...
                      </div>
                    )}
                    {formImagePreview && !photoProcessing && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-success)", fontSize: "0.75rem", marginTop: "4px" }}>
                        <CheckCircle size={13} /> Clean white background verified
                      </div>
                    )}
                    {formErrors.registeredFaceImage && <span className={styles.formError} style={{ display: "block", marginTop: "6px", color: "var(--color-danger)" }}>{formErrors.registeredFaceImage}</span>}
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  WhatsApp Number <span style={{ color: "var(--color-danger, #ef4444)" }}>*</span>
                </label>
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
                    placeholder="Enter 10-digit number"
                    required
                    value={formMobileNumber}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      if (digits.length <= 10) {
                        setFormMobileNumber(digits);
                      }
                    }}
                  />
                </div>
                {formErrors.mobileNumber && <span className={styles.formError}>{formErrors.mobileNumber}</span>}
                <span className={styles.formHint}>
                  Enter the 10-digit employee WhatsApp number (without country code).
                </span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Department <span style={{ color: "var(--color-danger, #ef4444)" }}>*</span>
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Engineering, Sales, HR"
                  required
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                />
                {formErrors.department && <span className={styles.formError}>{formErrors.department}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Designation / Role <span style={{ color: "var(--color-danger, #ef4444)" }}>*</span>
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Software Engineer, Manager"
                  required
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                />
                {formErrors.role && <span className={styles.formError}>{formErrors.role}</span>}
              </div>

              {branches.length > 0 && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Assigned Branches</label>
                  {branches.length === 1 ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255, 255, 255, 0.02)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-light)", fontSize: "0.95rem" }}>
                      <span style={{ fontWeight: 600, color: "var(--color-success)" }}>✔</span>
                      <span>
                        Automatically assigned: <strong>{branches[0].name}</strong> {branches[0].isMainOffice && <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>(Main)</span>}
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "rgba(255, 255, 255, 0.02)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
                      {branches.map((b) => (
                        <label key={b.id} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "0.95rem", userSelect: "none" }}>
                          <input
                            type="checkbox"
                            checked={selectedBranches.includes(b.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBranches([...selectedBranches, b.id]);
                              } else {
                                setSelectedBranches(selectedBranches.filter((id) => id !== b.id));
                              }
                            }}
                            style={{ width: "16px", height: "16px", accentColor: "var(--color-primary)", cursor: "pointer" }}
                          />
                          <span>
                            {b.name} {b.isMainOffice && <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>(Main Office)</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  {formErrors.branches && <span className={styles.formError}>{formErrors.branches}</span>}
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Status</label>
                <select 
                  className={styles.filterSelect}
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                <button type="submit" disabled={modalLoading} className="btn btn-primary" style={{ flex: 1 }}>
                  {modalLoading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    "Save Employee"
                  )}
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setModalOpen(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Office Location Required Modal */}
      {showLocationRequiredModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: "460px", textAlign: "center", padding: "32px 24px" }}>
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.15)",
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px auto",
            }}>
              <MapPin size={30} />
            </div>

            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff", marginBottom: "8px" }}>
              Office Location Required
            </h3>

            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: "1.6", marginBottom: "24px" }}>
              Please configure and save your office location on the Dashboard before registering your first employee. Setting your office location is mandatory for accurate geofenced attendance tracking.
            </p>

            <div style={{ display: "flex", gap: "12px", flexDirection: "column" }}>
              <Link
                href="/admin"
                className="btn btn-primary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  background: "#ef4444",
                  borderColor: "#ef4444",
                  padding: "12px",
                  textDecoration: "none",
                  fontWeight: 700
                }}
              >
                Go to Dashboard to Set Location
              </Link>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowLocationRequiredModal(false)}
                style={{ padding: "10px" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </AuthGate>
  );
}
