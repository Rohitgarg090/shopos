'use client';
import React, { useState, useEffect, useRef } from 'react';

const monthlyPrices = { basic: 1299, business: 1549, pro: 4999 };
const annualPrices = { basic: 974, business: 1159, pro: 3749 };

export default function ShoposLanding() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [activeSendChannel, setActiveSendChannel] = useState(0);
  const containerRef = useRef(null);

  const prices = { monthly: monthlyPrices, annual: annualPrices };

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    const fadeEls = root.querySelectorAll('.fade-in');
    fadeEls.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="shopos-landing">
      <style>{`
.shopos-landing {
  --ink: #0a0a0f;
  --ink-2: #1c1c28;
  --ink-3: #2e2e3a;
  --muted: #6b6b80;
  --muted-2: #9898a8;
  --surface: #f5f4f1;
  --surface-2: #eeecea;
  --white: #ffffff;
  --accent: #2563eb;
  --accent-2: #1d4ed8;
  --accent-glow: rgba(37,99,235,0.15);
  --teal: #0d9488;
  --teal-light: #ccfbf1;
  --amber: #d97706;
  --amber-light: #fef3c7;
  --emerald: #059669;
  --emerald-light: #d1fae5;
  --violet: #7c3aed;
  --violet-light: #ede9fe;
  --coral: #e11d48;
  --coral-light: #ffe4e6;
  --border: rgba(10,10,15,0.08);
  --border-strong: rgba(10,10,15,0.16);
  --radius: 12px;
  --radius-lg: 20px;
  --radius-xl: 32px;
}
.shopos-landing *, .shopos-landing *::before, .shopos-landing *::after { box-sizing: border-box; margin: 0; padding: 0; }
.shopos-landing { scroll-behavior: smooth; }
.shopos-landing {
  font-family: 'DM Sans', sans-serif;
  background: var(--white);
  color: var(--ink);
  font-size: 16px;
  line-height: 1.6;
  overflow-x: hidden;
}
/* NAV */
.shopos-landing nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  padding: 0 5%;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
}
.shopos-landing .logo {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 22px;
  color: var(--ink);
  text-decoration: none;
  letter-spacing: -0.5px;
}
.shopos-landing .logo span { color: var(--accent); }
.shopos-landing .nav-links {
  display: flex;
  align-items: center;
  gap: 32px;
  list-style: none;
}
.shopos-landing .nav-links a {
  font-size: 14px;
  color: var(--muted);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}
.shopos-landing .nav-links a:hover { color: var(--ink); }
.shopos-landing .nav-cta {
  display: flex;
  align-items: center;
  gap: 12px;
}
.shopos-landing .btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
  font-family: 'DM Sans', sans-serif;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
  border: 1.5px solid transparent;
}
.shopos-landing .btn-ghost {
  color: var(--ink);
  border-color: var(--border-strong);
  background: transparent;
}
.shopos-landing .btn-ghost:hover { background: var(--surface); }
.shopos-landing .btn-primary {
  background: var(--ink);
  color: var(--white);
  border-color: var(--ink);
}
.shopos-landing .btn-primary:hover { background: var(--ink-3); transform: translateY(-1px); }
.shopos-landing .btn-accent {
  background: var(--accent);
  color: var(--white);
  border-color: var(--accent);
}
.shopos-landing .btn-accent:hover { background: var(--accent-2); transform: translateY(-1px); }
.shopos-landing .btn-lg {
  padding: 14px 28px;
  font-size: 15px;
  border-radius: var(--radius);
}
/* HERO */
.shopos-landing .hero {
  min-height: 100vh;
  padding: 120px 5% 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: relative;
  background: var(--white);
  overflow: hidden;
}
.shopos-landing .hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.shopos-landing .hero-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
}
.shopos-landing .hero-orb-1 {
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%);
  top: -100px; left: 50%;
  transform: translateX(-50%);
}
.shopos-landing .hero-orb-2 {
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(13,148,136,0.06) 0%, transparent 70%);
  bottom: 0; right: -100px;
}
.shopos-landing .hero-orb-3 {
  width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%);
  bottom: 100px; left: -50px;
}
/* Grid background lines */
.shopos-landing .hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(10,10,15,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(10,10,15,0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  z-index: 0;
}
.shopos-landing .hero-content { position: relative; z-index: 1; max-width: 860px; }
.shopos-landing .hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 100px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
  margin-bottom: 32px;
  animation: fadeSlideUp 0.6s ease both;
}
.shopos-landing .hero-badge .dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--emerald);
}
.shopos-landing .hero h1 {
  font-family: 'Syne', sans-serif;
  font-size: clamp(42px, 7vw, 82px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -2.5px;
  color: var(--ink);
  margin-bottom: 24px;
  animation: fadeSlideUp 0.6s 0.1s ease both;
}
.shopos-landing .hero h1 .accent-word {
  color: var(--accent);
  position: relative;
  display: inline-block;
}
.shopos-landing .hero h1 .accent-word::after {
  content: '';
  position: absolute;
  bottom: 4px; left: 0; right: 0;
  height: 3px;
  background: var(--accent);
  border-radius: 2px;
  opacity: 0.3;
}
.shopos-landing .hero-sub {
  font-size: 18px;
  line-height: 1.7;
  color: var(--muted);
  max-width: 580px;
  margin: 0 auto 40px;
  animation: fadeSlideUp 0.6s 0.2s ease both;
  font-weight: 300;
}
.shopos-landing .hero-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 64px;
  animation: fadeSlideUp 0.6s 0.3s ease both;
}
.shopos-landing .hero-stats {
  display: flex;
  align-items: center;
  gap: 40px;
  justify-content: center;
  flex-wrap: wrap;
  animation: fadeSlideUp 0.6s 0.4s ease both;
}
.shopos-landing .hero-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.shopos-landing .hero-stat-num {
  font-family: 'Syne', sans-serif;
  font-size: 28px;
  font-weight: 800;
  color: var(--ink);
  line-height: 1;
}
.shopos-landing .hero-stat-label {
  font-size: 13px;
  color: var(--muted);
  margin-top: 2px;
}
.shopos-landing .hero-stat-divider {
  width: 1px;
  height: 32px;
  background: var(--border-strong);
}
/* DASHBOARD PREVIEW */
.shopos-landing .dashboard-preview {
  width: 100%;
  max-width: 960px;
  margin: 80px auto 0;
  position: relative;
  animation: fadeSlideUp 0.7s 0.5s ease both;
}
.shopos-landing .dashboard-frame {
  background: var(--ink-2);
  border-radius: var(--radius-xl);
  padding: 16px;
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.05),
    0 40px 100px rgba(10,10,15,0.25),
    0 20px 40px rgba(10,10,15,0.15);
}
.shopos-landing .dashboard-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 0 4px;
}
.shopos-landing .db-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
}
.shopos-landing .db-dot-r { background: #ff5f57; }
.shopos-landing .db-dot-y { background: #ffbd2e; }
.shopos-landing .db-dot-g { background: #28c941; }
.shopos-landing .dashboard-inner {
  background: #12121c;
  border-radius: 14px;
  overflow: hidden;
  display: grid;
  grid-template-columns: 200px 1fr;
  height: 420px;
}
.shopos-landing .dash-sidebar {
  background: #0e0e18;
  padding: 20px 0;
  border-right: 1px solid rgba(255,255,255,0.05);
}
.shopos-landing .dash-logo {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 16px;
  color: #fff;
  padding: 0 20px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  margin-bottom: 12px;
  letter-spacing: -0.5px;
}
.shopos-landing .dash-logo span { color: #60a5fa; }
.shopos-landing .dash-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 20px;
  font-size: 12px;
  color: rgba(255,255,255,0.45);
  cursor: pointer;
  transition: all 0.2s;
}
.shopos-landing .dash-nav-item.active {
  color: #fff;
  background: rgba(255,255,255,0.06);
  border-right: 2px solid #60a5fa;
}
.shopos-landing .dash-nav-icon {
  width: 14px; height: 14px;
  border-radius: 3px;
  background: currentColor;
  opacity: 0.7;
  flex-shrink: 0;
}
.shopos-landing .dash-main {
  padding: 20px;
  overflow: hidden;
}
.shopos-landing .dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.shopos-landing .dash-title {
  font-family: 'Syne', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
}
.shopos-landing .dash-period {
  font-size: 11px;
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5);
  padding: 4px 10px;
  border-radius: 6px;
}
.shopos-landing .dash-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}
.shopos-landing .dash-metric {
  background: rgba(255,255,255,0.05);
  border-radius: 10px;
  padding: 12px;
}
.shopos-landing .dm-label { font-size: 10px; color: rgba(255,255,255,0.4); margin-bottom: 4px; }
.shopos-landing .dm-value { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; color: #fff; line-height: 1; }
.shopos-landing .dm-change { font-size: 10px; margin-top: 3px; }
.shopos-landing .dm-up { color: #34d399; }
.shopos-landing .dm-down { color: #f87171; }
.shopos-landing .dash-chart-area {
  background: rgba(255,255,255,0.03);
  border-radius: 10px;
  padding: 14px;
  height: 120px;
  position: relative;
  overflow: hidden;
}
.shopos-landing .chart-label { font-size: 10px; color: rgba(255,255,255,0.35); margin-bottom: 8px; }
.shopos-landing .chart-bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 80px;
}
.shopos-landing .chart-bar-item {
  flex: 1;
  border-radius: 3px 3px 0 0;
  min-width: 8px;
  transition: opacity 0.2s;
}
.shopos-landing .dash-recent {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.shopos-landing .dash-invoice-row {
  background: rgba(255,255,255,0.04);
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.shopos-landing .dir-num { font-size: 10px; color: rgba(255,255,255,0.4); }
.shopos-landing .dir-name { font-size: 11px; color: rgba(255,255,255,0.8); font-weight: 500; }
.shopos-landing .dir-amt { font-size: 11px; color: #34d399; font-family: 'Syne', sans-serif; font-weight: 600; }
.shopos-landing .status-pill {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 4px;
}
.shopos-landing .sp-paid { background: rgba(52,211,153,0.15); color: #34d399; }
.shopos-landing .sp-pend { background: rgba(251,191,36,0.15); color: #fbbf24; }
/* SECTION BASE */
.shopos-landing section {
  padding: 100px 5%;
}
.shopos-landing .section-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 16px;
}
.shopos-landing .section-label::before {
  content: '';
  width: 20px; height: 1.5px;
  background: var(--accent);
  border-radius: 2px;
}
.shopos-landing h2.section-title {
  font-family: 'Syne', sans-serif;
  font-size: clamp(30px, 4vw, 48px);
  font-weight: 800;
  letter-spacing: -1.5px;
  line-height: 1.1;
  color: var(--ink);
  margin-bottom: 16px;
}
.shopos-landing .section-sub {
  font-size: 17px;
  color: var(--muted);
  max-width: 560px;
  line-height: 1.7;
  font-weight: 300;
}
.shopos-landing .text-center { text-align: center; }
.shopos-landing .mx-auto { margin-left: auto; margin-right: auto; }
/* FEATURES GRID */
.shopos-landing .features-section {
  background: var(--surface);
}
.shopos-landing .features-intro {
  text-align: center;
  margin-bottom: 64px;
}
.shopos-landing .features-intro .section-sub { margin: 0 auto; }
.shopos-landing .features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  background: var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.shopos-landing .feature-card {
  background: var(--white);
  padding: 40px 36px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
  cursor: default;
}
.shopos-landing .feature-card:hover {
  z-index: 2;
  transform: scale(1.02);
  box-shadow: 0 20px 60px rgba(10,10,15,0.15);
}
.shopos-landing .feature-card.featured {
  background: var(--ink);
  color: var(--white);
}
.shopos-landing .feature-icon {
  width: 48px; height: 48px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  font-size: 22px;
}
.shopos-landing .fi-blue { background: rgba(37,99,235,0.1); }
.shopos-landing .fi-teal { background: rgba(13,148,136,0.1); }
.shopos-landing .fi-violet { background: rgba(124,58,237,0.1); }
.shopos-landing .fi-amber { background: rgba(217,119,6,0.1); }
.shopos-landing .fi-emerald { background: rgba(5,150,105,0.1); }
.shopos-landing .fi-coral { background: rgba(225,29,72,0.1); }
.shopos-landing .feature-card.featured .feature-icon {
  background: rgba(255,255,255,0.12);
}
.shopos-landing .feature-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 4px;
  margin-bottom: 12px;
  background: rgba(37,99,235,0.1);
  color: var(--accent);
}
.shopos-landing .feature-card.featured .feature-tag {
  background: rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.8);
}
.shopos-landing .feature-title {
  font-family: 'Syne', sans-serif;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin-bottom: 10px;
  color: var(--ink);
}
.shopos-landing .feature-card.featured .feature-title { color: var(--white); }
.shopos-landing .feature-desc {
  font-size: 14px;
  color: var(--muted);
  line-height: 1.65;
}
.shopos-landing .feature-card.featured .feature-desc { color: rgba(255,255,255,0.6); }
.shopos-landing .feature-pill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 20px;
}
.shopos-landing .feature-pill {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 100px;
  background: var(--surface);
  color: var(--muted);
  border: 1px solid var(--border);
  font-weight: 500;
}
.shopos-landing .feature-card.featured .feature-pill {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7);
  border-color: rgba(255,255,255,0.1);
}
/* AI HIGHLIGHT */
.shopos-landing .ai-section {
  background: var(--white);
  overflow: hidden;
}
.shopos-landing .ai-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}
.shopos-landing .ai-visual {
  position: relative;
}
.shopos-landing .ai-card {
  background: var(--ink-2);
  border-radius: var(--radius-xl);
  padding: 28px;
  box-shadow: 0 30px 80px rgba(10,10,15,0.2);
  position: relative;
  overflow: hidden;
}
.shopos-landing .ai-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(37,99,235,0.5), transparent);
}
.shopos-landing .ai-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.shopos-landing .ai-avatar {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}
.shopos-landing .ai-card-title {
  font-size: 13px;
  color: rgba(255,255,255,0.8);
  font-weight: 500;
}
.shopos-landing .ai-card-sub {
  font-size: 11px;
  color: rgba(255,255,255,0.35);
}
.shopos-landing .ai-scanning {
  background: rgba(255,255,255,0.04);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  position: relative;
  overflow: hidden;
}
.shopos-landing .scan-line {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #2563eb, transparent);
  animation: scanMove 2s ease-in-out infinite;
}
@keyframes scanMove{0%{ top: 0; opacity: 1; }
100%{ top: 100%; opacity: 0; }

}
.shopos-landing .scan-doc {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.shopos-landing .scan-field {
  background: rgba(255,255,255,0.06);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 10px;
  color: rgba(255,255,255,0.4);
}
.shopos-landing .scan-field-value {
  font-size: 12px;
  color: rgba(255,255,255,0.85);
  font-weight: 500;
  margin-top: 2px;
}
.shopos-landing .ai-output {
  background: rgba(37,99,235,0.08);
  border: 1px solid rgba(37,99,235,0.2);
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 12px;
}
.shopos-landing .ai-output-label {
  font-size: 10px;
  color: rgba(37,99,235,0.7);
  letter-spacing: 1px;
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 6px;
}
.shopos-landing .ai-json {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: #93c5fd;
  line-height: 1.6;
}
.shopos-landing .ai-json .key { color: #a5b4fc; }
.shopos-landing .ai-json .str { color: #6ee7b7; }
.shopos-landing .ai-json .num { color: #fcd34d; }
.shopos-landing .ai-actions-row {
  display: flex;
  gap: 8px;
}
.shopos-landing .ai-action-btn {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  cursor: pointer;
}
.shopos-landing .aa-primary { background: #2563eb; color: #fff; }
.shopos-landing .aa-ghost { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6); }
.shopos-landing .floating-badge {
  position: absolute;
  background: var(--white);
  border-radius: var(--radius);
  padding: 12px 16px;
  box-shadow: 0 10px 30px rgba(10,10,15,0.15);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--ink);
  white-space: nowrap;
}
.shopos-landing .fb-1 { bottom: -20px; right: -30px; }
.shopos-landing .fb-2 { top: 20px; right: -40px; }
.shopos-landing .fb-icon {
  width: 32px; height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}
.shopos-landing .ai-content {}
.shopos-landing .feature-list {
  list-style: none;
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.shopos-landing .feature-list-item {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.shopos-landing .fli-icon {
  width: 40px; height: 40px;
  border-radius: 10px;
  background: rgba(37,99,235,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 2px;
}
.shopos-landing .fli-title {
  font-family: 'Syne', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 4px;
}
.shopos-landing .fli-desc {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
}
/* WORKFLOW */
.shopos-landing .workflow-section {
  background: var(--surface);
}
.shopos-landing .workflow-steps {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0;
  position: relative;
  margin-top: 64px;
}
.shopos-landing .workflow-steps::before {
  content: '';
  position: absolute;
  top: 32px;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(90deg, var(--border), var(--accent), var(--teal), var(--border));
  z-index: 0;
}
.shopos-landing .workflow-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  z-index: 1;
  padding: 0 16px;
}
.shopos-landing .ws-number {
  width: 64px; height: 64px;
  border-radius: 50%;
  background: var(--white);
  border: 2px solid var(--border-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 18px;
  color: var(--accent);
  margin-bottom: 20px;
  position: relative;
  transition: all 0.3s;
}
.shopos-landing .workflow-step:hover .ws-number {
  background: var(--accent);
  color: var(--white);
  border-color: var(--accent);
  transform: scale(1.1);
}
.shopos-landing .ws-icon { font-size: 22px; }
.shopos-landing .ws-title {
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 8px;
  letter-spacing: -0.3px;
}
.shopos-landing .ws-desc {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
}
/* SEND INVOICE */
.shopos-landing .send-section {
  background: var(--white);
}
.shopos-landing .send-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}
.shopos-landing .send-channels {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 40px;
}
.shopos-landing .send-channel {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: var(--surface);
  border-radius: var(--radius);
  border: 1.5px solid transparent;
  transition: all 0.25s;
  cursor: pointer;
}
.shopos-landing .send-channel:hover, .shopos-landing .send-channel.active {
  background: var(--white);
  border-color: var(--border-strong);
  box-shadow: 0 4px 20px rgba(10,10,15,0.08);
}
.shopos-landing .sc-icon {
  width: 48px; height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
.shopos-landing .sc-green { background: rgba(37,211,102,0.12); }
.shopos-landing .sc-blue { background: rgba(37,99,235,0.1); }
.shopos-landing .sc-gray { background: rgba(107,107,128,0.1); }
.shopos-landing .sc-name {
  font-family: 'Syne', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
}
.shopos-landing .sc-desc { font-size: 12px; color: var(--muted); }
.shopos-landing .sc-status {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 100px;
  background: rgba(5,150,105,0.1);
  color: var(--emerald);
}
.shopos-landing .send-visual {
  position: relative;
}
.shopos-landing .phone-mockup {
  width: 260px;
  margin: 0 auto;
  background: var(--ink);
  border-radius: 36px;
  padding: 12px;
  box-shadow: 0 40px 80px rgba(10,10,15,0.3);
  position: relative;
}
.shopos-landing .phone-screen {
  background: #128C7E;
  border-radius: 26px;
  overflow: hidden;
  height: 480px;
}
.shopos-landing .wa-header {
  background: #075E54;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.shopos-landing .wa-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}
.shopos-landing .wa-name { font-size: 13px; font-weight: 600; color: #fff; }
.shopos-landing .wa-status { font-size: 10px; color: rgba(255,255,255,0.6); }
.shopos-landing .wa-messages {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #ece5dd url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E");
  min-height: 300px;
}
.shopos-landing .wa-msg {
  max-width: 80%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.5;
  position: relative;
}
.shopos-landing .wa-msg-out {
  background: #dcf8c6;
  margin-left: auto;
  border-radius: 12px 12px 2px 12px;
  color: #1a1a1a;
}
.shopos-landing .wa-msg-in {
  background: #fff;
  margin-right: auto;
  border-radius: 12px 12px 12px 2px;
  color: #1a1a1a;
}
.shopos-landing .wa-time { font-size: 9px; color: rgba(0,0,0,0.4); margin-top: 2px; text-align: right; }
.shopos-landing .wa-invoice-card {
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  max-width: 200px;
}
.shopos-landing .wa-inv-header {
  background: #075E54;
  padding: 10px 12px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}
.shopos-landing .wa-inv-body {
  padding: 10px 12px;
}
.shopos-landing .wa-inv-row {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #666;
  margin-bottom: 3px;
}
.shopos-landing .wa-inv-total {
  font-size: 13px;
  font-weight: 700;
  color: #075E54;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid #eee;
}
.shopos-landing .wa-input {
  background: #fff;
  margin: 0 12px 12px;
  border-radius: 24px;
  padding: 8px 14px;
  font-size: 11px;
  color: #aaa;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
/* INVENTORY */
.shopos-landing .inventory-section {
  background: var(--surface);
}
.shopos-landing .inventory-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}
.shopos-landing .inv-dashboard {
  background: var(--white);
  border-radius: var(--radius-xl);
  padding: 28px;
  border: 1px solid var(--border);
  box-shadow: 0 20px 60px rgba(10,10,15,0.08);
}
.shopos-landing .inv-dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.shopos-landing .inv-dash-title {
  font-family: 'Syne', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
}
.shopos-landing .inv-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--muted);
  width: 140px;
}
.shopos-landing .inv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.shopos-landing .inv-table th {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted-2);
  text-align: left;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.shopos-landing .inv-table td {
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  color: var(--ink);
  vertical-align: middle;
}
.shopos-landing .inv-table tr:last-child td { border-bottom: none; }
.shopos-landing .inv-item-name { font-weight: 500; }
.shopos-landing .inv-item-sku { font-size: 11px; color: var(--muted-2); }
.shopos-landing .stock-bar-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.shopos-landing .stock-bar {
  flex: 1;
  height: 5px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}
.shopos-landing .stock-fill {
  height: 100%;
  border-radius: 3px;
}
.shopos-landing .sf-high { background: var(--emerald); }
.shopos-landing .sf-mid { background: var(--amber); }
.shopos-landing .sf-low { background: var(--coral); }
.shopos-landing .stock-count { font-size: 12px; font-weight: 500; }
.shopos-landing .inv-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
}
.shopos-landing .is-ok { background: rgba(5,150,105,0.1); color: var(--emerald); }
.shopos-landing .is-low { background: rgba(217,119,6,0.1); color: var(--amber); }
.shopos-landing .is-out { background: rgba(225,29,72,0.1); color: var(--coral); }
.shopos-landing .inv-alert {
  margin-top: 16px;
  background: rgba(217,119,6,0.08);
  border: 1px solid rgba(217,119,6,0.2);
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--amber);
}
/* PRICING */
.shopos-landing .pricing-section {
  background: var(--white);
}
.shopos-landing .pricing-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
  margin: 32px 0 56px;
}
.shopos-landing .toggle-label {
  font-size: 14px;
  color: var(--muted);
  font-weight: 500;
}
.shopos-landing .toggle-switch {
  position: relative;
  width: 48px;
  height: 26px;
}
.shopos-landing .toggle-switch input { opacity: 0; width: 0; height: 0; }
.shopos-landing .toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--border-strong);
  border-radius: 100px;
  transition: 0.3s;
}
.shopos-landing .toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px; height: 18px;
  left: 4px; top: 4px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
}
.shopos-landing input:checked + .toggle-slider { background: var(--accent); }
.shopos-landing input:checked + .toggle-slider::before { transform: translateX(22px); }
.shopos-landing .save-badge {
  background: rgba(5,150,105,0.1);
  color: var(--emerald);
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 100px;
}
.shopos-landing .pricing-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  max-width: 1100px;
  margin: 0 auto;
}
.shopos-landing .pricing-card {
  background: var(--white);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 36px 32px;
  position: relative;
  transition: all 0.3s;
}
.shopos-landing .pricing-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 60px rgba(10,10,15,0.12);
}
.shopos-landing .pricing-card.featured {
  background: var(--ink);
  border-color: var(--ink);
  transform: scale(1.03);
}
.shopos-landing .pricing-card.featured:hover {
  transform: scale(1.03) translateY(-4px);
}
.shopos-landing .popular-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--accent);
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 14px;
  border-radius: 100px;
  white-space: nowrap;
  letter-spacing: 0.5px;
}
.shopos-landing .plan-name {
  font-family: 'Syne', sans-serif;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--muted);
  margin-bottom: 8px;
}
.shopos-landing .pricing-card.featured .plan-name { color: rgba(255,255,255,0.5); }
.shopos-landing .plan-firms {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  background: rgba(37,99,235,0.1);
  padding: 4px 10px;
  border-radius: 100px;
  margin-bottom: 20px;
}
.shopos-landing .pricing-card.featured .plan-firms {
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.8);
}
.shopos-landing .plan-price {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 4px;
}
.shopos-landing .price-currency {
  font-size: 18px;
  font-weight: 600;
  color: var(--muted);
}
.shopos-landing .pricing-card.featured .price-currency { color: rgba(255,255,255,0.5); }
.shopos-landing .price-amount {
  font-family: 'Syne', sans-serif;
  font-size: 52px;
  font-weight: 800;
  letter-spacing: -2px;
  color: var(--ink);
  line-height: 1;
}
.shopos-landing .pricing-card.featured .price-amount { color: var(--white); }
.shopos-landing .price-period {
  font-size: 14px;
  color: var(--muted);
}
.shopos-landing .pricing-card.featured .price-period { color: rgba(255,255,255,0.4); }
.shopos-landing .plan-desc {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 28px;
  line-height: 1.6;
}
.shopos-landing .pricing-card.featured .plan-desc { color: rgba(255,255,255,0.5); }
.shopos-landing .plan-divider {
  height: 1px;
  background: var(--border);
  margin-bottom: 24px;
}
.shopos-landing .pricing-card.featured .plan-divider { background: rgba(255,255,255,0.1); }
.shopos-landing .plan-features {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
}
.shopos-landing .plan-feature {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  color: var(--ink);
}
.shopos-landing .pricing-card.featured .plan-feature { color: rgba(255,255,255,0.8); }
.shopos-landing .plan-feature-check {
  width: 18px; height: 18px;
  border-radius: 50%;
  background: rgba(5,150,105,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--emerald);
  flex-shrink: 0;
}
.shopos-landing .pricing-card.featured .plan-feature-check {
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7);
}
/* ERP Features strip */
.shopos-landing .erp-section {
  background: var(--ink);
  padding: 80px 5%;
  overflow: hidden;
}
.shopos-landing .erp-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 2px;
  margin-top: 56px;
}
.shopos-landing .erp-item {
  background: rgba(255,255,255,0.04);
  padding: 28px 20px;
  text-align: center;
  border-radius: 4px;
  transition: all 0.25s;
  cursor: default;
}
.shopos-landing .erp-item:hover {
  background: rgba(255,255,255,0.08);
}
.shopos-landing .erp-icon {
  font-size: 28px;
  margin-bottom: 12px;
}
.shopos-landing .erp-name {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.7);
  line-height: 1.4;
}
/* SOCIAL PROOF */
.shopos-landing .testimonials-section {
  background: var(--surface);
  padding: 100px 5%;
}
.shopos-landing .testimonials-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 56px;
}
.shopos-landing .testimonial-card {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 28px 24px;
  transition: all 0.25s;
}
.shopos-landing .testimonial-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(10,10,15,0.08);
}
.shopos-landing .tc-stars {
  display: flex;
  gap: 2px;
  margin-bottom: 16px;
  font-size: 14px;
}
.shopos-landing .tc-quote {
  font-size: 14px;
  color: var(--ink);
  line-height: 1.7;
  margin-bottom: 20px;
  font-style: italic;
}
.shopos-landing .tc-author {
  display: flex;
  align-items: center;
  gap: 12px;
}
.shopos-landing .tc-avatar {
  width: 40px; height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 14px;
  color: white;
}
.shopos-landing .tc-name { font-size: 14px; font-weight: 600; color: var(--ink); }
.shopos-landing .tc-role { font-size: 12px; color: var(--muted); }
/* COMPARE */
.shopos-landing .compare-section {
  padding: 100px 5%;
  background: var(--white);
}
.shopos-landing .compare-table-wrap {
  max-width: 900px;
  margin: 56px auto 0;
  overflow-x: auto;
}
.shopos-landing .compare-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 14px;
}
.shopos-landing .compare-table th {
  padding: 16px 20px;
  text-align: center;
  font-family: 'Syne', sans-serif;
  font-weight: 700;
  font-size: 14px;
  color: var(--ink);
  background: var(--surface);
  border-bottom: 2px solid var(--border);
}
.shopos-landing .compare-table th:first-child {
  text-align: left;
  border-radius: var(--radius) 0 0 0;
}
.shopos-landing .compare-table th:last-child { border-radius: 0 var(--radius) 0 0; }
.shopos-landing .compare-table th.highlight {
  background: var(--ink);
  color: var(--white);
}
.shopos-landing .compare-table td {
  padding: 12px 20px;
  text-align: center;
  border-bottom: 1px solid var(--border);
  color: var(--muted);
}
.shopos-landing .compare-table td:first-child {
  text-align: left;
  color: var(--ink);
  font-weight: 500;
}
.shopos-landing .compare-table td.highlight {
  background: rgba(10,10,15,0.02);
  color: var(--ink);
  font-weight: 600;
}
.shopos-landing .check-y { color: var(--emerald); font-size: 16px; }
.shopos-landing .check-n { color: var(--border-strong); font-size: 16px; }
.shopos-landing .check-p { color: var(--accent); font-size: 16px; }
/* CTA */
.shopos-landing .cta-section {
  padding: 120px 5%;
  background: var(--ink);
  position: relative;
  overflow: hidden;
  text-align: center;
}
.shopos-landing .cta-section::before {
  content: '';
  position: absolute;
  top: -200px; left: 50%;
  transform: translateX(-50%);
  width: 800px; height: 800px;
  background: radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 60%);
  pointer-events: none;
}
.shopos-landing .cta-section::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
}
.shopos-landing .cta-content {
  position: relative;
  z-index: 1;
  max-width: 700px;
  margin: 0 auto;
}
.shopos-landing .cta-section h2.section-title { color: var(--white); }
.shopos-landing .cta-sub { color: rgba(255,255,255,0.5); font-size: 17px; margin-bottom: 40px; font-weight: 300; }
.shopos-landing .cta-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.shopos-landing .btn-white {
  background: var(--white);
  color: var(--ink);
  border-color: var(--white);
}
.shopos-landing .btn-white:hover { background: var(--surface); transform: translateY(-1px); }
.shopos-landing .btn-outline-white {
  background: transparent;
  color: rgba(255,255,255,0.8);
  border-color: rgba(255,255,255,0.25);
}
.shopos-landing .btn-outline-white:hover { background: rgba(255,255,255,0.08); }
.shopos-landing .cta-trust {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-top: 40px;
  flex-wrap: wrap;
}
.shopos-landing .ct-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(255,255,255,0.45);
}
/* FOOTER */
.shopos-landing footer {
  background: var(--ink-2);
  padding: 60px 5% 32px;
}
.shopos-landing .footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 60px;
  margin-bottom: 48px;
}
.shopos-landing .footer-brand .logo {
  display: block;
  margin-bottom: 16px;
}
.shopos-landing .footer-desc {
  font-size: 13px;
  color: rgba(255,255,255,0.4);
  line-height: 1.7;
  max-width: 280px;
}
.shopos-landing .footer-col-title {
  font-family: 'Syne', sans-serif;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255,255,255,0.4);
  margin-bottom: 16px;
}
.shopos-landing .footer-links {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.shopos-landing .footer-links a {
  font-size: 13px;
  color: rgba(255,255,255,0.6);
  text-decoration: none;
  transition: color 0.2s;
}
.shopos-landing .footer-links a:hover { color: var(--white); }
.shopos-landing .footer-bottom {
  border-top: 1px solid rgba(255,255,255,0.08);
  padding-top: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.shopos-landing .footer-copy {
  font-size: 13px;
  color: rgba(255,255,255,0.3);
}
.shopos-landing .footer-socials {
  display: flex;
  gap: 12px;
}
.shopos-landing .footer-social {
  width: 36px; height: 36px;
  border-radius: 8px;
  background: rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  text-decoration: none;
  color: rgba(255,255,255,0.4);
  transition: all 0.2s;
}
.shopos-landing .footer-social:hover {
  background: rgba(255,255,255,0.12);
  color: var(--white);
}
/* ANIMATIONS */
@keyframes fadeSlideUp{from{ opacity: 0; transform: translateY(24px); }
to{ opacity: 1; transform: translateY(0); }

}
.shopos-landing .fade-in {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.shopos-landing .fade-in.visible {
  opacity: 1;
  transform: translateY(0);
}
/* MOBILE */
@media (max-width: 768px) {
 .shopos-landing nav { padding: 0 20px; }
.shopos-landing .nav-links { display: none; }
.shopos-landing .hero { padding: 100px 20px 60px; }
.shopos-landing .features-grid { grid-template-columns: 1fr; }
.shopos-landing .ai-layout, .shopos-landing .send-layout, .shopos-landing .inventory-grid { grid-template-columns: 1fr; gap: 40px; }
.shopos-landing .workflow-steps { grid-template-columns: 1fr 1fr; }
.shopos-landing .workflow-steps::before { display: none; }
.shopos-landing .pricing-cards { grid-template-columns: 1fr; }
.shopos-landing .pricing-card.featured { transform: none; }
.shopos-landing .erp-grid { grid-template-columns: repeat(3, 1fr); }
.shopos-landing .testimonials-grid { grid-template-columns: 1fr; }
.shopos-landing .footer-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
.shopos-landing section { padding: 60px 20px; }
.shopos-landing .fb-1, .shopos-landing .fb-2 { display: none; }

}


      `}</style>



      {/* NAV */}
      <nav>
        <a href="#" className="logo">shop<span>os</span></a>
        <ul className="nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#ai">AI Engine</a></li>
          <li><a href="#workflow">How it Works</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#compare">Compare</a></li>
        </ul>
        <div className="nav-cta">
          <a href="/auth?mode=login" className="btn btn-ghost">Login</a>
          <a href="/request-demo" className="btn btn-ghost">📅 Demo</a>
          <a href="/auth?mode=signup" className="btn btn-primary">Start Free Trial</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1"></div>
          <div className="hero-orb hero-orb-2"></div>
          <div className="hero-orb hero-orb-3"></div>
        </div>
        <div className="hero-content">
          <div className="hero-badge">
            <span className="dot"></span>
            AI-Powered Wholesale ERP — Now Live
          </div>
          <h1>The <span className="accent-word">Smarter</span> Way to<br />Run Your Wholesale<br />Business</h1>
          <p className="hero-sub">Generate invoices, manage inventory, scan supplier documents with AI, reconcile bank statements — all in one platform built for Indian wholesale traders.</p>
          <div className="hero-actions">
            <a href="/auth?mode=signup" className="btn btn-primary btn-lg">
              Start 14-Day Free Trial →
            </a>
            <a href="/request-demo" className="btn btn-ghost btn-lg">
              📅 Request Demo
            </a>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-num">10x</span>
              <span className="hero-stat-label">Faster invoicing</span>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-stat">
              <span className="hero-stat-num">98%</span>
              <span className="hero-stat-label">AI accuracy rate</span>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-stat">
              <span className="hero-stat-num">3 min</span>
              <span className="hero-stat-label">Setup time</span>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-stat">
              <span className="hero-stat-num">GST</span>
              <span className="hero-stat-label">Ready & compliant</span>
            </div>
          </div>
        </div>

        {/* Dashboard preview */}
        <div className="dashboard-preview">
          <div className="dashboard-frame">
            <div className="dashboard-bar">
              <div className="db-dot db-dot-r"></div>
              <div className="db-dot db-dot-y"></div>
              <div className="db-dot db-dot-g"></div>
            </div>
            <div className="dashboard-inner">
              {/* Sidebar */}
              <div className="dash-sidebar">
                <div className="dash-logo">shop<span>os</span></div>
                <div className="dash-nav-item active">
                  <div className="dash-nav-icon" style={{background: '#60a5fa'}}></div> Dashboard
                </div>
                <div className="dash-nav-item">
                  <div className="dash-nav-icon"></div> Invoices
                </div>
                <div className="dash-nav-item">
                  <div className="dash-nav-icon"></div> Inventory
                </div>
                <div className="dash-nav-item">
                  <div className="dash-nav-icon"></div> Parties
                </div>
                <div className="dash-nav-item">
                  <div className="dash-nav-icon"></div> Bank Recon
                </div>
                <div className="dash-nav-item">
                  <div className="dash-nav-icon"></div> GST Reports
                </div>
                <div className="dash-nav-item">
                  <div className="dash-nav-icon"></div> Purchase
                </div>
                <div className="dash-nav-item">
                  <div className="dash-nav-icon"></div> Settings
                </div>
              </div>
              {/* Main */}
              <div className="dash-main">
                <div className="dash-header">
                  <div className="dash-title">Dashboard — Mehta Wholesalers</div>
                  <div className="dash-period">May 2026</div>
                </div>
                <div className="dash-metrics">
                  <div className="dash-metric">
                    <div className="dm-label">Revenue</div>
                    <div className="dm-value">₹8.4L</div>
                    <div className="dm-change dm-up">↑ 18.2%</div>
                  </div>
                  <div className="dash-metric">
                    <div className="dm-label">Invoices</div>
                    <div className="dm-value">142</div>
                    <div className="dm-change dm-up">↑ 24 today</div>
                  </div>
                  <div className="dash-metric">
                    <div className="dm-label">Outstanding</div>
                    <div className="dm-value">₹1.2L</div>
                    <div className="dm-change dm-down">↓ 5 overdue</div>
                  </div>
                  <div className="dash-metric">
                    <div className="dm-label">Stock Value</div>
                    <div className="dm-value">₹22L</div>
                    <div className="dm-change dm-up">↑ healthy</div>
                  </div>
                </div>
                <div className="dash-chart-area">
                  <div className="chart-label">Daily Revenue (₹ in thousands)</div>
                  <div className="chart-bars">
                    <div className="chart-bar-item" style={{height: '40%', background: 'rgba(96,165,250,0.4)'}}></div>
                    <div className="chart-bar-item" style={{height: '55%', background: 'rgba(96,165,250,0.4)'}}></div>
                    <div className="chart-bar-item" style={{height: '38%', background: 'rgba(96,165,250,0.4)'}}></div>
                    <div className="chart-bar-item" style={{height: '72%', background: 'rgba(96,165,250,0.4)'}}></div>
                    <div className="chart-bar-item" style={{height: '60%', background: 'rgba(96,165,250,0.4)'}}></div>
                    <div className="chart-bar-item" style={{height: '85%', background: '#60a5fa'}}></div>
                    <div className="chart-bar-item" style={{height: '65%', background: 'rgba(96,165,250,0.4)'}}></div>
                    <div className="chart-bar-item" style={{height: '78%', background: 'rgba(96,165,250,0.4)'}}></div>
                    <div className="chart-bar-item" style={{height: '50%', background: 'rgba(96,165,250,0.4)'}}></div>
                    <div className="chart-bar-item" style={{height: '90%', background: 'rgba(96,165,250,0.6)'}}></div>
                    <div className="chart-bar-item" style={{height: '70%', background: 'rgba(96,165,250,0.4)'}}></div>
                    <div className="chart-bar-item" style={{height: '88%', background: 'rgba(96,165,250,0.4)'}}></div>
                    <div className="chart-bar-item" style={{height: '95%', background: '#60a5fa'}}></div>
                    <div className="chart-bar-item" style={{height: '62%', background: 'rgba(96,165,250,0.4)'}}></div>
                  </div>
                </div>
                <div className="dash-recent">
                  <div className="dash-invoice-row">
                    <div>
                      <div className="dir-num">INV-1284</div>
                      <div className="dir-name">Sharma Traders</div>
                    </div>
                    <div>
                      <div className="dir-amt">₹42,000</div>
                      <div className="status-pill sp-paid">Paid</div>
                    </div>
                  </div>
                  <div className="dash-invoice-row">
                    <div>
                      <div className="dir-num">INV-1285</div>
                      <div className="dir-name">Gupta & Sons</div>
                    </div>
                    <div>
                      <div className="dir-amt">₹18,500</div>
                      <div className="status-pill sp-pend">Pending</div>
                    </div>
                  </div>
                  <div className="dash-invoice-row">
                    <div>
                      <div className="dir-num">INV-1286</div>
                      <div className="dir-name">Jain Enterprises</div>
                    </div>
                    <div>
                      <div className="dir-amt">₹91,200</div>
                      <div className="status-pill sp-paid">Paid</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KEY FEATURES */}
      <section className="features-section" id="features">
        <div className="features-intro fade-in">
          <div className="section-label">Platform Features</div>
          <h2 className="section-title">Everything your wholesale<br />business needs</h2>
          <p className="section-sub">From invoicing to inventory, GST filing to bank reconciliation — Shopos handles the heavy lifting so you can focus on growing your business.</p>
        </div>
        <div className="features-grid fade-in">
          <div className="feature-card featured">
            <div className="feature-icon">🤖</div>
            <div className="feature-tag">AI Powered</div>
            <div className="feature-title">Smart Invoice Scanner</div>
            <div className="feature-desc">Point your camera at any supplier invoice. Our AI reads it instantly, extracts all data, and updates your inventory — no manual entry ever again.</div>
            <div className="feature-pill-list">
              <span className="feature-pill">OCR + AI</span>
              <span className="feature-pill">Auto-update stock</span>
              <span className="feature-pill">JSON export</span>
              <span className="feature-pill">98% accurate</span>
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon fi-teal">📄</div>
            <div className="feature-tag">Core</div>
            <div className="feature-title">Invoice Generation</div>
            <div className="feature-desc">Create beautiful, GST-compliant invoices in seconds. Add items, apply discounts, and send instantly via WhatsApp, email, or print.</div>
            <div className="feature-pill-list">
              <span className="feature-pill">GST compliant</span>
              <span className="feature-pill">Custom templates</span>
              <span className="feature-pill">Multi-tax</span>
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon fi-violet">📦</div>
            <div className="feature-tag">Inventory</div>
            <div className="feature-title">Live Stock Management</div>
            <div className="feature-desc">Real-time inventory tracking with low-stock alerts, batch management, expiry tracking, and multi-warehouse support.</div>
            <div className="feature-pill-list">
              <span className="feature-pill">Auto-deduction</span>
              <span className="feature-pill">Batch tracking</span>
              <span className="feature-pill">Low stock alerts</span>
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon fi-amber">🏦</div>
            <div className="feature-tag">Finance</div>
            <div className="feature-title">Bank Reconciliation</div>
            <div className="feature-desc">Upload bank statements and let AI automatically match transactions to your invoices and payments. Spot discrepancies instantly.</div>
            <div className="feature-pill-list">
              <span className="feature-pill">Auto-match</span>
              <span className="feature-pill">Multi-bank</span>
              <span className="feature-pill">UPI support</span>
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon fi-emerald">📊</div>
            <div className="feature-tag">Reports</div>
            <div className="feature-title">GST & Tax Reports</div>
            <div className="feature-desc">One-click GSTR-1, GSTR-3B generation. Automatic tax calculation, HSN summary, e-Way bill integration and e-Invoice support.</div>
            <div className="feature-pill-list">
              <span className="feature-pill">GSTR-1, 3B</span>
              <span className="feature-pill">e-Way bills</span>
              <span className="feature-pill">e-Invoice</span>
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon fi-coral">👥</div>
            <div className="feature-tag">Parties</div>
            <div className="feature-title">Ledger & Party Management</div>
            <div className="feature-desc">Manage all your buyers and suppliers with complete ledgers, outstanding tracking, credit limits, and payment history.</div>
            <div className="feature-pill-list">
              <span className="feature-pill">Party ledger</span>
              <span className="feature-pill">Credit limits</span>
              <span className="feature-pill">Aging report</span>
            </div>
          </div>
        </div>
      </section>

      {/* AI ENGINE */}
      <section className="ai-section" id="ai">
        <div className="ai-layout">
          <div className="ai-visual fade-in">
            <div className="ai-card">
              <div className="ai-card-header">
                <div className="ai-avatar">🧠</div>
                <div>
                  <div className="ai-card-title">Shopos AI Engine</div>
                  <div className="ai-card-sub">Scanning supplier invoice…</div>
                </div>
              </div>
              <div className="ai-scanning">
                <div className="scan-line"></div>
                <div className="scan-doc">
                  <div className="scan-field">
                    <div>Supplier</div>
                    <div className="scan-field-value">Rajesh Distributors</div>
                  </div>
                  <div className="scan-field">
                    <div>Invoice No.</div>
                    <div className="scan-field-value">RD/2026/4821</div>
                  </div>
                  <div className="scan-field">
                    <div>Date</div>
                    <div className="scan-field-value">28 May 2026</div>
                  </div>
                  <div className="scan-field">
                    <div>GSTIN</div>
                    <div className="scan-field-value">27ABCDE1234F1Z5</div>
                  </div>
                  <div className="scan-field" style={{gridColumn: 'span 2'}}>
                    <div>Items detected</div>
                    <div className="scan-field-value">14 line items • ₹1,24,800 total</div>
                  </div>
                </div>
              </div>
              <div className="ai-output">
                <div className="ai-output-label">Generated JSON</div>
                <div className="ai-json">
                  <span className="key">"supplier"</span>: <span className="str">"Rajesh Distributors"</span>,<br />
                  <span className="key">"invoice_no"</span>: <span className="str">"RD/2026/4821"</span>,<br />
                  <span className="key">"total"</span>: <span className="num">124800</span>,<br />
                  <span className="key">"gst"</span>: <span className="num">22464</span>,<br />
                  <span className="key">"items"</span>: [ <span style={{color: 'rgba(255,255,255,0.3)'}}>14 items...</span> ]
                </div>
              </div>
              <div className="ai-actions-row">
                <div className="ai-action-btn aa-primary">✓ Add to Inventory</div>
                <div className="ai-action-btn aa-ghost">📋 Review First</div>
                <div className="ai-action-btn aa-ghost">✏ Edit</div>
              </div>
            </div>
            <div className="floating-badge fb-1">
              <div className="fb-icon" style={{background: 'rgba(52,211,153,0.12)'}}>✅</div>
              <div>
                <div style={{fontSize: '11px', color: 'var(--muted)'}}>Stock Updated</div>
                <div>14 items restocked</div>
              </div>
            </div>
            <div className="floating-badge fb-2">
              <div className="fb-icon" style={{background: 'rgba(37,99,235,0.1)'}}>⚡</div>
              <div>
                <div style={{fontSize: '11px', color: 'var(--muted)'}}>Processing time</div>
                <div>2.3 seconds</div>
              </div>
            </div>
          </div>
          <div className="ai-content fade-in">
            <div className="section-label">AI Engine</div>
            <h2 className="section-title">Scan any invoice.<br />AI does the rest.</h2>
            <p className="section-sub">Stop spending hours on data entry. Our AI reads supplier invoices with 98% accuracy and instantly updates everything across your system.</p>
            <ul className="feature-list">
              <li className="feature-list-item">
                <div className="fli-icon">📸</div>
                <div>
                  <div className="fli-title">Scan physical or digital invoices</div>
                  <div className="fli-desc">Snap a photo with your phone or upload a PDF. Works with handwritten bills, printed invoices, and scanned documents.</div>
                </div>
              </li>
              <li className="feature-list-item">
                <div className="fli-icon">🔄</div>
                <div>
                  <div className="fli-title">Auto inventory update</div>
                  <div className="fli-desc">Every line item is matched to your catalog and stock quantities are updated instantly. Zero manual entry.</div>
                </div>
              </li>
              <li className="feature-list-item">
                <div className="fli-icon">📋</div>
                <div>
                  <div className="fli-title">Structured JSON output</div>
                  <div className="fli-desc">Export clean, structured data for any downstream system. Perfect for accounting integrations and custom workflows.</div>
                </div>
              </li>
              <li className="feature-list-item">
                <div className="fli-icon">🏦</div>
                <div>
                  <div className="fli-title">Bank statement reconciliation</div>
                  <div className="fli-desc">Upload your bank statement and AI automatically matches each transaction to invoices and payments in your books.</div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="workflow-section" id="workflow">
        <div className="fade-in" style={{textAlign: 'center', marginBottom: '0'}}>
          <div className="section-label" style={{justifyContent: 'center'}}>How It Works</div>
          <h2 className="section-title">From invoice to payment<br />in 5 simple steps</h2>
          <p className="section-sub mx-auto">The complete wholesale workflow — automated and streamlined so every rupee is tracked.</p>
        </div>
        <div className="workflow-steps fade-in">
          <div className="workflow-step">
            <div className="ws-number"><span className="ws-icon">📦</span></div>
            <div className="ws-title">Receive Supplies</div>
            <div className="ws-desc">Scan supplier invoice with your phone camera</div>
          </div>
          <div className="workflow-step">
            <div className="ws-number"><span className="ws-icon">🤖</span></div>
            <div className="ws-title">AI Processes</div>
            <div className="ws-desc">Extracts all data, updates inventory automatically</div>
          </div>
          <div className="workflow-step">
            <div className="ws-number"><span className="ws-icon">🧾</span></div>
            <div className="ws-title">Generate Invoice</div>
            <div className="ws-desc">Create GST-compliant sale invoice in seconds</div>
          </div>
          <div className="workflow-step">
            <div className="ws-number"><span className="ws-icon">📤</span></div>
            <div className="ws-title">Send Instantly</div>
            <div className="ws-desc">WhatsApp, email or print — one tap delivery</div>
          </div>
          <div className="workflow-step">
            <div className="ws-number"><span className="ws-icon">✅</span></div>
            <div className="ws-title">Get Paid</div>
            <div className="ws-desc">Track payment, reconcile with bank, close books</div>
          </div>
        </div>
      </section>

      {/* SEND INVOICE */}
      <section className="send-section" id="send">
        <div className="send-layout">
          <div className="fade-in">
            <div className="section-label">Multi-Channel Delivery</div>
            <h2 className="section-title">Send invoices<br />how your customer<br />prefers</h2>
            <p className="section-sub">One tap to send. Your customer gets it their way — WhatsApp, email, or a printed copy across the counter.</p>
            <div className="send-channels">
              <div className={`send-channel ${activeSendChannel === 0 ? 'active' : ''}`} onClick={() => setActiveSendChannel(0)}>
                <div className="sc-icon sc-green">💬</div>
                <div>
                  <div className="sc-name">WhatsApp</div>
                  <div className="sc-desc">Send invoice as a formatted message with PDF attachment</div>
                </div>
                <div className="sc-status">Most used</div>
              </div>
              <div className={`send-channel ${activeSendChannel === 1 ? 'active' : ''}`} onClick={() => setActiveSendChannel(1)}>
                <div className="sc-icon sc-blue">✉️</div>
                <div>
                  <div className="sc-name">Email</div>
                  <div className="sc-desc">Professional email with branded invoice PDF attached</div>
                </div>
              </div>
              <div className={`send-channel ${activeSendChannel === 2 ? 'active' : ''}`} onClick={() => setActiveSendChannel(2)}>
                <div className="sc-icon sc-gray">🖨️</div>
                <div>
                  <div className="sc-name">Print</div>
                  <div className="sc-desc">Thermal or A4 print. Works with all printers</div>
                </div>
              </div>
              <div className={`send-channel ${activeSendChannel === 3 ? 'active' : ''}`} onClick={() => setActiveSendChannel(3)}>
                <div className="sc-icon" style={{background: 'rgba(37,99,235,0.08)'}}>🔗</div>
                <div>
                  <div className="sc-name">Payment Link</div>
                  <div className="sc-desc">Share a link — customer pays online via UPI, card, netbanking</div>
                </div>
              </div>
            </div>
          </div>
          <div className="send-visual fade-in">
            <div className="phone-mockup">
              <div className="phone-screen">
                <div className="wa-header">
                  <div className="wa-avatar">MT</div>
                  <div>
                    <div className="wa-name">Mehta Traders</div>
                    <div className="wa-status">online</div>
                  </div>
                </div>
                <div className="wa-messages">
                  <div className="wa-msg wa-msg-in">
                    Bhai, invoice bhejo jaldi — truck ready hai
                    <div className="wa-time">11:42 AM</div>
                  </div>
                  <div className="wa-msg wa-msg-out">
                    <div className="wa-invoice-card">
                      <div className="wa-inv-header">
                        🧾 Invoice INV-1287
                      </div>
                      <div className="wa-inv-body">
                        <div className="wa-inv-row"><span>Party</span><span>Mehta Traders</span></div>
                        <div className="wa-inv-row"><span>Items</span><span>8 products</span></div>
                        <div className="wa-inv-row"><span>GST (18%)</span><span>₹13,680</span></div>
                        <div className="wa-inv-total">Total: ₹90,080</div>
                      </div>
                    </div>
                    <div className="wa-time" style={{marginTop: '6px'}}>Invoice sent via Shopos ✓✓</div>
                  </div>
                  <div className="wa-msg wa-msg-in">
                    Mil gaya! Payment abhi karein
                    <div className="wa-time">11:43 AM</div>
                  </div>
                  <div className="wa-msg wa-msg-out" style={{fontSize: '11px', background: '#dcf8c6', maxWidth: '90%'}}>
                    💳 Pay via UPI: shopos.pay/INV1287<br />
                    <span style={{color: '#666'}}>Valid for 48 hours</span>
                    <div className="wa-time">11:43 AM ✓✓</div>
                  </div>
                </div>
                <div className="wa-input">
                  Type a message
                  <span style={{fontSize: '18px'}}>🎤</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INVENTORY */}
      <section className="inventory-section">
        <div className="inventory-grid">
          <div className="fade-in">
            <div className="section-label">Inventory</div>
            <h2 className="section-title">Stock always<br />under control</h2>
            <p className="section-sub">Real-time inventory with smart alerts. Know what's running low before you run out. Auto-update on every sale and purchase.</p>
            <ul className="feature-list" style={{marginTop: '28px'}}>
              <li className="feature-list-item">
                <div className="fli-icon" style={{background: 'rgba(13,148,136,0.08)'}}>📊</div>
                <div>
                  <div className="fli-title">Live stock levels</div>
                  <div className="fli-desc">Auto-deducted on every sale, auto-added on every purchase scan</div>
                </div>
              </li>
              <li className="feature-list-item">
                <div className="fli-icon" style={{background: 'rgba(217,119,6,0.08)'}}>⚠️</div>
                <div>
                  <div className="fli-title">Low stock alerts</div>
                  <div className="fli-desc">Set reorder points. Get notified via WhatsApp or email before stockout</div>
                </div>
              </li>
              <li className="feature-list-item">
                <div className="fli-icon" style={{background: 'rgba(124,58,237,0.08)'}}>🏷️</div>
                <div>
                  <div className="fli-title">Batch & expiry tracking</div>
                  <div className="fli-desc">Track FIFO/LIFO, batch numbers, and expiry dates for regulated goods</div>
                </div>
              </li>
            </ul>
          </div>
          <div className="fade-in">
            <div className="inv-dashboard">
              <div className="inv-dash-header">
                <div className="inv-dash-title">Inventory Overview</div>
                <div className="inv-search">🔍 Search items…</div>
              </div>
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div className="inv-item-name">Basmati Rice 25kg</div>
                      <div className="inv-item-sku">SKU: GR-BASM-25</div>
                    </td>
                    <td>
                      <div className="stock-bar-wrap">
                        <div className="stock-bar"><div className="stock-fill sf-high" style={{width: '80%'}}></div></div>
                        <div className="stock-count">240 bags</div>
                      </div>
                    </td>
                    <td><span className="inv-status is-ok">● In Stock</span></td>
                    <td>₹4.32L</td>
                  </tr>
                  <tr>
                    <td>
                      <div className="inv-item-name">Toor Dal 50kg</div>
                      <div className="inv-item-sku">SKU: PL-TOOR-50</div>
                    </td>
                    <td>
                      <div className="stock-bar-wrap">
                        <div className="stock-bar"><div className="stock-fill sf-mid" style={{width: '22%'}}></div></div>
                        <div className="stock-count">18 bags</div>
                      </div>
                    </td>
                    <td><span className="inv-status is-low">⚠ Low Stock</span></td>
                    <td>₹54,000</td>
                  </tr>
                  <tr>
                    <td>
                      <div className="inv-item-name">Mustard Oil 15L</div>
                      <div className="inv-item-sku">SKU: OL-MUST-15</div>
                    </td>
                    <td>
                      <div className="stock-bar-wrap">
                        <div className="stock-bar"><div className="stock-fill sf-high" style={{width: '65%'}}></div></div>
                        <div className="stock-count">130 tins</div>
                      </div>
                    </td>
                    <td><span className="inv-status is-ok">● In Stock</span></td>
                    <td>₹2.08L</td>
                  </tr>
                  <tr>
                    <td>
                      <div className="inv-item-name">Sugar 100kg Bags</div>
                      <div className="inv-item-sku">SKU: SW-SUGR-100</div>
                    </td>
                    <td>
                      <div className="stock-bar-wrap">
                        <div className="stock-bar"><div className="stock-fill sf-low" style={{width: '4%'}}></div></div>
                        <div className="stock-count">3 bags</div>
                      </div>
                    </td>
                    <td><span className="inv-status is-out">✕ Critical</span></td>
                    <td>₹12,600</td>
                  </tr>
                  <tr>
                    <td>
                      <div className="inv-item-name">Refined Flour 50kg</div>
                      <div className="inv-item-sku">SKU: GR-MAID-50</div>
                    </td>
                    <td>
                      <div className="stock-bar-wrap">
                        <div className="stock-bar"><div className="stock-fill sf-high" style={{width: '55%'}}></div></div>
                        <div className="stock-count">88 bags</div>
                      </div>
                    </td>
                    <td><span className="inv-status is-ok">● In Stock</span></td>
                    <td>₹88,000</td>
                  </tr>
                </tbody>
              </table>
              <div className="inv-alert">
                ⚠️ <strong>3 items</strong> need restocking — Sugar critically low. <span style={{marginLeft: 'auto', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline'}}>Create PO →</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ERP FEATURES */}
      <section className="erp-section">
        <div style={{textAlign: 'center'}} className="fade-in">
          <div className="section-label" style={{justifyContent: 'center', color: 'rgba(255,255,255,0.5)'}}>Complete ERP</div>
          <h2 className="section-title" style={{color: '#fff'}}>Every feature you need.<br />Nothing you don't.</h2>
          <p className="section-sub mx-auto" style={{color: 'rgba(255,255,255,0.45)'}}>Shopos covers the full spectrum of wholesale business operations — GST to payroll, CRM to e-commerce.</p>
        </div>
        <div className="erp-grid fade-in">
          <div className="erp-item"><div className="erp-icon">📄</div><div className="erp-name">Sales Invoice</div></div>
          <div className="erp-item"><div className="erp-icon">🛒</div><div className="erp-name">Purchase Orders</div></div>
          <div className="erp-item"><div className="erp-icon">📦</div><div className="erp-name">Inventory Mgmt</div></div>
          <div className="erp-item"><div className="erp-icon">👥</div><div className="erp-name">Party Ledger</div></div>
          <div className="erp-item"><div className="erp-icon">🏦</div><div className="erp-name">Bank Reconciliation</div></div>
          <div className="erp-item"><div className="erp-icon">📊</div><div className="erp-name">GST Reports</div></div>
          <div className="erp-item"><div className="erp-icon">🧾</div><div className="erp-name">e-Way Bill</div></div>
          <div className="erp-item"><div className="erp-icon">⚡</div><div className="erp-name">e-Invoice</div></div>
          <div className="erp-item"><div className="erp-icon">💳</div><div className="erp-name">Payment Links</div></div>
          <div className="erp-item"><div className="erp-icon">📈</div><div className="erp-name">Profit & Loss</div></div>
          <div className="erp-item"><div className="erp-icon">⚖️</div><div className="erp-name">Balance Sheet</div></div>
          <div className="erp-item"><div className="erp-icon">🔁</div><div className="erp-name">Debit / Credit Notes</div></div>
          <div className="erp-item"><div className="erp-icon">🧑‍💼</div><div className="erp-name">Payroll</div></div>
          <div className="erp-item"><div className="erp-icon">🏭</div><div className="erp-name">Multi-Warehouse</div></div>
          <div className="erp-item"><div className="erp-icon">🔖</div><div className="erp-name">Batch Tracking</div></div>
          <div className="erp-item"><div className="erp-icon">📱</div><div className="erp-name">Mobile App</div></div>
          <div className="erp-item"><div className="erp-icon">🌐</div><div className="erp-name">Multi-Firm</div></div>
          <div className="erp-item"><div className="erp-icon">🔒</div><div className="erp-name">Role-based Access</div></div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing-section" id="pricing">
        <div className="fade-in" style={{textAlign: 'center'}}>
          <div className="section-label" style={{justifyContent: 'center'}}>Pricing</div>
          <h2 className="section-title">Simple, honest pricing</h2>
          <p className="section-sub mx-auto">No hidden fees. No per-transaction charges. Scale as your business grows.</p>
        </div>
        <div className="pricing-toggle fade-in">
          <span className="toggle-label">Monthly</span>
          <label className="toggle-switch">
            <input type="checkbox" checked={isAnnual} onChange={(e) => setIsAnnual(e.target.checked)} />
            <span className="toggle-slider"></span>
          </label>
          <span className="toggle-label">Annually</span>
          <span className="save-badge">Save 25%</span>
        </div>
        <div className="pricing-cards fade-in">
          {/* Basic */}
          <div className="pricing-card">
            <div className="plan-name">Basic</div>
            <div className="plan-firms">🏪 1 Firm</div>
            <div className="plan-price">
              <span className="price-currency">₹</span>
              <span className="price-amount">{isAnnual ? prices.annual.basic.toLocaleString('en-IN') : prices.monthly.basic.toLocaleString('en-IN')}</span>
            </div>
            <div className="price-period">/month</div>
            <div className="plan-desc" style={{marginTop: '8px'}}>Perfect for solo traders and single-shop owners just getting started with digital accounting.</div>
            <div className="plan-divider"></div>
            <ul className="plan-features">
              <li className="plan-feature"><span className="plan-feature-check">✓</span> 1 Firm / Company</li>
              <li className="plan-feature"><span className="plan-feature-check">✓</span> Unlimited invoices</li>
              <li className="plan-feature"><span className="plan-feature-check">✓</span> Inventory management</li>
              <li className="plan-feature"><span className="plan-feature-check">✓</span> WhatsApp & email sending</li>
              <li className="plan-feature"><span className="plan-feature-check">✓</span> GST reports (GSTR-1, 3B)</li>
              <li className="plan-feature"><span className="plan-feature-check">✓</span> AI invoice scanner (50/mo)</li>
              <li className="plan-feature"><span className="plan-feature-check">✓</span> Mobile app access</li>
            </ul>
            <a href="/auth?mode=signup" className="btn btn-primary" style={{width: '100%', justifyContent: 'center'}}>Start Free Trial →</a>
          </div>
          {/* Business */}
          <div className="pricing-card featured">
            <div className="popular-badge">⭐ Most Popular</div>
            <div className="plan-name">Business</div>
            <div className="plan-firms">🏪 Up to 3 Firms</div>
            <div className="plan-price">
              <span className="price-currency">₹</span>
              <span className="price-amount">{isAnnual ? prices.annual.business.toLocaleString('en-IN') : prices.monthly.business.toLocaleString('en-IN')}</span>
            </div>
            <div className="price-period">/month</div>
            <div className="plan-desc" style={{marginTop: '8px'}}>For growing traders managing multiple shops or product lines under one roof.</div>
            <div className="plan-divider"></div>
            <ul className="plan-features">
              <li className="plan-feature"><span className="plan-feature-check">✓</span> Up to 3 Firms</li>
              <li className="plan-feature"><span className="plan-feature-check">✓</span> Everything in Basic</li>
              <li className="plan-feature"><span className="plan-feature-check">✓</span> AI scanner unlimited</li>
              <li className="plan-feature"><span className="plan-feature-check">✓</span> Bank reconciliation</li>
              <li className="plan-feature"><span className="plan-feature-check">✓</span> e-Way bill integration</li>
              <li className="plan-feature"><span className="plan-feature-check">✓</span> e-Invoice generation</li>
              <li className="plan-feature"><span className="plan-feature-check">✓</span> Priority support</li>
            </ul>
            <a href="/auth?mode=signup" className="btn btn-white btn-lg" style={{width: '100%', justifyContent: 'center'}}>Start Free Trial →</a>
          </div>
          {/* Business Pro */}
          <div className="pricing-card">
            <div className="plan-name">Business Pro</div>
            <div className="plan-firms">🏪 Unlimited Firms</div>
            <div className="plan-price">
              <span className="price-currency">₹</span>
              <span className="price-amount">{isAnnual ? prices.annual.pro.toLocaleString('en-IN') : prices.monthly.pro.toLocaleString('en-IN')}</span>
            </div>
            <div className="price-period">/month</div>
            <div className="plan-desc" style={{marginTop: '8px'}}>For large wholesale groups, distributors, and multi-city operations with complex requirements.</div>
            <div className="plan-divider"></div>
            <ul className="plan-features">
              <li className="plan-feature"><span className="plan-feature-check">✓</span> Unlimited Firms</li>
              <li className="plan-feature"><span className="plan-feature-check">✓</span> Everything in Business</li>
              <li className="plan-feature"><span className="plan-feature-check">✓</span> Custom integrations</li>
              <li className="plan-feature"><span className="plan-feature-check">✓</span> Custom reports</li>
              <li className="plan-feature"><span className="plan-feature-check">✓</span> Data migration help</li>
              <li className="plan-feature"><span className="plan-feature-check">✓</span> SLA & uptime guarantee</li>
            </ul>
            <a href="/auth?mode=signup" className="btn btn-primary" style={{width: '100%', justifyContent: 'center'}}>Start Free Trial →</a>
          </div>
        </div>
        <div className="fade-in" style={{textAlign: 'center', marginTop: '32px', fontSize: '14px', color: 'var(--muted)'}}>
          All plans include 14-day free trial · No credit card required · Cancel anytime
        </div>
      </section>

      {/* COMPARE */}
      <section className="compare-section" id="compare">
        <div className="fade-in" style={{textAlign: 'center'}}>
          <div className="section-label" style={{justifyContent: 'center'}}>Comparison</div>
          <h2 className="section-title">How Shopos stacks up</h2>
          <p className="section-sub mx-auto">See how Shopos compares to alternatives like Tally, Vyaapaar, and MarQ ERP.</p>
        </div>
        <div className="compare-table-wrap fade-in">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th className="highlight">Shopos</th>
                <th>Tally</th>
                <th>Vyaapaar</th>
                <th>MarQ ERP</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>AI Invoice Scanner</td>
                <td className="highlight"><span className="check-y">✓</span></td>
                <td><span className="check-n">—</span></td>
                <td><span className="check-n">—</span></td>
                <td><span className="check-n">—</span></td>
              </tr>
              <tr>
                <td>WhatsApp Invoicing</td>
                <td className="highlight"><span className="check-y">✓</span></td>
                <td><span className="check-n">—</span></td>
                <td><span className="check-y">✓</span></td>
                <td><span className="check-n">—</span></td>
              </tr>
              <tr>
                <td>Bank Reconciliation AI</td>
                <td className="highlight"><span className="check-y">✓</span></td>
                <td><span className="check-n">—</span></td>
                <td><span className="check-n">—</span></td>
                <td><span className="check-p">Partial</span></td>
              </tr>
              <tr>
                <td>GST Compliance</td>
                <td className="highlight"><span className="check-y">✓</span></td>
                <td><span className="check-y">✓</span></td>
                <td><span className="check-y">✓</span></td>
                <td><span className="check-y">✓</span></td>
              </tr>
              <tr>
                <td>Multi-Firm Support</td>
                <td className="highlight"><span className="check-y">✓</span></td>
                <td><span className="check-y">✓</span></td>
                <td><span className="check-n">—</span></td>
                <td><span className="check-y">✓</span></td>
              </tr>
              <tr>
                <td>Cloud-based</td>
                <td className="highlight"><span className="check-y">✓</span></td>
                <td><span className="check-n">Desktop only</span></td>
                <td><span className="check-y">✓</span></td>
                <td><span className="check-y">✓</span></td>
              </tr>
              <tr>
                <td>Mobile App</td>
                <td className="highlight"><span className="check-y">✓</span></td>
                <td><span className="check-n">—</span></td>
                <td><span className="check-y">✓</span></td>
                <td><span className="check-p">Limited</span></td>
              </tr>
              <tr>
                <td>Starting Price / month</td>
                <td className="highlight">₹1,299</td>
                <td>₹18,000/yr</td>
                <td>₹599</td>
                <td>₹2,999</td>
              </tr>
              <tr>
                <td>Free Trial</td>
                <td className="highlight">14 days</td>
                <td><span className="check-n">—</span></td>
                <td>7 days</td>
                <td>7 days</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials-section">
        <div className="fade-in" style={{textAlign: 'center'}}>
          <div className="section-label" style={{justifyContent: 'center'}}>Testimonials</div>
          <h2 className="section-title">Trusted by wholesale<br />traders across India</h2>
        </div>
        <div className="testimonials-grid fade-in">
          <div className="testimonial-card">
            <div className="tc-stars">⭐⭐⭐⭐⭐</div>
            <div className="tc-quote">"Pehle invoice banane mein 10 minute lagte the, ab 30 second mein ho jata hai. Supplier ka bill scan karo, sab kuch automatically update ho jata hai. Kamaal ka software hai!"</div>
            <div className="tc-author">
              <div className="tc-avatar" style={{background: '#2563eb'}}>RS</div>
              <div>
                <div className="tc-name">Ramesh Sharma</div>
                <div className="tc-role">Sharma Kirana Wholesale, Jaipur</div>
              </div>
            </div>
          </div>
          <div className="testimonial-card">
            <div className="tc-stars">⭐⭐⭐⭐⭐</div>
            <div className="tc-quote">"We switched from Tally last year. Shopos is cloud-based so I can check business from my phone anywhere. WhatsApp invoice feature is a game changer for our buyers."</div>
            <div className="tc-author">
              <div className="tc-avatar" style={{background: '#059669'}}>AG</div>
              <div>
                <div className="tc-name">Anil Gupta</div>
                <div className="tc-role">AG Food Distributors, Mumbai</div>
              </div>
            </div>
          </div>
          <div className="testimonial-card">
            <div className="tc-stars">⭐⭐⭐⭐⭐</div>
            <div className="tc-quote">"Managing 3 firms was a headache before. Shopos Business plan handles all 3 in one login. GST reports generate automatically — my CA loves it!"</div>
            <div className="tc-author">
              <div className="tc-avatar" style={{background: '#7c3aed'}}>PJ</div>
              <div>
                <div className="tc-name">Pradeep Jain</div>
                <div className="tc-role">Jain Group of Traders, Delhi</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-content fade-in">
          <div className="section-label" style={{justifyContent: 'center', color: 'rgba(255,255,255,0.4)'}}>Get Started Today</div>
          <h2 className="section-title">Ready to modernize<br />your wholesale business?</h2>
          <p className="cta-sub">Join thousands of wholesale traders who've switched to Shopos. 14-day free trial, no card needed.</p>
          <div className="cta-btns">
            <a href="/auth?mode=signup" className="btn btn-white btn-lg">Start Free Trial — 14 Days →</a>
            <a href="#" className="btn btn-outline-white btn-lg">Schedule a Demo</a>
          </div>
          <div className="cta-trust">
            <div className="ct-item">🔒 256-bit SSL encryption</div>
            <div className="ct-item">🇮🇳 Made for Indian traders</div>
            <div className="ct-item">📞 Hindi & English support</div>
            <div className="ct-item">✓ GST compliant</div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-grid">
          <div className="footer-brand">
            <a href="#" className="logo" style={{color: 'white'}}>shop<span>os</span></a>
            <p className="footer-desc">The complete wholesale ERP for Indian businesses. AI-powered invoicing, inventory, GST compliance and more — all in one platform.</p>
          </div>
          <div>
            <div className="footer-col-title">Product</div>
            <ul className="footer-links">
              <li><a href="#">Features</a></li>
              <li><a href="#">AI Scanner</a></li>
              <li><a href="#">Pricing</a></li>
              <li><a href="#">Changelog</a></li>
              <li><a href="#">Roadmap</a></li>
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Resources</div>
            <ul className="footer-links">
              <li><a href="#">Documentation</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">GST Guides</a></li>
              <li><a href="#">Tally Migration</a></li>
              <li><a href="#">API Docs</a></li>
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Company</div>
            <ul className="footer-links">
              <li><a href="#">About Us</a></li>
              <li><a href="#">Contact</a></li>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Careers</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-copy">© 2026 Shopos. All rights reserved. Made with ❤️ for Indian businesses.</div>
          <div className="footer-socials">
            <a href="#" className="footer-social">𝕏</a>
            <a href="#" className="footer-social">in</a>
            <a href="#" className="footer-social">▶</a>
            <a href="#" className="footer-social">📘</a>
          </div>
        </div>
      </footer>


    </div>
  );
}