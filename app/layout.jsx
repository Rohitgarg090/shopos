import './globals.css'

export const metadata = {
  title: 'ShopOS — Wholesale Clothing POS',
  description: 'Wholesale clothing shop management system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      </head>
      <body className="margin-0 padding-0 bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
