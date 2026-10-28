"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle,
  X,
  Loader2,
  Building2,
  Mail,
  Phone,
  MapPin,
  Camera,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Sparkles,
  QrCode,
  Clock,
  LogIn,
  FileSpreadsheet
} from "lucide-react";
import { PRICING_PLANS, PlanConfig } from "@/lib/plans";

export default function Home() {
  const [selectedPlan, setSelectedPlan] = useState<PlanConfig | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  // Form states with auto-fetch
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [attendanceMode, setAttendanceMode] = useState<"with_photo" | "without_photo">("with_photo");
  const [formError, setFormError] = useState("");

  // Auto-fetch previously stored details if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("presivox_user_cache");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.adminName) setAdminName(parsed.adminName);
          if (parsed.adminEmail) setAdminEmail(parsed.adminEmail);
          if (parsed.adminPhone) setAdminPhone(parsed.adminPhone);
          if (parsed.companyName) setCompanyName(parsed.companyName);
          if (parsed.address) setAddress(parsed.address);
        } catch (e) {
          console.warn("Failed to parse cached details");
        }
      }
    }
  }, []);

  const openPlanModal = (planKey: "plan-a" | "plan-b" | "plan-c") => {
    const plan = PRICING_PLANS[planKey];
    setSelectedPlan(plan);
    setFormError("");
    setSuccessMessage(false);
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setFormError("");

    if (!adminName.trim() || !adminEmail.trim() || !adminPhone.trim() || !companyName.trim()) {
      setFormError("Please fill out all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/plan-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          adminName,
          adminEmail,
          adminPhone,
          companyName,
          address,
          attendanceMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to submit request.");
        return;
      }

      // Cache details in localStorage for auto-filling into onboarding
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "presivox_user_cache",
          JSON.stringify({
            adminName,
            adminEmail,
            adminPhone,
            companyName,
            address,
            attendanceMode,
            employeeLimit: selectedPlan.employeeLimit,
            planId: selectedPlan.id,
          })
        );
        localStorage.setItem("companyName", companyName.trim());
        localStorage.setItem("adminName", adminName.trim());
        localStorage.setItem("adminEmail", adminEmail.toLowerCase().trim());
        localStorage.setItem("adminPhone", adminPhone.trim());
        localStorage.setItem("address", address.trim());
        localStorage.setItem("attendanceMode", attendanceMode);
        localStorage.setItem("employeeLimit", String(selectedPlan.employeeLimit));
        localStorage.setItem("selectedPlanId", selectedPlan.id);
        localStorage.setItem("selectedPlanName", selectedPlan.name);
      }

      setSuccessMessage(true);
    } catch (err: any) {
      console.error(err);
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="presivox-landing">
      {/* Header */}
      <header className="site-header">
        <div className="wrap nav">
          <Link href="#top" className="brand">
            <img
              src="/images/presivox-logo.png"
              alt="PRESIVOX — Verified Presence. Simplified."
              className="brandlogo"
            />
          </Link>
          <nav className="navlinks">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQs</a>
            <Link href="/admin/qr" style={{ color: "var(--blue)" }}>
              QR Terminal
            </Link>
            <Link href="/admin/timesheet">
              Timesheets
            </Link>
          </nav>
          <div className="nav-actions">
            <Link href="/login" className="btn secondary" style={{ padding: "10px 16px", fontSize: "13px" }}>
              <LogIn size={15} /> Admin Login
            </Link>
            <a className="btn" href="#pricing">
              Get Started →
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="top">
        {/* Hero Section */}
        <div className="hero">
          <div className="wrap heroGrid">
            <div>
              <div className="eyebrow">Simple employee attendance</div>
              <h1 className="hero-title">
                Attendance, <span>without the complications.</span>
              </h1>
              <p className="lead">
                Scan the workplace QR, enter your registered mobile number, and mark IN or OUT. Presivox records the
                attendance time and GPS location, with optional face verification. No fingerprint machine. No payroll
                clutter. Straightforward annual plans.
              </p>
              <div className="actions">
                <a className="btn" href="#pricing">
                  Explore Annual Plans →
                </a>
                <Link className="btn secondary" href="/admin/qr">
                  <QrCode size={16} /> Direct QR Terminal
                </Link>
              </div>

              <div className="mini">
                <strong>✓ No biometric hardware</strong> &nbsp; ✓ Optional face verification &nbsp; ✓ GPS-stamped attendance
              </div>

              {/* Quick Jump Links to Connected Next Pages */}
              <div className="quick-nav-pills">
                <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "600", alignSelf: "center" }}>
                  Quick Access:
                </span>
                <Link href="/checkin">
                  <ArrowRight size={13} /> Mark IN (Check-In)
                </Link>
                <Link href="/checkout">
                  <ArrowRight size={13} /> Mark OUT (Check-Out)
                </Link>
                <Link href="/admin/qr">
                  <QrCode size={13} /> QR Standee
                </Link>
                <Link href="/admin/timesheet">
                  <FileSpreadsheet size={13} /> Work Hours Timesheet
                </Link>
                <Link href="/login">
                  <LogIn size={13} /> Admin Console
                </Link>
              </div>
            </div>

            {/* Dashboard Mockup */}
            <div className="dashboard">
              <div className="dashhead">
                Attendance overview <span className="pill">● Live Monitor</span>
              </div>
              <div className="stats">
                <div className="stat">
                  <small>Employees</small>
                  <strong>32</strong>
                </div>
                <div className="stat">
                  <small>Checked in</small>
                  <strong>27</strong>
                </div>
                <div className="stat">
                  <small>Pending</small>
                  <strong>5</strong>
                </div>
              </div>
              <div className="scan">
                <div className="scanIcon">⌗</div>
                <div>
                  <strong>Scan workplace QR</strong>
                  <p>IN / OUT → Mobile number → Confirm</p>
                </div>
              </div>
              <div className="record" style={{ marginTop: "14px" }}>
                <div>
                  <strong>Rahul Sharma (EMP-101)</strong>
                  <br />
                  <small style={{ color: "var(--muted)" }}>IN • 09:04 AM • Head Office</small>
                </div>
                <span>Verified ✓</span>
              </div>
              <div className="record">
                <div>
                  <strong>Priya Verma (EMP-104)</strong>
                  <br />
                  <small style={{ color: "var(--muted)" }}>IN • 09:12 AM • Head Office</small>
                </div>
                <span>Verified ✓</span>
              </div>
              <div className="mini" style={{ marginTop: "10px", textAlign: "right" }}>
                Presivox Terminal Mockup
              </div>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <section id="how">
          <div className="wrap">
            <div className="center">
              <span className="eyebrow">How it works</span>
              <h2 className="sectionTitle">Three steps. That&apos;s attendance.</h2>
              <p className="sub">
                Employees scan, identify themselves and allow location access to record their attendance from their
                smartphones in seconds.
              </p>
            </div>
            <div className="steps">
              <div className="step">
                <div className="number">01 / SCAN</div>
                <h3>Scan IN or OUT QR</h3>
                <p>Place the QR terminal sign at your workplace. Employees scan the relevant code using any mobile camera or scanner.</p>
              </div>
              <div className="step">
                <div className="number">02 / IDENTIFY</div>
                <h3>Enter mobile number</h3>
                <p>The system matches the entered number with the registered employee profile. Optional auto-white face verification adds another check.</p>
              </div>
              <div className="step">
                <div className="number">03 / DONE</div>
                <h3>Attendance + GPS recorded</h3>
                <p>The check-in or check-out is saved instantly with its timestamp, captured GPS coordinates, and verification badge.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="soft" id="features">
          <div className="wrap">
            <div className="center">
              <span className="eyebrow">What you get</span>
              <h2 className="sectionTitle">Everything needed. Nothing unnecessary.</h2>
              <p className="sub">Focused on recording tamper-proof employee attendance, not running an overcomplicated HR department.</p>
            </div>
            <div className="grid3">
              <div className="tile">
                <div className="glyph">⌗</div>
                <h3>QR-based IN &amp; OUT</h3>
                <p>Dedicated workplace QR codes for check-in and check-out with zero manual touching or fingerprint queuing.</p>
              </div>
              <div className="tile">
                <div className="glyph">#</div>
                <h3>Mobile number matching</h3>
                <p>Employees enter their registered number to identify themselves without remembering complex logins.</p>
              </div>
              <div className="tile">
                <div className="glyph">✓</div>
                <h3>Optional face verification</h3>
                <p>Enable an additional selfie face-matching step with automatic background whitening for crystal-clear verification.</p>
              </div>
              <div className="tile">
                <div className="glyph">▦</div>
                <h3>Admin dashboard</h3>
                <p>View employees, live attendance status, shift logs, and generated QR codes all in one streamlined console.</p>
              </div>
              <div className="tile">
                <div className="glyph">↧</div>
                <h3>Daily, Weekly &amp; Monthly Timesheets</h3>
                <p>Review exact hours worked per employee with daily, weekly, and monthly filters, plus one-click CSV export.</p>
              </div>
              <div className="tile">
                <div className="glyph">◎</div>
                <h3>GPS location at IN &amp; OUT</h3>
                <p>Capture the employee&apos;s device-reported latitude and longitude with attendance, alongside the date and time.</p>
              </div>
              <div className="tile" style={{ gridColumn: "span 3" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                  <div className="glyph" style={{ flexShrink: 0 }}>◎</div>
                  <div>
                    <h3 style={{ margin: "0 0 6px" }}>No dedicated hardware required</h3>
                    <p style={{ margin: 0 }}>Works through any modern smartphone browser without installing costly biometric hardware or cable wiring.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Two Verification Modes */}
        <section>
          <div className="wrap">
            <div className="center">
              <span className="eyebrow">Your choice</span>
              <h2 className="sectionTitle">One system. Two verification modes.</h2>
              <p className="sub">Both modes record QR-based IN/OUT attendance and GPS location. Choose whether face matching is required.</p>
            </div>
            <div className="toggleBox">
              <div className="mode">
                <span className="eyebrow">Simple mode</span>
                <h3>Mobile number attendance</h3>
                <p>For teams that want a quick QR + mobile number flow, with attendance timestamp and GPS location captured.</p>
                <ul>
                  <li>Scan workplace QR code</li>
                  <li>Enter registered mobile number</li>
                  <li>Instant Attendance + GPS recorded</li>
                </ul>
                <p style={{ fontSize: "13px", marginTop: "16px" }}>
                  <strong>Note:</strong> Ideal for fast-moving staff where physical presence is visually supervised.
                </p>
              </div>
              <div className="mode featured">
                <span className="eyebrow">Additional verification</span>
                <h3>Mobile + auto-white face matching</h3>
                <p>For teams that want photo proof in addition to QR, mobile identification, and GPS location capture.</p>
                <ul>
                  <li>Scan workplace QR code</li>
                  <li>Enter registered mobile number</li>
                  <li>Snap selfie with automatic background whitening</li>
                  <li>Attendance + GPS + Photo saved</li>
                </ul>
                <p style={{ fontSize: "13px", marginTop: "16px" }}>
                  <strong>Note:</strong> Zero-background distraction helps employers verify real identity reliably.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Section */}
        <section className="soft">
          <div className="wrap">
            <div className="center">
              <span className="eyebrow">Clear by design</span>
              <h2 className="sectionTitle">What Presivox is. And what it isn&apos;t.</h2>
            </div>
            <div className="compare">
              <div>
                <h3 style={{ color: "#17754b" }}>✓ What we are</h3>
                <ul>
                  <li>A focused employee attendance and check-in location system</li>
                  <li>Separate QR codes for workplace IN and OUT terminal signs</li>
                  <li>Simple mobile-number-based employee identification</li>
                  <li>Optional selfie verification with auto-whitening</li>
                  <li>GPS coordinates, timestamps and Daily/Weekly/Monthly timesheet reporting</li>
                  <li>Work hours calculation per employee per day</li>
                  <li>Straightforward annual pricing with no per-user monthly surprises</li>
                </ul>
              </div>
              <div>
                <h3 style={{ color: "#8a3b3b" }}>— What we are not</h3>
                <ul>
                  <li>Not a bloated payroll or tax deduction engine</li>
                  <li>Not a complex 50-step HRMS or leave approval labyrinth</li>
                  <li>Not a biometric fingerprint machine vendor</li>
                  <li>Not invasive continuous battery-draining GPS tracking</li>
                  <li>Not a per-employee monthly billing trap</li>
                  <li>Not complicated software requiring weeks of employee training</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing">
          <div className="wrap">
            <div className="center">
              <span className="eyebrow">Straightforward pricing</span>
              <h2 className="sectionTitle">Simple attendance. Simple annual plans.</h2>
              <p className="sub">
                Flat annual subscription pricing. Select the plan that fits your employee capacity and start recording attendance today.
              </p>
            </div>

            {/* Prominent English Process Notice Banner */}
            <div className="plan-flow-notice-banner">
              <div className="notice-icon-box">
                <Sparkles size={22} />
              </div>
              <div>
                <h4>First select your plan and fill the process.</h4>
                <p>
                  In 24 hours you will get an email from our team with your Admin ID and Password once approved by Super Admin.
                </p>
              </div>
            </div>

            <div className="pricing">
              {/* Plan A */}
              <div className="plan">
                <h3>Plan A</h3>
                <p className="mini">Up to 10 Employees</p>
                <div className="price">
                  ₹2,599 <small>/ year</small>
                </div>
                <div className="plan-tax-note">+ 18% GST (Total: ₹3,066.82/yr)</div>
                <ul>
                  <li><strong>Up to 10 employees capacity</strong></li>
                  <li>QR-based IN / OUT terminal</li>
                  <li>Registered mobile number matching</li>
                  <li>Daily, Weekly &amp; Monthly Timesheets</li>
                  <li>Work hours tracking per employee</li>
                  <li>GPS location capture on every punch</li>
                  <li>Attendance history &amp; CSV export</li>
                  <li>Self-service admin onboarding</li>
                </ul>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => openPlanModal("plan-a")}
                >
                  Choose Plan A →
                </button>
              </div>

              {/* Plan B (Popular) */}
              <div className="plan popular">
                <span className="tag">Recommended</span>
                <h3>Plan B</h3>
                <p className="mini">Up to 50 Employees</p>
                <div className="price">
                  ₹11,999 <small>/ year</small>
                </div>
                <div className="plan-tax-note">+ 18% GST (Total: ₹14,158.82/yr)</div>
                <ul>
                  <li><strong>Up to 50 employees capacity</strong></li>
                  <li>Everything in Plan A</li>
                  <li>Optional selfie verification</li>
                  <li>Auto-white background processing</li>
                  <li>Priority email &amp; phone support</li>
                  <li>Printable QR Standee generator</li>
                  <li>Multi-shift duration tracking</li>
                  <li>Assisted company onboarding</li>
                </ul>
                <button
                  type="button"
                  className="btn"
                  onClick={() => openPlanModal("plan-b")}
                >
                  Choose Plan B →
                </button>
              </div>

              {/* Plan C */}
              <div className="plan">
                <h3>Plan C</h3>
                <p className="mini">Unlimited Employees</p>
                <div className="price">
                  ₹21,999 <small>/ year</small>
                </div>
                <div className="plan-tax-note">+ 18% GST (Total: ₹25,958.82/yr)</div>
                <ul>
                  <li><strong>Unlimited employees capacity</strong></li>
                  <li>Everything in Plan B</li>
                  <li>Unlimited branch / department locations</li>
                  <li>Bulk employee CSV import</li>
                  <li>Dedicated account manager</li>
                  <li>Full historical data archiving</li>
                  <li>Custom QR terminal branding</li>
                  <li>Direct phone &amp; priority SLA support</li>
                </ul>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => openPlanModal("plan-c")}
                >
                  Choose Plan C →
                </button>
              </div>
            </div>

            <p className="note center">
              All plans are billed annually on a transparent basis. 18% GST is added at checkout. Confirmation details and login credentials are provided to your registered email.
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="soft" id="faq">
          <div className="wrap">
            <div className="center">
              <span className="eyebrow">Frequently asked questions</span>
              <h2 className="sectionTitle">A few things worth knowing.</h2>
            </div>
            <div className="faq">
              <details>
                <summary>Do employees need a biometric fingerprint machine?</summary>
                <p>No. Presivox replaces fingerprint hardware completely. Employees simply scan the office QR code using their own smartphone camera or browser.</p>
              </details>
              <details>
                <summary>Is face recognition / selfie compulsory?</summary>
                <p>No. You can configure your company for &quot;Without Photo&quot; mode (mobile number + GPS only) or enable &quot;With Photo&quot; for selfie matching with auto-whitened background.</p>
              </details>
              <details>
                <summary>How does the automatic white background feature work?</summary>
                <p>When an employee takes a selfie or uploads a reference photo, our system automatically isolates the subject and turns the background pure white (#FFFFFF), eliminating office clutter and speeding up visual verification.</p>
              </details>
              <details>
                <summary>Can employees view their daily, weekly, and monthly work hours?</summary>
                <p>Yes. The admin dashboard features a complete Timesheet section where you can filter any employee&apos;s records by Daily, Weekly, or Monthly periods and see total hours worked with CSV export.</p>
              </details>
              <details>
                <summary>What happens after I select a subscription plan?</summary>
                <p>You fill out your company details in the plan form. Once submitted, our team provisions your account and you receive confirmation on your registered email within 48 hours with your login ID and password.</p>
              </details>
              <details>
                <summary>Is GPS location captured for both IN and OUT?</summary>
                <p>Yes. Whenever an employee clocks IN or OUT, their device-reported GPS coordinates are recorded and displayed in the admin attendance logs.</p>
              </details>
              <details>
                <summary>Does Presivox continuously track employee location all day?</summary>
                <p>No. We respect privacy. Location is only captured at the exact moment of marking IN and marking OUT, not continuously throughout the day.</p>
              </details>
              <details>
                <summary>Can I upgrade to a higher plan later if my team grows?</summary>
                <p>Yes. You can upgrade from Plan A (10 employees) to Plan B (50 employees) or Plan C (Unlimited) at any time through your SuperAdmin contact.</p>
              </details>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section>
          <div className="wrap">
            <div className="cta">
              <span className="eyebrow">Ready for simpler attendance?</span>
              <h2 className="sectionTitle">
                Keep attendance simple.
                <br />
                Focus on your work.
              </h2>
              <p>
                Choose your team plan and experience hassle-free QR attendance with GPS verification and accurate timesheets.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: "14px", flexWrap: "wrap" }}>
                <a
                  className="btn"
                  href="#pricing"
                  style={{ background: "white", color: "#112850 !important", borderColor: "white" }}
                >
                  Choose Your Plan →
                </a>
                <Link
                  href="/admin/qr"
                  className="btn secondary"
                  style={{ background: "transparent", color: "white !important", borderColor: "rgba(255,255,255,0.4)" }}
                >
                  Open QR Station
                </Link>
                <Link
                  href="/login"
                  className="btn secondary"
                  style={{ background: "transparent", color: "white !important", borderColor: "rgba(255,255,255,0.4)" }}
                >
                  Admin Login
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer>
        <div className="wrap foot">
          <div>
            <strong>PRESIVOX</strong> · Verified Presence. Simplified.
          </div>
          <div>© 2026 Presivox · All rights reserved</div>
          <div className="foot-product-line">
            A Product of{" "}
            <a
              href="https://www.solutionplanets.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--blue, #2563eb)", textDecoration: "underline", textUnderlineOffset: "3px", fontWeight: 700 }}
            >
              Solution Planets
            </a>
          </div>
        </div>
      </footer>

      {/* Interactive Plan Order Modal */}
      {modalOpen && selectedPlan && (
        <div className="modal-overlay" onClick={() => !submitting && setModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              <X size={20} />
            </button>

            {successMessage ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div
                  style={{
                    width: "68px",
                    height: "68px",
                    borderRadius: "50%",
                    background: "#e8f8ef",
                    color: "#17754b",
                    display: "grid",
                    placeItems: "center",
                    margin: "0 auto 18px",
                  }}
                >
                  <CheckCircle size={36} />
                </div>
                <h3 style={{ fontSize: "22px", fontWeight: "800", color: "var(--ink)", margin: "0 0 10px" }}>
                  Request Received!
                </h3>
                <div
                  style={{
                    background: "#f4f7fc",
                    borderRadius: "16px",
                    padding: "20px",
                    margin: "20px 0",
                    border: "1px solid var(--border)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "15px",
                      fontWeight: "750",
                      color: "var(--blue)",
                      margin: "0 0 8px",
                    }}
                  >
                    &ldquo;First select your plan and fill the process. In 24 hours you get email from our team with your ID and password.&rdquo;
                  </p>
                  <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>
                    Our team will review your <strong>{selectedPlan.name}</strong> subscription for{" "}
                    <strong>{companyName}</strong>. Once approved by Super Admin, your login credentials will be delivered to <strong>{adminEmail}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn"
                  style={{ width: "100%" }}
                  onClick={() => setModalOpen(false)}
                >
                  Done
                </button>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: "16px" }}>
                  <span className="eyebrow">{selectedPlan.name}</span>
                  <h3 style={{ fontSize: "24px", fontWeight: "850", color: "var(--ink)", margin: "8px 0 4px" }}>
                    Company Subscription Setup
                  </h3>
                  <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>
                    {selectedPlan.employeeLimit >= 999990
                      ? "Unlimited Employees Capacity"
                      : `Capacity: Up to ${selectedPlan.employeeLimit} Employees`}
                  </p>
                </div>

                {/* Modal Top Process Banner */}
                <div
                  style={{
                    background: "#eef4ff",
                    border: "1px solid #c7d8fe",
                    borderRadius: "12px",
                    padding: "12px 14px",
                    marginBottom: "16px",
                    fontSize: "13px",
                    color: "#1e3a8a",
                    lineHeight: "1.5",
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                  }}
                >
                  <Sparkles size={18} style={{ color: "var(--blue)", flexShrink: 0 }} />
                  <span>
                    <strong>Process:</strong> First select your plan and fill the process. In 24 hours you will get an email from our team with your ID and Password once approved by Super Admin.
                  </span>
                </div>

                {/* Price Breakdown Box */}
                <div
                  style={{
                    background: "#f7f9fd",
                    border: "1px solid var(--border)",
                    borderRadius: "16px",
                    padding: "16px",
                    marginBottom: "20px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "6px" }}>
                    <span style={{ color: "var(--muted)" }}>Annual Subscription:</span>
                    <span style={{ fontWeight: "700" }}>₹{selectedPlan.basePrice.toLocaleString("en-IN")}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "8px" }}>
                    <span style={{ color: "var(--muted)" }}>GST (18%):</span>
                    <span style={{ fontWeight: "700" }}>₹{selectedPlan.gstAmount.toFixed(2)}</span>
                  </div>
                  <div
                    style={{
                      borderTop: "1px dashed var(--border)",
                      paddingTop: "10px",
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "16px",
                    }}
                  >
                    <span style={{ fontWeight: "800", color: "var(--ink)" }}>Total Payable / Year:</span>
                    <span style={{ fontWeight: "850", color: "var(--blue)" }}>
                      ₹{selectedPlan.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {formError && (
                  <div
                    style={{
                      background: "#fef2f2",
                      color: "#b91c1c",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      fontSize: "13px",
                      marginBottom: "16px",
                      border: "1px solid #fecaca",
                    }}
                  >
                    {formError}
                  </div>
                )}

                <form onSubmit={handleFormSubmit}>
                  <div className="modal-field">
                    <label>Company / Organization Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Tech Solutions"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div className="modal-field">
                      <label>Admin Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Rajesh Kumar"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="modal-field">
                      <label>Admin Mobile Number *</label>
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="modal-field">
                    <label>Registered Work Email *</label>
                    <input
                      type="email"
                      placeholder="e.g. rajesh@acmetech.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      required
                    />
                    <small style={{ color: "var(--muted)", fontSize: "11px", marginTop: "4px", display: "block" }}>
                      Login ID and password will be delivered to this email.
                    </small>
                  </div>

                  <div className="modal-field">
                    <label>Company Address / City</label>
                    <input
                      type="text"
                      placeholder="e.g. 402, Cyber Tower, Sector 62, Noida"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>

                  <div className="modal-field">
                    <label>Attendance Verification Mode</label>
                    <select
                      value={attendanceMode}
                      onChange={(e) => setAttendanceMode(e.target.value as any)}
                    >
                      <option value="with_photo">With Photo (Selfie + Auto-White Background)</option>
                      <option value="without_photo">Without Photo (Mobile Number + GPS Only)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="btn"
                    style={{ width: "100%", marginTop: "10px" }}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Submitting Request...
                      </>
                    ) : (
                      `Submit Request (₹${selectedPlan.totalAmount.toFixed(2)}/yr) →`
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
