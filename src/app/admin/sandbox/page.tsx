"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { 
  Users, MapPin, Send, PlusCircle, ArrowLeft, CheckCircle, XCircle,
  Smartphone, Sparkles, MessageCircle, ExternalLink, ShieldAlert, CalendarDays
} from "lucide-react";
import AuthGate from "@/components/AuthGate";
import Sidebar from "@/components/Sidebar";
import adminStyles from "../admin.module.css";
import styles from "./sandbox.module.css";

interface Employee {
  id: string;
  employeeId: string;
  fullName: string;
  mobileNumber: string;
  department: string;
  role: string;
}

interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  link?: string;
  token?: string;
}

export default function WhatsAppSandbox() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [customPhone, setCustomPhone] = useState("");
  const [useCustomPhone, setUseCustomPhone] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "system-welcome",
      text: "WhatsApp Sandbox Active.\n\nSimulate sending inbound messages to the Smart Attendance Bot. Select an employee on the left to impersonate their registered phone number, type a message like 'HI' or 'ATTENDANCE', and press send.",
      sender: "bot",
      timestamp: new Date(),
    }
  ]);
  
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);

  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const selectedCompanyHeaders: Record<string, string> = selectedCompanyId ? { "x-company-id": selectedCompanyId } : {};

  useEffect(() => {
    setSelectedCompanyId(localStorage.getItem("selectedCompanyId") || "");
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [selectedCompanyId]);

  useEffect(() => {
    // Scroll to bottom when messages update
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/admin/employees", { headers: selectedCompanyHeaders });
      const data = await res.json();
      if (data.success && data.employees) {
        setEmployees(data.employees);
        if (data.employees.length > 0) {
          setSelectedEmpId(data.employees[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Get active phone number being simulated
  const getSimulatedPhone = () => {
    if (useCustomPhone) return customPhone.trim();
    const emp = employees.find(e => e.id === selectedEmpId);
    return emp ? emp.mobileNumber : "";
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const text = inputText.trim();
    const phone = getSimulatedPhone();

    if (!text) return;
    if (!phone) {
      alert("Please select an employee or enter a custom mobile number to simulate.");
      return;
    }

    setSending(true);
    setInputText("");

    // Append user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      text: text,
      sender: "user",
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMsg]);

    try {
      // Hit local webhook
      const res = await fetch("/api/whatsapp/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...selectedCompanyHeaders },
        body: JSON.stringify({
          isSandbox: true,
          senderPhone: phone,
          messageText: text
        }),
      });

      const data = await res.json();

      if (data.success && data.reply) {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          text: data.reply,
          sender: "bot",
          timestamp: new Date(),
          link: data.link,
          token: data.token
        };
        setChatMessages(prev => [...prev, botMsg]);
      } else {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          text: data.error || "Bot did not respond. Check if number is registered.",
          sender: "bot",
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, botMsg]);
      }

    } catch (err) {
      console.error(err);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        text: "Error: Failed to connect to local webhook endpoint.",
        sender: "bot",
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, botMsg]);
    } finally {
      setSending(false);
    }
  };

  const simulatedPhone = getSimulatedPhone();

  return (
    <AuthGate>
      <div className={adminStyles.adminLayout} style={{ overflow: "hidden" }}>
      {/* Sidebar Navigation */}
      <Sidebar activeKey="sandbox" onCompanyChange={(id) => setSelectedCompanyId(id)} />

      {/* WhatsApp Layout Container */}
      <main className={styles.sandboxContainer}>
        {/* Simulator Control Pane */}
        <div className={styles.chatListPane}>
          <div className={styles.paneHeader}>
            <span className={styles.paneHeaderTitle}>Simulator Controls</span>
            <Smartphone size={18} color="var(--color-secondary)" />
          </div>

          <div className={styles.controllerCard}>
            <div className={adminStyles.formGroup}>
              <span className={styles.controllerTitle}>Impersonate Sender</span>
              <div style={{ display: "flex", gap: "8px", margin: "6px 0 12px" }}>
                <button 
                  type="button" 
                  className={`btn ${!useCustomPhone ? "btn-secondary" : "btn-outline"}`}
                  style={{ flex: 1, padding: "8px" }}
                  onClick={() => setUseCustomPhone(false)}
                >
                  Registry List
                </button>
                <button 
                  type="button" 
                  className={`btn ${useCustomPhone ? "btn-secondary" : "btn-outline"}`}
                  style={{ flex: 1, padding: "8px" }}
                  onClick={() => setUseCustomPhone(true)}
                >
                  Custom No.
                </button>
              </div>

              {!useCustomPhone ? (
                <div className={adminStyles.formGroup}>
                  <label className={adminStyles.formLabel}>Select Employee</label>
                  {employees.length === 0 ? (
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      No active employees found. Add some in the Registry first.
                    </span>
                  ) : (
                    <select 
                      className={adminStyles.filterSelect}
                      value={selectedEmpId}
                      onChange={(e) => setSelectedEmpId(e.target.value)}
                    >
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.fullName} ({emp.mobileNumber})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div className={adminStyles.formGroup}>
                  <label className={adminStyles.formLabel}>WhatsApp Mobile Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. +919876543210" 
                    className="form-input"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div style={{ padding: "10px", background: "rgba(255,255,255,0.01)", border: "1px dashed var(--border-light)", borderRadius: "6px", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              <strong>Simulated Sender ID:</strong>
              <div style={{ color: "#fff", fontWeight: "700", marginTop: "4px", fontSize: "0.85rem", wordBreak: "break-all" }}>
                {simulatedPhone || "None configured"}
              </div>
            </div>
          </div>

          <div className={styles.contactsList}>
            <div className={`${styles.contactItem} ${styles.contactItemActive}`}>
              <div className={styles.contactAvatar}>B</div>
              <div className={styles.contactDetails}>
                <div className={styles.contactName}>Smart Attendance Bot</div>
                <div className={styles.contactStatus}>Send HI or ATTENDANCE to check in</div>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Chat Main Window */}
        <div className={styles.chatWindow}>
          {/* Chat Header */}
          <div className={styles.chatHeader}>
            <div className={styles.contactAvatar}>B</div>
            <div className={styles.chatTitleInfo}>
              <span className={styles.chatTitle}>Smart Attendance Bot</span>
              <span className={styles.chatSubtitle}>online</span>
            </div>
          </div>

          {/* Messages Log */}
          <div className={styles.messageArea}>
            {chatMessages.map(msg => (
              <div 
                key={msg.id} 
                className={`${styles.messageBubble} ${
                  msg.sender === "user" ? styles.bubbleUser : styles.bubbleBot
                }`}
              >
                {msg.text}
                
                {/* Render Link Card if Bot reply contains the check-in URL */}
                {msg.sender === "bot" && msg.link && (
                  <div className={styles.linkCard}>
                    <span className={styles.linkTitle}>Smart Attendance portal</span>
                    <span className={styles.linkText}>{msg.link}</span>
                    <a 
                      href={msg.link} 
                      target="_blank" 
                      rel="noreferrer" 
                      className={styles.linkBtn}
                    >
                      Open Check-In Portal <ExternalLink size={12} />
                    </a>
                  </div>
                )}

                <span className={styles.messageTime}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            <div ref={messageEndRef} />
          </div>

          {/* Send Input Panel */}
          <form onSubmit={handleSendMessage} className={styles.inputPane}>
            <input 
              type="text" 
              placeholder="Type HI or ATTENDANCE..." 
              className={styles.chatInput}
              disabled={sending}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button type="submit" className={styles.sendBtn} disabled={sending || !inputText.trim()}>
              <Send size={20} />
            </button>
          </form>
        </div>
      </main>
      </div>
    </AuthGate>
  );
}
