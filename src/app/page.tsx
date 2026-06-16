import Link from "next/link";
import { 
  Sparkles, ArrowRight, Shield, UserCheck, 
  MapPin, CheckCircle, XCircle, Users, 
  Activity, Settings, BarChart2, HelpCircle, Building2
} from "lucide-react";

export default function Home() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
      background: "radial-gradient(circle at 50% 50%, #0d0f1e 0%, #050608 100%)",
      color: "var(--text-primary)",
      overflowX: "hidden"
    }}>
      {/* Premium Navigation Header */}
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "24px 6%",
        maxWidth: "1400px",
        width: "100%",
        margin: "0 auto",
        zIndex: 50
      }}>
        {/* Presivox Logo Branding */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 15px rgba(139, 92, 246, 0.3)"
          }}>
            <span style={{ fontWeight: 800, fontSize: "1.3rem", color: "#fff", letterSpacing: "-1px" }}>P</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ 
              fontWeight: 800, 
              fontSize: "1.25rem", 
              color: "#fff", 
              letterSpacing: "0.5px",
              lineHeight: "1.1" 
            }}>
              PRESIVOX
            </span>
            <span style={{ 
              fontSize: "0.62rem", 
              color: "var(--text-secondary)", 
              letterSpacing: "0.2px",
              fontWeight: 600
            }}>
              Workforce Management Solutions
            </span>
          </div>
        </div>

      </header>

      {/* Main Hero Container */}
      <main style={{
        flex: 1,
        alignItems: "center",
        maxWidth: "1400px",
        width: "100%",
        margin: "0 auto",
        padding: "40px 6% 80px 6%",
        gap: "48px",
        zIndex: 10
      }} className="hero-grid">
        
        {/* Left Info Column */}
        <div className="hero-text-col">
          {/* SECURE CLOUD PLATFORM badge */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            padding: "6px 14px",
            borderRadius: "30px",
            marginBottom: "24px",
            boxShadow: "0 0 15px rgba(16, 185, 129, 0.05)"
          }}>
            <div className="pulse-green-dot" style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "var(--color-success)",
              boxShadow: "0 0 8px var(--color-success)"
            }} />
            <span style={{ 
              fontSize: "0.75rem", 
              fontWeight: 700, 
              letterSpacing: "0.8px", 
              color: "var(--color-success)",
              textTransform: "uppercase"
            }}>
              SECURE CLOUD PLATFORM
            </span>
          </div>

          {/* Main Heading */}
          <h1 style={{
            fontSize: "clamp(2.5rem, 5vw, 3.8rem)",
            fontWeight: 800,
            lineHeight: "1.1",
            color: "#fff",
            marginBottom: "24px",
            letterSpacing: "-1.5px",
            maxWidth: "600px"
          }}>
            Smart Attendance <br />
            <span style={{ color: "#fff" }}>& Workforce </span><br />
            <span style={{
              background: "linear-gradient(135deg, var(--color-secondary), var(--color-primary))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 0 40px rgba(6, 182, 212, 0.12)"
            }}>
              Tracking Platform
            </span>
          </h1>

          {/* Subheading */}
          <p style={{
            fontSize: "1.12rem",
            color: "var(--text-secondary)",
            maxWidth: "540px",
            marginBottom: "36px",
            lineHeight: "1.6",
            fontWeight: 400
          }}>
            An intelligent attendance management system with GPS geofencing, identity verification, and real-time check-in confirmations – built for today's dynamic workforce.
          </p>

          {/* Action CTAs */}
          <div className="btn-container">
            <Link 
              href="/login?next=%2Fadmin" 
              className="btn btn-primary" 
              style={{ 
                padding: "14px 28px", 
                fontSize: "1rem",
                background: "linear-gradient(135deg, var(--color-primary), #6d28d9)",
                boxShadow: "0 6px 20px rgba(139, 92, 246, 0.35)"
              }}
            >
              Enter Admin Portal <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Right Dashboard Mockup Column */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          perspective: "1000px"
        }}>
          {/* Interactive CSS Dashboard Mockup */}
          <div style={{
            width: "100%",
            maxWidth: "680px",
            background: "rgba(10, 11, 22, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "16px",
            boxShadow: "0 30px 60px rgba(0,0,0,0.6), 0 0 40px rgba(139, 92, 246, 0.06)",
            overflow: "hidden",
            display: "grid",
            gridTemplateColumns: "180px 1fr",
            height: "440px",
            transition: "transform 0.5s ease, border-color 0.3s ease",
            transform: "translateY(0)"
          }} className="dashboard-mockup">
            
            {/* Mockup Sidebar */}
            <aside style={{
              background: "rgba(13, 16, 30, 0.95)",
              borderRight: "1px solid rgba(255, 255, 255, 0.05)",
              padding: "20px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "24px"
            }}>
              {/* Mockup Sidebar Brand */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={16} color="var(--color-secondary)" />
                <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#fff", letterSpacing: "0.5px" }}>PRESIVOX</span>
              </div>
              
              {/* Mockup Menu Links */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {[
                  { icon: <MapPin size={13} />, name: "Dashboard", active: true },
                  { icon: <Users size={13} />, name: "Employees" },
                  { icon: <CheckCircle size={13} />, name: "Attendance" },
                  { icon: <Activity size={13} />, name: "Live Tracking" },
                  { icon: <BarChart2 size={13} />, name: "Reports" },
                  { icon: <Building2 size={13} />, name: "Geofence" },
                  { icon: <Settings size={13} />, name: "Settings" }
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: item.active ? "#fff" : "var(--text-secondary)",
                      background: item.active ? "rgba(139, 92, 246, 0.15)" : "transparent",
                      border: item.active ? "1px solid rgba(139, 92, 246, 0.2)" : "1px solid transparent",
                      cursor: "default"
                    }}
                  >
                    {item.icon} {item.name}
                  </div>
                ))}
              </div>
            </aside>

            {/* Mockup Panel Main Content */}
            <main style={{
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              overflow: "hidden"
            }}>
              {/* Mockup Panel Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h4 style={{ fontSize: "0.98rem", fontWeight: 700, color: "#fff" }}>Today's Overview</h4>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500 }}>25 May 2026, Friday</span>
                </div>
                <span style={{ fontSize: "0.7rem", color: "var(--color-secondary)", fontWeight: 600, cursor: "default" }}>View Report ›</span>
              </div>

              {/* Mockup Stat Cards Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                {[
                  { title: "Total Staff", val: "1,248", col: "var(--color-primary)" },
                  { title: "Present", val: "1,032", col: "var(--color-success)", tag: "82.7%" },
                  { title: "Absent", val: "216", col: "var(--color-danger)", tag: "17.3%" },
                  { title: "On Leave", val: "34", col: "#f59e0b", tag: "2.7%" }
                ].map((stat, idx) => (
                  <div 
                    key={idx}
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.04)",
                      borderRadius: "8px",
                      padding: "10px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      height: "64px"
                    }}
                  >
                    <span style={{ fontSize: "0.58rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>{stat.title}</span>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.98rem", fontWeight: 700, color: "#fff" }}>{stat.val}</span>
                      {stat.tag && (
                        <span style={{ fontSize: "0.52rem", color: stat.col, fontWeight: 700 }}>{stat.tag}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Lower Section (Live Logs & Details) */}
              <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "16px", flex: 1, minHeight: "0" }}>
                
                {/* Live Attendance List */}
                <div style={{
                  background: "rgba(255, 255, 255, 0.015)",
                  border: "1px solid rgba(255, 255, 255, 0.04)",
                  borderRadius: "10px",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#fff" }}>Live Attendance</span>
                    <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>View All</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflow: "hidden" }}>
                    {[
                      { name: "Rohit Sharma", time: "09:01 AM", col: "var(--color-success)" },
                      { name: "Sneha Patel", time: "09:08 AM", col: "var(--color-success)" },
                      { name: "Aman Verma", time: "09:21 AM", col: "var(--color-success)" },
                      { name: "Neha Singh", time: "09:34 AM", col: "var(--color-success)" }
                    ].map((emp, idx) => (
                      <div 
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "6px 8px",
                          background: "rgba(255, 255, 255, 0.01)",
                          borderRadius: "6px",
                          fontSize: "0.7rem"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div style={{
                            width: "18px",
                            height: "18px",
                            borderRadius: "50%",
                            background: "rgba(255, 255, 255, 0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.5rem",
                            fontWeight: 700,
                            color: "var(--text-secondary)"
                          }}>
                            {emp.name.split(" ").map(n=>n[0]).join("")}
                          </div>
                          <span style={{ color: "#eee", fontWeight: 500 }}>{emp.name}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.6rem" }}>{emp.time}</span>
                          <span style={{ color: emp.col, fontSize: "0.6rem", fontWeight: 700 }}>On Time</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Geofence Map Card & Trend */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {/* Attendance Trend Preview */}
                  <div style={{
                    background: "rgba(255, 255, 255, 0.015)",
                    border: "1px solid rgba(255, 255, 255, 0.04)",
                    borderRadius: "10px",
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    flex: 1
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.7rem" }}>
                      <span style={{ fontWeight: 700, color: "#fff" }}>Attendance Trend</span>
                      <span style={{ color: "var(--color-secondary)", fontWeight: 600 }}>This Week</span>
                    </div>
                    {/* Tiny CSS Line Chart Representation */}
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "46px", padding: "4px 0", marginTop: "4px" }}>
                      {[40, 55, 48, 62, 78, 68, 85].map((h, idx) => (
                        <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div style={{
                            width: "100%",
                            height: `${h}%`,
                            background: idx === 6 ? "linear-gradient(to top, var(--color-primary), var(--color-secondary))" : "rgba(255,255,255,0.08)",
                            borderRadius: "2px",
                            boxShadow: idx === 6 ? "0 0 8px var(--color-secondary-glow)" : "none",
                            transition: "height 0.3s"
                          }} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active Geofences Card */}
                  <div style={{
                    background: "rgba(255, 255, 255, 0.015)",
                    border: "1px solid rgba(255, 255, 255, 0.04)",
                    borderRadius: "10px",
                    padding: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px"
                  }}>
                    <div style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      background: "rgba(6, 182, 212, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--color-secondary)"
                    }}>
                      <MapPin size={14} />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#fff" }}>12 Active Sites</div>
                      <div style={{ fontSize: "0.55rem", color: "var(--text-muted)" }}>Geofence Boundaries Locked</div>
                    </div>
                  </div>
                </div>

              </div>
            </main>
          </div>
        </div>
      </main>

      {/* Subtle Styling via Styled JSX to achieve animations & responsive layouts */}
      <style dangerouslySetInnerHTML={{ __html: `
        .hero-grid {
          display: grid !important;
          grid-template-columns: 1fr;
          align-items: center;
          gap: 48px;
        }

        .hero-text-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          width: 100%;
          margin: 0 auto;
        }

        .btn-container {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 16px;
          margin-bottom: 40px;
          width: 100%;
        }

        @media (min-width: 992px) {
          .hero-grid {
            grid-template-columns: 1.2fr 1fr !important;
            padding: 80px 6% 120px 6% !important;
            gap: 60px !important;
          }
          .hero-text-col {
            align-items: flex-start !important;
            text-align: left !important;
            margin: 0 !important;
          }
          .btn-container {
            justify-content: flex-start !important;
          }
          .desktop-nav {
            display: flex !important;
          }
        }
        
        .dashboard-mockup:hover {
          transform: translateY(-8px) rotateX(2deg) rotateY(-2deg) !important;
          border-color: rgba(6, 182, 212, 0.2) !important;
        }

        @keyframes pulseGreen {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
          70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        
        .pulse-green-dot {
          animation: pulseGreen 2s infinite;
        }

        .nav-item {
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.88rem;
          font-weight: 500;
          transition: color 0.2s;
        }
        .nav-item:hover {
          color: #fff !important;
        }

        .login-btn {
          color: var(--text-primary);
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 600;
          padding: 10px 18px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.02);
          transition: all 0.2s;
        }
        .login-btn:hover {
          background: rgba(255,255,255,0.06) !important;
          border-color: rgba(255,255,255,0.15) !important;
        }
      `}} />

      {/* Info Footer */}
      <footer style={{
        borderTop: "1px solid rgba(255, 255, 255, 0.05)",
        padding: "32px 6%",
        maxWidth: "1400px",
        width: "100%",
        margin: "auto auto 0 auto",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "16px",
        fontSize: "0.8rem",
        color: "var(--text-muted)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Shield size={14} />
          <span>PRESIVOX Workforce Security • Geofence Bounds Validated</span>
        </div>
        <div>
          <span>© 2026 Presivox Inc. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
