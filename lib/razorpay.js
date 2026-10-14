// Loads Razorpay Checkout on demand (only when someone pays), so visitors don't download it
// or receive Razorpay cookies just by opening the website.
let loading = null;
export function loadRazorpay() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (!loading) {
    loading = new Promise(resolve => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.async = true;
      s.onload = () => resolve(!!window.Razorpay);
      s.onerror = () => { loading = null; resolve(false); };
      document.body.appendChild(s);
    });
  }
  return loading;
}
