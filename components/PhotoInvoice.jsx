'use client';
import React, { useState, useRef } from 'react';
import { Camera, X, Edit2, Trash2, Plus } from 'lucide-react';

const BL = '#1B5E8A', BLL = '#E3EFF8', GR = '#2E6B1F', GRL = '#EBF5E4', RD = '#9B2626', RDL = '#FDF0F0', AMB = '#B8690A', AMBL = '#FDF0E0', BORD = '#E3E1D9', MUT = '#888', TXT = '#1A1A18', BG = '#F5F4F0';
const fmt = n => 'Rs.' + Number(n || 0).toFixed(2);

export default function PhotoInvoice({ firmGeminiKey, onItemsExtracted, onClose }) {
  const [stage, setStage] = useState('capture'); // 'capture' | 'preview' | 'extracting' | 'review'
  const [image, setImage] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStage('preview');
        setError(null);
      }
    } catch (err) {
      setError(err.message || 'Camera access denied');
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setImage(imageDataUrl);

    // Stop video stream
    if (video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
    }

    // Extract items
    await extractItems(imageDataUrl);
  };

  const extractItems = async (imageDataUrl) => {
    if (!firmGeminiKey) {
      setError('Add your Gemini API key in Settings first');
      return;
    }

    setExtracting(true);
    setError(null);
    setStage('extracting');

    try {
      // Convert data URL to base64
      const base64 = imageDataUrl.split(',')[1];

      const res = await fetch('/api/extract-invoice-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getToken()}`,
          'x-firm-id': firmGeminiKey, // Using as placeholder, actual firm ID should come from parent
        },
        body: JSON.stringify({
          imageBase64: base64,
          geminiKey: firmGeminiKey,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to extract items');
      }

      const data = await res.json();
      setItems(data.items || []);
      setStage('review');
    } catch (err) {
      console.error('[PhotoInvoice] Extract error:', err);
      setError(err.message);
      setStage('capture');
    } finally {
      setExtracting(false);
    }
  };

  const getToken = async () => {
    // This would normally get from session
    // For now, return empty (parent should pass token via props)
    return '';
  };

  const editItem = (item) => {
    setEditingId(item.id || items.indexOf(item));
    setEditForm({ ...item });
  };

  const saveEdit = () => {
    const idx = editingId;
    const updated = [...items];
    updated[idx] = {
      ...items[idx],
      name: editForm.name,
      quantity: parseInt(editForm.quantity) || 1,
      unitPrice: parseFloat(editForm.unitPrice) || 0,
    };
    setItems(updated);
    setEditingId(null);
  };

  const deleteItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        name: '',
        quantity: 1,
        unitPrice: 0,
        confidence: 1,
      },
    ]);
  };

  const confirmItems = () => {
    if (items.length === 0) {
      setError('Add at least one item');
      return;
    }
    onItemsExtracted(items);
  };

  const S_card = {
    background: '#fff',
    border: '0.5px solid ' + BORD,
    borderRadius: 12,
    padding: '16px 20px',
  };

  const S_btn = (variant = 'primary', small = false) => {
    const styles = {
      primary: { bg: BL, co: '#fff' },
      secondary: { bg: '#f0f0f0', co: TXT },
      danger: { bg: RDL, co: RD },
      success: { bg: GRL, co: GR },
    };
    const s = styles[variant] || styles.primary;
    return {
      background: s.bg,
      color: s.co,
      border: 'none',
      padding: small ? '6px 10px' : '10px 16px',
      borderRadius: 8,
      cursor: 'pointer',
      fontSize: small ? 11 : 13,
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
    };
  };

  const S_inp = {
    width: '100%',
    padding: '8px 10px',
    border: '0.5px solid ' + BORD,
    borderRadius: 6,
    fontSize: 12,
    boxSizing: 'border-box',
  };

  if (stage === 'capture') {
    return (
      <div style={{ ...S_card, textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📸</div>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: TXT }}>
          Capture Invoice Image
        </h3>
        <p style={{ fontSize: 12, color: MUT, marginBottom: 16 }}>
          Take a photo of your handwritten or printed invoice
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={startCamera} style={S_btn('primary')}>
            📷 Open Camera
          </button>
          <button onClick={() => fileInputRef.current?.click()} style={S_btn('secondary')}>
            📁 Upload Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  setImage(ev.target?.result);
                  extractItems(ev.target?.result);
                };
                reader.readAsDataURL(file);
              }
            }}
          />
        </div>
        {error && (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              background: RDL,
              border: '0.5px solid ' + RD,
              borderRadius: 6,
              fontSize: 12,
              color: RD,
            }}
          >
            ⚠️ {error}
          </div>
        )}
      </div>
    );
  }

  if (stage === 'preview') {
    return (
      <div style={S_card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: TXT }}>Capture Invoice</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: MUT }}>×</button>
        </div>

        <video
          ref={videoRef}
          style={{
            width: '100%',
            borderRadius: 10,
            background: '#000',
            marginBottom: 12,
            maxHeight: 400,
            objectFit: 'cover',
          }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={capturePhoto} style={{ ...S_btn('success'), flex: 1 }}>
            ✓ Capture Photo
          </button>
          <button
            onClick={() => {
              if (videoRef.current?.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(t => t.stop());
              }
              setStage('capture');
            }}
            style={{ ...S_btn('secondary'), flex: 1 }}
          >
            ⟲ Retake
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'extracting') {
    return (
      <div style={{ ...S_card, textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 16, animation: 'spin 2s linear infinite' }}>⚙️</div>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: TXT }}>
          Extracting Items...
        </h3>
        <p style={{ fontSize: 12, color: MUT }}>
          AI is reading your invoice image
        </p>
        {image && (
          <img
            src={image}
            style={{
              maxWidth: '100%',
              maxHeight: 300,
              borderRadius: 8,
              marginTop: 16,
            }}
            alt="Captured invoice"
          />
        )}
      </div>
    );
  }

  if (stage === 'review') {
    const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    return (
      <div style={S_card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: TXT }}>
            Review Extracted Items ({items.length})
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: MUT }}>×</button>
        </div>

        {image && (
          <div
            style={{
              maxWidth: 200,
              marginBottom: 12,
              borderRadius: 8,
              overflow: 'hidden',
              border: '0.5px solid ' + BORD,
            }}
          >
            <img src={image} alt="Source" style={{ width: '100%' }} />
          </div>
        )}

        <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 12 }}>
          {items.map((item, idx) =>
            editingId === idx ? (
              <div
                key={idx}
                style={{
                  padding: 10,
                  border: '1px solid ' + BL,
                  borderRadius: 6,
                  marginBottom: 8,
                  background: BLL,
                }}
              >
                <input
                  type="text"
                  placeholder="Item name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{ ...S_inp, marginBottom: 6 }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                  <input
                    type="number"
                    placeholder="Qty"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                    style={S_inp}
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={editForm.unitPrice}
                    onChange={(e) => setEditForm({ ...editForm, unitPrice: e.target.value })}
                    style={S_inp}
                  />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={saveEdit} style={{ ...S_btn('success'), flex: 1, fontSize: 11 }}>
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} style={{ ...S_btn('secondary'), flex: 1, fontSize: 11 }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={idx}
                style={{
                  padding: 10,
                  border: '0.5px solid ' + BORD,
                  borderRadius: 6,
                  marginBottom: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: item.confidence < 0.8 ? AMBL : '#fff',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: TXT, marginBottom: 2 }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: 11, color: MUT }}>
                    {item.quantity} × {fmt(item.unitPrice)} = {fmt(item.quantity * item.unitPrice)}
                  </div>
                  {item.confidence < 1 && (
                    <div style={{ fontSize: 10, color: AMB, marginTop: 2 }}>
                      Confidence: {Math.round(item.confidence * 100)}%
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => editItem(item)}
                    style={{ ...S_btn('secondary', true) }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteItem(idx)}
                    style={{ ...S_btn('danger', true) }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        <div
          style={{
            padding: 10,
            background: GRL,
            border: '0.5px solid ' + GR,
            borderRadius: 6,
            marginBottom: 12,
            textAlign: 'right',
          }}
        >
          <div style={{ fontSize: 11, color: GR, marginBottom: 4 }}>Total Amount</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: GR }}>
            {fmt(total)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={addItem} style={{ ...S_btn('secondary'), flex: 1 }}>
            + Add Item
          </button>
          <button onClick={confirmItems} style={{ ...S_btn('success'), flex: 1 }}>
            ✓ Use Items
          </button>
          <button
            onClick={() => {
              setStage('capture');
              setImage(null);
              setItems([]);
            }}
            style={{ ...S_btn('secondary'), flex: 1 }}
          >
            ⟲ Retake
          </button>
        </div>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              background: RDL,
              border: '0.5px solid ' + RD,
              borderRadius: 6,
              fontSize: 12,
              color: RD,
            }}
          >
            ⚠️ {error}
          </div>
        )}
      </div>
    );
  }

  return null;
}
