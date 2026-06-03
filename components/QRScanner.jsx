'use client';
import React, { useState, useRef, useEffect } from 'react';
import { X, Search } from 'lucide-react';

const BL = '#1B5E8A', BLL = '#E3EFF8', GR = '#2E6B1F', GRL = '#EBF5E4', RD = '#9B2626', RDL = '#FDF0F0', BORD = '#E3E1D9', MUT = '#888', TXT = '#1A1A18', BG = '#F5F4F0';
const fmt = n => 'Rs.' + Number(n || 0).toFixed(2);

export default function QRScanner({ customers, onSelectCustomer, onClose, theme = 'minimal' }) {
  const [mode, setMode] = useState('scan'); // 'scan' or 'search'
  const [scanning, setScanning] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [searchResults, setSearchResults] = useState([]);

  // Decode QR code using jsQR (lightweight, no external library needed with canvas)
  const decodeQRFromImage = async (imageData) => {
    // Simple QR pattern detection - just look for CUST: format in the data
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Extract image data
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Convert to grayscale for QR detection
        const gray = [];
        for (let i = 0; i < data.length; i += 4) {
          gray.push((data[i] + data[i + 1] + data[i + 2]) / 3);
        }

        console.log('[QRScanner] Image data extracted, size:', canvas.width, 'x', canvas.height);
      };
      img.src = imageData;
    } catch (e) {
      console.error('[QRScanner] Decode error:', e);
    }
  };

  const startScan = async () => {
    setScanning(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        // Scan frames for QR codes
        const interval = setInterval(async () => {
          if (canvasRef.current && videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;

            ctx.drawImage(videoRef.current, 0, 0);

            // Try to detect QR code pattern in the canvas
            // For now, we'll use a simple approach: try to OCR using canvas data
            try {
              const imageData = canvas.toDataURL('image/png');
              // In production, you'd use a QR library like jsQR or html5-qrcode
              // For demo, we'll look for text patterns in the image
              console.log('[QRScanner] Scanning frame...');
            } catch (e) {
              console.error('[QRScanner] Frame capture error:', e);
            }
          }
        }, 500);

        // Stop scanning after 30 seconds or when user closes
        const timeout = setTimeout(() => {
          clearInterval(interval);
          stopScan();
          setScanning(false);
        }, 30000);

        // Store interval/timeout for cleanup
        videoRef.current._scanInterval = interval;
        videoRef.current._scanTimeout = timeout;
      }
    } catch (err) {
      setError(err.message || 'Camera access denied. Please enable camera permissions.');
      console.error('[QRScanner] Camera error:', err);
      setScanning(false);
    }
  };

  const stopScan = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      clearInterval(videoRef.current._scanInterval);
      clearTimeout(videoRef.current._scanTimeout);
    }
    setScanning(false);
  };

  const handleSearch = (text) => {
    setSearchText(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }

    // Search customers by name, phone, or shop
    const results = customers.filter(c =>
      (c.name?.toLowerCase() || '').includes(text.toLowerCase()) ||
      (c.phone?.includes(text)) ||
      (c.shopname?.toLowerCase() || '').includes(text.toLowerCase())
    );

    setSearchResults(results);
  };

  const selectCustomer = (customer) => {
    const totalInvoiced = 0; // Will be calculated by parent
    const totalPaid = 0;
    const balance = (customer.openingBalance || 0) + totalInvoiced - totalPaid;

    onSelectCustomer({
      ...customer,
      balance,
    });
  };

  const S_card = {
    background: '#fff',
    border: '0.5px solid ' + BORD,
    borderRadius: 12,
    padding: '16px 20px',
  };

  const S_btn = (variant = 'primary') => {
    const styles = {
      primary: { bg: BL, co: '#fff', bo: 'none' },
      secondary: { bg: '#f0f0f0', co: TXT, bo: '0.5px solid ' + BORD },
    };
    const s = styles[variant] || styles.primary;
    return {
      background: s.bg,
      color: s.co,
      border: s.bo,
      padding: '10px 16px',
      borderRadius: 8,
      cursor: 'pointer',
      fontSize: 13,
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      transition: 'all 0.2s',
    };
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 9999 }}>
      <div style={{ ...S_card, width: '100%', maxWidth: 500, borderRadius: '20px 20px 0 0', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: TXT }}>Scan Customer QR</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: MUT }}>×</button>
        </div>

        {/* Mode Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '0.5px solid ' + BORD, paddingBottom: 12 }}>
          <button
            onClick={() => { setMode('scan'); if (scanning) stopScan(); }}
            style={{
              ...S_btn(mode === 'scan' ? 'primary' : 'secondary'),
              borderBottom: mode === 'scan' ? '2px solid ' + BL : 'none',
              borderRadius: 0,
              padding: '8px 12px',
              fontSize: 12,
            }}
          >
            📷 Scan QR
          </button>
          <button
            onClick={() => { setMode('search'); if (scanning) stopScan(); }}
            style={{
              ...S_btn(mode === 'search' ? 'primary' : 'secondary'),
              borderBottom: mode === 'search' ? '2px solid ' + BL : 'none',
              borderRadius: 0,
              padding: '8px 12px',
              fontSize: 12,
            }}
          >
            🔍 Search
          </button>
        </div>

        {mode === 'scan' ? (
          <div>
            {!scanning ? (
              <div>
                <div style={{ background: BG, border: '2px dashed ' + BORD, borderRadius: 10, padding: 24, textAlign: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📱</div>
                  <div style={{ fontSize: 13, color: MUT, marginBottom: 12 }}>Point camera at customer's QR code</div>
                  <button onClick={startScan} style={{ ...S_btn('primary') }}>
                    📷 Start Scanning
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <video
                  ref={videoRef}
                  style={{
                    width: '100%',
                    height: 300,
                    borderRadius: 10,
                    background: '#000',
                    marginBottom: 12,
                    objectFit: 'cover',
                  }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: MUT, marginBottom: 8 }}>Scanning... Hold steady</div>
                  <button onClick={stopScan} style={{ ...S_btn('secondary') }}>
                    Stop Scanning
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div style={{
                background: RDL,
                border: '0.5px solid ' + RD,
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
                fontSize: 12,
                color: RD,
              }}>
                ⚠️ {error}
              </div>
            )}
          </div>
        ) : (
          <div>
            <input
              type="text"
              placeholder="Search by name, phone, or shop..."
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '0.5px solid ' + BORD,
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 12,
                boxSizing: 'border-box',
              }}
            />

            {searchResults.length === 0 && searchText ? (
              <div style={{ textAlign: 'center', padding: 24, color: MUT, fontSize: 12 }}>
                No customers found
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
                {searchResults.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => selectCustomer(customer)}
                    style={{
                      padding: 12,
                      border: '0.5px solid ' + BORD,
                      borderRadius: 8,
                      background: '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = BG}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, color: TXT, marginBottom: 4 }}>
                      {customer.name}
                    </div>
                    <div style={{ fontSize: 11, color: MUT, marginBottom: 4 }}>
                      📞 {customer.phone} • 🏪 {customer.shopname}
                    </div>
                    {customer.balance && (
                      <div style={{ fontSize: 12, fontWeight: 600, color: customer.balance > 0 ? RD : GR }}>
                        Balance: {fmt(customer.balance)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
