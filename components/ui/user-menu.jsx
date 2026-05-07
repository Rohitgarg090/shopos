"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  User,
  Settings,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronDown,
  QrCode,
} from "lucide-react";

export default function UserMenu({
  email,
  onLogout,
  theme = "minimal",
  onNavigate,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isModern = theme === "modern";

  const menuItems = [
    { icon: QrCode, label: "QR Labels", action: () => onNavigate("labels") },
    { icon: Settings, label: "Settings", action: () => onNavigate("settings") },
    { icon: CreditCard, label: "Billing", action: () => onNavigate("billing") },
    {
      icon: HelpCircle,
      label: "Help & Support",
      action: () => onNavigate("help"),
    },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={
          isModern
            ? {
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                borderRadius: 10,
                background: "rgba(255, 255, 255, 0.15)",
                color: "rgba(255, 255, 255, 0.9)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                transition: "all 0.2s ease",
                backdropFilter: "blur(8px)",
              }
            : {
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                border: "0.5px solid #E3E1D9",
                borderRadius: 7,
                background: "#fff",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                color: "#1A1A18",
              }
        }
        onMouseEnter={(e) => {
          if (isModern) {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
          }
        }}
        onMouseLeave={(e) => {
          if (isModern) {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
          }
        }}
      >
        <User size={16} />
        <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis" }}>
          {email?.split("@")[0] || "Account"}
        </span>
        <ChevronDown
          size={14}
          style={{
            transition: "transform 0.2s ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {open && (
        <div
          style={
            isModern
              ? {
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  background: "rgba(15, 23, 42, 0.92)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: 12,
                  boxShadow: "0 24px 48px rgba(0, 0, 0, 0.25)",
                  zIndex: 500,
                  minWidth: 180,
                  overflow: "hidden",
                }
              : {
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 4px)",
                  background: "#fff",
                  border: "0.5px solid #E3E1D9",
                  borderRadius: 10,
                  boxShadow: "0 8px 30px rgba(0,0,0,.12)",
                  zIndex: 500,
                  minWidth: 180,
                  overflow: "hidden",
                }
          }
        >
          {/* Email Header */}
          <div
            style={
              isModern
                ? {
                    padding: "10px 16px",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    background: "rgba(255, 255, 255, 0.05)",
                  }
                : {
                    padding: "8px 12px",
                    borderBottom: "0.5px solid #E3E1D9",
                    background: "#F5F4F0",
                  }
            }
          >
            <div
              style={
                isModern
                  ? {
                      fontSize: 10,
                      fontWeight: 700,
                      color: "rgba(255, 255, 255, 0.6)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: 2,
                    }
                  : {
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#888",
                      textTransform: "uppercase",
                      letterSpacing: ".6px",
                      marginBottom: 2,
                    }
              }
            >
              Account
            </div>
            <div
              style={
                isModern
                  ? {
                      fontWeight: 600,
                      color: "rgba(255, 255, 255, 0.9)",
                      fontSize: 12,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }
                  : {
                      fontWeight: 600,
                      color: "#1B5E8A",
                      fontSize: 12,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }
              }
            >
              {email}
            </div>
          </div>

          {/* Menu Items */}
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                item.action();
                setOpen(false);
              }}
              style={
                isModern
                  ? {
                      width: "100%",
                      padding: "10px 16px",
                      border: "none",
                      background: "transparent",
                      color: "rgba(255, 255, 255, 0.8)",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      transition: "all 0.15s ease",
                      textAlign: "left",
                    }
                  : {
                      width: "100%",
                      padding: "9px 12px",
                      border: "none",
                      background: "transparent",
                      color: "#1A1A18",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      transition: "background 0.15s",
                      textAlign: "left",
                    }
              }
              onMouseEnter={(e) => {
                if (isModern) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.color = "rgba(255, 255, 255, 1)";
                } else {
                  e.currentTarget.style.background = "#F5F4F0";
                }
              }}
              onMouseLeave={(e) => {
                if (isModern) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
                } else {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <item.icon size={16} style={{ flexShrink: 0 }} />
              {item.label}
            </button>
          ))}

          {/* Divider */}
          <div
            style={
              isModern
                ? {
                    height: "1px",
                    background: "rgba(255, 255, 255, 0.1)",
                    margin: "4px 0",
                  }
                : {
                    height: "0.5px",
                    background: "#E3E1D9",
                    margin: "4px 0",
                  }
            }
          />

          {/* Logout */}
          <button
            onClick={() => {
              onLogout();
              setOpen(false);
            }}
            style={
              isModern
                ? {
                    width: "100%",
                    padding: "10px 16px",
                    border: "none",
                    background: "transparent",
                    color: "rgba(255, 100, 100, 0.9)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "all 0.15s ease",
                    textAlign: "left",
                  }
                : {
                    width: "100%",
                    padding: "9px 12px",
                    border: "none",
                    background: "transparent",
                    color: "#9B2626",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "background 0.15s",
                    textAlign: "left",
                  }
            }
            onMouseEnter={(e) => {
              if (isModern) {
                e.currentTarget.style.background = "rgba(255, 100, 100, 0.15)";
                e.currentTarget.style.color = "rgba(255, 100, 100, 1)";
              } else {
                e.currentTarget.style.background = "#FDF0F0";
              }
            }}
            onMouseLeave={(e) => {
              if (isModern) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "rgba(255, 100, 100, 0.9)";
              } else {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <LogOut size={16} style={{ flexShrink: 0 }} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
