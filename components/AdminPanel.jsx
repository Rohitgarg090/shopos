'use client';

import React, { useState, useEffect } from 'react';
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

export default function AdminPanel({ session }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [organizations, setOrganizations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createdCustomer, setCreatedCustomer] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    email: '',
    businessName: '',
    phone: '',
    plan: 'trial',
  });

  const [newAnnouncementForm, setNewAnnouncementForm] = useState({
    title: '',
    message: '',
    type: 'info',
    target: 'all',
    targetOrgIds: [],
    showUntil: '',
  });

  const api = {
    get: async (url) => {
      const token = session?.access_token;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
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
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session]);

  const handleCreateCustomer = async () => {
    if (!newCustomerForm.email || !newCustomerForm.businessName) {
      alert('Email and business name are required');
      return;
    }

    try {
      const result = await api.post('/api/admin/organizations', newCustomerForm);
      setCreatedCustomer(result);
      setNewCustomerForm({ name: '', email: '', businessName: '', phone: '', plan: 'trial' });
      await fetchData();
    } catch (error) {
      alert('Error creating customer: ' + error.message);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncementForm.title || !newAnnouncementForm.message) {
      alert('Title and message are required');
      return;
    }

    try {
      await api.post('/api/admin/announcements', newAnnouncementForm);
      setNewAnnouncementForm({
        title: '',
        message: '',
        type: 'info',
        target: 'all',
        targetOrgIds: [],
        showUntil: '',
      });
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
              setNewCustomerForm({ name: '', email: '', businessName: '', phone: '', plan: 'trial' });
              fetchData();
            }}
            style={styles.button}
          >
            Create Another Customer
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
              Create New Customer
            </h3>
            <input
              placeholder="Contact Name"
              value={newCustomerForm.name}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
              style={styles.input}
            />
            <input
              placeholder="Email"
              value={newCustomerForm.email}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
              style={styles.input}
            />
            <input
              placeholder="Business Name"
              value={newCustomerForm.businessName}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, businessName: e.target.value })}
              style={styles.input}
            />
            <input
              placeholder="Phone"
              value={newCustomerForm.phone}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
              style={styles.input}
            />
            <select
              value={newCustomerForm.plan}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, plan: e.target.value })}
              style={styles.input}
            >
              <option value="trial">Trial (14 days)</option>
              <option value="free">Free</option>
              <option value="starter">Starter - ₹799/mo</option>
              <option value="business">Business - ₹1499/mo</option>
              <option value="pro">Pro - ₹2499/mo</option>
            </select>
            <button
              onClick={handleCreateCustomer}
              style={{ ...styles.button, width: '100%' }}
            >
              <Plus size={14} style={{ marginRight: '6px' }} /> Create Portal
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Announcements Tab
  const AnnouncementsTab = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      <div>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
          New Announcement
        </h3>
        <input
          placeholder="Title"
          value={newAnnouncementForm.title}
          onChange={(e) => setNewAnnouncementForm({ ...newAnnouncementForm, title: e.target.value })}
          style={styles.input}
        />
        <textarea
          placeholder="Message"
          value={newAnnouncementForm.message}
          onChange={(e) => setNewAnnouncementForm({ ...newAnnouncementForm, message: e.target.value })}
          style={{ ...styles.input, minHeight: '100px', fontFamily: 'monospace' }}
        />
        <select
          value={newAnnouncementForm.type}
          onChange={(e) => setNewAnnouncementForm({ ...newAnnouncementForm, type: e.target.value })}
          style={styles.input}
        >
          <option value="info">ℹ️ Info</option>
          <option value="warning">⚠️ Warning</option>
          <option value="maintenance">🔧 Maintenance</option>
          <option value="critical">🚨 Critical</option>
        </select>
        <select
          value={newAnnouncementForm.target}
          onChange={(e) => setNewAnnouncementForm({ ...newAnnouncementForm, target: e.target.value })}
          style={styles.input}
        >
          <option value="all">All Customers</option>
          <option value="trial">Trial Only</option>
          <option value="active">Active Only</option>
          <option value="specific">Specific Customers</option>
        </select>
        <input
          type="datetime-local"
          placeholder="Show Until"
          value={newAnnouncementForm.showUntil}
          onChange={(e) => setNewAnnouncementForm({ ...newAnnouncementForm, showUntil: e.target.value })}
          style={styles.input}
        />
        <button
          onClick={handleCreateAnnouncement}
          style={{ ...styles.button, width: '100%' }}
        >
          <Bell size={14} style={{ marginRight: '6px' }} /> Create Announcement
        </button>
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

  // Support Tab
  const SupportTab = () => (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Customer</th>
          <th style={styles.th}>Title</th>
          <th style={styles.th}>Category</th>
          <th style={styles.th}>Priority</th>
          <th style={styles.th}>Status</th>
          <th style={styles.th}>Date</th>
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
          </tr>
        ))}
      </tbody>
    </table>
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
        {activeTab === 'support' && <SupportTab />}
      </div>
    </div>
  );
}
