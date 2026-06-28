'use client';

import { useState } from 'react';

export default function RequestDemo() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact_number: '',
    city: '',
    company_name: '',
    message: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit demo request');
      }

      setSubmitted(true);
      setFormData({ name: '', email: '', contact_number: '', city: '', company_name: '', message: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <div style={styles.box}>
          {!submitted ? (
            <>
              <h1 style={styles.title}>Request a Demo</h1>
              <p style={styles.subtitle}>
                Schedule a personalized demo of Shopos. Fill in your details and we'll get back to you shortly.
              </p>

              {error && (
                <div style={styles.error}>❌ {error}</div>
              )}

              <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Your name"
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="your@email.com"
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Mobile Number *</label>
                  <input
                    type="tel"
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleChange}
                    required
                    placeholder="+91 9876543210"
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    placeholder="Your city"
                    style={styles.input}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    ...styles.button,
                    opacity: loading ? 0.6 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? '⏳ Submitting...' : '📅 Request Demo'}
                </button>
              </form>

              <p style={styles.footer}>
                We'll send you a link to schedule your demo. No credit card required.
              </p>
            </>
          ) : (
            <>
              <div style={styles.successIcon}>✅</div>
              <h1 style={styles.successTitle}>Demo Request Submitted!</h1>
              <p style={styles.successText}>
                Thank you for your interest! We'll reach out to <strong>{formData.email}</strong> shortly to confirm your demo slot.
              </p>
              <p style={styles.successSubtext}>
                Expected response: Within 24 hours
              </p>
              <a href="/" style={styles.backLink}>← Back to Home</a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f4f1',
    padding: '20px',
    marginTop: '64px',
  },
  wrapper: {
    width: '100%',
    maxWidth: '500px',
  },
  box: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '40px',
    boxShadow: '0 10px 40px rgba(10, 10, 15, 0.1)',
    border: '1px solid rgba(10, 10, 15, 0.08)',
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#0a0a0f',
    marginBottom: '12px',
    fontFamily: "'Syne', sans-serif",
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b6b80',
    marginBottom: '24px',
    lineHeight: '1.6',
  },
  error: {
    background: '#ffe4e6',
    border: '1px solid #f87171',
    color: '#e11d48',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  form: {
    marginBottom: '24px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#0a0a0f',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '14px',
    border: '1.5px solid rgba(10, 10, 15, 0.12)',
    borderRadius: '8px',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '14px 20px',
    fontSize: '15px',
    fontWeight: '600',
    background: '#0a0a0f',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'all 0.2s',
  },
  footer: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#9898a8',
    marginTop: '16px',
  },
  successIcon: {
    fontSize: '48px',
    textAlign: 'center',
    marginBottom: '20px',
  },
  successTitle: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#0a0a0f',
    marginBottom: '16px',
    textAlign: 'center',
    fontFamily: "'Syne', sans-serif",
  },
  successText: {
    fontSize: '15px',
    color: '#0a0a0f',
    lineHeight: '1.6',
    marginBottom: '12px',
    textAlign: 'center',
  },
  successSubtext: {
    fontSize: '13px',
    color: '#6b6b80',
    textAlign: 'center',
    marginBottom: '28px',
  },
  backLink: {
    display: 'inline-block',
    padding: '12px 20px',
    background: '#f5f4f1',
    color: '#0a0a0f',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'background 0.2s',
    width: '100%',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
};
