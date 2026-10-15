// Thermal sticker labels: one label per PDF page, page size = sticker size.
// Barcode = Code 128 (read by USB/laser scanners, which type the code + Enter into the billing box).
// QR = ShopOS format "ART:<article>|SIZE:<size>|BC:<sku>" (read by the in-app camera scanner).

export const LABEL_SIZES = [
  { id: '50x25', w: 50, h: 25, name: '50 × 25 mm (2" × 1")' },
  { id: '38x25', w: 38, h: 25, name: '38 × 25 mm (1.5" × 1")' },
  { id: '50x38', w: 50, h: 38, name: '50 × 38 mm (2" × 1.5")' },
  { id: '75x38', w: 75, h: 38, name: '75 × 38 mm (3" × 1.5")' },
  { id: '100x50', w: 100, h: 50, name: '100 × 50 mm (4" × 2")' },
];

// ── Code 128 ──────────────────────────────────────────────────────────────
// Bar/space widths for values 0–106 (106 = stop, 7 elements).
const C128 = ['212222','222122','222221','121223','121322','131222','122213','122312','132212','221213','221312','231212','112232','122132','122231','113222','123122','123221','223211','221132','221231','213212','223112','312131','311222','321122','321221','312212','322112','322211','212123','212321','232121','111323','131123','131321','112313','132113','132311','211313','231113','231311','112133','112331','132131','113123','113321','133121','313121','211331','231131','213113','213311','213131','311123','311321','331121','312113','312311','332111','314111','221411','431111','111224','111422','121124','121421','141122','141221','112214','112412','122114','122411','142112','142211','241211','221114','413111','241112','134111','111242','121142','121241','114212','124112','124211','411212','421112','421211','212141','214121','412121','111143','111341','131141','114113','114311','411113','411311','113141','114131','311141','411131','211412','211214','211232','2331112'];
const START_B = 104, START_C = 105, CODE_B = 100, STOP = 106;

// Returns the list of symbol values (start … checksum stop) for printable ASCII text.
export function code128Values(text) {
  const t = String(text);
  if (!/^[\x20-\x7e]+$/.test(t)) throw new Error('Barcode supports plain letters, digits and symbols only');
  const vals = [];
  const digits = /^\d+$/.test(t);
  if (digits && t.length >= 4) {
    // Code C packs two digits per symbol; an odd trailing digit switches to Code B
    const even = t.length - (t.length % 2);
    vals.push(START_C);
    for (let i = 0; i < even; i += 2) vals.push(+t.slice(i, i + 2));
    if (even < t.length) { vals.push(CODE_B); vals.push(t.charCodeAt(even) - 32); }
  } else {
    vals.push(START_B);
    for (const ch of t) vals.push(ch.charCodeAt(0) - 32);
  }
  let sum = vals[0];
  for (let i = 1; i < vals.length; i++) sum += vals[i] * i;
  vals.push(sum % 103, STOP);
  return vals;
}

// Expands symbol values into module widths, alternating bar/space starting with a bar.
export function code128Modules(text) {
  return code128Values(text).flatMap(v => C128[v].split('').map(Number));
}

// Everything is drawn in label coordinates (W wide, H tall). With rotate, the PDF page is H wide and W tall
// and the label is turned 90° clockwise — for printers that feed labels sideways.
function surface(doc, W, H, rotate) {
  if (!rotate) return {
    text: (s, x, y, align) => doc.text(s, x, y, align ? { align } : undefined),
    rect: (x, y, w, h) => doc.rect(x, y, w, h, 'F'),
    image: (url, x, y, w, h, alias) => doc.addImage(url, 'PNG', x, y, w, h, alias, 'FAST'),
  };
  // label point (x, y) -> page point (H - y, x)
  return {
    text: (s, x, y, align) => {
      const tw = doc.getTextWidth(s);
      const x0 = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
      doc.text(s, H - y, x0, { angle: -90 });
    },
    rect: (x, y, w, h) => doc.rect(H - y - h, x, h, w, 'F'),
    image: (url, x, y, w, h, alias) => doc.addImage(url, 'PNG', H - y - h, x, h, w, alias, 'FAST'),   // QR codes scan in any orientation
  };
}

function drawBarcode(doc, d, text, x, y, w, h) {
  const widths = code128Modules(text);
  const total = widths.reduce((s, n) => s + n, 0);
  const mod = w / total;
  let cx = x, bar = true;
  doc.setFillColor(0, 0, 0);
  for (const n of widths) {
    if (bar) d.rect(cx, y, n * mod, h);
    cx += n * mod; bar = !bar;
  }
}

// Shrinks the font (down to 60%) before cutting the text with "…"
const fit = (doc, text, maxW, size) => {
  let s = String(text || '');
  for (let f = size; f >= size * 0.6; f -= size * 0.05) {
    doc.setFontSize(f);
    if (doc.getTextWidth(s) <= maxW) return s;
  }
  if (doc.getTextWidth(s) <= maxW) return s;
  while (s.length > 1 && doc.getTextWidth(s + '…') > maxW) s = s.slice(0, -1);
  return s + '…';
};
const price = n => 'Rs. ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
// Price code: the price hidden between random digits, e.g. 630 -> 42 630 43 -> "4263043" (front digit never 0)
const rnd = (n, first) => Array.from({ length: n }, (_, i) => (i === 0 && first ? 1 + Math.floor(Math.random() * 9) : Math.floor(Math.random() * 10))).join('');
export const priceCode = (n, front = 2, back = 2) => rnd(front, true) + String(Math.round(+n || 0)) + rnd(back, false);

// Code printed on a label. Catalog items use their barcode (SKU); items not in the catalog yet use
// "article|size", which the billing scanner matches by article number and size.
export const labelCode = lb => String(lb.sku || [lb.articleNo, lb.size].filter(Boolean).join('|') || '').trim();

// labels: [{ name, articleNo, size, color, price, sku }]; style: 'barcode' | 'qr'
// custom = { w, h } in mm when sizeId is 'custom'; rotate = turn each label 90° on the page
export async function generateLabelsPDF({ labels, firmName = '', sizeId = '50x25', style = 'barcode', showPrice = true, code = null, custom = null, rotate = false }) {
  // code = { front, back }: print the price as a price code instead of "Rs. 630"
  const priceTxtOf = lb => (code ? priceCode(lb.price, code.front, code.back) : price(lb.price));
  const clampMm = v => Math.min(150, Math.max(20, +v || 0));
  const L = sizeId === 'custom' && custom ? { w: clampMm(custom.w), h: clampMm(custom.h) } : (LABEL_SIZES.find(s => s.id === sizeId) || LABEL_SIZES[0]);
  const { w, h } = L;
  const pw0 = rotate ? h : w, ph0 = rotate ? w : h;           // PDF page size
  const orient = pw0 >= ph0 ? 'landscape' : 'portrait';
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: orient, unit: 'mm', format: [pw0, ph0] });
  const d = surface(doc, w, h, rotate);
  const k = h / 25;                       // scale text with label height
  const pad = 1.5 * Math.min(k, 1.6);
  let qrLib = null;
  if (style === 'qr') qrLib = (await import('qrcode')).default;

  for (let i = 0; i < labels.length; i++) {
    const lb = labels[i];
    if (i > 0) doc.addPage([pw0, ph0], orient);
    doc.setTextColor(0, 0, 0);
    const code = labelCode(lb) || '0000';
    const sizeTxt = (lb.size || '-') + (lb.color ? ' · ' + lb.color : '');

    if (style === 'qr') {
      const q = Math.min(h - 2 * pad, w * 0.45);
      const data = `ART:${lb.articleNo || ''}|SIZE:${lb.size || ''}` + (lb.sku ? `|BC:${lb.sku}` : '');
      const url = await qrLib.toDataURL(data, { margin: 2, errorCorrectionLevel: 'M', width: 300 });   // margin = quiet zone scanners need
      const top = (h - q) / 2;
      d.image(url, pad, top, q, q, 'qr:' + data);   // same product = same QR, stored once in the PDF
      const tx = pad * 2 + q, tw = w - tx - pad;
      let y = top + 2.6 * k;
      doc.setFont('helvetica', 'bold'); d.text(fit(doc, firmName.toUpperCase(), tw, 5.5 * k), tx, y); y += 3.1 * k;
      d.text(fit(doc, lb.name, tw, 7 * k), tx, y); y += 3.4 * k;
      doc.setFont('helvetica', 'normal');
      d.text(fit(doc, 'Art: ' + (lb.articleNo || '-'), tw, 6.2 * k), tx, y); y += 3 * k;
      d.text(fit(doc, 'Size: ' + sizeTxt, tw, 6.2 * k), tx, y); y += 3.6 * k;
      if (showPrice) { doc.setFont('helvetica', 'bold'); d.text(fit(doc, priceTxtOf(lb), tw, 8.5 * k), tx, Math.min(y, h - pad)); }
      continue;
    }

    // Barcode layout
    const cw = w - 2 * pad;
    let y = pad + 2.2 * k;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5 * k); d.text(fit(doc, firmName.toUpperCase(), cw, 5.5 * k), w / 2, y, 'center');
    y += 3.1 * k;
    const priceTxt = showPrice ? priceTxtOf(lb) : '';
    doc.setFontSize(8 * k); const pw = priceTxt ? doc.getTextWidth(priceTxt) : 0;
    d.text(fit(doc, lb.name, cw - pw - 1.5, 7 * k), pad, y);
    if (priceTxt) { doc.setFontSize(8 * k); d.text(priceTxt, w - pad, y, 'right'); }
    y += 3 * k;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2 * k);
    d.text(fit(doc, 'Art: ' + (lb.articleNo || '-'), cw / 2, 6.2 * k), pad, y);
    doc.setFontSize(6.2 * k); d.text(fit(doc, 'Size: ' + sizeTxt, cw / 2, 6.2 * k), w - pad, y, 'right');
    y += 1.2 * k;
    const textH = 2.4 * k, barH = h - y - pad - textH - 0.4;
    const quiet = Math.min(3, w * 0.05);   // blank margin either side so scanners find the code
    drawBarcode(doc, d, code, pad + quiet, y, cw - 2 * quiet, Math.max(barH, 4));
    doc.setFontSize(5.5 * k); d.text(code, w / 2, h - pad, 'center');
  }
  return doc;
}
