"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Home, Search, Bell, User, Settings, Bookmark, ShoppingCart, FileText } from "lucide-react";

interface NavItem {
  id: number;
  icon: React.ReactNode;
  label: string;
  page: string;
}

interface FloatingNavProps {
  activePage: string;
  onNavigate: (page: string) => void;
  theme?: string;
  show?: boolean;
}

export const FloatingNav: React.FC<FloatingNavProps> = ({ activePage, onNavigate, theme = "minimal", show = false }) => {
  // Only show floating nav when theme is "modern" and show is true
  if (theme !== "modern" || !show) {
    return null;
  }
  const [active, setActive] = useState(0);
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const items: NavItem[] = [
    { id: 0, icon: <Home size={22} />, label: "Dashboard", page: "dash" },
    { id: 1, icon: <ShoppingCart size={22} />, label: "POS", page: "pos" },
    { id: 2, icon: <FileText size={22} />, label: "Bills", page: "bills" },
    { id: 3, icon: <User size={22} />, label: "Customers", page: "cust" },
    { id: 4, icon: <Bookmark size={22} />, label: "Catalog", page: "catalog" },
    { id: 5, icon: <Search size={22} />, label: "Ledger", page: "ledger" },
    { id: 6, icon: <Settings size={22} />, label: "Settings", page: "settings" },
  ];

  // Update indicator position when active changes or resize
  useEffect(() => {
    const updateIndicator = () => {
      if (btnRefs.current[active] && containerRef.current) {
        const btn = btnRefs.current[active];
        const container = containerRef.current;
        if (!btn) return;
        const btnRect = btn.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        setIndicatorStyle({
          width: btnRect.width,
          left: btnRect.left - containerRect.left,
        });
      }
    };

    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [active]);

  const handleNavClick = (index: number, page: string) => {
    setActive(index);
    onNavigate(page);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 pointer-events-none">
      <div
        ref={containerRef}
        className="relative flex items-center justify-between bg-white/80 dark:bg-neutral-900/80 backdrop-blur-lg shadow-2xl rounded-full px-2 py-3 border border-gray-200/50 dark:border-gray-700/50 pointer-events-auto"
      >
        {items.map((item, index) => (
          <button
            key={item.id}
            ref={(el) => (btnRefs.current[index] = el)}
            onClick={() => handleNavClick(index, item.page)}
            className="relative flex flex-col items-center justify-center flex-1 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors duration-200 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <div className="z-10 transition-transform duration-200 group-hover:scale-110">{item.icon}</div>
            {/* Hide labels on small screens, show on md and up */}
            <span className="text-xs mt-1 hidden md:block whitespace-nowrap">{item.label}</span>
          </button>
        ))}

        {/* Sliding Active Indicator */}
        <motion.div
          animate={indicatorStyle}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="absolute top-2 bottom-2 rounded-full bg-blue-500/15 dark:bg-blue-400/20 border border-blue-500/30 dark:border-blue-400/30"
        />
      </div>
    </div>
  );
};

export default FloatingNav;
