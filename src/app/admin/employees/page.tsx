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

  // Form states
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formFullName, setFormFullName] = useState("");
  const [formMobileNumber, setFormMobileNumber] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formStatus, setFormStatus] = useState("active");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [companyCountryCode] = useState("+91");

  // Photo states
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [formImageBase64, setFormImageBase64] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Photo size must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormImagePreview(base64String);
        setFormImageBase64(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchEmployees();
    }
  }, [selectedCompanyId]);

  const selectedCompany = companies.find(company => company.id === selectedCompanyId);

  const companyHeaders = () => ({
    "Content-Type": "application/json",
    "x-company-id": selectedCompanyId,
  });

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/admin/companies");
      const data = await res.json();
      if (data.success) {
        setCompanies(data.companies);
        const storedCompanyId = localStorage.getItem("selectedCompanyId");
        const nextCompany = data.companies.find((company: Company) => company.id === storedCompanyId) || data.companies[0];
        if (nextCompany) {
          setSelectedCompanyId(nextCompany.id);
          localStorage.setItem("selectedCompanyId", nextCompany.id);
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

  const openAddModal = () => {
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
    setModalOpen(true);
  };

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
    // Enforce face image upload for new registrations
    if (!editEmployee && !formImageBase64) {
      errors.registeredFaceImage = "An employee face photo is required for registration.";
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
          <button onClick={openAddModal} className="btn btn-primary">
            <Plus size={16} /> Add Employee
          </button>
        </div>

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
                <label className={styles.formLabel}>Employee ID (Unique)</label>
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
                <label className={styles.formLabel}>Full Name</label>
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
                <label className={styles.formLabel}>Employee Photo (For Face Matching)</label>
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
                      Upload a clear, front-facing profile photo. This photo will be compared against the check-in selfie.
                    </span>
                    {formErrors.registeredFaceImage && <span className={styles.formError} style={{ display: "block", marginTop: "6px", color: "var(--color-danger)" }}>{formErrors.registeredFaceImage}</span>}
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>WhatsApp Number</label>
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
                <label className={styles.formLabel}>Department</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Engineering, Sales, HR"
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                />
                {formErrors.department && <span className={styles.formError}>{formErrors.department}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Designation / Role</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Software Engineer, Manager"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                />
                {formErrors.role && <span className={styles.formError}>{formErrors.role}</span>}
              </div>

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

      </div>
    </AuthGate>
  );
}
