'use client';

import React, { useState, useEffect, memo } from 'react';
import {
  BarChart3,
  Users,
  Plus,
  Bell,
  TrendingUp,
  MessageSquare,
  LogOut,
  Search,
  Copy,
  MessageCircle,
  Eye,
  EyeOff,
  ChevronDown,
} from 'lucide-react';

// Announcement form with local state to prevent parent re-renders
const AnnouncementForm = memo(({ onSubmit, styles, Bell }) => {
  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'info',
    target: 'all',
    targetOrgIds: [],
    showUntil: '',
  });

  const handleSubmit = () => {
    if (!form.title || !form.message) {
      alert('Title and message are required');
      return;
    }
    onSubmit(form);
    setForm({ title: '', message: '', type: 'info', target: 'all', targetOrgIds: [], showUntil: '' });
  };

  return (
    <div>
      <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
        New Announcement
      </h3>
      <input
        autoComplete="off"
        placeholder="Title"
        value={form.title}
        onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
        style={styles.input}
      />
      <textarea
        placeholder="Message"
        value={form.message}
        onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
        style={{ ...styles.input, minHeight: '100px', fontFamily: 'monospace' }}
      />
      <select
        value={form.type}
        onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value }))}
        style={styles.input}
      >
        <option value="info">ℹ️ Info</option>
        <option value="warning">⚠️ Warning</option>
        <option value="maintenance">🔧 Maintenance</option>
        <option value="critical">🚨 Critical</option>
      </select>
      <select
        value={form.target}
        onChange={(e) => setForm(prev => ({ ...prev, target: e.target.value }))}
        style={styles.input}
      >
        <option value="all">All Customers</option>
        <option value="trial">Trial Only</option>
        <option value="active">Active Only</option>
        <option value="specific">Specific Customers</option>
      </select>
      <input
        autoComplete="off"
        type="datetime-local"
        placeholder="Show Until"
        value={form.showUntil}
        onChange={(e) => setForm(prev => ({ ...prev, showUntil: e.target.value }))}
        style={styles.input}
      />
      <button
        onClick={handleSubmit}
        style={{ ...styles.button, width: '100%' }}
      >
        <Bell size={14} style={{ marginRight: '6px' }} /> Create Announcement
      </button>
    </div>
  );
});

// Onboarding form with local state to prevent parent re-renders
const OnboardingForm = memo(({ onSubmit, styles, Plus }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    businessName: '',
    phone: '',
    plan: 'trial',
  });

  const handleSubmit = () => {
    if (!form.email || !form.businessName) {
      alert('Email and business name are required');
      return;
    }
    onSubmit(form);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      <div>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Create New Customer</h3>
        <input
          autoComplete="off"
          placeholder="Contact Name"
          value={form.name}
          onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
          style={styles.input}
        />
        <input
          autoComplete="off"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
          style={styles.input}
        />
        <input
          autoComplete="off"
          placeholder="Business Name"
          value={form.businessName}
          onChange={(e) => setForm(prev => ({ ...prev, businessName: e.target.value }))}
          style={styles.input}
        />
        <input
          autoComplete="off"
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
          style={styles.input}
        />
        <select
          value={form.plan}
          onChange={(e) => setForm(prev => ({ ...prev, plan: e.target.value }))}
          style={styles.input}
        >
          <option value="trial">Trial (14 days)</option>
          <option value="free">Free</option>
          <option value="starter">Starter - ₹799/mo</option>
          <option value="business">Business - ₹1499/mo</option>
          <option value="pro">Pro - ₹2499/mo</option>
        </select>
        <button onClick={handleSubmit} style={{ ...styles.button, width: '100%' }}>
          <span>+</span> Create Portal
        </button>
      </div>
    </div>
  );
});

export default function AdminPanel({ session }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [organizations, setOrganizations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [demoRequests, setDemoRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createdCustomer, setCreatedCustomer] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedDemoRequest, setSelectedDemoRequest] = useState(null);
  const [demoRequestFilter, setDemoRequestFilter] = useState('all');


  const api = {
    get: async (url) => {
      const token = session?.access_token;
      console.log(`[api.get] ${url} - Token present: ${!!token}`);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`[api.get] ${url} - Status: ${res.status}`);
      if (!res.ok) {
        const errorData = await res.text();
        console.error(`[api.get] ${url} - Error:`, errorData);
        throw new Error(`HTTP ${res.status}: ${errorData}`);
      }
      const data = await res.json();
      console.log(`[api.get] ${url} - Data:`, data);
      return data;
    },
    post: async (url, body) => {
      const token = session?.access_token;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    patch: async (url, body) => {
      const token = session?.access_token;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Fetching admin data...');
      const [orgsRes, analyticsRes, announcementsRes, ticketsRes] = await Promise.all([
        api.get('/api/admin/organizations'),
        api.get('/api/admin/analytics'),
        api.get('/api/admin/announcements'),
        api.get('/api/admin/support'),
      ]);

      setOrganizations(orgsRes.organizations || []);
      setAnalytics(analyticsRes);
      setAnnouncements(announcementsRes.announcements || []);
      setSupportTickets(ticketsRes.tickets || []);

      // Fetch demo requests separately to avoid blocking other data
      try {
        const demoRes = await api.get('/api/demo-request');
        setDemoRequests(demoRes.requests || []);
      } catch (error) {
        console.error('Error fetching demo requests:', error);
        setDemoRequests([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[AdminPanel] Session:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      userEmail: session?.user?.email,
      sessionKeys: session ? Object.keys(session) : []
    });
    if (session?.access_token) {
      fetchData();
    } else {
      console.warn('[AdminPanel] No access token available');
    }
  }, [session?.access_token]);

  const handleCreateCustomer = async (formData) => {
    try {
      const result = await api.post('/api/admin/organizations', formData);
      setCreatedCustomer(result);
      setTimeout(() => fetchData(), 500);
    } catch (error) {
      console.error('Customer creation error:', error);
      alert('Error creating customer: ' + error.message);
    }
  };

  const handleCreateAnnouncement = async (formData) => {
    try {
      await api.post('/api/admin/announcements', formData);
      await fetchData();
    } catch (error) {
      alert('Error creating announcement: ' + error.message);
    }
  };

  const toggleAnnouncement = async (id, isActive) => {
    try {
      await api.patch(`/api/admin/announcements/${id}`, { isActive: !isActive });
      await fetchData();
    } catch (error) {
      alert('Error updating announcement: ' + error.message);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0A0A0F 0%, #111118 100%)',
      color: '#F8FAFC',
      fontFamily: 'inter, system-ui, sans-serif',
      padding: '20px',
    },
    header: {
      maxWidth: '1400px',
      margin: '0 auto 30px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      letterSpacing: '-0.5px',
      margin: 0,
    },
    tabs: {
      maxWidth: '1400px',
      margin: '0 auto 30px',
      display: 'flex',
      gap: '8px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      paddingBottom: '12px',
    },
    tab: (isActive) => ({
      padding: '8px 16px',
      border: 'none',
      background: 'transparent',
      color: isActive ? '#6366F1' : '#94A3B8',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      borderBottom: isActive ? '2px solid #6366F1' : 'none',
      transition: 'all 0.2s ease',
    }),
    card: {
      maxWidth: '1400px',
      margin: '0 auto',
      background: 'rgba(17, 17, 24, 0.8)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '12px',
      padding: '24px',
      backdropFilter: 'blur(12px)',
    },
    kpiGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '16px',
      marginBottom: '24px',
    },
    kpiCard: {
      background: 'rgba(99, 102, 241, 0.08)',
      border: '1px solid rgba(99, 102, 241, 0.2)',
      borderRadius: '10px',
      padding: '18px',
      display: 'flex',
      flexDirection: 'column',
    },
    kpiLabel: {
      fontSize: '12px',
      color: '#94A3B8',
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: '8px',
    },
    kpiValue: {
      fontSize: '32px',
      fontWeight: '700',
      color: '#6366F1',
      margin: '0',
    },
    button: {
      padding: '8px 16px',
      background: '#6366F1',
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '600',
      transition: 'all 0.2s ease',
    },
    input: {
      padding: '8px 12px',
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '6px',
      color: '#F8FAFC',
      fontSize: '13px',
      marginBottom: '12px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '12px',
    },
    th: {
      textAlign: 'left',
      padding: '12px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      color: '#94A3B8',
      fontWeight: '600',
      fontSize: '11px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    },
  };

  // Dashboard Tab
  const DashboardTab = () => (
    <div>
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Total Customers</div>
          <div style={styles.kpiValue}>{analytics?.totalCustomers || 0}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>MRR (₹)</div>
          <div style={styles.kpiValue}>
            ₹{(analytics?.mrr || 0).toLocaleString('en-IN')}
          </div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Active Trials</div>
          <div style={styles.kpiValue}>{analytics?.trialCount || 0}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Conversion Rate</div>
          <div style={styles.kpiValue}>{analytics?.conversionRate || 0}%</div>
        </div>
      </div>

      {organizations.slice(0, 5).length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
            Recent Signups
          </h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Plan</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {organizations.slice(0, 5).map((org) => (
                <tr key={org.id}>
                  <td style={styles.td}>{org.name}</td>
                  <td style={styles.td}>{org.email}</td>
                  <td style={styles.td}>
                    <span style={{
                      background: org.plan === 'trial' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                      color: org.plan === 'trial' ? '#FBBF24' : '#6366F1',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                    }}>
                      {org.plan}
                    </span>
                  </td>
                  <td style={styles.td}>{org.status}</td>
                  <td style={styles.td}>
                    {new Date(org.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Customers Tab
  const CustomersTab = () => (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
        <input
          type="text"
          placeholder="Search customers..."
          style={{ ...styles.input, flex: 1 }}
        />
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Business Name</th>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Plan</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Trial Days Left</th>
            <th style={styles.th}>Joined</th>
          </tr>
        </thead>
        <tbody>
          {organizations.map((org) => (
            <tr key={org.id}>
              <td style={styles.td}>{org.name}</td>
              <td style={styles.td}>{org.email}</td>
              <td style={styles.td}>
                <span style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  color: '#6366F1',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                }}>
                  {org.plan}
                </span>
              </td>
              <td style={styles.td}>
                <span style={{
                  background: org.status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: org.status === 'active' ? '#22C55E' : '#EF4444',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                }}>
                  {org.status}
                </span>
              </td>
              <td style={styles.td}>{org.trialDaysRemaining || '—'}</td>
              <td style={styles.td}>
                {new Date(org.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Onboarding Tab
  const OnboardingTab = () => (
    <div>
      {createdCustomer ? (
        <div style={{
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '10px',
          padding: '20px',
          marginBottom: '24px',
        }}>
          <h3 style={{ color: '#22C55E', fontWeight: '600', marginBottom: '16px' }}>
            ✓ Customer Portal Created Successfully!
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
            {/* Portal URL */}
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '6px' }}>
                Portal URL
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  readOnly
                  value={createdCustomer.portalUrl}
                  style={{
                    ...styles.input,
                    flex: 1,
                    marginBottom: 0,
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    fontSize: '13px',
                  }}
                />
                <button
                  onClick={() => copyToClipboard(createdCustomer.portalUrl)}
                  style={{ ...styles.button, padding: '6px' }}
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            {/* Email */}
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '6px' }}>
                Email
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  readOnly
                  value={createdCustomer.email}
                  style={{
                    ...styles.input,
                    flex: 1,
                    marginBottom: 0,
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    fontSize: '13px',
                  }}
                />
                <button
                  onClick={() => copyToClipboard(createdCustomer.email)}
                  style={{ ...styles.button, padding: '6px' }}
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            {/* Temp Password */}
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '6px' }}>
                Temporary Password
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  readOnly
                  type={showPassword ? 'text' : 'password'}
                  value={createdCustomer.tempPassword}
                  style={{
                    ...styles.input,
                    flex: 1,
                    marginBottom: 0,
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    fontSize: '13px',
                  }}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ ...styles.button, padding: '6px' }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  onClick={() => copyToClipboard(createdCustomer.tempPassword)}
                  style={{ ...styles.button, padding: '6px' }}
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            {/* Magic Link */}
            {createdCustomer.magicLink && (
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '6px' }}>
                  One-Click Login Link (24hrs)
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    readOnly
                    value={createdCustomer.magicLink}
                    style={{
                      ...styles.input,
                      flex: 1,
                      marginBottom: 0,
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      fontSize: '11px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  />
                  <button
                    onClick={() => copyToClipboard(createdCustomer.magicLink)}
                    style={{ ...styles.button, padding: '6px' }}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Email Template */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
              📧 Email Template (Copy & Paste)
            </div>
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '12px',
              lineHeight: '1.6',
              fontFamily: 'monospace',
            }}>
              <div style={{ marginBottom: '12px' }}>
                <strong>Subject:</strong> Your ShopOS Account is Ready! 🎉
              </div>
              <div style={{ whiteSpace: 'pre-wrap', color: '#94A3B8' }}>
{`Hi ${createdCustomer.businessName || 'there'},

Your ShopOS business portal has been set up and is ready to use!

🔗 Portal: ${createdCustomer.portalUrl}
📧 Email: ${createdCustomer.email}
🔑 Password: ${createdCustomer.tempPassword}

Or use this one-click login link (valid 24hrs):
${createdCustomer.magicLink || 'Magic link available in credentials'}

Getting Started:
1. Login with the credentials above
2. Set up your firm details in Settings
3. Add your products and customers
4. Start creating invoices!

Need help? Reply to this email.

Best regards,
Rohit Garg
ShopOS Team`}
              </div>
            </div>
            <button
              onClick={() => {
                const template = `Subject: Your ShopOS Account is Ready! 🎉\n\nHi ${createdCustomer.businessName || 'there'},\n\nYour ShopOS business portal has been set up and is ready to use!\n\n🔗 Portal: ${createdCustomer.portalUrl}\n📧 Email: ${createdCustomer.email}\n🔑 Password: ${createdCustomer.tempPassword}\n\nOr use this one-click login link (valid 24hrs):\n${createdCustomer.magicLink || 'Magic link available'}\n\nGetting Started:\n1. Login with the credentials above\n2. Set up your firm details in Settings\n3. Add your products and customers\n4. Start creating invoices!\n\nNeed help? Reply to this email.\n\nBest regards,\nRohit Garg\nShopOS Team`;
                copyToClipboard(template);
              }}
              style={{ ...styles.button, marginTop: '12px' }}
            >
              <Copy size={14} style={{ marginRight: '6px' }} /> Copy Email Template
            </button>
          </div>

          {/* WhatsApp Share */}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Hi ${createdCustomer.businessName}, your ShopOS portal is ready! Login: ${createdCustomer.email} | Password: ${createdCustomer.tempPassword} | Portal: ${createdCustomer.portalUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...styles.button,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginRight: '12px',
              background: '#25D366',
            }}
          >
            <MessageCircle size={14} /> Share via WhatsApp
          </a>

          <button
            onClick={() => {
              setCreatedCustomer(null);
              fetchData();
            }}
            style={styles.button}
          >
            Create Another Customer
          </button>
        </div>
      ) : (
        <OnboardingForm
          onSubmit={handleCreateCustomer}
          styles={styles}
          Plus={Plus}
        />
      )}
    </div>
  );

  // Announcements Tab
  const AnnouncementsTab = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      <div>
        <AnnouncementForm
          onSubmit={handleCreateAnnouncement}
          styles={styles}
          Bell={Bell}
        />
      </div>

      <div>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
          Active Announcements
        </h3>
        {announcements.length === 0 ? (
          <div style={{ color: '#94A3B8', fontSize: '13px' }}>No announcements yet</div>
        ) : (
          announcements.map((a) => (
            <div
              key={a.id}
              style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '12px',
                borderLeft: `4px solid ${
                  a.type === 'info'
                    ? '#3B82F6'
                    : a.type === 'warning'
                      ? '#FBBF24'
                      : a.type === 'maintenance'
                        ? '#F97316'
                        : '#EF4444'
                }`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13px' }}>{a.title}</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
                    {a.message.substring(0, 50)}...
                  </div>
                </div>
                <button
                  onClick={() => toggleAnnouncement(a.id, a.is_active)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: a.is_active ? '#22C55E' : '#EF4444',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  {a.is_active ? '✓ Active' : '✗ Inactive'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Analytics Tab
  const AnalyticsTab = () => (
    <div>
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>ARR (₹)</div>
          <div style={styles.kpiValue}>
            ₹{((analytics?.arr || 0) / 10).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>New This Month</div>
          <div style={styles.kpiValue}>{analytics?.newThisMonth || 0}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Active Customers</div>
          <div style={styles.kpiValue}>{analytics?.activeCount || 0}</div>
        </div>
      </div>

      {analytics?.planDistribution && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
            Plan Distribution
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {Object.entries(analytics.planDistribution).map(([plan, count]) => (
              <div
                key={plan}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '8px' }}>
                  {plan.charAt(0).toUpperCase() + plan.slice(1)}
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#6366F1' }}>
                  {count}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Support detail component with local response state
  const SupportDetail = memo(({ ticket, onBack, styles, session }) => {
    const [response, setResponse] = useState('');
    const [messages, setMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [sendingMessage, setSendingMessage] = useState(false);

    useEffect(() => {
      const fetchMessages = async () => {
        try {
          setLoadingMessages(true);
          const res = await fetch(`/api/admin/support/${ticket.id}/messages`, {
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
            },
          });
          if (!res.ok) throw new Error('Failed to fetch messages');
          const data = await res.json();
          setMessages(data.messages || []);
        } catch (error) {
          console.error('Error fetching messages:', error);
        } finally {
          setLoadingMessages(false);
        }
      };
      if (ticket?.id) fetchMessages();
    }, [ticket?.id, session?.access_token]);

    const handleSendMessage = async () => {
      if (!response.trim()) return;

      try {
        setSendingMessage(true);
        const res = await fetch(`/api/admin/support/${ticket.id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ message: response.trim() }),
        });

        if (!res.ok) throw new Error('Failed to send message');
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        setResponse('');
      } catch (error) {
        console.error('Error sending message:', error);
        alert('Error sending message: ' + error.message);
      } finally {
        setSendingMessage(false);
      }
    };

    return (
      <div>
        <button onClick={onBack} style={{ ...styles.button, marginBottom: '16px', background: '#94A3B8' }}>
          ← Back to List
        </button>
        <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600', marginBottom: '4px' }}>CUSTOMER</div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>{ticket.customerName}</div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>{ticket.customerEmail}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600', marginBottom: '4px' }}>CREATED</div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>{new Date(ticket.createdAt).toLocaleDateString()}</div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>{new Date(ticket.createdAt).toLocaleTimeString()}</div>
            </div>
          </div>

          <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600', marginBottom: '8px' }}>TITLE</div>
            <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>{ticket.title}</div>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600', marginBottom: '8px' }}>DESCRIPTION</div>
            <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#E2E8F0' }}>{ticket.description}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600', marginBottom: '4px' }}>CATEGORY</div>
              <div style={{ fontSize: '13px', fontWeight: '600' }}>{ticket.category}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600', marginBottom: '4px' }}>PRIORITY</div>
              <span style={{
                background: ticket.priority === 'high' || ticket.priority === 'urgent'
                  ? 'rgba(239, 68, 68, 0.2)'
                  : 'rgba(99, 102, 241, 0.2)',
                color: ticket.priority === 'high' || ticket.priority === 'urgent'
                  ? '#EF4444'
                  : '#6366F1',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                display: 'inline-block',
              }}>
                {ticket.priority}
              </span>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600', marginBottom: '4px' }}>STATUS</div>
              <select
                defaultValue={ticket.status}
                style={{ ...styles.input, marginBottom: 0 }}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600', marginBottom: '12px' }}>CONVERSATION</div>
            <div style={{
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              padding: '16px',
              maxHeight: '300px',
              overflowY: 'auto',
              marginBottom: '16px',
              minHeight: '100px',
            }}>
              {loadingMessages ? (
                <div style={{ color: '#94A3B8', fontSize: '12px' }}>Loading messages...</div>
              ) : messages.length === 0 ? (
                <div style={{ color: '#94A3B8', fontSize: '12px' }}>No messages yet. Send a response to the customer.</div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#6366F1' }}>
                      {msg.senderEmail === session?.user?.email ? '👤 You' : `👥 ${msg.senderName}`}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>
                      {new Date(msg.createdAt).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '13px', color: '#E2E8F0', whiteSpace: 'pre-wrap' }}>{msg.message}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600', marginBottom: '8px' }}>YOUR RESPONSE</div>
            <textarea
              autoComplete="off"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Type your response to the customer..."
              style={{ ...styles.input, minHeight: '100px', fontFamily: 'monospace', marginBottom: '12px' }}
            />
            <button
              onClick={handleSendMessage}
              disabled={sendingMessage || !response.trim()}
              style={{
                ...styles.button,
                width: '100%',
                opacity: sendingMessage || !response.trim() ? 0.5 : 1,
                cursor: sendingMessage || !response.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {sendingMessage ? 'Sending...' : '✉️ Send Response to Customer'}
            </button>
          </div>
        </div>
      </div>
    );
  });

  // Support Tab
  const DemoRequestsTab = () => {
    const filteredRequests = demoRequests.filter(req =>
      demoRequestFilter === 'all' ? true : req.status === demoRequestFilter
    );

    const getStatusBadge = (status) => {
      const colors = {
        pending: { bg: 'rgba(234, 179, 8, 0.1)', color: '#EAB308' },
        contacted: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' },
        converted: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22C55E' },
        rejected: { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' },
      };
      const c = colors[status] || colors.pending;
      return (
        <span style={{
          background: c.bg,
          color: c.color,
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '600',
        }}>
          {status}
        </span>
      );
    };

    return (
      <div>
        {selectedDemoRequest ? (
          <div>
            <button
              onClick={() => setSelectedDemoRequest(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#6366F1',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '16px',
              }}
            >
              ← Back
            </button>
            <div style={{ ...styles.card, marginTop: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#F8FAFC' }}>
                Demo Request Details
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600' }}>Name</label>
                  <p style={{ color: '#F8FAFC', marginTop: '4px' }}>{selectedDemoRequest.name}</p>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600' }}>Email</label>
                  <a href={`mailto:${selectedDemoRequest.email}`} style={{ color: '#6366F1', marginTop: '4px', display: 'block' }}>
                    {selectedDemoRequest.email}
                  </a>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600' }}>Contact</label>
                  <a href={`tel:${selectedDemoRequest.contact_number}`} style={{ color: '#6366F1', marginTop: '4px', display: 'block' }}>
                    {selectedDemoRequest.contact_number}
                  </a>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600' }}>City</label>
                  <p style={{ color: '#F8FAFC', marginTop: '4px' }}>{selectedDemoRequest.city}</p>
                </div>
                {selectedDemoRequest.company_name && (
                  <div>
                    <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600' }}>Company</label>
                    <p style={{ color: '#F8FAFC', marginTop: '4px' }}>{selectedDemoRequest.company_name}</p>
                  </div>
                )}
                {selectedDemoRequest.message && (
                  <div>
                    <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600' }}>Message</label>
                    <p style={{ color: '#94A3B8', fontSize: '13px', marginTop: '4px' }}>{selectedDemoRequest.message}</p>
                  </div>
                )}
              </div>
              <div style={{ marginTop: '24px' }}>
                <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600', display: 'block', marginBottom: '8px' }}>Status</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['pending', 'contacted', 'converted', 'rejected'].map(status => (
                    <button
                      key={status}
                      onClick={async () => {
                        try {
                          await api.patch(`/api/demo-request/${selectedDemoRequest.id}`, { status });
                          await fetchData();
                          setSelectedDemoRequest(null);
                        } catch (error) {
                          alert('Error updating status: ' + error.message);
                        }
                      }}
                      disabled={selectedDemoRequest.status === status}
                      style={{
                        background: selectedDemoRequest.status === status ? '#475569' : '#6366F1',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: selectedDemoRequest.status === status ? 'not-allowed' : 'pointer',
                        opacity: selectedDemoRequest.status === status ? 0.5 : 1,
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {['all', 'pending', 'contacted', 'converted', 'rejected'].map(status => (
                <button
                  key={status}
                  onClick={() => setDemoRequestFilter(status)}
                  style={{
                    background: demoRequestFilter === status ? '#6366F1' : '#1F2937',
                    color: '#fff',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Contact</th>
                  <th style={styles.th}>City</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
                  <tr key={req.id}>
                    <td style={styles.td}>
                      <div>{req.name}</div>
                      {req.company_name && <div style={{ fontSize: '11px', color: '#94A3B8' }}>{req.company_name}</div>}
                    </td>
                    <td style={styles.td}>{req.email}</td>
                    <td style={styles.td}>{req.contact_number}</td>
                    <td style={styles.td}>{req.city}</td>
                    <td style={styles.td}>{getStatusBadge(req.status)}</td>
                    <td style={styles.td}>
                      {new Date(req.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => setSelectedDemoRequest(req)}
                        style={{
                          background: '#6366F1',
                          color: '#fff',
                          border: 'none',
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const SupportTab = () => (
    <div>
      {selectedTicket ? (
        <SupportDetail
          ticket={selectedTicket}
          onBack={() => setSelectedTicket(null)}
          styles={styles}
          session={session}
        />
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Customer</th>
              <th style={styles.th}>Title</th>
              <th style={styles.th}>Category</th>
              <th style={styles.th}>Priority</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {supportTickets.map((ticket) => (
              <tr key={ticket.id}>
                <td style={styles.td}>{ticket.customerName}</td>
                <td style={styles.td}>{ticket.title}</td>
                <td style={styles.td}>{ticket.category}</td>
                <td style={styles.td}>
                  <span style={{
                    background: ticket.priority === 'high' || ticket.priority === 'urgent'
                      ? 'rgba(239, 68, 68, 0.1)'
                      : 'rgba(99, 102, 241, 0.1)',
                    color: ticket.priority === 'high' || ticket.priority === 'urgent'
                      ? '#EF4444'
                      : '#6366F1',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                  }}>
                    {ticket.priority}
                  </span>
                </td>
                <td style={styles.td}>{ticket.status}</td>
                <td style={styles.td}>
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </td>
                <td style={styles.td}>
                  <button
                    onClick={() => setSelectedTicket(ticket)}
                    style={{
                      background: '#6366F1',
                      color: '#fff',
                      border: 'none',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>ShopOS Admin</h1>
        <button
          onClick={handleLogout}
          style={{ ...styles.button, background: '#EF4444' }}
        >
          <LogOut size={14} style={{ marginRight: '6px' }} /> Logout
        </button>
      </div>

      <div style={styles.tabs}>
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'customers', label: 'Customers', icon: Users },
          { id: 'onboarding', label: 'Onboarding', icon: Plus },
          { id: 'announcements', label: 'Announcements', icon: Bell },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp },
          { id: 'demo-requests', label: 'Demo Requests', icon: MessageSquare },
          { id: 'support', label: 'Support', icon: MessageSquare },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={styles.tab(activeTab === tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={styles.card}>
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'customers' && <CustomersTab />}
        {activeTab === 'onboarding' && <OnboardingTab />}
        {activeTab === 'announcements' && <AnnouncementsTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'demo-requests' && <DemoRequestsTab />}
        {activeTab === 'support' && <SupportTab />}
      </div>
    </div>
  );
}
