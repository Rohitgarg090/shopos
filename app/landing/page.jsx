'use client';
import { ArrowRight, CheckCircle, Zap, BarChart3, Smartphone, Shield, Camera, FileText, Users, Truck, TrendingUp, Bell, Scan, Layers } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function LandingPage() {
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [email, setEmail] = useState('');

  const handleShowInterest = (e) => {
    e.preventDefault();
    if (email) {
      alert(`Thanks for your interest! We'll contact you at ${email}`);
      setEmail('');
      setShowInterestModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            ShopOS
          </div>
          <div className="flex gap-8 items-center">
            <a href="#features" className="text-slate-400 hover:text-white transition">Features</a>
            <a href="#how-it-works" className="text-slate-400 hover:text-white transition">How It Works</a>
            <a href="#pricing" className="text-slate-400 hover:text-white transition">Pricing</a>
            <a href="/auth" className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition">Login</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-6 inline-block px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full">
            <span className="text-cyan-400 text-sm font-semibold">🚀 The Modern GST-Ready Invoicing Solution</span>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            Invoice Smarter,
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              Not Harder
            </span>
          </h1>

          <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
            Scan supplier invoices. Generate e-way bills. File GST returns. Manage your business with one powerful platform built for India's businesses.
          </p>

          <div className="flex flex-col md:flex-row gap-4 justify-center mb-16">
            <Link href="/auth">
              <button className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-lg font-bold text-lg transition transform hover:scale-105 shadow-lg shadow-cyan-500/50">
                Start Free Trial (14 days) →
              </button>
            </Link>
            <button
              onClick={() => setShowInterestModal(true)}
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-bold text-lg transition"
            >
              Schedule Demo
            </button>
          </div>

          <p className="text-slate-500">
            ✓ No credit card required  •  ✓ 14-day free trial  •  ✓ Cancel anytime
          </p>
        </div>

        {/* Hero Image / Visual */}
        <div className="max-w-5xl mx-auto mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-purple-600/20 blur-3xl -z-10 rounded-3xl"></div>
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="text-3xl font-bold text-cyan-400">1000+</div>
                <div className="text-sm text-slate-400">Businesses Using</div>
              </div>
              <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="text-3xl font-bold text-blue-400">10M+</div>
                <div className="text-sm text-slate-400">Invoices Created</div>
              </div>
              <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="text-3xl font-bold text-purple-400">₹500Cr+</div>
                <div className="text-sm text-slate-400">Billed Successfully</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section id="features" className="py-20 px-4 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Powerful Features Built for India</h2>
            <p className="text-slate-400 text-xl">Everything you need to manage invoices, compliance, and payments</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Scan Invoices */}
            <div className="group p-8 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl hover:border-cyan-500/50 transition hover:shadow-lg hover:shadow-cyan-500/20">
              <div className="w-14 h-14 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-cyan-500/30 transition">
                <Camera size={28} className="text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Scan Supplier Invoices</h3>
              <p className="text-slate-400">
                Snap a photo of supplier invoices. AI extracts details automatically. No manual data entry. Save 10+ hours/week.
              </p>
            </div>

            {/* Feature 2: E-way Bills */}
            <div className="group p-8 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl hover:border-blue-500/50 transition hover:shadow-lg hover:shadow-blue-500/20">
              <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition">
                <FileText size={28} className="text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">E-way Bill Integration</h3>
              <p className="text-slate-400">
                Generate e-way bills directly from invoices. Compliant with GST requirements. One-click generation for B2B shipments.
              </p>
            </div>

            {/* Feature 3: WhatsApp Delivery */}
            <div className="group p-8 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl hover:border-green-500/50 transition hover:shadow-lg hover:shadow-green-500/20">
              <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-500/30 transition">
                <Smartphone size={28} className="text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">WhatsApp Invoice Delivery</h3>
              <p className="text-slate-400">
                Send invoices directly via WhatsApp. Higher open rates. Customers can share instantly. Built-in & hassle-free.
              </p>
            </div>

            {/* Feature 4: Bank Sync */}
            <div className="group p-8 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl hover:border-purple-500/50 transition hover:shadow-lg hover:shadow-purple-500/20">
              <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition">
                <TrendingUp size={28} className="text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Bank Reconciliation</h3>
              <p className="text-slate-400">
                Auto-match invoices with bank transactions. Reconcile payments in seconds. Always know your true cash position.
              </p>
            </div>

            {/* Feature 5: Analytics */}
            <div className="group p-8 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl hover:border-orange-500/50 transition hover:shadow-lg hover:shadow-orange-500/20">
              <div className="w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-500/30 transition">
                <BarChart3 size={28} className="text-orange-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Advanced Analytics</h3>
              <p className="text-slate-400">
                Real-time revenue tracking. Customer insights. Payment trends. Beautiful dashboards. Data-driven decisions.
              </p>
            </div>

            {/* Feature 6: Team Management */}
            <div className="group p-8 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl hover:border-pink-500/50 transition hover:shadow-lg hover:shadow-pink-500/20">
              <div className="w-14 h-14 bg-pink-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-pink-500/30 transition">
                <Users size={28} className="text-pink-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Team & Permissions</h3>
              <p className="text-slate-400">
                Invite team members with role-based access. Owner, Manager, Accountant, Staff roles. Control who sees what.
              </p>
            </div>

            {/* Feature 7: Multi-Firm */}
            <div className="group p-8 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl hover:border-indigo-500/50 transition hover:shadow-lg hover:shadow-indigo-500/20">
              <div className="w-14 h-14 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-500/30 transition">
                <Layers size={28} className="text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Multiple Firms</h3>
              <p className="text-slate-400">
                Manage multiple businesses from one account. Different invoicing for each firm. Separate analytics and reports.
              </p>
            </div>

            {/* Feature 8: POS Integration */}
            <div className="group p-8 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl hover:border-red-500/50 transition hover:shadow-lg hover:shadow-red-500/20">
              <div className="w-14 h-14 bg-red-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-red-500/30 transition">
                <Zap size={28} className="text-red-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">POS / Retail Sales</h3>
              <p className="text-slate-400">
                Built-in point-of-sale system. Create bills instantly at counter. Inventory tracking. Works online & offline.
              </p>
            </div>

            {/* Feature 9: GST Ready */}
            <div className="group p-8 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl hover:border-teal-500/50 transition hover:shadow-lg hover:shadow-teal-500/20">
              <div className="w-14 h-14 bg-teal-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-teal-500/30 transition">
                <Shield size={28} className="text-teal-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">GST Compliance</h3>
              <p className="text-slate-400">
                Auto-calculate GST. Tax-ready invoices. GSTR compliance. GST return filing (coming soon).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section id="comparison" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Choose ShopOS?</h2>
            <p className="text-slate-400 text-xl">See how we compare to traditional solutions</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-4 px-4 font-bold">Feature</th>
                  <th className="text-center py-4 px-4 font-bold text-cyan-400">ShopOS</th>
                  <th className="text-center py-4 px-4 font-bold text-slate-400">Zoho Books</th>
                  <th className="text-center py-4 px-4 font-bold text-slate-400">Tally</th>
                  <th className="text-center py-4 px-4 font-bold text-slate-400">Excel / Quickbooks</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: '📸 Scan Invoices (OCR)', shopos: true, zoho: false, tally: false, excel: false },
                  { feature: '📱 WhatsApp Delivery', shopos: true, zoho: false, tally: false, excel: false },
                  { feature: '🛣️ E-way Bill Integration', shopos: true, zoho: false, tally: true, excel: false },
                  { feature: '💰 GST Compliance Ready', shopos: true, zoho: true, tally: true, excel: false },
                  { feature: '🏪 Built-in POS', shopos: true, zoho: false, tally: false, excel: false },
                  { feature: '🏢 Multiple Firms', shopos: true, zoho: false, tally: false, excel: false },
                  { feature: '🔗 Bank Reconciliation', shopos: true, zoho: true, tally: true, excel: false },
                  { feature: '📊 Advanced Analytics', shopos: true, zoho: true, tally: true, excel: false },
                  { feature: '👥 Team Management', shopos: true, zoho: true, tally: false, excel: false },
                  { feature: 'Modern Web UI', shopos: true, zoho: true, tally: false, excel: false },
                  { feature: '📞 WhatsApp Support', shopos: true, zoho: false, tally: false, excel: false },
                  { feature: '💰 Per Invoice Cost', shopos: false, zoho: false, tally: false, excel: false },
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-800 hover:bg-slate-900/50">
                    <td className="py-4 px-4 font-semibold text-slate-300">{row.feature}</td>
                    <td className="text-center py-4 px-4">
                      {row.feature === '💰 Per Invoice Cost' ? (
                        <span className="text-green-400 font-bold">Free</span>
                      ) : row.shopos ? (
                        <CheckCircle size={20} className="text-green-400 mx-auto" />
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="text-center py-4 px-4">
                      {row.zoho ? (
                        <CheckCircle size={20} className="text-slate-600 mx-auto" />
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="text-center py-4 px-4">
                      {row.tally ? (
                        <CheckCircle size={20} className="text-slate-600 mx-auto" />
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="text-center py-4 px-4">
                      {row.excel ? (
                        <CheckCircle size={20} className="text-slate-600 mx-auto" />
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 bg-gradient-to-b from-transparent via-slate-900/30 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Get Started in 3 Steps</h2>
            <p className="text-slate-400 text-xl">From zero to invoicing in 5 minutes</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-2xl p-8 h-full">
                <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">
                  1
                </div>
                <h3 className="text-2xl font-bold mb-3">Sign Up Free</h3>
                <p className="text-slate-400">
                  Create account in 2 minutes. No credit card needed. Get instant access to all features for 14 days.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-2xl p-8 h-full">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">
                  2
                </div>
                <h3 className="text-2xl font-bold mb-3">Add Your Business</h3>
                <p className="text-slate-400">
                  Enter basic info: Name, GST number, bank details. Invite team members with different roles. Done!
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-2xl p-8 h-full">
                <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">
                  3
                </div>
                <h3 className="text-2xl font-bold mb-3">Create & Send</h3>
                <p className="text-slate-400">
                  Create invoice in 30 seconds. Send via email, WhatsApp, or portal. Track payments automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-400 text-xl">No hidden fees. No per-invoice costs. No payment gateway charges.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Starter',
                price: '₹799',
                period: '/month',
                description: 'Perfect for small businesses',
                features: [
                  '1 Business/Firm',
                  '2 Team Members',
                  'Unlimited Invoices',
                  'Basic Analytics',
                  'Customer Management',
                  'Email Support',
                  'Scan Invoices (5/month)',
                ],
                cta: 'Get Started',
              },
              {
                name: 'Business',
                price: '₹1,499',
                period: '/month',
                description: 'For growing teams',
                popular: true,
                features: [
                  'Everything in Starter',
                  '3 Businesses/Firms',
                  '5 Team Members',
                  'Advanced Analytics',
                  'Supplier Management',
                  'Bank Reconciliation',
                  'Unlimited Scans',
                  'E-way Bill Generation',
                  'Priority Support',
                ],
                cta: 'Get Started',
              },
              {
                name: 'Pro',
                price: '₹2,499',
                period: '/month',
                description: 'For enterprises',
                features: [
                  'Everything in Business',
                  'Unlimited Businesses',
                  'Unlimited Team Members',
                  'API Access',
                  'Data Migration',
                  'Custom Workflows',
                  'Dedicated Account Manager',
                  'Phone Support',
                  'GST Filing (when available)',
                ],
                cta: 'Contact Sales',
              },
            ].map((plan, idx) => (
              <div key={idx} className={`relative rounded-2xl p-8 transition ${
                plan.popular
                  ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500 shadow-lg shadow-cyan-500/20 scale-105'
                  : 'bg-slate-800/50 border border-slate-700/50 hover:border-slate-600'
              }`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-1 rounded-full text-sm font-bold">
                      Most Popular
                    </span>
                  </div>
                )}

                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-slate-400 text-sm mb-4">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-slate-400">{plan.period}</span>
                </div>

                <button className={`w-full py-3 rounded-lg font-bold mb-6 transition ${
                  plan.popular
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}>
                  {plan.cta}
                </button>

                <div className="space-y-3">
                  {plan.features.map((feature, fidx) => (
                    <div key={fidx} className="flex items-start gap-3">
                      <CheckCircle size={18} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Transform Your Invoicing?</h2>
          <p className="text-xl text-slate-400 mb-8">
            Join 1000+ businesses already using ShopOS. 14-day free trial. No credit card required.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link href="/auth">
              <button className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-lg font-bold text-lg transition transform hover:scale-105 shadow-lg shadow-cyan-500/50">
                Start Free Trial Now →
              </button>
            </Link>
            <button
              onClick={() => setShowInterestModal(true)}
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-bold text-lg transition"
            >
              Schedule a Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-4">ShopOS</h3>
              <p className="text-slate-400 text-sm">Modern invoicing for Indian businesses</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
                <li><a href="#" className="hover:text-white transition">Status</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-400">
            <p>&copy; 2024 ShopOS. All rights reserved. Made for Indian businesses. 🇮🇳</p>
          </div>
        </div>
      </footer>

      {/* Show Interest Modal */}
      {showInterestModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-4">Schedule a Demo</h3>
            <p className="text-slate-400 mb-6">
              See ShopOS in action. Our team will help you get started.
            </p>
            <form onSubmit={handleShowInterest} className="space-y-4">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg font-bold hover:from-cyan-600 hover:to-blue-700 transition"
              >
                Get Demo Link
              </button>
            </form>
            <button
              onClick={() => setShowInterestModal(false)}
              className="mt-4 w-full text-slate-400 hover:text-white transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
