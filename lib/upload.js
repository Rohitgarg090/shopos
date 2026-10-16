// Browser-side file preparation for uploads.
// Vercel rejects request bodies over 4.5 MB and files travel as base64 (+33%), so the encoded file
// must stay under ~3.6 MB. Photos are resized/re-compressed here (a bill stays perfectly readable at
// ~2200 px); PDFs and other files can't be shrunk in the browser, so they get a clear size message.
export const MAX_B64 = 3_600_000;
const mb = n => (n / 1048576).toFixed(1) + ' MB';

const readDataUrl = file => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result));
  r.onerror = () => reject(new Error('Could not read the file'));
  r.readAsDataURL(file);
});

async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* fall back to <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally { URL.revokeObjectURL(url); }
}

// Resize to at most maxSide px and encode as JPEG, stepping quality/size down until it fits.
export async function compressImage(file, { maxSide = 2200, maxB64 = MAX_B64 } = {}) {
  const src = await decodeImage(file);
  const w0 = src.width, h0 = src.height;
  let side = Math.min(maxSide, Math.max(w0, h0));
  const qualities = [0.85, 0.75, 0.65];
  for (let attempt = 0; attempt < 7; attempt++) {
    const s = side / Math.max(w0, h0);
    const w = Math.max(1, Math.round(w0 * s)), h = Math.max(1, Math.round(h0 * s));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);   // transparent PNGs → white, not black
    ctx.drawImage(src, 0, 0, w, h);
    const dataUrl = c.toDataURL('image/jpeg', qualities[Math.min(attempt, 2)]);
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    if (base64.length <= maxB64) return { dataUrl, base64, mimeType: 'image/jpeg', resized: true };
    if (attempt >= 2) side = Math.round(side * 0.8);
  }
  throw new Error('This photo is too large to upload even after shrinking. Please take it again at a lower resolution.');
}

const isPdf = f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name || '');
const isImage = f => (f.type || '').startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(f.name || '');

/**
 * Turns a picked file into { dataUrl, base64, mimeType } that is safe to upload.
 * Images: small JPG/PNG/WebP go as they are; anything bigger (or HEIC) is converted to a JPEG that fits.
 * PDFs / CSV / Excel: sent as they are if they fit, otherwise a clear error.
 */
export async function fileToPayload(file, { maxB64 = MAX_B64 } = {}) {
  if (isImage(file) && !isPdf(file)) {
    if (/^image\/(jpeg|png|webp)$/.test(file.type) && file.size < 1_500_000) {
      const dataUrl = await readDataUrl(file);
      return { dataUrl, base64: dataUrl.slice(dataUrl.indexOf(',') + 1), mimeType: file.type, resized: false };
    }
    try { return await compressImage(file, { maxB64 }); }
    catch (e) {
      if (/too large/.test(e.message)) throw e;
      throw new Error('This image type can’t be opened here (for example iPhone HEIC). Please upload a JPG or PNG, or a screenshot of the bill.');
    }
  }
  const dataUrl = await readDataUrl(file);
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  if (base64.length > maxB64) {
    throw new Error(isPdf(file)
      ? `This PDF is ${mb(file.size)} — the upload limit is about 2.5 MB. Upload a photo or screenshot of the pages instead, or save the PDF at a smaller size.`
      : `This file is ${mb(file.size)} — the upload limit is about 2.5 MB.`);
  }
  return { dataUrl, base64, mimeType: file.type || (isPdf(file) ? 'application/pdf' : 'application/octet-stream'), resized: false };
}

// Reads a fetch() response that should be JSON, with readable errors when the server sent text instead.
export async function readJsonResponse(res) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch {
    if (res.status === 413) throw new Error('The file is too large to upload (limit about 2.5 MB). Try a smaller photo or PDF.');
    if (res.status === 504) throw new Error('The server took too long to read this file. Try again, or upload fewer pages.');
    throw new Error(`Server error ${res.status}${text ? ': ' + text.slice(0, 80) : ''}`);
  }
}
