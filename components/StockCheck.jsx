'use client';
import React, { useState } from 'react';
import { Search, X, Plus, Minus } from 'lucide-react';

const BL = '#1B5E8A', BLL = '#E3EFF8', GR = '#2E6B1F', GRL = '#EBF5E4', AMB = '#B8690A', AMBL = '#FDF0E0', RD = '#9B2626', RDL = '#FDF0F0', BORD = '#E3E1D9', MUT = '#888', TXT = '#1A1A18', BG = '#F5F4F0';

export default function StockCheck({ products, onSelectItem, onClose, mobile }) {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [quantities, setQuantities] = useState({});

  // Filter products
  const filtered = products.filter(p => {
    const matchesSearch =
      (p.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (p.sku?.includes(search)) ||
      (p.articleNo?.toLowerCase() || '').includes(search.toLowerCase());

    const matchesCat = selectedCat === 'All' || p.cat === selectedCat;

    return matchesSearch && matchesCat;
  });

  // Group by category
  const categories = [...new Set(products.map(p => p.cat))];

  const getStockStatus = (qty) => {
    if (qty === 0) return { status: 'Out', color: RD, bg: RDL, icon: '❌' };
    if (qty <= 10) return { status: 'Low', color: AMB, bg: AMBL, icon: '⚠️' };
    return { status: 'In Stock', color: GR, bg: GRL, icon: '✅' };
  };

  const handleAdd = (product) => {
    const currentQty = quantities[product.id] || 0;
    if (currentQty < product.qty) {
      setQuantities({ ...quantities, [product.id]: currentQty + 1 });
    }
  };

  const handleRemove = (product) => {
    const currentQty = quantities[product.id] || 0;
    if (currentQty > 0) {
      setQuantities({ ...quantities, [product.id]: currentQty - 1 });
    }
  };

  const handleConfirm = (product) => {
    const qty = quantities[product.id] || 0;
    if (qty > 0) {
      onSelectItem({ ...product, qty });
    }
  };

  return (
    <div
      style={{
        position: mobile ? 'fixed' : 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'flex-end',
        zIndex: 9998,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 600,
          background: '#fff',
          borderRadius: mobile ? '20px 20px 0 0' : 12,
          maxHeight: mobile ? '90vh' : '80vh',
          overflowY: 'auto',
          padding: 16,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: TXT }}>📦 Check Stock</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: MUT }}>
            ×
          </button>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Search product name, SKU, article no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '0.5px solid ' + BORD,
              borderRadius: 8,
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {['All', ...categories].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              style={{
                padding: '6px 12px',
                background: selectedCat === cat ? BL : '#f0f0f0',
                color: selectedCat === cat ? '#fff' : TXT,
                border: 'none',
                borderRadius: 20,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: MUT }}>
            No products found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(product => {
              const status = getStockStatus(product.qty);
              const qty = quantities[product.id] || 0;

              return (
                <div
                  key={product.id}
                  style={{
                    padding: 12,
                    border: '0.5px solid ' + BORD,
                    borderRadius: 8,
                    background: '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: TXT, marginBottom: 2 }}>
                        {product.name}
                      </div>
                      <div style={{ fontSize: 10, color: MUT, marginBottom: 4 }}>
                        SKU: {product.sku} {product.articleNo && `• Art: ${product.articleNo}`}
                      </div>
                      <div
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          background: status.bg,
                          border: '0.5px solid ' + status.color,
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          color: status.color,
                        }}
                      >
                        {status.icon} {status.status}: {product.qty} pcs
                      </div>
                    </div>

                    {/* Qty Selector */}
                    {product.qty > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          marginLeft: 8,
                        }}
                      >
                        <button
                          onClick={() => handleRemove(product)}
                          disabled={qty === 0}
                          style={{
                            width: 28,
                            height: 28,
                            padding: 0,
                            background: qty === 0 ? '#f0f0f0' : BL,
                            color: qty === 0 ? MUT : '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: qty === 0 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                          }}
                        >
                          −
                        </button>
                        <div style={{ width: 28, textAlign: 'center', fontWeight: 700, fontSize: 12 }}>
                          {qty}
                        </div>
                        <button
                          onClick={() => handleAdd(product)}
                          disabled={qty >= product.qty}
                          style={{
                            width: 28,
                            height: 28,
                            padding: 0,
                            background: qty >= product.qty ? '#f0f0f0' : BL,
                            color: qty >= product.qty ? MUT : '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: qty >= product.qty ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                          }}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Add button */}
                  {qty > 0 && (
                    <button
                      onClick={() => handleConfirm(product)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: GR,
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        marginTop: 8,
                      }}
                    >
                      ✓ Add {qty} to Invoice
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
